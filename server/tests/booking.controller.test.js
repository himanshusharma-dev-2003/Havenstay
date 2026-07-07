jest.mock('../models/Room');
jest.mock('../models/Hotel');
jest.mock('../models/Booking');

const Room = require('../models/Room');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
const controller = require('../controllers/bookingController');

beforeEach(() => jest.clearAllMocks());

const futureDate = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

describe('createBooking', () => {
  test('creates a booking successfully when room available', async () => {
    Room.findOne = jest.fn().mockResolvedValue({
      _id: 'room1',
      price: 100,
      maxPeople: 2,
      roomNumbers: [{ number: 1, bookedDates: [] }],
    });

    Hotel.findById = jest.fn().mockResolvedValue({ _id: 'hotel1' });

    Room.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const mockBooking = {
      _id: 'b1',
      populate: jest.fn().mockResolvedValue({ _id: 'b1', hotelId: { name: 'H' }, roomId: { title: 'R' } }),
    };
    Booking.create = jest.fn().mockResolvedValue(mockBooking);

    const req = {
      body: {
        roomId: 'room1',
        hotelId: 'hotel1',
        checkIn: futureDate(2),
        checkOut: futureDate(4),
        guests: 1,
      },
      user: { id: 'user1' },
    };

    const res = { status: jest.fn(() => res), json: jest.fn() };
    const next = jest.fn();

    await controller.createBooking(req, res, next);

    if (next.mock.calls.length > 0) {
      throw next.mock.calls[0][0];
    }

    expect(Room.findOne).toHaveBeenCalledWith({ _id: 'room1', isActive: true });
    expect(Hotel.findById).toHaveBeenCalledWith('hotel1');
    expect(Room.findOneAndUpdate).toHaveBeenCalled();
    expect(Booking.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('returns conflict when no availability', async () => {
    const inDate = futureDate(1);
    const outDate = futureDate(2);

    Room.findOne = jest.fn().mockResolvedValue({
      _id: 'room1',
      price: 100,
      maxPeople: 2,
      roomNumbers: [{ number: 1, bookedDates: [inDate] }],
    });

    Hotel.findById = jest.fn().mockResolvedValue({ _id: 'hotel1' });

    const req = {
      body: {
        roomId: 'room1',
        hotelId: 'hotel1',
        checkIn: inDate,
        checkOut: outDate,
        guests: 1,
      },
      user: { id: 'user1' },
    };

    const res = {};
    const next = jest.fn();

    await controller.createBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.message).toMatch(/No availability/);
  });
});

describe('cancelBooking', () => {
  test('cancels an existing booking and releases dates', async () => {
    const bookingObj = {
      _id: 'b1',
      roomId: 'room1',
      roomNumber: 1,
      status: 'confirmed',
      userId: 'user1',
      checkIn: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      checkOut: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      save: jest.fn().mockResolvedValue(true),
    };

    Booking.findById = jest.fn().mockResolvedValue(bookingObj);
    Room.findOneAndUpdate = jest.fn().mockResolvedValue({});

    const req = { params: { id: 'b1' }, user: { id: 'user1', role: 'user' }, body: { reason: 'Change of plans' } };
    const res = { json: jest.fn() };
    const next = jest.fn();

    await controller.cancelBooking(req, res, next);

    if (next.mock.calls.length > 0) {
      throw next.mock.calls[0][0];
    }

    expect(Booking.findById).toHaveBeenCalledWith('b1');
    expect(Room.findOneAndUpdate).toHaveBeenCalled();
    expect(bookingObj.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

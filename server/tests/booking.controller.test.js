/**
 * booking.controller.test.js
 *
 * Unit tests for the booking controller using Jest manual mocks.
 * All external I/O (MongoDB models, cache service, Razorpay, config)
 * is mocked so these tests run without any network or database connection.
 */

// ── Mocks (must be declared before any require() calls) ──────────
jest.mock('../models/Room');
jest.mock('../models/Hotel');
jest.mock('../models/Booking');

// Mock the cache service — all methods are no-ops in unit tests.
// Without this, the real service tries to call getClient() which
// pulls in config/redis.js and the redis package unnecessarily.
jest.mock('../services/cache.service', () => ({
  get:        jest.fn().mockResolvedValue(null),
  set:        jest.fn().mockResolvedValue(undefined),
  del:        jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
  flush:      jest.fn().mockResolvedValue(undefined),
  getOrSet:   jest.fn().mockResolvedValue(null),
}));

// Mock config so Razorpay is treated as disabled — avoids network calls
// and the need for real API keys in CI.
jest.mock('../config', () => ({
  isProd:  false,
  nodeEnv: 'test',
  razorpay: {
    keyId:     'test_key',
    keySecret: 'test_secret',
    isEnabled: false, // disables payment gateway branch in createBooking
  },
  jwt: {
    accessSecret:  'testsecret',
    refreshSecret: 'testrefresh',
    accessExpiry:  '15m',
    refreshExpiry: '7d',
  },
}));

const Room    = require('../models/Room');
const Hotel   = require('../models/Hotel');
const Booking = require('../models/Booking');
const controller = require('../controllers/bookingController');

beforeEach(() => jest.clearAllMocks());

const futureDate = (days) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

// ── createBooking ─────────────────────────────────────────────────
describe('createBooking', () => {
  test('returns 409 when no availability for requested dates', async () => {
    const inDate  = futureDate(1);
    const outDate = futureDate(2);

    Room.findOne = jest.fn().mockResolvedValue({
      _id:         'room1',
      price:       100,
      maxPeople:   2,
      roomNumbers: [{ number: 1, bookedDates: [new Date(inDate)] }],
    });

    Hotel.findById = jest.fn().mockResolvedValue({ _id: 'hotel1' });

    const req = {
      body: {
        roomId:   'room1',
        hotelId:  'hotel1',
        checkIn:  inDate,
        checkOut: outDate,
        guests:   1,
      },
      user: { id: 'user1' },
    };

    const res  = {};
    const next = jest.fn();

    await controller.createBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.message).toMatch(/No availability/);
    expect(err.statusCode).toBe(409);
  });

  test('returns 409 when atomic update conflicts (race condition)', async () => {
    Room.findOne = jest.fn().mockResolvedValue({
      _id:         'room1',
      price:       100,
      maxPeople:   2,
      roomNumbers: [{ number: 1, bookedDates: [] }],
    });

    Hotel.findById = jest.fn().mockResolvedValue({ _id: 'hotel1' });

    // Atomic update returns null → another request claimed these dates
    Room.findOneAndUpdate = jest.fn().mockResolvedValue(null);

    const req = {
      body: {
        roomId:   'room1',
        hotelId:  'hotel1',
        checkIn:  futureDate(2),
        checkOut: futureDate(4),
        guests:   1,
      },
      user: { id: 'user1' },
    };

    const res  = {};
    const next = jest.fn();

    await controller.createBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/conflict/i);
  });

  test('returns 404 when room not found', async () => {
    Room.findOne = jest.fn().mockResolvedValue(null);

    const req = {
      body: {
        roomId:   'nonexistent',
        hotelId:  'hotel1',
        checkIn:  futureDate(1),
        checkOut: futureDate(2),
        guests:   1,
      },
      user: { id: 'user1' },
    };

    const res  = {};
    const next = jest.fn();

    await controller.createBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  test('returns 400 when guest count exceeds room capacity', async () => {
    Room.findOne = jest.fn().mockResolvedValue({
      _id:         'room1',
      price:       100,
      maxPeople:   1,
      roomNumbers: [{ number: 1, bookedDates: [] }],
    });

    Hotel.findById = jest.fn().mockResolvedValue({ _id: 'hotel1' });

    const req = {
      body: {
        roomId:   'room1',
        hotelId:  'hotel1',
        checkIn:  futureDate(1),
        checkOut: futureDate(2),
        guests:   3, // exceeds maxPeople: 1
      },
      user: { id: 'user1' },
    };

    const res  = {};
    const next = jest.fn();

    await controller.createBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toMatch(/maximum/i);
  });
});

// ── cancelBooking ─────────────────────────────────────────────────
describe('cancelBooking', () => {
  test('cancels a confirmed booking and releases dates', async () => {
    const bookingObj = {
      _id:        'b1',
      roomId:     'room1',
      roomNumber: 1,
      status:     'confirmed',
      userId:     'user1',
      checkIn:    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      checkOut:   new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      save:       jest.fn().mockResolvedValue(true),
    };

    Booking.findById       = jest.fn().mockResolvedValue(bookingObj);
    Room.findOneAndUpdate  = jest.fn().mockResolvedValue({});

    const req  = { params: { id: 'b1' }, user: { id: 'user1', role: 'user' }, body: { reason: 'Change of plans' } };
    const res  = { json: jest.fn() };
    const next = jest.fn();

    await controller.cancelBooking(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(Booking.findById).toHaveBeenCalledWith('b1');
    expect(Room.findOneAndUpdate).toHaveBeenCalled();
    expect(bookingObj.save).toHaveBeenCalled();
    expect(bookingObj.status).toBe('cancelled');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('returns 404 when booking not found', async () => {
    Booking.findById = jest.fn().mockResolvedValue(null);

    const req  = { params: { id: 'missing' }, user: { id: 'user1', role: 'user' }, body: {} };
    const res  = {};
    const next = jest.fn();

    await controller.cancelBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  test('returns 400 when booking already cancelled', async () => {
    Booking.findById = jest.fn().mockResolvedValue({
      _id:    'b1',
      status: 'cancelled',
      userId: 'user1',
    });

    const req  = { params: { id: 'b1' }, user: { id: 'user1', role: 'user' }, body: {} };
    const res  = {};
    const next = jest.fn();

    await controller.cancelBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  test('returns 403 when user does not own the booking', async () => {
    Booking.findById = jest.fn().mockResolvedValue({
      _id:    'b1',
      status: 'confirmed',
      userId: 'other-user',
    });

    const req  = { params: { id: 'b1' }, user: { id: 'user1', role: 'user' }, body: {} };
    const res  = {};
    const next = jest.fn();

    await controller.cancelBooking(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});

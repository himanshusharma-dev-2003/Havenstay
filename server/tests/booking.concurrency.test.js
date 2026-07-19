const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Room = require('../models/Room');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed minimal data
  const user = await User.create({ name: 'Test', email: 'test@example.com', password: 'password' });
  global.testUser = user;

  const hotel = await Hotel.create({ name: 'H', city: 'C', country: 'X', address: 'A', description: 'D', cheapestPrice: 100 });
  global.testHotel = hotel;

  const room = await Room.create({ hotelId: hotel._id, title: 'R1', price: 100, maxPeople: 2, roomNumbers: [ { number: 101, bookedDates: [] } ] });
  global.testRoom = room;

  // Login to get cookies
  const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password' });
  global.cookie = res.headers['set-cookie'];
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('concurrent bookings: only one succeeds for same room/dates', async () => {
  const body = {
    roomId: global.testRoom._id.toString(),
    hotelId: global.testHotel._id.toString(),
    checkIn: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    guests: 1,
  };

  // Send two requests in parallel
  const [r1, r2] = await Promise.all([
    request(app).post('/api/bookings').set('Cookie', global.cookie).send(body),
    request(app).post('/api/bookings').set('Cookie', global.cookie).send(body),
  ]);

  const statuses = [r1.statusCode, r2.statusCode].sort();
  // Expect one 201 and one 409
  expect(statuses).toEqual([201, 409]);
});

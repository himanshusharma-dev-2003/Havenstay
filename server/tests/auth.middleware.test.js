const jwt = require('jsonwebtoken');
const { verifyToken, verifyAdmin, optionalAuth } = require('../middleware/auth');

describe('Auth middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('verifyToken attaches user from Authorization header', async () => {
    process.env.JWT_ACCESS_SECRET = 'testsecret';
    const token = jwt.sign({ id: 'user1', email: 'a@b.com', role: 'user' }, process.env.JWT_ACCESS_SECRET);

    const req = { headers: { authorization: `Bearer ${token}` }, cookies: {} };
    const res = {};
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(req.user).toMatchObject({ id: 'user1', email: 'a@b.com', role: 'user' });
    expect(next).toHaveBeenCalled();
  });

  test('verifyToken returns 401 when token missing', async () => {
    const req = { headers: {}, cookies: {} };
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status };
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('optionalAuth does not throw on invalid token and continues', async () => {
    // provide an invalid token and ensure middleware doesn't throw
    const req = { headers: { authorization: 'Bearer invalidtoken' }, cookies: {} };
    const res = {};
    const next = jest.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    // invalid token should not attach user
    expect(req.user).toBeUndefined();
  });

  test('verifyAdmin rejects non-admin users', () => {
    const req = { user: { id: 'u1', role: 'user' } };
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status };
    const next = jest.fn();

    verifyAdmin(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });
});

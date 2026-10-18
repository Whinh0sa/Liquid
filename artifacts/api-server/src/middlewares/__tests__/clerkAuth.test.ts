import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../clerkAuth.js';
import { verifyToken } from '@clerk/backend';
import { db } from '../../lib/db.js';

// Mock the external modules
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn().mockReturnValue({
    users: {
      getUser: vi.fn().mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        primaryEmailAddressId: 'email_1',
        emailAddresses: [{ id: 'email_1', emailAddress: 'john@example.com' }],
      }),
    },
  }),
  verifyToken: vi.fn(),
}));

vi.mock('../../lib/db.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    catch: vi.fn(),
  },
}));

vi.mock('@workspace/db/schema', () => ({
  users: {
    id: 'user_id_col',
    clerkUserId: 'clerk_user_id_col',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

describe('requireAuth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {
      headers: {},
      log: {
        info: vi.fn(),
        warn: vi.fn(),
      } as any,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
    process.env.CLERK_SECRET_KEY = 'test_secret';
  });

  it('should return 401 if Authorization header is missing', async () => {
    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing Authorization header' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header does not start with Bearer', async () => {
    mockReq.headers = { authorization: 'Basic xyz' };
    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing Authorization header' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid', async () => {
    mockReq.headers = { authorization: 'Bearer invalid_token' };
    vi.mocked(verifyToken).mockRejectedValueOnce(new Error('Invalid token'));

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next and set req.auth if token is valid and user exists in DB', async () => {
    mockReq.headers = { authorization: 'Bearer valid_token' };
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'clerk_user_123' } as any);

    // Mock DB returning an existing user
    const mockDbUser = { id: 'db_user_123' };
    (db as any).select().from().where().limit().then.mockImplementationOnce(async (cb: any) => cb([mockDbUser]));

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.auth).toEqual({
      clerkUserId: 'clerk_user_123',
      dbUserId: 'db_user_123',
    });
    expect(mockNext).toHaveBeenCalled();

    // Check if background update was called
    expect(db.update).toHaveBeenCalled();
  });

  it('should create a new user and call next if token is valid but user does not exist in DB', async () => {
    mockReq.headers = { authorization: 'Bearer valid_token' };
    vi.mocked(verifyToken).mockResolvedValueOnce({ sub: 'clerk_user_123' } as any);

    // Mock DB returning null (user not found)
    (db as any).select().from().where().limit().then.mockImplementationOnce(async (cb: any) => cb([]));

    // Mock DB insert returning a new user
    const mockNewUser = { id: 'new_db_user_123' };
    (db as any).insert().values().returning.mockResolvedValueOnce([mockNewUser]);

    await requireAuth(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.auth).toEqual({
      clerkUserId: 'clerk_user_123',
      dbUserId: 'new_db_user_123',
    });
    expect(mockNext).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalled();
  });
});

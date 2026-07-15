import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  }
}));

import prisma from '../lib/prisma';

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a student and ignore provided ADMIN role', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'test@hutech.edu.vn',
        name: 'Test Student',
        role: 'STUDENT'
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@hutech.edu.vn',
          password: 'password123',
          name: 'Test Student',
          studentId: '123456789',
          role: 'ADMIN' // Trying to inject ADMIN role
        });

      expect(res.status).toBe(201);
      // Ensure the Prisma create call forces the role to STUDENT (except for admin email)
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@hutech.edu.vn',
            role: 'STUDENT'
          })
        })
      );
    });
  });

  describe('GET /api/auth/admin/reset-requests', () => {
    it('should return 401 if no token provided', async () => {
      const res = await request(app).get('/api/auth/admin/reset-requests');
      expect(res.status).toBe(401);
    });
  });
});

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });

    try {
      // Check if user is blocked in DB
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { status: true }
      });

      if (!dbUser || dbUser.status === 'BLOCKED') {
        return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa' });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server' });
    }
  });
};

import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

// ADMIN: Get all users
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, name: true, email: true, studentId: true, role: true, status: true, faceImage: true, createdAt: true },
        skip,
        take: limit,
      }),
      prisma.user.count()
    ]);

    res.json({
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Update user status (Block/Unblock)
router.put('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { status } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Delete user
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    res.json({ message: 'Xóa người dùng thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Update user profile
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, faceImage, faceDescriptor, major, interests, skills, bio, phone, address, className, dateOfBirth } = req.body;
    const userId = req.user?.userId;

    // Security: Only allow users to update their own profile (unless ADMIN)
    if (userId !== id && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(faceImage && { faceImage }),
        ...(faceDescriptor && { faceDescriptor }),
        ...(major !== undefined && { major }),
        ...(interests !== undefined && { interests }),
        ...(skills !== undefined && { skills }),
        ...(bio !== undefined && { bio }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(className !== undefined && { className }),
        ...(dateOfBirth !== undefined && { dateOfBirth })
      }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Create a new user account
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { studentId, name, email, password, role } = req.body;

    if (!studentId || !name || !email || !password || !role) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin.' });
    }

    // Check if email or studentId already exists
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email này đã tồn tại.' });
    }

    const existingStudentId = await prisma.user.findUnique({ where: { studentId } });
    if (existingStudentId) {
      return res.status(400).json({ message: 'Mã số sinh viên này đã tồn tại.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        studentId,
        name,
        email,
        password: hashedPassword,
        role,
        status: 'ACTIVE'
      }
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Update user account details (including password override)
router.put('/:id/admin-update', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { studentId, name, email, role, status, password } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    // Check unique constraints for email & studentId if they changed
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email đã được sử dụng bởi tài khoản khác.' });
      }
    }

    if (studentId && studentId !== user.studentId) {
      const existingStudentId = await prisma.user.findUnique({ where: { studentId } });
      if (existingStudentId) {
        return res.status(400).json({ message: 'Mã số sinh viên đã được sử dụng bởi tài khoản khác.' });
      }
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(studentId && { studentId }),
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(status && { status }),
        ...(hashedPassword && { password: hashedPassword })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// GET /api/users/notifications - Fetch user's notifications
router.get('/notifications', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Auto cleanup: delete notifications older than 1 week (7 days)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      await prisma.notification.deleteMany({
        where: {
          createdAt: { lt: oneWeekAgo }
        }
      });
    } catch (cleanupErr) {
      console.error("Failed to run notification cleanup:", cleanupErr);
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// PUT /api/users/notifications/read-all - Mark all user's notifications as read
router.put('/notifications/read-all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// PUT /api/users/notifications/:id/read - Mark a notification as read
router.put('/notifications/:id/read', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });

    res.json({ message: 'Đã đánh dấu thông báo là đã đọc' });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;


import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}

// Register
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, studentId, role } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { studentId }] }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email hoặc Mã số SV đã tồn tại' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        studentId,
        role: email === 'admin@hutech.edu.vn' ? 'ADMIN' : 'STUDENT'
      }
    });

    // Create token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role, 
        studentId: user.studentId,
        faceImage: user.faceImage,
        major: user.major,
        interests: user.interests,
        skills: user.skills,
        bio: user.bio,
        phone: user.phone,
        address: user.address,
        className: user.className,
        dateOfBirth: user.dateOfBirth
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get Current User
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, studentId: true, createdAt: true, faceImage: true, major: true, interests: true, skills: true, bio: true, phone: true, address: true, className: true, dateOfBirth: true }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});



interface ResetRequest {
  email: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
}

// Memory store for password reset requests
const resetRequests = new Map<string, ResetRequest>();

// Request password reset (Forgot password)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Vui lòng cung cấp email' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Email này không tồn tại trong hệ thống.' });
    }

    // Save request in memory store
    resetRequests.set(email, {
      email,
      name: user.name,
      status: 'PENDING',
      createdAt: Date.now()
    });

    // Notify all ADMIN users
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Yêu cầu đặt lại mật khẩu',
          message: `Sinh viên ${user.name} (${user.email}) đã gửi yêu cầu đặt lại mật khẩu. Vui lòng phê duyệt.`
        }
      });
    }

    console.log(`\n==========================================\n[RESET PASSWORD REQUEST]: ${email} submitted\n==========================================\n`);

    res.json({
      message: 'Yêu cầu đặt lại mật khẩu đã được gửi đến Admin. Vui lòng chờ phê duyệt.'
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi xử lý quên mật khẩu' });
  }
});

// Check status of password reset request
router.get('/check-reset-status', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Thiếu email' });
    }

    const request = resetRequests.get(email as string);
    if (!request) {
      return res.json({ status: 'NONE' });
    }

    res.json({ status: request.status });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Reset password after admin approval
router.post('/reset-password-approved', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    const request = resetRequests.get(email);
    if (!request || request.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Yêu cầu đặt lại mật khẩu chưa được phê duyệt hoặc không tồn tại.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    // Remove request from memory
    resetRequests.delete(email);

    res.json({ message: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: 'Lỗi máy chủ khi đặt lại mật khẩu' });
  }
});

// Admin endpoint: Get all pending reset requests
router.get('/admin/reset-requests', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    res.json(Array.from(resetRequests.values()));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Admin endpoint: Approve reset request
router.post('/admin/approve-reset', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Thiếu email' });
    }

    const request = resetRequests.get(email);
    if (!request) {
      return res.status(404).json({ message: 'Yêu cầu không tồn tại.' });
    }

    request.status = 'APPROVED';
    resetRequests.set(email, request);

    res.json({ message: `Đã phê duyệt yêu cầu khôi phục mật khẩu của ${email}.` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

// Admin endpoint: Reject reset request
router.post('/admin/reject-reset', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Thiếu email' });
    }

    const request = resetRequests.get(email);
    if (!request) {
      return res.status(404).json({ message: 'Yêu cầu không tồn tại.' });
    }

    request.status = 'REJECTED';
    resetRequests.set(email, request);
    resetRequests.delete(email);

    res.json({ message: `Đã từ chối yêu cầu khôi phục mật khẩu của ${email}.` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ' });
  }
});

export default router;

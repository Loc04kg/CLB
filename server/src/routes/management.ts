import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

// Upload background image for HomePage
router.post('/background', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ Admin mới có quyền đổi ảnh nền' });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ message: 'Vui lòng cung cấp dữ liệu ảnh' });
    }

    // Tách phần metadata (data:image/jpeg;base64,) và lấy chuỗi data thực sự
    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Dữ liệu ảnh không hợp lệ' });
    }

    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    // Đường dẫn tới thư mục public của frontend
    // backend đang ở .../server/src/routes
    // Frontend public nằm ở .../public (3 cấp)
    const frontendPublicDir = path.resolve(__dirname, '../../../public');
    const imagePath = path.join(frontendPublicDir, 'background.jpg');

    fs.writeFileSync(imagePath, imageBuffer);

    res.json({ message: 'Cập nhật ảnh nền thành công!', url: '/background.jpg' });
  } catch (error) {
    console.error("Lỗi cập nhật ảnh nền:", error);
    res.status(500).json({ message: 'Lỗi server khi lưu file' });
  }
});

// Generic Upload API for saving images as physical files
router.post('/upload', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ message: 'Vui lòng cung cấp dữ liệu ảnh' });
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ message: 'Dữ liệu ảnh không hợp lệ' });
    }

    const extensionMatch = matches[1].match(/\/([a-zA-Z0-9]+)$/);
    const ext = extensionMatch ? extensionMatch[1] : 'jpg';
    
    const imageBuffer = Buffer.from(matches[2], 'base64');
    
    const fileName = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
    
    const frontendPublicDir = path.resolve(__dirname, '../../../public');
    const uploadsDir = path.join(frontendPublicDir, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const imagePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(imagePath, imageBuffer);

    res.json({ url: `/uploads/${fileName}` });
  } catch (error) {
    console.error("Lỗi upload ảnh:", error);
    res.status(500).json({ message: 'Lỗi server khi lưu file upload' });
  }
});

// Get club members (Leader or Admin)
router.get('/:clubId/members', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const { userId, role } = req.user!;

    // Permission check: Must be Admin or the Leader of this club
    if (role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId, userId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    const members = await prisma.clubMember.findMany({
      where: { clubId },
      include: { user: { select: { id: true, name: true, email: true, studentId: true, role: true } } }
    });
    res.json(members);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Manage Departments
router.post('/:clubId/departments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const { name } = req.body;
    const { userId, role } = req.user!;

    if (role !== 'ADMIN') {
        const membership = await prisma.clubMember.findFirst({
          where: { clubId, userId, role: 'LEADER' }
        });
        if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    const dept = await prisma.department.create({
      data: { clubId, name }
    });
    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/:clubId/departments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const depts = await prisma.department.findMany({
      where: { clubId: req.params.clubId },
      include: { members: { include: { user: true } } }
    });
    res.json(depts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/:clubId/users/:userId/profile', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, userId } = req.params;
    const requesterId = req.user!.userId;
    const role = req.user!.role;

    // Must be ADMIN or LEADER of the club
    if (role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Forbidden' });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, studentId: true, email: true, faceImage: true,
        attendances: {
          where: { event: { clubId: clubId } },
          select: { 
            id: true, checkinTime: true, method: true, snapshotImage: true, 
            event: { select: { title: true, eventDate: true } } 
          },
          orderBy: { checkinTime: 'desc' }
        }
      }
    });

    if (!userProfile) return res.status(404).json({ message: 'User not found' });

    res.json(userProfile);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get club stats
router.get('/:clubId/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const totalMembers = await prisma.clubMember.count({ where: { clubId, status: 'APPROVED' } });
    const pendingMembers = await prisma.clubMember.count({ where: { clubId, status: 'PENDING' } });
    const totalEvents = await prisma.event.count({ where: { clubId } });
    
    res.json({ totalMembers, pendingMembers, totalEvents });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Update member role or title
router.put('/:clubId/members/:memberId/role', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, memberId } = req.params;
    const { role, customTitle } = req.body;
    const { userId, role: userRole } = req.user!;

    if (userRole !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId, userId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await prisma.clubMember.update({
      where: { id: memberId },
      data: { role, customTitle }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Remove a member
router.delete('/:clubId/members/:memberId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, memberId } = req.params;
    const { userId, role: userRole } = req.user!;

    if (userRole !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId, userId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.clubMember.delete({ where: { id: memberId } });
    res.json({ message: 'Đã xóa thành viên khỏi CLB' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Add user to department
router.post('/:clubId/departments/:deptId/members', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, deptId } = req.params;
    const { userId } = req.body;
    const { userId: requesterId, role: userRole } = req.user!;

    if (userRole !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    const deptMember = await prisma.departmentMember.create({
      data: { departmentId: deptId, userId }
    });
    res.json(deptMember);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Remove user from department
router.delete('/:clubId/departments/:deptId/members/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, deptId, userId: targetUserId } = req.params;
    const { userId: requesterId, role: userRole } = req.user!;

    if (userRole !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.departmentMember.deleteMany({
      where: { departmentId: deptId, userId: targetUserId }
    });
    res.json({ message: 'Đã xóa khỏi ban' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Add member to club directly (Leader or Admin)
router.post('/:clubId/members', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const { email, role: memberRole } = req.body;
    const { userId, role } = req.user!;

    if (role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId, userId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    const userToAdd = await prisma.user.findUnique({
      where: { email }
    });
    if (!userToAdd) return res.status(404).json({ message: 'Không tìm thấy người dùng với email này' });

    const existing = await prisma.clubMember.findFirst({
      where: { clubId, userId: userToAdd.id }
    });
    if (existing) {
      if (existing.status === 'APPROVED') {
        return res.status(400).json({ message: 'Người dùng đã là thành viên của CLB này' });
      }
      const updated = await prisma.clubMember.update({
        where: { id: existing.id },
        data: { status: 'APPROVED', role: memberRole || 'MEMBER' }
      });
      return res.json(updated);
    }

    const newMember = await prisma.clubMember.create({
      data: {
        clubId,
        userId: userToAdd.id,
        role: memberRole || 'MEMBER',
        status: 'APPROVED'
      }
    });
    res.status(201).json(newMember);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;

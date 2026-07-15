import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all approved events
router.get('/', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: 'APPROVED' },
      include: {
        club: { select: { name: true, logoUrl: true } }
      },
      orderBy: { eventDate: 'asc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Get ALL events (all statuses) -- MUST be before /:id
router.get('/all', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const events = await prisma.event.findMany({
      include: {
        club: { select: { name: true, logoUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Get pending events -- MUST be before /:id
router.get('/pending', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const events = await prisma.event.findMany({
      where: { status: 'PENDING' },
      include: { club: { select: { name: true } } }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get clubs the user leads (for event creation dropdown) -- MUST be before /:id
router.get('/my-clubs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const memberships = await prisma.clubMember.findMany({
      where: { userId, role: 'LEADER' },
      include: { club: true }
    });
    res.json(memberships.map(m => m.club));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get draft events for a club (for Leader)
router.get('/drafts/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.userId;

    const isLeader = await prisma.clubMember.findFirst({
      where: { clubId, userId, role: 'LEADER' }
    });
    if (!isLeader && req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const drafts = await prisma.event.findMany({
      where: { clubId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get ALL events for a club (for Management)
router.get('/club/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.userId;

    const isLeader = await prisma.clubMember.findFirst({
      where: { clubId, userId, role: 'LEADER' }
    });
    if (!isLeader && req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const events = await prisma.event.findMany({
      where: { clubId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Approve/Reject event -- MUST be before /:id/register
router.put('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { status } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status }
    });

    if (status === 'APPROVED') {
      try {
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const eventClub = await prisma.club.findUnique({ where: { id: event.clubId } });
        const notificationsData = allUsers.map(u => ({
          userId: u.id,
          title: 'Sự kiện mới sắp diễn ra!',
          message: `CLB "${eventClub?.name || ''}" vừa đăng tải sự kiện mới: "${event.title}" diễn ra vào ngày ${new Date(event.eventDate).toLocaleDateString('vi-VN')}. Đăng ký tham gia ngay!`
        }));
        await prisma.notification.createMany({
          data: notificationsData
        });
      } catch (err) {
        console.error("Error creating notifications for approved event:", err);
      }
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Create event (only for LEADERS or ADMINS)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, title, description, location, eventDate, isDraft, latitude, longitude, maxCapacity } = req.body;
    const imageUrl = req.body.imageUrl || req.body.image;
    const { userId, role } = req.user!;

    if (role !== 'ADMIN' && role !== 'LEADER') {
      return res.status(403).json({ message: 'Bạn không có quyền tạo sự kiện' });
    }

    const event = await prisma.event.create({
      data: {
        clubId,
        title,
        description,
        location,
        eventDate: new Date(eventDate),
        imageUrl,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        status: role === 'ADMIN' ? 'APPROVED' : (isDraft ? 'DRAFT' : 'PENDING')
      }
    });

    if (event.status === 'APPROVED') {
      try {
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const eventClub = await prisma.club.findUnique({ where: { id: event.clubId } });
        const notificationsData = allUsers.map(u => ({
          userId: u.id,
          title: 'Sự kiện mới sắp diễn ra!',
          message: `CLB "${eventClub?.name || ''}" vừa đăng tải sự kiện mới: "${event.title}" diễn ra vào ngày ${new Date(event.eventDate).toLocaleDateString('vi-VN')}. Đăng ký tham gia ngay!`
        }));
        await prisma.notification.createMany({
          data: notificationsData
        });
      } catch (err) {
        console.error("Error creating notifications for newly created approved event:", err);
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Lỗi tạo sự kiện:', error);
    res.status(500).json({ message: 'Lỗi server khi tạo sự kiện' });
  }
});

// Update event (for Leader)
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { title, description, location, eventDate, isDraft, status, latitude, longitude, maxCapacity } = req.body;
    const imageUrl = req.body.imageUrl || req.body.image;
    const { userId, role } = req.user!;
    
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện' });

    if (role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title,
        description,
        location,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        imageUrl,
        latitude: latitude !== undefined ? (latitude ? parseFloat(latitude) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(longitude) : null) : undefined,
        maxCapacity: maxCapacity !== undefined ? (maxCapacity ? parseInt(maxCapacity) : null) : undefined,
        status: status || (role === 'ADMIN' ? 'APPROVED' : (isDraft ? 'DRAFT' : 'PENDING'))
      }
    });

    if (updated.status === 'APPROVED' && event.status !== 'APPROVED') {
      try {
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const eventClub = await prisma.club.findUnique({ where: { id: updated.clubId } });
        const notificationsData = allUsers.map(u => ({
          userId: u.id,
          title: 'Sự kiện mới sắp diễn ra!',
          message: `CLB "${eventClub?.name || ''}" vừa đăng tải sự kiện mới: "${updated.title}" diễn ra vào ngày ${new Date(updated.eventDate).toLocaleDateString('vi-VN')}. Đăng ký tham gia ngay!`
        }));
        await prisma.notification.createMany({
          data: notificationsData
        });
      } catch (err) {
        console.error("Error creating notifications for event transition to approved:", err);
      }
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Student: Register for event
router.post('/:id/register', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existing = await prisma.eventRegistration.findFirst({ where: { eventId, userId } });
    if (existing) {
      if (existing.status === 'PENDING') {
        return res.status(400).json({ message: 'Yêu cầu của bạn đang chờ duyệt' });
      }
      return res.status(400).json({ message: 'Bạn đã đăng ký sự kiện này rồi' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { club: true }
    });

    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });

    const userObj = await prisma.user.findUnique({
      where: { id: userId }
    });

    const registration = await prisma.eventRegistration.create({
      data: { eventId, userId, status: 'PENDING' }
    });

    // Create notifications for Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    const leaders = await prisma.clubMember.findMany({
      where: { clubId: event.clubId, role: 'LEADER', status: 'APPROVED' }
    });

    const notifyUserIds = new Set<string>();
    admins.forEach(a => notifyUserIds.add(a.id));
    leaders.forEach(l => notifyUserIds.add(l.userId));
    if (event.club?.founderId) {
      notifyUserIds.add(event.club.founderId);
    }

    // Exclude the registering user
    notifyUserIds.delete(userId);

    for (const targetUserId of notifyUserIds) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'Yêu cầu tham gia sự kiện mới',
          message: `Sinh viên ${userObj?.name || 'Thành viên'} (${userObj?.studentId || 'Chưa có MSSV'}) đã đăng ký tham gia sự kiện "${event.title}" của CLB "${event.club?.name}". Vui lòng phê duyệt.`
        }
      });
    }

    res.status(201).json({
      message: 'Yêu cầu của bạn đang chờ duyệt',
      registration
    });
  } catch (error) {
    console.error("Lỗi đăng ký sự kiện:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get event registrations (for Leader/Admin)
router.get('/:id/registrations', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, studentId: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Update registration status (Approve/Reject)
router.put('/:eventId/registrations/:registrationId/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });

    if (role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
    }

    const updated = await prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { status }
    });

    res.json({ message: 'Cập nhật trạng thái thành công', registration: updated });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đăng ký:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// DELETE /api/events/:id (Admin or Leader)
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.user!;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ message: 'Không tìm thấy sự kiện' });

    if (role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Bạn không có quyền xóa sự kiện này' });
    }

    await prisma.event.delete({
      where: { id }
    });

    res.json({ message: 'Xóa sự kiện thành công' });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: 'Lỗi server khi xóa sự kiện' });
  }
});

export default router;

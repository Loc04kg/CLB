import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all approved clubs
router.get('/', async (req, res) => {
  try {
    const clubs = await prisma.club.findMany({
      where: { status: 'APPROVED' },
      include: {
        _count: {
          select: { members: { where: { status: 'APPROVED' } } }
        }
      }
    });
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get clubs the current user has joined (APPROVED members only)
router.get('/my-clubs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const memberships = await prisma.clubMember.findMany({
      where: { userId, status: 'APPROVED' },
      include: { 
        club: {
          include: {
            events: { where: { status: 'APPROVED' }, orderBy: { eventDate: 'asc' } },
            _count: { select: { members: { where: { status: 'APPROVED' } } } }
          }
        }
      }
    });
    res.json(memberships.map(m => ({ ...m.club, memberRole: m.role })));
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Get ALL clubs (all statuses) -- MUST be before /:id routes
router.get('/all', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [clubs, total] = await Promise.all([
      prisma.club.findMany({
        include: {
          founder: { select: { id: true, name: true, email: true, studentId: true } },
          _count: { select: { members: { where: { status: 'APPROVED' } } } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.club.count()
    ]);

    res.json({
      data: clubs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
});

// ADMIN: Get pending clubs -- MUST be before /:id routes
router.get('/pending', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const clubs = await prisma.club.findMany({
      where: { status: 'PENDING' },
      include: { founder: { select: { id: true, name: true, email: true } } }
    });
    res.json(clubs);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Get ALL users
router.get('/admin/users', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, studentId: true, role: true, createdAt: true }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Approve/Reject club -- MUST be before /:id
router.put('/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { status } = req.body;
    
    const club = await prisma.club.update({
      where: { id: req.params.id },
      data: { status }
    });

    // If APPROVED, make founder a LEADER member & update their role
    if (status === 'APPROVED') {
      if (club.founderId) {
        const existingMember = await prisma.clubMember.findFirst({
          where: { clubId: club.id, userId: club.founderId }
        });
        if (!existingMember) {
          await prisma.clubMember.create({
            data: { clubId: club.id, userId: club.founderId, role: 'LEADER', status: 'APPROVED' }
          });
        } else {
          await prisma.clubMember.update({
            where: { id: existingMember.id },
            data: { role: 'LEADER', status: 'APPROVED' }
          });
        }
        await prisma.user.update({
          where: { id: club.founderId },
          data: { role: 'LEADER' }
        });
      }

      // Notify all users about the new club
      try {
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const notificationsData = allUsers.map(u => ({
          userId: u.id,
          title: 'Câu lạc bộ mới được thành lập!',
          message: `Câu lạc bộ "${club.name}" thuộc thể loại ${club.category} đã chính thức đi vào hoạt động. Hãy tham gia ngay!`
        }));
        await prisma.notification.createMany({
          data: notificationsData
        });
      } catch (err) {
        console.error("Error creating notifications for new club approval:", err);
      }
    }

    res.json(club);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// LEADER: Get pending member requests for their club
router.get('/:id/pending-members', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user?.userId;

    const isLeader = await prisma.clubMember.findFirst({
      where: { clubId, userId, role: 'LEADER', status: 'APPROVED' }
    });
    if (!isLeader && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Bạn không phải chủ nhiệm CLB này' });
    }

    const pendingMembers = await prisma.clubMember.findMany({
      where: { clubId, status: 'PENDING' },
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true, 
            studentId: true,
            className: true,
            phone: true,
            address: true,
            dateOfBirth: true
          } 
        } 
      }
    });
    res.json(pendingMembers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// LEADER: Approve/Reject member request
router.put('/:clubId/members/:memberId/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, memberId } = req.params;
    const { status } = req.body;
    const userId = req.user?.userId;

    const isLeader = await prisma.clubMember.findFirst({
      where: { clubId, userId, role: 'LEADER', status: 'APPROVED' }
    });
    if (!isLeader && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await prisma.clubMember.update({
      where: { id: memberId },
      data: { status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Create a new club (requires login)
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name, description, logoUrl, category, founderId } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const actualFounderId = role === 'ADMIN' ? (founderId || userId) : userId;
    const actualStatus = role === 'ADMIN' ? 'APPROVED' : 'PENDING';

    const club = await prisma.club.create({
      data: { name, description, logoUrl, category, founderId: actualFounderId, status: actualStatus }
    });

    if (actualStatus === 'APPROVED' && actualFounderId) {
      await prisma.clubMember.create({
        data: { clubId: club.id, userId: actualFounderId, role: 'LEADER', status: 'APPROVED' }
      });
      const userObj = await prisma.user.findUnique({ where: { id: actualFounderId } });
      if (userObj && (userObj.role === 'STUDENT' || userObj.role === 'MEMBER')) {
        await prisma.user.update({
          where: { id: actualFounderId },
          data: { role: 'LEADER' }
        });
      }

      // Notify all users about the new club
      try {
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        const notificationsData = allUsers.map(u => ({
          userId: u.id,
          title: 'Câu lạc bộ mới được thành lập!',
          message: `Câu lạc bộ "${club.name}" thuộc thể loại ${club.category} đã chính thức đi vào hoạt động. Hãy tham gia ngay!`
        }));
        await prisma.notification.createMany({
          data: notificationsData
        });
      } catch (err) {
        console.error("Error creating notifications for new club creation:", err);
      }
    }

    res.status(201).json(club);
  } catch (error) {
    console.error("Create club error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Update club info (Only founder/Admin)
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description, logoUrl, coverUrl, facebookUrl, zaloUrl, category, founderId, status } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) return res.status(404).json({ message: 'Không tìm thấy CLB' });

    if (club.founderId !== userId && role !== 'ADMIN') {
      return res.status(403).json({ message: 'Bạn không có quyền sửa CLB này' });
    }

    const dataToUpdate: any = { name, description, logoUrl, coverUrl, facebookUrl, zaloUrl, category };

    if (role === 'ADMIN') {
      if (founderId) {
        dataToUpdate.founderId = founderId;
        const existingMember = await prisma.clubMember.findFirst({
          where: { clubId: id, userId: founderId }
        });
        if (!existingMember) {
          await prisma.clubMember.create({
            data: { clubId: id, userId: founderId, role: 'LEADER', status: 'APPROVED' }
          });
        } else {
          await prisma.clubMember.update({
            where: { id: existingMember.id },
            data: { role: 'LEADER', status: 'APPROVED' }
          });
        }
        await prisma.user.update({
          where: { id: founderId },
          data: { role: 'LEADER' }
        });
      }
      if (status) {
        dataToUpdate.status = status;
      }
    } else {
      dataToUpdate.status = 'PENDING';
    }

    const updated = await prisma.club.update({
      where: { id },
      data: dataToUpdate
    });

    res.json({ message: 'Cập nhật thành công!', club: updated });
  } catch (error) {
    console.error("Update club error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Request to join a club - status = PENDING
router.post('/:id/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clubId = req.params.id;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const existingMember = await prisma.clubMember.findFirst({ where: { clubId, userId } });

    if (existingMember) {
      if (existingMember.status === 'PENDING') {
        return res.status(400).json({ message: 'Yêu cầu của bạn đang chờ duyệt' });
      }
      return res.status(400).json({ message: 'Bạn đã là thành viên của CLB này' });
    }

    const { fullName, studentId, className, address, phone, dateOfBirth } = req.body;

    const membership = await prisma.clubMember.create({
      data: { 
        clubId, 
        userId, 
        role: 'MEMBER', 
        status: 'PENDING',
        fullName,
        studentId,
        className,
        address,
        phone,
        dateOfBirth
      }
    });

    res.status(201).json({ message: 'Đã gửi yêu cầu tham gia! Chờ chủ CLB duyệt.', membership });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// LEADER: Request leadership transfer
router.post('/:id/transfer-leadership', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const clubId = req.params.id;
    const { toUserId } = req.body;
    const fromUserId = req.user?.userId;

    if (!fromUserId) return res.status(401).json({ message: 'Unauthorized' });

    const isLeader = await prisma.clubMember.findFirst({
      where: { clubId, userId: fromUserId, role: 'LEADER', status: 'APPROVED' }
    });
    if (!isLeader && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Chỉ chủ nhiệm mới có thể yêu cầu chuyển quyền' });
    }

    // Check if target user is an approved member of the club
    const targetMember = await prisma.clubMember.findFirst({
      where: { clubId, userId: toUserId, status: 'APPROVED' }
    });
    if (!targetMember) {
      return res.status(400).json({ message: 'Người được chuyển quyền phải là thành viên chính thức của CLB' });
    }

    const transferRequest = await prisma.leadershipTransferRequest.create({
      data: { clubId, fromUserId, toUserId, status: 'PENDING' }
    });

    res.status(201).json({ message: 'Yêu cầu chuyển quyền đã được gửi! Chờ Admin duyệt.', transferRequest });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Get all pending leadership transfers
router.get('/admin/transfers/pending', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const transfers = await prisma.leadershipTransferRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        club: { select: { name: true } },
        fromUser: { select: { name: true, studentId: true } },
        toUser: { select: { name: true, studentId: true } }
      }
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Approve/Reject leadership transfer
router.put('/admin/transfers/:id/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;
    const { status } = req.body;

    const request = await prisma.leadershipTransferRequest.findUnique({
      where: { id },
      include: { club: true }
    });

    if (!request) return res.status(404).json({ message: 'Không tìm thấy yêu cầu' });

    if (status === 'APPROVED') {
      // 1. Change old leader to member
      await prisma.clubMember.updateMany({
        where: { clubId: request.clubId, userId: request.fromUserId },
        data: { role: 'MEMBER' }
      });

      // 2. Change new leader to leader
      await prisma.clubMember.updateMany({
        where: { clubId: request.clubId, userId: request.toUserId },
        data: { role: 'LEADER' }
      });

      // 3. Update global role for new leader
      await prisma.user.update({
        where: { id: request.toUserId },
        data: { role: 'LEADER' }
      });

      // 4. Check if old leader is still leader of any other club
      const otherLeaderRoles = await prisma.clubMember.findFirst({
        where: { userId: request.fromUserId, role: 'LEADER', NOT: { clubId: request.clubId } }
      });
      if (!otherLeaderRoles) {
        await prisma.user.update({
          where: { id: request.fromUserId },
          data: { role: 'STUDENT' }
        });
      }
    }

    const updatedRequest = await prisma.leadershipTransferRequest.update({
      where: { id },
      data: { status }
    });

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ADMIN: Delete a club
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
    const { id } = req.params;

    await prisma.club.delete({
      where: { id }
    });

    res.json({ message: 'Xóa câu lạc bộ thành công' });
  } catch (error) {
    console.error("Delete club error:", error);
    res.status(500).json({ message: 'Lỗi server khi xóa câu lạc bộ' });
  }
});

export default router;

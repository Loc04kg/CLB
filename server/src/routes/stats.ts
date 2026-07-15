import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.userId;

    if (role === 'ADMIN') {
      const [totalClubs, pendingClubs, totalUsers, pendingEvents] = await Promise.all([
        prisma.club.count(),
        prisma.club.count({ where: { status: 'PENDING' } }),
        prisma.user.count(),
        prisma.event.count({ where: { status: 'PENDING' } })
      ]);

      res.json({
        stats: [
          { label: 'Tổng CLB', value: totalClubs, color: 'blue' },
          { label: 'CLB chờ duyệt', value: pendingClubs, color: 'orange' },
          { label: 'Tổng thành viên', value: totalUsers, color: 'green' },
          { label: 'Sự kiện chờ duyệt', value: pendingEvents, color: 'purple' }
        ],
        chartData: [
          { name: 'Tháng 1', value: 40 },
          { name: 'Tháng 2', value: 50 },
          { name: 'Tháng 3', value: 80 },
          { name: 'Tháng 4', value: 120 },
          { name: 'Tháng 5', value: Math.floor(totalUsers / 2) },
          { name: 'Tháng 6', value: totalUsers }
        ]
      });
    } else {
      // Student / Leader stats
      const [joinedClubs, upcomingEvents, attendanceCount] = await Promise.all([
        prisma.clubMember.count({ where: { userId, status: 'APPROVED' } }),
        prisma.eventRegistration.count({ where: { userId, status: 'APPROVED' } }),
        prisma.attendance.count({ where: { userId, isValid: true } })
      ]);

      res.json({
        stats: [
          { label: 'CLB đã tham gia', value: joinedClubs, color: 'blue' },
          { label: 'Sự kiện tham gia', value: upcomingEvents, color: 'orange' },
          { label: 'Lần điểm danh', value: attendanceCount, color: 'green' },
          { label: 'Điểm rèn luyện', value: upcomingEvents * 2, color: 'purple' }
        ],
        chartData: [
          { name: 'T1', value: 1 },
          { name: 'T2', value: 2 },
          { name: 'T3', value: 3 },
          { name: 'T4', value: joinedClubs },
          { name: 'T5', value: upcomingEvents },
          { name: 'T6', value: attendanceCount }
        ]
      });
    }
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;

import { Router } from 'express';
import { AttendanceMethod } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── Haversine formula (metres) ────────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── POST /attendance — FaceID / QR Code self check-in (Student on own device) ──
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, method, faceImage, checkInDescriptor, latitude, longitude } = req.body;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Bảo mật: Tự điểm danh chỉ được dùng FACEID hoặc QR_CODE
    if (method !== 'FACEID' && method !== 'QR_CODE') {
      return res.status(400).json({ message: 'Phương thức điểm danh không hợp lệ cho tự phục vụ' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId }, include: { club: true } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    if (event.status !== 'APPROVED') return res.status(400).json({ message: 'Sự kiện chưa được duyệt' });

    const membership = await prisma.clubMember.findFirst({
      where: { clubId: event.clubId, userId, status: 'APPROVED' }
    });
    if (!membership && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Bạn chưa là thành viên của CLB này. Không thể điểm danh!' });
    }

    // Bảo mật: Định vị Geofencing cho tự phục vụ (nếu sự kiện có cấu hình toạ độ)
    const MAX_DISTANCE_METRES = 100;
    if (event.latitude != null && event.longitude != null) {
      if (latitude == null || longitude == null) {
        return res.status(400).json({ message: 'Sự kiện này yêu cầu bật định vị GPS để điểm danh' });
      }
      const dist = haversineDistance(latitude, longitude, event.latitude, event.longitude);
      if (dist > MAX_DISTANCE_METRES) {
        return res.status(400).json({
          message: `Bạn đang cách khu vực tổ chức ${Math.round(dist)}m. Vui lòng đến gần hơn (trong vòng ${MAX_DISTANCE_METRES}m) để điểm danh.`
        });
      }
    }

    // AI Face Verification
    if (method === 'FACEID') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.faceDescriptor) {
        return res.status(400).json({ message: 'Bạn chưa đăng ký khuôn mặt trên hệ thống' });
      }
      if (!checkInDescriptor) {
        return res.status(400).json({ message: 'Không nhận diện được khuôn mặt từ ảnh chụp' });
      }
      try {
        const savedDesc = JSON.parse(user.faceDescriptor);
        const checkInDesc = JSON.parse(checkInDescriptor);
        if (savedDesc.length !== 128 || checkInDesc.length !== 128) {
          return res.status(400).json({ message: 'Dữ liệu khuôn mặt không hợp lệ' });
        }
        let distance = 0;
        for (let i = 0; i < 128; i++) distance += (savedDesc[i] - checkInDesc[i]) ** 2;
        distance = Math.sqrt(distance);
        if (distance >= 0.40) {
          return res.status(403).json({ message: `Khuôn mặt không khớp (Sai số: ${distance.toFixed(2)}). Điểm danh thất bại!` });
        }
      } catch {
        return res.status(400).json({ message: 'Lỗi xử lý dữ liệu khuôn mặt' });
      }
    }

    const existing = await prisma.attendance.findFirst({ where: { eventId, userId } });
    if (existing) return res.status(400).json({ message: 'Bạn đã điểm danh cho sự kiện này rồi' });

    const record = await prisma.attendance.create({
      data: {
        eventId,
        userId,
        method: method as any,
        snapshotImage: method === 'FACEID' ? faceImage : null,
        isValid: true,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ─── POST /attendance/gps-checkin — GPS Geofencing check-in/out ─────────────
router.post('/gps-checkin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, type, latitude, longitude } = req.body; // type: 'IN' | 'OUT'
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'Không lấy được vị trí GPS' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });
    if (event.status !== 'APPROVED') return res.status(400).json({ message: 'Sự kiện chưa được duyệt' });

    // Check geofence if event has GPS coordinates
    const MAX_DISTANCE_METRES = 100;
    if (event.latitude != null && event.longitude != null) {
      const dist = haversineDistance(latitude, longitude, event.latitude, event.longitude);
      if (dist > MAX_DISTANCE_METRES) {
        return res.status(400).json({
          message: `Bạn đang cách khu vực tổ chức ${Math.round(dist)}m. Vui lòng đến gần hơn (trong vòng ${MAX_DISTANCE_METRES}m) để điểm danh.`
        });
      }
    }

    const existing = await prisma.attendance.findFirst({ where: { eventId, userId } });

    if (type === 'IN') {
      if (existing) return res.status(400).json({ message: 'Bạn đã check-in rồi' });

      const membership = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId, status: 'APPROVED' }
      });
      if (!membership && req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Bạn chưa là thành viên của CLB này' });
      }

      const record = await prisma.attendance.create({
        data: { eventId, userId, method: 'MANUAL', latitude, longitude, isValid: true }
      });
      return res.status(201).json({ message: 'Check-in GPS thành công!', record });
    }

    // type === 'OUT'
    if (!existing) return res.status(400).json({ message: 'Bạn chưa check-in' });
    if (existing.checkoutTime) return res.status(400).json({ message: 'Bạn đã check-out rồi' });

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkoutTime: new Date() }
    });
    return res.json({ message: 'Check-out GPS thành công!', record: updated });

  } catch (error) {
    console.error('GPS checkin error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ─── POST /attendance/kiosk-checkin — Kiosk auto check-in (face match done client-side) ──
router.post('/kiosk-checkin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId, userId: targetUserId, faceImage } = req.body;
    const requesterId = req.user?.userId;
    const requesterRole = req.user?.role;

    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    // Only LEADER or ADMIN can submit kiosk check-ins
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });

    if (requesterRole !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId: requesterId, role: 'LEADER', status: 'APPROVED' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Chỉ Leader hoặc Admin mới có thể dùng Kiosk' });
    }

    const existing = await prisma.attendance.findFirst({ where: { eventId, userId: targetUserId } });
    if (existing) return res.status(400).json({ message: 'Sinh viên này đã điểm danh rồi', alreadyCheckedIn: true });

    const record = await prisma.attendance.create({
      data: {
        eventId,
        userId: targetUserId,
        method: 'FACEID',
        snapshotImage: faceImage || null,
        isValid: true,
      }
    });
    const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true, studentId: true } });
    res.status(201).json({ message: 'Check-in thành công!', record, user });
  } catch (error) {
    console.error('Kiosk checkin error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ─── GET /attendance/event/:eventId/descriptors — Load face descriptors for Kiosk ─
router.get('/event/:eventId/descriptors', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params;
    const requesterId = req.user?.userId;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });

    if (req.user?.role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId: requesterId, role: 'LEADER', status: 'APPROVED' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Forbidden' });
    }

    // Get all APPROVED registrations for this event
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId, status: 'APPROVED' },
      include: {
        user: { select: { id: true, name: true, studentId: true, faceDescriptor: true } }
      }
    });

    const result = registrations
      .filter(r => r.user.faceDescriptor)
      .map(r => ({
        userId: r.user.id,
        name: r.user.name,
        studentId: r.user.studentId,
        faceDescriptor: r.user.faceDescriptor,
      }));

    res.json(result);
  } catch (error) {
    console.error('Descriptors fetch error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ─── GET /attendance/my — Student's own attendance history ──────────────────
router.get('/my', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const history = await prisma.attendance.findMany({
      where: { userId },
      include: {
        event: { include: { club: { select: { name: true } } } }
      },
      orderBy: { checkinTime: 'desc' }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ─── GET /attendance/event/:eventId — Attendees for an event (Leader/Admin) ─
router.get('/event/:eventId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const event = await prisma.event.findUnique({ where: { id: eventId }, include: { club: true } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });

    if (req.user?.role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Bạn không có quyền xem danh sách điểm danh' });
    }

    const attendances = await prisma.attendance.findMany({
      where: { eventId },
      include: { user: { select: { id: true, studentId: true, name: true } } },
      orderBy: { checkinTime: 'asc' }
    });

    res.json(attendances);
  } catch (error) {
    console.error('Get event attendances error:', error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ─── POST /attendance/event/:eventId/manual-checkin — Leader manual check-in ─
router.post('/event/:eventId/manual-checkin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { eventId } = req.params;
    const { userIds } = req.body;
    const requesterId = req.user?.userId;
    if (!requesterId) return res.status(401).json({ message: 'Unauthorized' });

    const event = await prisma.event.findUnique({ where: { id: eventId }, include: { club: true } });
    if (!event) return res.status(404).json({ message: 'Sự kiện không tồn tại' });

    if (req.user?.role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: { clubId: event.clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!membership) return res.status(403).json({ message: 'Forbidden' });
    }

    const newAttendances = [];
    for (const uId of userIds) {
      const existing = await prisma.attendance.findFirst({ where: { eventId, userId: uId } });
      if (!existing) {
        newAttendances.push({ eventId, userId: uId, method: AttendanceMethod.MANUAL, isValid: true });
      }
    }

    if (newAttendances.length > 0) {
      await prisma.attendance.createMany({ data: newAttendances });
    }

    res.json({ message: `Đã điểm danh thành công ${newAttendances.length} người` });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;

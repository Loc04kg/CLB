import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Lấy danh sách tasks của CLB
router.get('/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.userId;

    const membership = await prisma.clubMember.findFirst({
      where: { clubId, userId, status: 'APPROVED' }
    });
    if (!membership && req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const tasks = await prisma.task.findMany({
      where: { clubId },
      include: {
        assignee: { select: { id: true, name: true, faceImage: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Tạo task mới (Chỉ Leader)
router.post('/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const { title, description, assigneeId, deadline } = req.body;
    const requesterId = req.user?.userId;

    if (req.user?.role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Chỉ ban chủ nhiệm mới có quyền tạo task' });
    }

    const task = await prisma.task.create({
      data: {
        clubId,
        title,
        description,
        assigneeId: assigneeId || null,
        deadline: deadline ? new Date(deadline) : null
      },
      include: {
        assignee: { select: { id: true, name: true, faceImage: true } }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Cập nhật trạng thái task (Assignee hoặc Leader)
router.put('/:clubId/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, id } = req.params;
    const { status, title, description, assigneeId, deadline } = req.body;
    const requesterId = req.user?.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Cho phép người được gán hoặc Leader sửa
    let canEdit = false;
    if (req.user?.role === 'ADMIN' || task.assigneeId === requesterId) {
       canEdit = true;
    } else {
       const isLeader = await prisma.clubMember.findFirst({
         where: { clubId, userId: requesterId, role: 'LEADER' }
       });
       if (isLeader) canEdit = true;
    }

    if (!canEdit) return res.status(403).json({ message: 'Forbidden' });

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = assigneeId;
    if (deadline !== undefined) dataToUpdate.deadline = deadline ? new Date(deadline) : null;

    const updated = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignee: { select: { id: true, name: true, faceImage: true } }
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xóa task (Chỉ Leader)
router.delete('/:clubId/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, id } = req.params;
    const requesterId = req.user?.userId;

    if (req.user?.role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Đã xóa task' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;

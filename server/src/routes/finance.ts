import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Lấy danh sách giao dịch tài chính của CLB
router.get('/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.userId;

    const membership = await prisma.clubMember.findFirst({
      where: { clubId, userId, status: 'APPROVED' }
    });
    if (!membership && req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });

    const transactions = await prisma.fundTransaction.findMany({
      where: { clubId },
      include: {
        member: { select: { id: true, name: true, studentId: true } }
      },
      orderBy: { date: 'desc' }
    });
    
    // Tính toán số dư
    let balance = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    
    transactions.forEach(t => {
      if (t.type === 'INCOME') {
        balance += t.amount;
        totalIncome += t.amount;
      } else {
        balance -= t.amount;
        totalExpense += t.amount;
      }
    });

    res.json({ balance, totalIncome, totalExpense, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Thêm giao dịch (Chỉ Leader/Admin)
router.post('/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId } = req.params;
    const { amount, type, description, memberId, date } = req.body;
    const requesterId = req.user?.userId;

    if (req.user?.role !== 'ADMIN') {
      const isLeader = await prisma.clubMember.findFirst({
        where: { clubId, userId: requesterId, role: 'LEADER' }
      });
      if (!isLeader) return res.status(403).json({ message: 'Chỉ ban chủ nhiệm mới có quyền thêm giao dịch' });
    }

    const tx = await prisma.fundTransaction.create({
      data: {
        clubId,
        amount: Number(amount),
        type,
        description,
        memberId: memberId || null,
        date: date ? new Date(date) : new Date()
      }
    });

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Xóa giao dịch
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

    await prisma.fundTransaction.delete({ where: { id } });
    res.json({ message: 'Đã xóa giao dịch' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;

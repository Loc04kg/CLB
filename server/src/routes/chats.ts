import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get chats (for Student: their own chat; for Admin: list of all student chats)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId, role } = req.user!;
    const { clubId } = req.query; // optional filter by clubId

    if (role === 'ADMIN' && !clubId) {
      // Return a list of all chats: find all messages
      const messages = await prisma.chatMessage.findMany({
        orderBy: { createdAt: 'desc' }
      });

      // Group by the student's ID (the sender for outgoing student messages, or receiver for incoming admin messages)
      const uniqueChatsMap = new Map();
      for (const msg of messages) {
        const studentId = msg.isFromAdmin ? msg.receiverId : msg.senderId;
        if (!studentId) continue;
        
        if (!uniqueChatsMap.has(studentId)) {
          uniqueChatsMap.set(studentId, msg);
        } else {
          // Keep the latest message
          const existing = uniqueChatsMap.get(studentId);
          if (new Date(msg.createdAt) > new Date(existing.createdAt)) {
            uniqueChatsMap.set(studentId, msg);
          }
        }
      }

      const chatList = [];
      for (const [studentId, lastMessage] of uniqueChatsMap.entries()) {
        let studentName = 'Sinh viên';
        if (!lastMessage.isFromAdmin) {
          studentName = lastMessage.senderName;
        } else {
          // Fetch student name from database
          const studentObj = await prisma.user.findUnique({
            where: { id: studentId },
            select: { name: true }
          });
          if (studentObj) {
            studentName = studentObj.name;
          }
        }

        chatList.push({
          studentId,
          studentName,
          lastMessage: lastMessage.message,
          isAI: lastMessage.isAI,
          createdAt: lastMessage.createdAt
        });
      }

      // Sort chat list by latest message
      chatList.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.json(chatList);
    } else {
      // Student/Leader: get all their messages (where senderId = userId OR receiverId = userId)
      let whereCondition: any = {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      };

      if (clubId === 'admin_ai') {
        whereCondition.clubId = null;
      } else if (clubId && typeof clubId === 'string') {
        whereCondition.clubId = clubId;
      }

      const messages = await prisma.chatMessage.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'asc' }
      });
      return res.json(messages);
    }
  } catch (error) {
    console.error("Lỗi lấy danh sách chat:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get all chats sent to a specific club (for Club Leaders/Managers)
router.get('/club/:clubId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const targetClubId = req.params.clubId;

    // Verify that the user is a manager (Leader/Member) of the club
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: targetClubId,
        userId: userId,
        status: 'APPROVED'
      }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý câu lạc bộ này' });
    }

    // Find all messages for this club
    const messages = await prisma.chatMessage.findMany({
      where: { clubId: targetClubId },
      orderBy: { createdAt: 'desc' }
    });

    // Group by the student's ID (which is senderId for student messages, or receiverId for manager replies)
    const uniqueChatsMap = new Map();
    for (const msg of messages) {
      const studentId = msg.isFromClubManager ? msg.receiverId : msg.senderId;
      if (!studentId) continue;

      if (!uniqueChatsMap.has(studentId)) {
        uniqueChatsMap.set(studentId, msg);
      } else {
        const existing = uniqueChatsMap.get(studentId);
        if (new Date(msg.createdAt) > new Date(existing.createdAt)) {
          uniqueChatsMap.set(studentId, msg);
        }
      }
    }

    const chatList = [];
    for (const [studentId, lastMessage] of uniqueChatsMap.entries()) {
      let studentName = 'Sinh viên';
      if (!lastMessage.isFromClubManager) {
        studentName = lastMessage.senderName;
      } else {
        const studentObj = await prisma.user.findUnique({
          where: { id: studentId },
          select: { name: true }
        });
        if (studentObj) {
          studentName = studentObj.name;
        }
      }

      chatList.push({
        studentId,
        studentName,
        lastMessage: lastMessage.message,
        isAI: lastMessage.isAI,
        createdAt: lastMessage.createdAt
      });
    }

    chatList.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(chatList);
  } catch (error) {
    console.error("Lỗi lấy danh sách chat CLB:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get chat history for a specific student in a club (Club Leader only)
router.get('/club/:clubId/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId } = req.user!;
    const { clubId, userId: targetUserId } = req.params;

    // Verify membership
    const membership = await prisma.clubMember.findFirst({
      where: {
        clubId: clubId,
        userId: userId,
        status: 'APPROVED'
      }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý câu lạc bộ này' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        clubId: clubId,
        OR: [
          { senderId: targetUserId },
          { receiverId: targetUserId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error("Lỗi lấy lịch sử chat CLB của user:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Get chat history for a specific student (Admin only)
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { role } = req.user!;
    if (role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const targetUserId = req.params.userId;
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: targetUserId },
          { receiverId: targetUserId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error("Lỗi lấy lịch sử chat:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// Send a message
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { userId, role } = req.user!;
    const { message, receiverId, isAI, clubId, clubName, isFromClubManager } = req.body;

    // Find sender name
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    const senderName = sender?.name || 'User';

    const isFromAdmin = role === 'ADMIN';

    const chatMsg = await prisma.chatMessage.create({
      data: {
        senderId: userId,
        senderName,
        receiverId: receiverId || null,
        clubId: clubId || null,
        clubName: clubName || null,
        message,
        isFromAdmin,
        isFromClubManager: !!isFromClubManager,
        isAI: !!isAI
      }
    });

    // Notify club leaders if a student sends a message to the club
    if (clubId && !isFromClubManager && !isFromAdmin && !isAI) {
      const leaders = await prisma.clubMember.findMany({
        where: {
          clubId: clubId,
          role: 'LEADER',
          status: 'APPROVED'
        }
      });
      
      if (leaders.length > 0) {
        const notifications = leaders.map(leader => ({
          userId: leader.userId,
          title: `Hỏi đáp CLB mới`,
          message: `Sinh viên ${senderName} vừa gửi yêu cầu hỗ trợ đến câu lạc bộ của bạn. Vui lòng kiểm tra mục Hỏi đáp CLB.`
        }));

        await prisma.notification.createMany({
          data: notifications
        });
      }
    }

    res.status(201).json(chatMsg);
  } catch (error) {
    console.error("Lỗi gửi tin nhắn:", error);
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;


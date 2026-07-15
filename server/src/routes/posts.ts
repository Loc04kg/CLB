import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET all posts (blog feed)
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        club: {
          select: { id: true, name: true, logoUrl: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            type: true
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(posts);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({ message: 'Lỗi server khi tải bài viết' });
  }
});

// GET posts for a specific club
router.get('/club/:clubId', async (req, res) => {
  try {
    const { clubId } = req.params;
    const posts = await prisma.post.findMany({
      where: { clubId },
      include: {
        club: {
          select: { id: true, name: true, logoUrl: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        reactions: {
          select: {
            id: true,
            userId: true,
            type: true
          }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(posts);
  } catch (error) {
    console.error("Get club posts error:", error);
    res.status(500).json({ message: 'Lỗi server khi tải bài viết của CLB' });
  }
});

// POST create a new post
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { clubId, title, content } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!clubId || !title || !content) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bài viết.' });
    }

    // Verify permission: User must be ADMIN or a LEADER of the target club
    if (role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: {
          clubId,
          userId,
          role: 'LEADER',
          status: 'APPROVED'
        }
      });
      if (!membership) {
        return res.status(403).json({ message: 'Bạn không có quyền đăng bài viết cho CLB này.' });
      }
    }

    const newPost = await prisma.post.create({
      data: {
        clubId,
        title,
        content
      },
      include: {
        club: {
          select: { id: true, name: true, logoUrl: true }
        }
      }
    });

    res.status(201).json(newPost);
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({ message: 'Lỗi server khi đăng bài viết' });
  }
});

// DELETE a post
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    }

    // Verify permission: User must be ADMIN or a LEADER of the club that owns the post
    if (role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: {
          clubId: post.clubId,
          userId,
          role: 'LEADER',
          status: 'APPROVED'
        }
      });
      if (!membership) {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bài viết này.' });
      }
    }

    await prisma.post.delete({
      where: { id }
    });

    res.json({ message: 'Xóa bài viết thành công.' });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({ message: 'Lỗi server khi xóa bài viết' });
  }
});

// PUT update a post
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    }

    // Verify permission: User must be ADMIN or a LEADER of the club that owns the post
    if (role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: {
          clubId: post.clubId,
          userId,
          role: 'LEADER',
          status: 'APPROVED'
        }
      });
      if (!membership) {
        return res.status(403).json({ message: 'Bạn không có quyền sửa bài viết này.' });
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title,
        content
      },
      include: {
        club: {
          select: { id: true, name: true, logoUrl: true }
        }
      }
    });

    res.json(updatedPost);
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({ message: 'Lỗi server khi sửa bài viết' });
  }
});

// GET comments for a post
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    res.json(comments);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: 'Lỗi server khi tải bình luận' });
  }
});

// POST add a comment to a post
router.post('/:postId/comments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Nội dung bình luận không được để trống.' });
    }

    const newComment = await prisma.comment.create({
      data: {
        postId,
        userId: userId!,
        content: content.trim()
      },
      include: {
        user: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ message: 'Lỗi server khi thêm bình luận' });
  }
});

// DELETE a comment
router.delete('/:postId/comments/:commentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận.' });
    }

    // Verify permission: User must be ADMIN, or the owner of the comment, or the LEADER of the club owning the post
    if (role !== 'ADMIN' && comment.userId !== userId) {
      // Fetch post to check club membership
      const post = await prisma.post.findUnique({
        where: { id: comment.postId }
      });
      if (post) {
        const membership = await prisma.clubMember.findFirst({
          where: {
            clubId: post.clubId,
            userId,
            role: 'LEADER',
            status: 'APPROVED'
          }
        });
        if (!membership) {
          return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
        }
      } else {
        return res.status(403).json({ message: 'Bạn không có quyền xóa bình luận này.' });
      }
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    res.json({ message: 'Xóa bình luận thành công.' });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: 'Lỗi server khi xóa bình luận' });
  }
});

// POST react to a post (toggle or update reaction)
router.post('/:postId/react', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { postId } = req.params;
    const { type } = req.body; // "LIKE", "HEART", "HAHA"
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Không thể nhận diện người dùng.' });
    }

    const validTypes = ['LIKE', 'HEART', 'HAHA'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ message: 'Kiểu cảm xúc không hợp lệ.' });
    }

    // Check if reaction already exists
    const existingReaction = await prisma.postReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId
        }
      }
    });

    if (existingReaction) {
      if (!type || existingReaction.type === type) {
        // Delete reaction (unlike/unreact)
        await prisma.postReaction.delete({
          where: {
            id: existingReaction.id
          }
        });
        return res.json({ message: 'Đã bỏ bày tỏ cảm xúc.', action: 'REMOVED' });
      } else {
        // Update reaction type
        const updatedReaction = await prisma.postReaction.update({
          where: {
            id: existingReaction.id
          },
          data: {
            type
          }
        });
        return res.json({ message: 'Đã cập nhật cảm xúc.', action: 'UPDATED', data: updatedReaction });
      }
    } else {
      // Create new reaction
      if (!type) {
        return res.status(400).json({ message: 'Kiểu cảm xúc là bắt buộc.' });
      }
      const newReaction = await prisma.postReaction.create({
        data: {
          postId,
          userId,
          type
        }
      });
      return res.status(201).json({ message: 'Đã bày tỏ cảm xúc.', action: 'CREATED', data: newReaction });
    }
  } catch (error) {
    console.error("React error:", error);
    res.status(500).json({ message: 'Lỗi server khi bày tỏ cảm xúc.' });
  }
});

// PUT pin/unpin a post
router.put('/:id/pin', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;

    const post = await prisma.post.findUnique({
      where: { id }
    });

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết.' });
    }

    // Verify permission: User must be ADMIN or a LEADER of the club that owns the post
    if (role !== 'ADMIN') {
      const membership = await prisma.clubMember.findFirst({
        where: {
          clubId: post.clubId,
          userId,
          role: 'LEADER',
          status: 'APPROVED'
        }
      });
      if (!membership) {
        return res.status(403).json({ message: 'Bạn không có quyền ghim bài viết này.' });
      }
    }

    // Toggle isPinned field
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        isPinned: !post.isPinned
      },
      include: {
        club: {
          select: { id: true, name: true, logoUrl: true }
        }
      }
    });

    res.json(updatedPost);
  } catch (error) {
    console.error("Pin post error:", error);
    res.status(500).json({ message: 'Lỗi server khi ghim bài viết' });
  }
});

export default router;

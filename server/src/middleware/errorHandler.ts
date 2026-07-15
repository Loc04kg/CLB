import { Request, Response, NextFunction } from 'express';

// Lỗi chung của ứng dụng
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error Handler]:', err);

  // Prisma Unique Constraint Error
  if (err.code === 'P2002') {
    return res.status(409).json({
      message: `Dữ liệu đã tồn tại hoặc bị trùng lặp. Vui lòng kiểm tra lại.`,
    });
  }

  // Lỗi validation Zod
  if (err.name === 'ZodError') {
    return res.status(400).json({
      message: 'Dữ liệu không hợp lệ',
      errors: err.errors,
    });
  }

  // Multer Error
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'Lỗi tải file',
      details: err.message,
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
}

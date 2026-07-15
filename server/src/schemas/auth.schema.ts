import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email không hợp lệ').endsWith('@hutech.edu.vn', 'Chỉ chấp nhận email sinh viên HUTECH (@hutech.edu.vn) hoặc admin'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự').max(50),
    name: z.string().min(2, 'Tên quá ngắn').max(100),
    studentId: z.string().min(5, 'Mã sinh viên không hợp lệ').max(20),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  })
});

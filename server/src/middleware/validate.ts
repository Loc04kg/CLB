import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema<any>) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Dữ liệu không hợp lệ',
          errors: error.issues.map((err: any) => ({ field: err.path.join('.'), message: err.message }))
        });
      }
      return next(error);
    }
  };

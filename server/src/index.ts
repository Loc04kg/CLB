import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import clubRoutes from './routes/clubs';
import eventRoutes from './routes/events';
import attendanceRoutes from './routes/attendance';
import userRoutes from './routes/users';
import managementRoutes from './routes/management';
import financeRoutes from './routes/finance';
import taskRoutes from './routes/tasks';
import postRoutes from './routes/posts';
import chatRoutes from './routes/chats';
import statsRoutes from './routes/stats';
import uploadRoutes from './routes/upload';
import webauthnRoutes from './routes/webauthn';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window`
  message: { message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(limiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/webauthn', webauthnRoutes);

app.get('/', (req, res) => {
  res.send('HUTECH CLB API is running...');
});

// Phải đặt cuối cùng
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

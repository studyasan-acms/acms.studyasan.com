import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './socket/socket.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { NotificationProcessorService } from './services/notificationProcessor.service.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ACMS StudyAsan API',
    version: '1.0.0',
  });
});

app.use('/api', routes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Initialize Socket.IO
initSocket(httpServer);

// Start notification processor
NotificationProcessorService.start();

httpServer.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

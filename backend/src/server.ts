import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './socket/socket.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { NotificationProcessorService } from './services/notificationProcessor.service.js';
import { JanusCleanupService } from './services/janusCleanup.service.js';
import { KnowYourChildScheduler } from './services/knowYourChildScheduler.service.js';
import { RecordingCleanupService } from './services/recordingCleanup.service.js';
import { ClassSessionScheduler } from './services/classSessionScheduler.service.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use((req, _res, next) => {
  if (req.url && req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
});
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Routes


import path from 'path';
import { fileURLToPath } from 'url';

// Define dirname manually for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/api', routes);

// Serve static files from the frontend build
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Error handling
app.use(errorHandler);

// SPA Fallback: Serve index.html for any unknown route NOT starting with /api
app.get(/.*/, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Initialize Socket.IO
initSocket(httpServer);

// Start notification processor & Janus session cleanup service
NotificationProcessorService.start();
JanusCleanupService.start();
KnowYourChildScheduler.start();
RecordingCleanupService.start();
ClassSessionScheduler.start();

httpServer.listen(PORT, () => {
  console.log(` Server is running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

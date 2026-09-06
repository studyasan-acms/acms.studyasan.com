import { Router } from 'express';
import multer from 'multer';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcement.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB max file size
  },
});

const router = Router();

// All announcement routes require authentication
router.use(authenticate);

router.get('/', getAnnouncements);
router.post('/', upload.single('image'), createAnnouncement);
router.put('/:id', upload.single('image'), updateAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;

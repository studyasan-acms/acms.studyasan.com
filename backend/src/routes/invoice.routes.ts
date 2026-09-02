import { Router } from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  markInvoiceStatus,
  sendInvoiceEmail,
  deleteInvoice,
} from '../controllers/invoice.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin / Teacher accessible routes
router.get('/', authorize('ADMIN', 'TEACHER'), getAllInvoices);
router.get('/:id', authorize('ADMIN', 'TEACHER', 'STUDENT'), getInvoiceById);

// Admin only mutation routes
router.post('/', authorize('ADMIN'), createInvoice);
router.put('/:id', authorize('ADMIN'), updateInvoice);
router.patch('/:id/status', authorize('ADMIN'), markInvoiceStatus);
router.post('/:id/send-email', authorize('ADMIN'), sendInvoiceEmail);
router.delete('/:id', authorize('ADMIN'), deleteInvoice);

export default router;

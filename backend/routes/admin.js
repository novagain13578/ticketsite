/**
 * ADMIN ROUTES
 * GET    /pending-approvals  - List pending payments
 * POST   /approve-payment    - Approve payment
 * POST   /reject-payment     - Reject payment
 * GET    /stats              - Admin statistics
 */

import express from 'express';
import {
  getPendingApprovals,
  approvePayment,
  rejectPayment,
  getAdminStats,
} from '../controllers/adminController.js';

const router = express.Router();

// Routes
router.get('/pending-approvals', getPendingApprovals);
router.post('/approve-payment', approvePayment);
router.post('/reject-payment', rejectPayment);
router.get('/stats', getAdminStats);

export default router;

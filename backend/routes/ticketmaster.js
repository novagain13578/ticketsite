/**
 * TICKETMASTER ROUTES
 * GET    /events             - List events
 * POST   /checkout           - Initiate checkout
 * POST   /webhook            - Receive webhooks
 */

import express from 'express';
import {
  getEvents,
  initiateCheckout,
  handleWebhook,
} from '../controllers/ticketmasterController.js';

const router = express.Router();

// Routes
router.get('/events', getEvents);
router.post('/checkout', initiateCheckout);
router.post('/webhook', handleWebhook);

export default router;

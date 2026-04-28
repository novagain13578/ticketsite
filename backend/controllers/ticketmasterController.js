/**
 * TICKETMASTER INTEGRATION CONTROLLER
 * Handles Ticketmaster API integration for checkout and ticket delivery
 */

import axios from 'axios';

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_BASE_URL = process.env.TICKETMASTER_BASE_URL || 'https://app.ticketmaster.com/discovery/v2';

// Mock Ticketmaster client
const ticketmasterClient = axios.create({
  baseURL: TICKETMASTER_BASE_URL,
  params: {
    apikey: TICKETMASTER_API_KEY,
  },
});

// ============================================================================
// CONTROLLER: GET /api/ticketmaster/events
// ============================================================================

export async function getEvents(req, res) {
  try {
    const { eventId } = req.query;

    if (!TICKETMASTER_API_KEY) {
      return res.status(400).json({
        success: false,
        message: 'Ticketmaster API key not configured',
      });
    }

    // Query Ticketmaster API
    const response = await ticketmasterClient.get('/events', {
      params: {
        id: eventId || process.env.TICKETMASTER_EVENT_ID,
      },
    });

    res.json({
      success: true,
      event: response.data._embedded?.events?.[0] || null,
    });
  } catch (err) {
    console.error('❌ Ticketmaster API error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Ticketmaster events',
      error: err.message,
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/ticketmaster/checkout
// ============================================================================

export async function initiateCheckout(req, res) {
  const { event_id, seats, cart_total } = req.body;

  try {
    if (!event_id || !seats || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: event_id, seats',
      });
    }

    // Step 1: Build checkout payload
    const checkoutPayload = {
      eventId: event_id,
      items: seats.map(seat => ({
        section: seat.section,
        row: seat.row,
        number: seat.seat,
        price: seat.price,
      })),
      total: cart_total,
      timestamp: new Date().toISOString(),
    };

    // Step 2: Create reservation in Ticketmaster
    // In production: Call Ticketmaster API to hold seats & create order
    // const ticketmasterOrder = await createTicketmasterOrder(checkoutPayload);

    // For now, return a redirect URL to Ticketmaster checkout
    // (In production, integrate OAuth or hosted checkout)
    const ticketmasterCheckoutUrl = `https://www.ticketmaster.com/checkout?eventId=${event_id}&total=${cart_total}`;

    res.json({
      success: true,
      message: 'Checkout initiated',
      checkoutUrl: ticketmasterCheckoutUrl,
      orderId: `TM-${Date.now()}`,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min TTL
    });
  } catch (err) {
    console.error('❌ Ticketmaster checkout error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Ticketmaster checkout',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/ticketmaster/webhook
// ============================================================================

export async function handleWebhook(req, res) {
  try {
    const { event_type, data } = req.body;

    console.log(`🔔 Ticketmaster Webhook: ${event_type}`, data);

    // TODO: Verify webhook signature from Ticketmaster
    // const isValid = verifyWebhookSignature(req);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    // Handle different webhook events
    switch (event_type) {
      case 'order.completed':
        // TODO: Update order status in DB
        console.log(`✅ Order completed: ${data.orderId}`);
        break;

      case 'order.failed':
        // TODO: Update order status to failed
        console.log(`❌ Order failed: ${data.orderId}`);
        break;

      case 'payment.processed':
        // TODO: Deliver tickets
        console.log(`💰 Payment processed: ${data.orderId}`);
        break;

      default:
        console.log(`⚠️  Unknown webhook event: ${event_type}`);
    }

    res.json({
      success: true,
      message: 'Webhook received',
    });
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process webhook',
    });
  }
}

// ============================================================================
// HELPER: Send order confirmation
// ============================================================================

export async function sendOrderConfirmation(orderId, userEmail, tickets) {
  try {
    // TODO: Send email to user with tickets
    console.log(`📧 Order confirmation email sent to ${userEmail}`);
    // await emailService.send({
    //   to: userEmail,
    //   subject: 'Your tickets are ready!',
    //   template: 'order-confirmation',
    //   data: { orderId, tickets }
    // });
  } catch (err) {
    console.error('❌ Failed to send order confirmation:', err);
  }
}

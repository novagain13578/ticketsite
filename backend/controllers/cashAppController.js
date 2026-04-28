/**
 * CASH APP PAYMENT CONTROLLER
 * Handles Cash App payment flow:
 * 1. Generate payment details (cashtag, amount)
 * 2. Upload proof of payment screenshot
 * 3. List pending approvals for admin
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Mock database for demo
const mockReservations = new Map();

// ============================================================================
// CONTROLLER: POST /api/cashapp/payment-details
// ============================================================================

export async function getPaymentDetails(req, res) {
  const { reservation_id, event_id, cart_total } = req.body;

  try {
    if (!reservation_id || !event_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservation_id, event_id',
      });
    }

    // TODO: Fetch from MongoDB
    // const reservation = await db.collection('reservations').findOne({
    //   reservationId: reservation_id,
    //   eventId: event_id,
    //   status: 'ACTIVE',
    // });

    // Mock response
    const amount = cart_total || parseFloat(req.body.amount) || 0;
    const cashtag = process.env.CASH_APP_TAG || '$NovadeniaConcerts';

    res.json({
      success: true,
      cashtag,
      amount: amount.toFixed(2),
      deepLink: `https://cash.app/${cashtag}/${amount.toFixed(2)}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min TTL
    });
  } catch (err) {
    console.error('❌ Error in getPaymentDetails:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment details',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/cashapp/upload-proof
// ============================================================================

export async function uploadProof(req, res) {
  const { reservation_id, event_id, user_id } = req.body;

  try {
    if (!reservation_id || !event_id) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservation_id, event_id',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // TODO: Update MongoDB
    // const reservation = await db.collection('reservations').findOne({
    //   reservationId: reservation_id,
    //   eventId: event_id,
    //   status: 'ACTIVE',
    // });

    // Mock update
    const now = new Date();
    const proofData = {
      reservationId: reservation_id,
      eventId: event_id,
      filename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: now,
      uploadedBy: user_id || 'anonymous',
      status: 'PENDING_ADMIN_APPROVAL',
    };

    mockReservations.set(reservation_id, proofData);

    // TODO: Send Telegram notification to admin
    // await sendTelegramNotification(`New payment proof: ${reservation_id}`);

    console.log(`✅ Payment proof uploaded for ${reservation_id}`);

    res.status(200).json({
      success: true,
      message: 'Payment proof submitted successfully. Awaiting admin verification.',
      reservationId: reservation_id,
      status: 'PENDING_ADMIN_APPROVAL',
      estimatedReviewTime: '15-30 minutes',
    });
  } catch (err) {
    console.error('❌ Error in uploadProof:', err);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof',
    });
  }
}

// ============================================================================
// CONTROLLER: GET /api/cashapp/status/:reservation_id
// ============================================================================

export async function getPaymentStatus(req, res) {
  const { reservation_id } = req.params;

  try {
    // TODO: Query MongoDB
    // const reservation = await db.collection('reservations').findOne({
    //   reservationId: reservation_id,
    // });

    const proof = mockReservations.get(reservation_id);

    if (!proof) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found',
      });
    }

    res.json({
      success: true,
      reservationId: reservation_id,
      status: proof.status,
      uploadedAt: proof.uploadedAt,
      estimatedReviewTime: proof.status === 'PENDING_ADMIN_APPROVAL' ? '15-30 minutes' : 'N/A',
    });
  } catch (err) {
    console.error('❌ Error in getPaymentStatus:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
    });
  }
}

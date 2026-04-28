/**
 * CASH APP PAYMENT CONTROLLER
 * Node.js/Express backend for handling Cash App payments
 * 
 * Features:
 * - Generate active Cash App $Cashtag
 * - Handle file uploads (proof of payment)
 * - Pause TTL while awaiting admin verification
 * - Telegram webhook notifications
 * - Admin approval/rejection flow
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const { MongoClient, ObjectId } = require('mongodb');

// ============================================================================
// CONFIGURATION
// ============================================================================

const UPLOAD_DIR = path.join(__dirname, 'uploads/cashapp-proofs');
const ACTIVE_CASHTAG = process.env.CASH_APP_TAG || '$NovaDenTickets';
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4().substring(0, 8)}`;
    const ext = path.extname(file.originalname);
    cb(null, `payment-proof-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Only accept image files
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// ============================================================================
// DATABASE SCHEMA UPDATES
// ============================================================================

/**
 * Extended Reservation Schema for Cash App:
 * 
 * {
 *   _id: ObjectId,
 *   reservationId: "res_abc123",
 *   paymentMethod: "cashapp",
 *   status: "ACTIVE" | "PENDING_ADMIN_APPROVAL" | "EXPIRED" | "APPROVED" | "REJECTED",
 *   
 *   // Cash App specific fields
 *   cashapp: {
 *     cashtag: "$NovaDenTickets",
 *     amount: 150.00,
 *     proofOfPayment: {
 *       filename: "payment-proof-123456789.jpg",
 *       filePath: "/uploads/cashapp-proofs/...",
 *       uploadedAt: ISODate,
 *       uploadedBy: "user_id",
 *     },
 *     adminApprovalNote: "Payment confirmed",
 *     approvedAt: ISODate,
 *     rejectedAt: ISODate,
 *     rejectionReason: "Invalid screenshot"
 *   },
 *   
 *   // TTL management
 *   originalExpiresAt: ISODate,
 *   pausedExpiresAt: ISODate,
 *   pausedAt: ISODate,
 *   pausedDuration: 600, // seconds
 *   
 *   // Audit
 *   createdAt: ISODate,
 *   updatedAt: ISODate,
 * }
 */

// ============================================================================
// HELPER: Send Telegram Notification
// ============================================================================

async function sendTelegramNotification(message, parseMode = 'HTML') {
  if (!TELEGRAM_WEBHOOK_URL || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram notification not configured');
    return false;
  }

  try {
    const payload = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: parseMode,
    });

    return new Promise((resolve) => {
      const req = https.request(TELEGRAM_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      }, (res) => {
        res.on('data', () => {}); // Consume response
        res.on('end', () => {
          console.log('✓ Telegram notification sent');
          resolve(true);
        });
      });

      req.on('error', (err) => {
        console.error('✗ Telegram notification error:', err);
        resolve(false);
      });

      req.write(payload);
      req.end();
    });
  } catch (err) {
    console.error('✗ Error sending Telegram notification:', err);
    return false;
  }
}

// ============================================================================
// CONTROLLER: POST /api/cashapp/payment-details
// Purpose: Get the active Cash App $Cashtag
// ============================================================================

async function getPaymentDetails(req, res) {
  const { reservation_id, event_id, user_id } = req.body;

  try {
    if (!reservation_id || !event_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reservation_id, event_id',
      });
    }

    // Verify reservation exists and is still active
    const db = req.app.get('mongodb');
    const reservations = db.collection('reservations');

    const reservation = await reservations.findOne({
      reservationId: reservation_id,
      eventId: event_id,
      status: 'ACTIVE',
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or expired',
      });
    }

    // Return the active Cashtag
    res.json({
      success: true,
      cashtag: ACTIVE_CASHTAG,
      amount: reservation.seatDetails.price,
      expiresAt: reservation.expiresAt,
    });
  } catch (err) {
    console.error('✗ Error in getPaymentDetails:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment details',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/cashapp/upload-proof
// Purpose: Handle screenshot upload and change reservation status
// ============================================================================

async function uploadProof(req, res) {
  // Middleware: multer.single('screenshot')
  // This is called after multer processes the file

  const { reservation_id, event_id, user_id } = req.body;

  try {
    // Validate inputs
    if (!reservation_id || !event_id) {
      // Clean up file if error
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
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

    const db = req.app.get('mongodb');
    const reservations = db.collection('reservations');

    // STEP 1: Verify reservation exists and is active
    const reservation = await reservations.findOne({
      reservationId: reservation_id,
      eventId: event_id,
      status: 'ACTIVE',
    });

    if (!reservation) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or expired',
      });
    }

    // Calculate relative file path for storage
    const relativeFilePath = path.relative(
      path.dirname(__dirname),
      req.file.path
    );

    const now = new Date();

    // STEP 2: Update reservation to PENDING_ADMIN_APPROVAL
    // AND pause the TTL (don't let it auto-expire while admin reviews)
    const updateResult = await reservations.updateOne(
      { reservationId: reservation_id },
      {
        $set: {
          status: 'PENDING_ADMIN_APPROVAL',
          paymentMethod: 'cashapp',

          // Cash App proof details
          'cashapp.cashtag': ACTIVE_CASHTAG,
          'cashapp.amount': reservation.seatDetails.price,
          'cashapp.proofOfPayment': {
            filename: req.file.filename,
            filePath: relativeFilePath,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedAt: now,
            uploadedBy: user_id || 'anonymous',
          },

          // Pause TTL: extend expiresAt to give admin time to review
          // Typical review window: 60 minutes
          originalExpiresAt: reservation.expiresAt,
          pausedExpiresAt: new Date(now.getTime() + 60 * 60 * 1000), // +1 hour
          pausedAt: now,
          pausedDuration: 60 * 60, // 3600 seconds

          updatedAt: now,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      // Shouldn't happen, but clean up file just in case
      fs.unlink(req.file.path, () => {});
      return res.status(500).json({
        success: false,
        message: 'Failed to update reservation status',
      });
    }

    // STEP 3: Send Telegram notification to admin
    const telegramMessage = `
🔔 <b>New Cash App Payment Proof Submitted</b>

<b>Reservation ID:</b> <code>${reservation_id}</code>
<b>Amount:</b> $${reservation.seatDetails.price.toFixed(2)}
<b>Seat:</b> Section ${reservation.seatDetails.section}, Row ${reservation.seatDetails.row}, Seat ${reservation.seatDetails.number}
<b>Submitted At:</b> ${now.toLocaleString()}

<b>Action Required:</b> Review and approve/reject in Admin Dashboard
    `;

    await sendTelegramNotification(telegramMessage);

    // STEP 4: Log audit trail
    console.log(
      `✓ Payment proof uploaded for reservation ${reservation_id}`,
      {
        filename: req.file.filename,
        fileSize: req.file.size,
        uploadedBy: user_id || 'anonymous',
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Payment proof submitted successfully. Awaiting admin verification.',
      reservationId: reservation_id,
      status: 'PENDING_ADMIN_APPROVAL',
      updatedAt: now,
      estimatedReviewTime: '15-30 minutes',
    });
  } catch (err) {
    console.error('✗ Error in uploadProof:', err);

    // Clean up file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload payment proof',
      error: err.message,
    });
  }
}

// ============================================================================
// CONTROLLER: GET /api/admin/pending-approvals
// Purpose: List all reservations pending admin approval
// ============================================================================

async function getPendingApprovals(req, res) {
  try {
    // TODO: Add authentication/authorization check for admin
    const db = req.app.get('mongodb');
    const reservations = db.collection('reservations');

    const pending = await reservations
      .find({
        status: 'PENDING_ADMIN_APPROVAL',
        paymentMethod: 'cashapp',
      })
      .sort({ 'cashapp.proofOfPayment.uploadedAt': -1 })
      .toArray();

    // Sanitize response (don't expose sensitive file paths)
    const sanitized = pending.map((res) => ({
      reservationId: res.reservationId,
      eventId: res.eventId,
      userId: res.userId,
      seatDetails: res.seatDetails,
      cashapp: {
        amount: res.cashapp.amount,
        cashtag: res.cashapp.cashtag,
        proofOfPayment: {
          filename: res.cashapp.proofOfPayment.filename,
          uploadedAt: res.cashapp.proofOfPayment.uploadedAt,
          uploadedBy: res.cashapp.proofOfPayment.uploadedBy,
        },
      },
      pausedExpiresAt: res.pausedExpiresAt,
      submittedAt: res.cashapp.proofOfPayment.uploadedAt,
    }));

    res.json({
      success: true,
      count: sanitized.length,
      pending: sanitized,
    });
  } catch (err) {
    console.error('✗ Error in getPendingApprovals:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/admin/approve-payment
// Purpose: Admin approves payment
// ============================================================================

async function approvePayment(req, res) {
  try {
    // TODO: Add authentication/authorization check for admin
    const { reservation_id, approval_note } = req.body;
    const admin_id = req.body.admin_id || 'admin_system';

    if (!reservation_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: reservation_id',
      });
    }

    const db = req.app.get('mongodb');
    const reservations = db.collection('reservations');
    const seats = db.collection('seats');

    const now = new Date();

    // STEP 1: Find reservation
    const reservation = await reservations.findOne({
      reservationId: reservation_id,
      status: 'PENDING_ADMIN_APPROVAL',
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or already processed',
      });
    }

    // STEP 2: Create order (mark seat as SOLD)
    const orders = db.collection('orders');
    const orderId = `order_${uuidv4().substring(0, 16)}`;
    const ticketId = `ticket_${uuidv4().substring(0, 16)}`;

    const orderDoc = {
      orderId,
      eventId: reservation.eventId,
      userId: reservation.userId,
      items: [
        {
          seatId: reservation.seatId,
          sectionId: reservation.seatDetails.section,
          rowId: reservation.seatDetails.row,
          seatNumber: reservation.seatDetails.number,
          price: reservation.seatDetails.price,
        },
      ],
      payment: {
        gateway: 'cashapp',
        status: 'COMPLETED',
        amount: reservation.seatDetails.price,
        currency: 'USD',
        approvedAt: now,
        approvedBy: admin_id,
        approvalNote: approval_note || '',
      },
      tickets: [
        {
          ticketId,
          seatId: reservation.seatId,
          qrCode: '', // Would be generated
          scanned: false,
          createdAt: now,
        },
      ],
      status: 'COMPLETED',
      createdAt: now,
      updatedAt: now,
    };

    const insertedOrder = await orders.insertOne(orderDoc);

    // STEP 3: Update seat to SOLD
    await seats.updateOne(
      { seatId: reservation.seatId },
      {
        $set: {
          status: 'SOLD',
          soldTo: {
            userId: reservation.userId,
            orderId,
            soldAt: now,
          },
          updatedAt: now,
        },
      }
    );

    // STEP 4: Update reservation to APPROVED
    await reservations.updateOne(
      { reservationId: reservation_id },
      {
        $set: {
          status: 'APPROVED',
          orderId,
          'cashapp.approvedAt': now,
          'cashapp.approvedBy': admin_id,
          'cashapp.adminApprovalNote': approval_note || 'Payment verified',
          updatedAt: now,
        },
      }
    );

    // STEP 5: Broadcast via WebSocket
    if (req.app.get('socketio')) {
      req.app.get('socketio').emit('SEAT_STATUS_UPDATE', {
        seatId: reservation.seatId,
        status: 'SOLD',
        orderId,
        approvedAt: now,
      });
    }

    // STEP 6: Send user notification (email/SMS)
    console.log(
      `✓ Payment approved for reservation ${reservation_id}, Order: ${orderId}`
    );

    res.json({
      success: true,
      message: 'Payment approved successfully',
      orderId,
      ticketId,
      seatDetails: reservation.seatDetails,
    });
  } catch (err) {
    console.error('✗ Error in approvePayment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to approve payment',
    });
  }
}

// ============================================================================
// CONTROLLER: POST /api/admin/reject-payment
// Purpose: Admin rejects payment and releases seat
// ============================================================================

async function rejectPayment(req, res) {
  try {
    // TODO: Add authentication/authorization check for admin
    const { reservation_id, rejection_reason } = req.body;
    const admin_id = req.body.admin_id || 'admin_system';

    if (!reservation_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: reservation_id',
      });
    }

    const db = req.app.get('mongodb');
    const reservations = db.collection('reservations');
    const seats = db.collection('seats');
    const redis = req.app.get('redis');

    const now = new Date();

    // STEP 1: Find reservation
    const reservation = await reservations.findOne({
      reservationId: reservation_id,
      status: 'PENDING_ADMIN_APPROVAL',
    });

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found or already processed',
      });
    }

    // STEP 2: Release seat back to AVAILABLE
    await seats.updateOne(
      { seatId: reservation.seatId },
      {
        $set: {
          status: 'AVAILABLE',
          reservationId: null,
          updatedAt: now,
        },
      }
    );

    // STEP 3: Update reservation to REJECTED
    await reservations.updateOne(
      { reservationId: reservation_id },
      {
        $set: {
          status: 'REJECTED',
          'cashapp.rejectedAt': now,
          'cashapp.rejectedBy': admin_id,
          'cashapp.rejectionReason': rejection_reason || 'Payment verification failed',
          updatedAt: now,
        },
      }
    );

    // STEP 4: Clean up Redis locks
    await new Promise((resolve) => {
      const lockKey = `seat:lock:${reservation.seatId}`;
      const reservationKey = `reservation:${reservation_id}`;
      
      redis.del(lockKey, () => {
        redis.del(reservationKey, () => resolve());
      });
    });

    // STEP 5: Broadcast via WebSocket (seat now available)
    if (req.app.get('socketio')) {
      req.app.get('socketio').emit('SEAT_STATUS_UPDATE', {
        seatId: reservation.seatId,
        status: 'AVAILABLE',
        reason: 'PAYMENT_REJECTED',
        rejectedAt: now,
      });
    }

    // STEP 6: Notify user of rejection
    console.log(
      `✗ Payment rejected for reservation ${reservation_id}. Reason: ${rejection_reason}`
    );

    res.json({
      success: true,
      message: 'Payment rejected. Seat has been released.',
      reservationId,
      seatId: reservation.seatId,
    });
  } catch (err) {
    console.error('✗ Error in rejectPayment:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to reject payment',
    });
  }
}

// ============================================================================
// CONTROLLER: GET /api/admin/proof/:filename
// Purpose: Serve uploaded proof of payment image (admin only)
// ============================================================================

async function getProofImage(req, res) {
  try {
    const { filename } = req.params;

    // Security: Validate filename (prevent directory traversal)
    if (!/^payment-proof-[\w-]+\.(jpg|jpeg|png|gif|webp)$/.test(filename)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename',
      });
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Serve the image
    res.sendFile(filePath);
  } catch (err) {
    console.error('✗ Error in getProofImage:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve proof image',
    });
  }
}

// ============================================================================
// ROUTE SETUP
// ============================================================================

function setupCashAppRoutes(app) {
  // User routes
  app.post('/api/cashapp/payment-details', getPaymentDetails);
  app.post(
    '/api/cashapp/upload-proof',
    upload.single('screenshot'),
    uploadProof
  );

  // Admin routes
  app.get('/api/admin/pending-approvals', getPendingApprovals);
  app.post('/api/admin/approve-payment', approvePayment);
  app.post('/api/admin/reject-payment', rejectPayment);
  app.get('/api/admin/proof/:filename', getProofImage);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  setupCashAppRoutes,
  getPaymentDetails,
  uploadProof,
  getPendingApprovals,
  approvePayment,
  rejectPayment,
  getProofImage,
  sendTelegramNotification,
};

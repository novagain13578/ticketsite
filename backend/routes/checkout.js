/**
 * CHECKOUT GATEWAY ROUTES
 * Multi-method payment gateway with admin synchronization
 * POST   /initiate      - Start new order and notify admin
 * GET    /status/:id    - Poll for payment details from admin
 * POST   /upload-proof  - Submit proof of payment
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Check if fetch is available (Node 18+)
const fetchFn = typeof fetch !== 'undefined' ? fetch : null;

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// IN-MEMORY TRANSACTION STORE
// ============================================================================

const activeTransactions = new Map();

// Configure multer for proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/checkout-proofs'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ============================================================================
// ENDPOINT: POST /api/checkout/initiate
// ============================================================================

export async function initiateCheckout(req, res) {
  const { cart, total, method, reservation_id } = req.body;

  try {
    if (!cart || !method || !reservation_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: cart, method, reservation_id',
      });
    }

    // Create transaction record
    const referenceId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
    const transaction = {
      reservation_id,
      referenceId,
      cart,
      total: Number(total),
      method,
      status: 'WAITING_FOR_ADMIN',
      createdAt: new Date(),
      adminPaymentTag: null,
      adminPaymentEmail: null,
      adminPaymentId: null,
      proofSubmitted: false,
      proofFilePath: null,
    };

    activeTransactions.set(reservation_id, transaction);

    // Format the cart items for the message
    const itemList = cart.map(item => `- Sec ${item.section}, Row ${item.row} ($${item.price})`).join('\n');
    
    // Construct the Telegram message
    const message = `🚨 *NEW TICKET ORDER* 🚨\n\n` +
                    `*Order ID:* \`${reservation_id}\`\n` +
                    `*Method:* ${method.toUpperCase()}\n` +
                    `*Total Amount:* $${Number(total).toFixed(2)}\n\n` +
                    `*Seats Selected:*\n${itemList}\n\n` +
                    `⚠️ *ACTION REQUIRED:* Use your admin panel to assign the payment tag for this Order ID.`;

    // Dispatch to Telegram asynchronously (don't await so the frontend doesn't hang)
    if (fetchFn) {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!botToken || !chatId) {
            console.warn('⚠️ Telegram credentials missing during checkout. Skipping alert.');
        } else {
          // Use native URL class to sanitize and validate the string
          const telegramUrl = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
          
          fetchFn(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'Markdown'
            })
          }).then(res => res.json()).then(data => {
              if (!data.ok) console.error('❌ Telegram API Error on Checkout:', data);
          }).catch(err => {
              console.error('❌ Failed to send Telegram alert:', err.message);
              console.error('🔍 Detailed Cause:', err.cause ? (err.cause.message || err.cause) : 'No cause provided');
          });
        }
      } catch (urlErr) {
        console.error('❌ Failed to construct Telegram URL:', urlErr.message);
      }
    } else {
      console.warn('⚠️  Telegram notification skipped (fetch not available)');
    }

    res.json({
      success: true,
      reservation_id,
      status: 'WAITING_FOR_ADMIN',
      message: 'Order initiated. Waiting for admin to provide payment details.',
    });
  } catch (err) {
    console.error('❌ Detailed Error in initiateCheckout:', err.message, '\nStack:', err.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate checkout',
      details: err.message,
    });
  }
}

// ============================================================================
// ENDPOINT: GET /api/checkout/status/:reservation_id
// ============================================================================

export async function getCheckoutStatus(req, res) {
  const { reservation_id } = req.params;

  try {
    const transaction = activeTransactions.get(reservation_id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Determine status based on what admin has provided
    let paymentTag = transaction.adminPaymentTag;
    let paymentEmail = transaction.adminPaymentEmail;
    let paymentId = transaction.adminPaymentId;

    // Simulate admin providing payment details (in production, this comes from admin panel/Telegram)
    if (!paymentTag && !paymentEmail && !paymentId) {
      // Still waiting for admin
      return res.json({
        success: true,
        reservation_id,
        status: 'WAITING_FOR_ADMIN',
        message: 'Admin is processing your order...',
      });
    }

    // Admin has provided payment details
    res.json({
      success: true,
      reservation_id,
      referenceId: transaction.referenceId,
      status: 'ADMIN_RESPONSE_RECEIVED',
      targetTag: paymentTag || paymentEmail,
      method: transaction.method,
      amount: transaction.total,
    });
  } catch (err) {
    console.error('❌ Error in getCheckoutStatus:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to get checkout status',
    });
  }
}

// ============================================================================
// ENDPOINT: POST /api/checkout/upload-proof
// ============================================================================

export async function uploadCheckoutProof(req, res) {
  const { reservation_id } = req.body;

  try {
    if (!reservation_id) {
      if (req.file) {
        const fs = await import('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Missing reservation_id',
      });
    }

    const transaction = activeTransactions.get(reservation_id);

    if (!transaction) {
      if (req.file) {
        const fs = await import('fs');
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Update transaction with proof
    transaction.proofSubmitted = true;
    transaction.proofFilePath = req.file.path;
    transaction.status = 'PROOF_SUBMITTED';

    console.log(`✅ Payment proof uploaded for ${reservation_id}`);
    console.log(`📁 File: ${req.file.filename}`);

    // Dispatch Telegram Notification with Photo
    
// Dispatch Telegram Notification with Photo
// Dispatch Telegram Notification with Photo
    if (fetchFn) {
      try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        
        if (botToken && chatId) {
          const fileBuffer = fs.readFileSync(req.file.path);
          
          // FIX: Use Node 20 native 'File' instead of 'Blob' to guarantee correct headers
          const file = new File([fileBuffer], req.file.filename, { type: req.file.mimetype });
          
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('photo', file);
          formData.append('caption', `📸 *Payment Proof Uploaded*\n\n*Order ID:* \`${reservation_id}\`\n*Method:* ${transaction.method.toUpperCase()}\n*Status:* Awaiting Verification`);
          formData.append('parse_mode', 'Markdown');

          const telegramUrl = new URL(`https://api.telegram.org/bot${botToken}/sendPhoto`);
          
          const response = await fetchFn(telegramUrl, {
            method: 'POST',
            body: formData
          });
          
          const data = await response.json();
          
          if (!data.ok) {
              console.error('❌ Telegram API Error on Proof Upload:', data);
              return res.status(500).json({ success: false, error: 'Telegram API rejected photo: ' + (data.description || 'Unknown error') });
          }
          
          console.log('✅ Telegram proof photo sent successfully!');
        } else {
            console.warn('⚠️ Telegram credentials missing. Skipping photo dispatch.');
        }
      } catch (tgErr) {
        // FIX: Extract the hidden underlying network cause from Node.js
        const realCause = tgErr.cause ? (tgErr.cause.message || tgErr.cause) : tgErr.message;
        console.error('❌ Failed to process/send Telegram photo:', realCause);
        return res.status(500).json({ success: false, error: 'Backend crash: ' + realCause });
      }
    }

    // Only send this success response if the Telegram dispatch survived without throwing an error
    res.json({
      success: true,
      reservation_id,
      status: 'PROOF_SUBMITTED',
      message: 'Payment proof submitted successfully. Awaiting admin verification.',
      estimatedReviewTime: '10-15 minutes',
    });
  } catch (err) {
    console.error('❌ Error in uploadCheckoutProof:', err);
    if (req.file) {
      try {
        const fs = await import('fs');
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({
      success: false,
      error: 'Failed to upload proof',
    });
  }
}

// ============================================================================
// ENDPOINT: POST /api/checkout/admin/respond
// (Admin endpoint to provide payment details)
// ============================================================================

export async function adminRespond(req, res) {
  const { reservation_id, paymentTag, paymentEmail, paymentId } = req.body;

  try {
    if (!reservation_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing reservation_id',
      });
    }

    const transaction = activeTransactions.get(reservation_id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Reservation not found',
      });
    }

    // Store admin response
    if (paymentTag) transaction.adminPaymentTag = paymentTag;
    if (paymentEmail) transaction.adminPaymentEmail = paymentEmail;
    if (paymentId) transaction.adminPaymentId = paymentId;

    transaction.status = 'ADMIN_RESPONDED';

    console.log(`✅ Admin responded for ${reservation_id}`);

    res.json({
      success: true,
      message: 'Admin response recorded',
      transaction,
    });
  } catch (err) {
    console.error('❌ Error in adminRespond:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to record admin response',
    });
  }
}

// ============================================================================
// ENDPOINT: GET /api/checkout/admin/pending-approvals
// ============================================================================

export async function getPendingApprovals(req, res) {
  try {
    const pending = Array.from(activeTransactions.values()).filter(
      t => t.status === 'INITIATED' || t.status === 'WAITING_FOR_ADMIN'
    );
    // Sort newest first
    pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, count: pending.length, pending });
  } catch (err) {
    console.error('❌ Error in getPendingApprovals:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch pending orders' });
  }
}

// Routes
router.post('/initiate', initiateCheckout);
router.get('/status/:reservation_id', getCheckoutStatus);
router.post('/upload-proof', upload.single('proof'), uploadCheckoutProof);
router.post('/admin/respond', adminRespond);
router.get('/admin/pending-approvals', getPendingApprovals);

export default router;

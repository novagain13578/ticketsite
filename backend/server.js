/**
 * CONCERT TICKETING BACKEND - MAIN SERVER
 * Node.js/Express API for Cash App payment processing
 * 
 * Endpoints:
 * - POST   /api/cashapp/payment-details      (Generate payment)
 * - POST   /api/cashapp/upload-proof         (Submit proof screenshot)
 * - GET    /api/cashapp/status/:id           (Check payment status)
 * - GET    /api/admin/pending-approvals      (List pending payments)
 * - POST   /api/admin/approve-payment        (Approve Cash App payment)
 * - POST   /api/admin/reject-payment         (Reject Cash App payment)
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';

// ============================================================================
// INITIALIZATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file (explicit path to parent directory)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import routes
import cashAppRoutes from './routes/cashapp.js';
import adminRoutes from './routes/admin.js';
import checkoutRoutes from './routes/checkout.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS - Allow frontend to call backend
const corsOptions = {
  origin: (process.env.CORS_ORIGINS || 'http://localhost:8000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ============================================================================
// TELEGRAM NOTIFICATION ENDPOINT
// ============================================================================

/**
 * POST /api/notify
 * Sends a Telegram notification when a user views seats in a section
 * Body: { sectionName: string }
 */
app.post('/api/notify', async (req, res) => {
  try {
    const { sectionName } = req.body;

    if (!sectionName) {
      return res.status(400).json({ error: 'sectionName is required' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Validate Telegram credentials exist
    if (!botToken || !chatId) {
      console.log(`📝 Seat View Notification - Section: ${sectionName}`);
      console.log(`   ❔ Telegram not configured. In production, would notify admin at chat_id: ${chatId || '(not set)'}`);
      return res.status(200).json({
        success: true,
        message: 'Notification logged (Telegram credentials not configured)',
        sectionName,
        timestamp: new Date().toISOString(),
      });
    }

    // Send message to Telegram with timeout
    const message = `🚨 *New Interaction*\nA user is currently viewing seats in *Section ${sectionName}*.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      // Use native URL class to sanitize and validate the string
      const url = new URL(`https://api.telegram.org/bot${botToken}/sendMessage`);
      
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      // Graceful degradation - log but don't fail
      console.warn(`⚠️  Telegram API unreachable for Section ${sectionName}:`, fetchErr.message);
      console.warn(`🔍 Detailed Cause:`, fetchErr.cause ? (fetchErr.cause.message || fetchErr.cause) : 'No specific network cause provided');
      return res.status(200).json({
        success: true,
        message: 'Notification queued (Telegram API temporarily unavailable)',
        sectionName,
        timestamp: new Date().toISOString(),
      });
    }

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Telegram API Error for Section', sectionName, ':', data);
      return res.status(200).json({
        success: true,
        message: 'Notification processed (Telegram API returned error, logged)',
        sectionName,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`✅ Telegram notification sent for Section ${sectionName}`);
    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      sectionName,
      telegramMessageId: data.result.message_id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('❌ Unexpected error in notification endpoint:', err.message);
    // Always return 200 to prevent client-side errors
    return res.status(200).json({
      success: true,
      message: 'Notification processed',
      error: 'Server error logged',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// TELEGRAM WEBHOOK - CUSTOMER SUPPORT BRIDGE
// ============================================================================

/**
 * POST /webhook/telegram
 * Handles incoming Telegram messages from users requesting support
 * Listens for /start command with support_ parameter
 */
app.post('/webhook/telegram', async (req, res) => {
  try {
    const message = req.body.message;
    
    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    // Check if message is /start support_<reservationId>
    const supportMatch = message.text.match(/^\/start\s+support_(\S+)/);
    
    if (supportMatch) {
      const reservationId = supportMatch[1];
      const userId = message.from.id;
      const userName = message.from.username || message.from.first_name || 'Unknown User';
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;

      if (!botToken || !chatId) {
        console.log(`Support request from user ${userId} for reservation ${reservationId}`);
        return res.status(200).json({ ok: true });
      }

      // Notify admin about the support request
      const adminMessage = `Support Request\n\nUser: ${userName} (ID: ${userId})\nReservation ID: ${reservationId}\n\nUser is requesting assistance with this order.`;

      try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: adminMessage,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`Support request logged for reservation ${reservationId}`);
          
          // Send message to user acknowledging their support request
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `Thank you for contacting customer care.\n\nYour Order ID: ${reservationId}\n\nOur team will review your request and get back to you shortly.`,
            }),
          });
        }
      } catch (err) {
        console.error('Error sending support notification:', err.message);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error in Telegram webhook handler:', err.message);
    return res.status(200).json({ ok: true });
  }
});

// API Routes
app.use('/api/cashapp', cashAppRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/checkout', checkoutRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(NODE_ENV === 'development' && { details: err.stack }),
  });
});

// ============================================================================
// DATABASE CONNECTION (Placeholder)
// ============================================================================

// Parse MongoDB URI from environment
async function connectDatabase() {
  try {
    // TODO: Implement MongoDB connection
    // const { MongoClient } = await import('mongodb');
    // const uri = process.env.MONGODB_URI;
    // const client = new MongoClient(uri);
    // await client.connect();
    // const db = client.db(process.env.MONGODB_DATABASE);
    // app.set('mongodb', db);
    // console.log('✅ MongoDB Connected');

    console.log('⚠️  MongoDB connection not configured (using mock data)');
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║    🎵 CONCERT TICKETING BACKEND - STARTED ✅               ║
╚════════════════════════════════════════════════════════════╝

📍 Server: http://localhost:${PORT}
🌍 Environment: ${NODE_ENV}
      `);

      // ==========================================================
      // RENDER KEEP-ALIVE PING
      // ==========================================================
      if (NODE_ENV === 'production') {
        const selfUrl = process.env.RENDER_EXTERNAL_URL || 'https://morgan-pqka.onrender.com';
        
        // Ping every 14 minutes (840,000 ms)
        setInterval(() => {
          axios.get(`${selfUrl}/health`)
            .then(() => console.log(`[${new Date().toISOString()}] Self-ping successful: Server is awake.`))
            .catch(err => console.error(`[${new Date().toISOString()}] Self-ping failed:`, err.message));
        }, 840000);
      }
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}


// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
// Start the server
startServer();

export default app;

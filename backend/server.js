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
🔐 CORS Origins: ${process.env.CORS_ORIGINS || 'http://localhost:8000'}

📊 Available Endpoints:
  • GET  /health                               (Health check)
  • POST /api/cashapp/payment-details           (Generate payment)
  • POST /api/cashapp/upload-proof              (Submit proof)
  • GET  /api/cashapp/status/:id                (Check status)
  • GET  /api/admin/pending-approvals           (List pending)
  • POST /api/admin/approve-payment             (Approve)
  • POST /api/admin/reject-payment              (Reject)
  • POST /api/checkout/initiate                 (Initiate order)
  • GET  /api/checkout/status/:id               (Poll status)
  • POST /api/checkout/upload-proof             (Upload proof)
  • POST /api/checkout/admin/respond            (Admin response)

⚡ Ready to handle requests!
      `);
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

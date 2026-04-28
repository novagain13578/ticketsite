# Cash App Payment Gateway - Complete Integration Guide

## Overview

This is a complete Cash App payment integration system for the Novaden ticketing platform, featuring:

✅ **Vanilla Frontend**: HTML/CSS/JavaScript (no frameworks)  
✅ **Node.js/Express Backend**: RESTful API with file uploads  
✅ **Admin Dashboard**: Real-time payment approval workflow  
✅ **TTL Management**: Pause seat lock during verification  
✅ **Telegram Notifications**: Real-time admin alerts  
✅ **Secure File Uploads**: Multipart form-data with validation  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vanilla JS)                    │
├─────────────────────────────────────────────────────────────┤
│  cashapp-checkout.html                                      │
│  - Modal UI (3-stage flow)                                  │
│  - Generate Payment Details                                 │
│  - Display $Cashtag + Copy Button                           │
│  - Screenshot Upload with Preview                           │
│  - 10-minute Countdown Timer                                │
│                                                             │
│  cashapp-checkout.js                                        │
│  - CashAppCheckout class (state management)                 │
│  - fetch() API calls to backend                             │
│  - DOM manipulation & events                                │
│  - Clipboard API integration                                │
│  - FormData file upload                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
        fetch() POST /api/cashapp/payment-details
        fetch() POST /api/cashapp/upload-proof
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  cashapp-payment-controller.js                              │
│  - getPaymentDetails() → return $Cashtag                    │
│  - uploadProof() → handle multipart/form-data               │
│  - Change reservation status → PENDING_ADMIN_APPROVAL       │
│  - Pause TTL (extend expiration)                            │
│  - Send Telegram notification                               │
│                                                             │
│  MongoDB Collections:                                       │
│  - reservations (status: PENDING_ADMIN_APPROVAL)            │
│  - seats (status: RESERVED)                                 │
│  - orders (created on approval)                             │
│                                                             │
│  Redis:                                                     │
│  - seat:lock:{seatId} (active during upload)                │
│  - reservation:{reservationId} (cached)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
        fetch() GET /api/admin/pending-approvals
        fetch() POST /api/admin/approve-payment
        fetch() POST /api/admin/reject-payment
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD                          │
├─────────────────────────────────────────────────────────────┤
│  admin-dashboard.html                                       │
│  - List all PENDING_ADMIN_APPROVAL reservations             │
│  - Display user details & seat info                         │
│  - Show uploaded screenshot image                           │
│  - Approve/Reject buttons                                   │
│  - Rejection reason modal                                   │
│  - 30-second auto-refresh                                   │
│                                                             │
│  admin-dashboard.js                                         │
│  - AdminDashboard class                                     │
│  - Load and render pending approvals                        │
│  - Handle approve/reject actions                            │
│  - Real-time updates                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
        Telegram Webhook Notification
        MongoDB status updates
        WebSocket broadcast (seat available again)
```

---

## Installation & Setup

### 1. Frontend Installation

#### Option A: HTML File (Standalone Modal)

```html
<!-- In your main ticket selection page -->
<script src="cashapp-checkout.js"></script>

<!-- When user selects "Cash App" payment method: -->
<script>
  // From your seat selection component
  document.addEventListener('selectPaymentMethod', (e) => {
    if (e.detail.method === 'cashapp') {
      window.cashappCheckout.open({
        reservation_id: reservationDetails.id,
        seat_details: {
          section: '101',
          row: 'a',
          number: 120,
          price: 150.00,
        },
        event_id: 'concert_2026_vegas',
      });
    }
  });
</script>
```

#### Option B: Embed in Existing Page

```javascript
// Initialize the checkout on page load
const checkout = new CashAppCheckout({
  backendUrl: 'https://api.novaden.com', // Your backend URL
  timeoutSeconds: 600, // 10 minutes
});

// Trigger when user needs Cash App payment
document.getElementById('cashAppPaymentBtn').addEventListener('click', () => {
  checkout.open({
    reservation_id: currentReservation.id,
    seat_details: selectedSeat,
    event_id: 'concert_2026_vegas',
  });
});
```

### 2. Backend Installation

#### Install Dependencies

```bash
npm install express multer mongodb redis socket.io uuid
npm install --save-dev nodemon
```

#### Environment Variables (.env)

```bash
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=concert_ticketing

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cash App Settings
CASH_APP_TAG=$NovaDenTickets

# Telegram Webhook (for admin notifications)
TELEGRAM_WEBHOOK_URL=https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage
TELEGRAM_CHAT_ID=YOUR_ADMIN_CHAT_ID

# Server
PORT=3000
NODE_ENV=production
```

#### Telegram Bot Setup

1. **Create Bot**: Message [@BotFather](https://t.me/botfather) on Telegram
   - `/newbot` → Follow prompts → Get BOT_TOKEN

2. **Get Chat ID**:
   ```bash
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getMe"
   ```

3. **Set Webhook URL** (optional, or use polling):
   ```bash
   curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=YOUR_BACKEND_URL/webhook/telegram"
   ```

4. **Environment Setup**:
   ```bash
   TELEGRAM_WEBHOOK_URL=https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage
   TELEGRAM_CHAT_ID=YOUR_ADMIN_CHAT_ID
   ```

Example notification message:

```
🔔 New Cash App Payment Proof Submitted

Reservation ID: res_abc123def456
Amount: $150.00
Seat: Section 101, Row A, Seat 120
Submitted At: 4/22/2026, 2:30 PM

Action Required: Review and approve/reject in Admin Dashboard
```

#### Express Setup

```javascript
// server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const redis = require('redis');
const { Server: IOServer } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, {
  cors: { origin: '*' },
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Initialize MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URI);
mongoClient.connect().then(() => {
  const db = mongoClient.db(process.env.MONGODB_DB);
  app.set('mongodb', db);
});

// Initialize Redis
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});
redisClient.connect();
app.set('redis', redisClient);

// Socket.io
app.set('socketio', io);

// Setup routes
const { setupCashAppRoutes } = require('./cashapp-payment-controller');
setupCashAppRoutes(app);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});
```

### 3. Admin Dashboard Setup

#### Deployment

1. **Serve as Static HTML**:
   ```bash
   # In your Express server
   app.use(express.static('public/admin'));
   ```

2. **Access at**:
   ```
   http://localhost:3000/admin-dashboard.html
   ```

3. **Authentication** (Add to admin-dashboard.js):
   ```javascript
   // Check auth token before loading
   const token = localStorage.getItem('adminToken');
   if (!token) {
     window.location.href = '/login';
   }
   ```

---

## API Reference

### POST /api/cashapp/payment-details

**Request**:
```json
{
  "reservation_id": "res_abc123def456",
  "event_id": "concert_2026_vegas",
  "user_id": "user_12345"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "cashtag": "$NovaDenTickets",
  "amount": 150.00,
  "expiresAt": "2026-04-22T14:35:00Z"
}
```

**Response (404 Not Found)**:
```json
{
  "success": false,
  "message": "Reservation not found or expired"
}
```

---

### POST /api/cashapp/upload-proof

**Request** (FormData):
```
Content-Type: multipart/form-data

Form Fields:
- screenshot (file): Image file (jpg, png, gif, webp, max 5MB)
- reservation_id (string): Reservation ID
- event_id (string): Event ID
- user_id (string, optional): User ID
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment proof submitted successfully. Awaiting admin verification.",
  "reservationId": "res_abc123def456",
  "status": "PENDING_ADMIN_APPROVAL",
  "estimatedReviewTime": "15-30 minutes",
  "updatedAt": "2026-04-22T14:25:00Z"
}
```

**Database Changes**:
- Reservation status: `ACTIVE` → `PENDING_ADMIN_APPROVAL`
- TTL extended: original `+10min` → `+1hour`
- Screenshot file saved to: `/uploads/cashapp-proofs/{filename}`

---

### GET /api/admin/pending-approvals

**Request**:
```
GET /api/admin/pending-approvals
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Response (200 OK)**:
```json
{
  "success": true,
  "count": 3,
  "pending": [
    {
      "reservationId": "res_abc123def456",
      "eventId": "concert_2026_vegas",
      "userId": "user_12345",
      "seatDetails": {
        "section": "101",
        "row": "a",
        "number": 120,
        "price": 150.00
      },
      "cashapp": {
        "amount": 150.00,
        "cashtag": "$NovaDenTickets",
        "proofOfPayment": {
          "filename": "payment-proof-123456789.jpg",
          "uploadedAt": "2026-04-22T14:25:00Z",
          "uploadedBy": "user_12345"
        }
      },
      "pausedExpiresAt": "2026-04-22T15:25:00Z",
      "submittedAt": "2026-04-22T14:25:00Z"
    }
  ]
}
```

---

### POST /api/admin/approve-payment

**Request**:
```json
{
  "reservation_id": "res_abc123def456",
  "approval_note": "Payment verified by admin",
  "admin_id": "admin_user_123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "orderId": "order_xyz789",
  "ticketId": "ticket_qwerty123",
  "seatDetails": {
    "section": "101",
    "row": "a",
    "number": 120,
    "price": 150.00
  }
}
```

**Database Changes**:
- Seat status: `RESERVED` → `SOLD`
- New Order created
- Reservation status: `PENDING_ADMIN_APPROVAL` → `APPROVED`

---

### POST /api/admin/reject-payment

**Request**:
```json
{
  "reservation_id": "res_abc123def456",
  "rejection_reason": "Screenshot doesn't show transaction details",
  "admin_id": "admin_user_123"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment rejected. Seat has been released.",
  "reservationId": "res_abc123def456",
  "seatId": "s_101_a_120"
}
```

**Database Changes**:
- Seat status: `RESERVED` → `AVAILABLE`
- Reservation status: `PENDING_ADMIN_APPROVAL` → `REJECTED`
- Redis locks cleared
- WebSocket broadcast: Seat available again

---

## Payment Flow Timeline

### User Flow (10-minute window)

```
00:00 → User clicks "Cash App" button
        ↓ Modal opens (Stage 1)
        ↓ "Generate Payment Details" clicked

00:02 → $Cashtag fetched from backend
        ↓ Modal moves to Stage 2
        ↓ Countdown timer starts (09:58 remaining)
        ↓ $Cashtag displayed + Copy button

00:15 → User copies $Cashtag → Opens Cash App → Sends transfer
        ↓ "I have made the transfer" clicked
        ↓ Modal moves to Stage 3 (timer pauses display)

00:45 → User takes screenshot → Uploads file
        ↓ Reservation status → PENDING_ADMIN_APPROVAL
        ↓ Seat lock TTL extended (+1 hour)
        ↓ Admin notified via Telegram

09:58 → Timer reaches 00:00
        ↓ Reservation would expire if not already in admin review
        ↓ Since status is PENDING_ADMIN_APPROVAL, extended TTL applies
```

### Admin Flow (1-hour window)

```
00:00 → Payment proof uploaded
        ↓ Admin Dashboard shows pending approval
        ↓ Telegram notification sent to admin

00:05 → Admin reviews screenshot in dashboard
        ↓ Approves payment

00:06 → Order created
        ↓ Seat marked as SOLD
        ↓ Digital ticket generated
        ↓ Reservation → APPROVED
        ↓ WebSocket broadcast to all users

OR

00:15 → Admin reviews but rejects
        ↓ Reason: "Amount doesn't match"
        ↓ Seat status → AVAILABLE
        ↓ Reservation → REJECTED
        ↓ Redis locks cleared
        ↓ User notified of rejection
```

---

## Database Schema Changes

### Extended Reservation Document

```javascript
{
  _id: ObjectId(),
  reservationId: "res_abc123def456",
  eventId: "concert_2026_vegas",
  userId: "user_12345",
  seatId: "s_101_a_120",
  
  // Original fields
  seatDetails: {
    section: "101",
    row: "a",
    number: 120,
    price: 150.00
  },
  status: "ACTIVE" | "PENDING_ADMIN_APPROVAL" | "APPROVED" | "REJECTED" | "EXPIRED",
  expiresAt: ISODate("2026-04-22T14:35:00Z"),
  
  // NEW: Cash App payment fields
  paymentMethod: "cashapp",
  cashapp: {
    cashtag: "$NovaDenTickets",
    amount: 150.00,
    proofOfPayment: {
      filename: "payment-proof-1713786900000-abc12345.jpg",
      filePath: "uploads/cashapp-proofs/payment-proof-1713786900000-abc12345.jpg",
      fileSize: 245632, // bytes
      mimeType: "image/jpeg",
      uploadedAt: ISODate("2026-04-22T14:25:00Z"),
      uploadedBy: "user_12345"
    },
    approvedAt: ISODate("2026-04-22T14:26:00Z"),
    approvedBy: "admin_user_123",
    adminApprovalNote: "Payment verified",
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null
  },
  
  // NEW: TTL pause fields
  originalExpiresAt: ISODate("2026-04-22T14:35:00Z"), // Original +10min
  pausedExpiresAt: ISODate("2026-04-22T15:25:00Z"), // Extended +1hour
  pausedAt: ISODate("2026-04-22T14:25:00Z"),
  pausedDuration: 3600, // seconds
  
  // Audit
  orderId: "order_xyz789", // Set if approved
  createdAt: ISODate("2026-04-22T14:15:00Z"),
  updatedAt: ISODate("2026-04-22T14:26:00Z")
}
```

### Index Updates

```javascript
// Cache extended reservations
db.reservations.createIndex(
  { status: 1, paymentMethod: 1, 'cashapp.proofOfPayment.uploadedAt': -1 }
);

db.reservations.createIndex(
  { pausedExpiresAt: 1 },
  { expireAfterSeconds: 0 }
);
```

---

## File Upload Security

### Validation Rules (cashapp-payment-controller.js)

```javascript
const fileFilter = (req, file, cb) => {
  // Only image files
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});
```

### File Storage

```
uploads/
└── cashapp-proofs/
    ├── payment-proof-1713786900000-abc12345.jpg
    ├── payment-proof-1713786901000-def67890.png
    └── payment-proof-1713786902000-ghi11111.jpg
```

### Access Control

- **User**: Cannot see other users' proofs
- **Admin**: Can view all proofs in dashboard
- **Public API**: `/api/admin/proof/{filename}` requires admin auth

---

## Real-time Notifications

### Telegram Integration

**Notification Sent When**:
1. Payment proof uploaded
2. Payment approved
3. Payment rejected

**Message Format**:
```
🔔 New Cash App Payment Proof Submitted

Reservation ID: res_abc123def456
Amount: $150.00
Seat: Section 101, Row A, Seat 120
Submitted At: 4/22/2026, 2:30 PM

Action Required: Review and approve/reject in Admin Dashboard
```

### WebSocket Integration

**Broadcasts On Approval**:
```javascript
io.emit('SEAT_STATUS_UPDATE', {
  seatId: 's_101_a_120',
  status: 'SOLD',
  orderId: 'order_xyz789',
  approvedAt: new Date(),
});
```

**Broadcasts On Rejection**:
```javascript
io.emit('SEAT_STATUS_UPDATE', {
  seatId: 's_101_a_120',
  status: 'AVAILABLE',
  reason: 'PAYMENT_REJECTED',
  rejectedAt: new Date(),
});
```

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `SEAT_LOCKED` | Another user has the seat | Retry after 5 seconds |
| `RESERVATION_EXPIRED` | 10-minute timer elapsed | Select seat again |
| `INVALID_FILE` | Wrong file type or too large | Upload image < 5MB |
| `PAYMENT_PROOF_INVALID` | Admin rejected proof | Resubmit valid proof |
| `SEAT_UNAVAILABLE` | Seat already sold | Choose different seat |

### Frontend Error Handling

```javascript
// In cashapp-checkout.js
async submitUploadProof() {
  try {
    const response = await fetch(...);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    if (!data.success) {
      throw new Error(data.message);
    }

    this.showSuccessAlert('✓ Proof uploaded successfully!');
  } catch (error) {
    this.showErrorAlert(`❌ ${error.message}`);
  }
}
```

### Backend Error Response

```javascript
// Return consistent error format
res.status(409).json({
  success: false,
  error: 'SEAT_LOCKED',
  message: 'Another user is completing their purchase for this seat',
  retryAfter: 5,
});
```

---

## Testing

### Unit Test Example (Payment Approval)

```javascript
const assert = require('assert');

describe('approvePayment', () => {
  it('should create order and mark seat as SOLD', async () => {
    const result = await approvePayment({
      body: {
        reservation_id: 'res_test_123',
        admin_id: 'admin_test',
        approval_note: 'Test approval'
      }
    });

    assert(result.success === true);
    assert(result.orderId !== undefined);
    assert(result.ticketId !== undefined);

    // Verify DB changes
    const reservation = await db.reservations.findOne({ 
      reservationId: 'res_test_123' 
    });
    assert(reservation.status === 'APPROVED');

    const seat = await db.seats.findOne({ 
      seatId: reservation.seatId 
    });
    assert(seat.status === 'SOLD');
  });
});
```

### Manual Testing Checklist

- [ ] Create reservation 
- [ ] Open Cash App modal
- [ ] Generate payment details
- [ ] Copy $Cashtag
- [ ] Upload screenshot
- [ ] Check admin dashboard
- [ ] Approve payment
- [ ] Verify order created
- [ ] Confirm ticket generated
- [ ] Verify WebSocket broadcast

---

## Deployment Checklist

- [ ] Set environment variables (.env)
- [ ] Configure MongoDB indexes
- [ ] Set up Telegram bot + webhook
- [ ] Create upload directory with proper permissions
- [ ] Enable CORS for frontend domain
- [ ] Set up SSL/HTTPS certificate
- [ ] Configure file upload size limits
- [ ] Set up logging/monitoring
- [ ] Test Telegram notifications
- [ ] Backup upload directory regularly
- [ ] Set up admin authentication
- [ ] Configure payment timeout values
- [ ] Test end-to-end flow

---

## Troubleshooting

### Telegram Notifications Not Sending

```bash
# Test webhook
curl -X POST https://api.telegram.org/botYOUR_BOT_TOKEN/sendMessage \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"YOUR_CHAT_ID","text":"Test message"}'
```

### File Upload Fails

```bash
# Check upload directory permissions
chmod 755 uploads/cashapp-proofs/

# Check multer middleware is configured
app.post('/api/cashapp/upload-proof', 
  upload.single('screenshot'), 
  uploadProof
);
```

### Reservation TTL Not Pausing

```javascript
// Verify pausedExpiresAt is being set
const reservation = await db.reservations.findOne({ 
  reservationId: 'res_test' 
});
console.log('pausedExpiresAt:', reservation.pausedExpiresAt);
// Should be 1 hour from now, not 10 minutes
```

---

## Next Steps

1. **Integrate Payment Method Selection**: Add Cash App as payment option in seat selection
2. **Add Email Notifications**: Notify user when payment approved/rejected
3. **Admin Authentication**: Implement JWT-based admin auth
4. **Analytics**: Track approval rates, average review time
5. **Webhook Retry Logic**: Handle failed Telegram notifications
6. **Rate Limiting**: Prevent upload spam
7. **Captcha**: Add to rejection modal to prevent abuse

---

## Support

For issues or questions, check:
1. Browser console for error messages
2. Server logs for backend errors
3. Telegram chat for admin notifications
4. MongoDB logs for database errors
5. Redis logs for cache issues

# Ticketmaster Integration - Backend Setup

This backend provides secure APIs for Cash App and Ticketmaster payment integration.

## Quick Start

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Configure environment variables
cp ../.env .env
# Edit .env with your API keys

# 3. Start server
npm start
# or for development with auto-reload:
npm run dev
```

## API Endpoints

### Cash App Payment Flow

**POST** `/api/cashapp/payment-details`
- Generate payment cashtag and amount
- **Body**: `{ reservation_id, event_id, cart_total }`
- **Response**: `{ cashtag, amount, deepLink, expiresAt }`

**POST** `/api/cashapp/upload-proof`
- Submit screenshot proof of payment
- **Form Data**: `{ reservation_id, event_id, screenshot (file) }`
- **Response**: `{ success, status, estimatedReviewTime }`

**GET** `/api/cashapp/status/:reservation_id`
- Check payment status
- **Response**: `{ status, uploadedAt, estimatedReviewTime }`

### Ticketmaster Integration

**GET** `/api/ticketmaster/events`
- List Ticketmaster events
- **Query**: `?eventId=XXX`
- **Response**: `{ event }`

**POST** `/api/ticketmaster/checkout`
- Initiate Ticketmaster checkout
- **Body**: `{ event_id, seats, cart_total }`
- **Response**: `{ checkoutUrl, orderId, expiresAt }`

**POST** `/api/ticketmaster/webhook`
- Receive Ticketmaster webhook events
- Event types: `order.completed`, `order.failed`, `payment.processed`

### Admin Approval

**GET** `/api/admin/pending-approvals`
- List pending Cash App approvals
- **Response**: `{ count, pending: [] }`

**POST** `/api/admin/approve-payment`
- Approve a Cash App payment
- **Body**: `{ reservation_id, approval_note }`
- **Response**: `{ success, status }`

**POST** `/api/admin/reject-payment`
- Reject a Cash App payment
- **Body**: `{ reservation_id, rejection_reason }`
- **Response**: `{ success, status }`

**GET** `/api/admin/stats`
- Admin dashboard statistics
- **Response**: `{ stats: { totalReservations, approved, rejected, pendingApproval } }`

## Configuration

Edit `.env` with your API keys:

```env
# Ticketmaster
TICKETMASTER_API_KEY=your_key_here
TICKETMASTER_EVENT_ID=your_event_id_here

# Cash App
CASH_APP_TAG=$YourTag

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=concert_ticketing
```

## File Structure

```
backend/
├── server.js                    # Main Express app
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── .gitignore                   # Git ignore rules
│
├── controllers/
│   ├── cashAppController.js     # Cash App logic
│   ├── ticketmasterController.js # Ticketmaster logic
│   └── adminController.js       # Admin approval logic
│
├── routes/
│   ├── cashapp.js               # /api/cashapp routes
│   ├── ticketmaster.js          # /api/ticketmaster routes
│   └── admin.js                 # /api/admin routes
│
└── uploads/
    └── cashapp-proofs/          # User uploaded receipts
```

## Security Notes

✅ **Private .env** - Never commit API keys
✅ **CORS** - Configured to frontend URL
✅ **File uploads** - Image-only with size limit
✅ **Error handling** - Safe error messages
✅ **Logging** - Request logging for debugging

## Next Steps

1. Set up MongoDB database
2. Add authentication middleware
3. Integrate Ticketmaster OAuth
4. Add email notifications
5. Deploy to production

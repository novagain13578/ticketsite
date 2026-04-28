# Ticketmaster-Style Checkout Engine

## System Architecture Overview

This document describes a high-performance, distributed checkout system for stadium ticketing with:
- Distributed seat locking (Redis-based)
- 10-minute timed reservations with automatic expiration
- Real-time WebSocket synchronization
- Idempotent payment processing
- Secure digital ticket generation

---

## 1. Reservation-to-Payment Flow Sequence Diagram

```
User 1                    Frontend              Backend              Redis         Payment       Database
   |                          |                   |                   |           Gateway         |
   |--Click Seat A--->|        |                   |                   |             |             |
   |                  |--POST /reserve (seat_id)--|                   |             |             |
   |                  |        |                   |                   |             |             |
   |                  |        |--LOCK seat:A---->|                   |             |             |
   |                  |        |<--LOCKED---------|                   |             |             |
   |                  |        |--Create Reservation (TTL 10min)----->|             |             |
   |                  |        |        |         |--INSERT reservation----------->|             |
   |                  |<--201 Created--| <--Expires: 2026-04-22T14:35:00Z---------|             |
   |                  |        |         |         |                   |             |             |
   |                  |--Start 10min countdown    |                   |             |             |
   |                  |        |         |         |                   |             |             |
   |--Enter Payment-->|        |         |         |                   |             |             |
   |                  |--POST /confirm-purchase--|          |         |             |             |
   |                  |   (idempotency-key)     |          |         |             |             |
   |                  |        |                   |         |         |             |             |
   |                  |        |--Check idempotency cache------------>|             |             |
   |                  |        |<--Cache miss-----|                   |             |             |
   |                  |        |                   |         |         |             |             |
   |                  |        |--Process payment-----------|---------->|             |             |
   |                  |        |                   |         |         |   Webhook   |             |
   |                  |        |<--Payment Success---------|<----------|             |             |
   |                  |        |                   |         |         |             |             |
   |                  |        |--UPDATE seat: Sold---------|---------->|             |
   |                  |        |--DELETE reservation from Redis         |             |
   |                  |        |--Generate JWT ticket----->|             |             |
   |                  |<--Ticket + Confirmation |         |             |             |
   |                  |        |         |         |         |             |             |
   |<--Show QR Code---|        |         |         |         |             |             |
   |                  |        |         |         |         |             |             |
   |                  |        |--Broadcast via WebSocket         |             |
   |                  |        |   "Seat A: SOLD"          |             |
   |                  |        |         |         |         |             |             |
```

---

## 2. Data Models

### Seat Schema
```javascript
{
  _id: ObjectId,
  eventId: "concert_2026_vegas",
  sectionId: "s_101",
  rowId: "row_a",
  seatNumber: 120,
  
  // Seat Status: AVAILABLE | RESERVED | SOLD
  status: "AVAILABLE",
  
  // If RESERVED, reference to reservation
  reservationId: "res_abc123def456",
  
  // Audit
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Reservation Schema
```javascript
{
  _id: ObjectId,
  reservationId: "res_abc123def456",
  eventId: "concert_2026_vegas",
  userId: "user_12345",
  seatId: "s_101_a_120",
  seatDetails: {
    section: "s_101",
    row: "a",
    number: 120,
    price: 150.00
  },
  
  // Reservation state
  status: "ACTIVE", // ACTIVE | EXPIRED | CONVERTED_TO_ORDER
  expiresAt: ISODate("2026-04-22T14:35:00Z"), // 10 minutes from now
  
  // For automatic cleanup
  ttl: 600, // MongoDB TTL index
  
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Order Schema (Post-Payment)
```javascript
{
  _id: ObjectId,
  orderId: "order_xyz789",
  eventId: "concert_2026_vegas",
  userId: "user_12345",
  
  items: [{
    seatId: "s_101_a_120",
    sectionId: "s_101",
    price: 150.00,
    rowId: "row_a",
    seatNumber: 120
  }],
  
  // Payment details
  payment: {
    gateway: "stripe", // stripe | paypal | paystack
    gatewayOrderId: "ch_1234567890",
    amount: 150.00,
    currency: "USD",
    status: "COMPLETED",
    idempotencyKey: "idem_abc123def456",
    completedAt: ISODate
  },
  
  // Ticket generation
  tickets: [{
    ticketId: "ticket_qwerty123",
    seatId: "s_101_a_120",
    jwtToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    qrCode: "data:image/png;base64,iVBORw0KG...",
    scanned: false
  }],
  
  status: "COMPLETED",
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

## 3. Redis Data Structures

### Seat Lock (Distributed Mutex)
```
Key: seat:lock:{seatId}
Type: SET (with expiration)
Value: "user_12345:session_xyz789"
TTL: 30 seconds (minimum lock duration)

EXAMPLE:
  SET seat:lock:s_101_a_120 
      "user_12345:session_xyz789" 
      EX 30 
      NX
  # Returns: OK if acquired, nil if already locked
```

### Active Reservations (Cache)
```
Key: reservation:{reservationId}
Type: HASH
Fields:
  - userId: "user_12345"
  - seatId: "s_101_a_120"
  - eventId: "concert_2026_vegas"
  - expiresAt: "1713787500000" (unix ms)
  - createdAt: "1713786900000"
TTL: 600 seconds (10 minutes)

EXAMPLE:
  HSET reservation:res_abc123 
    userId "user_12345" 
    seatId "s_101_a_120" 
    eventId "concert_2026_vegas" 
    expiresAt "1713787500000"
  EXPIRE reservation:res_abc123 600
```

### Idempotency Cache
```
Key: idempotent:{idempotencyKey}
Type: STRING (JSON)
Value: {
  "status": "completed",
  "orderId": "order_xyz789",
  "result": { ... payment result ... }
}
TTL: 86400 seconds (24 hours)

EXAMPLE:
  SET idempotent:idem_abc123def456 
      '{"status":"completed","orderId":"order_xyz789"}'
      EX 86400
```

### Session to Reservations Index
```
Key: user:reservations:{userId}
Type: SET (list of reservation IDs)
Value: ["res_abc123def456", "res_def456ghi789"]
TTL: 600 seconds (10 minutes)

EXAMPLE:
  SADD user:reservations:user_12345 res_abc123def456
  EXPIRE user:reservations:user_12345 600
```

---

## 4. Database Indexes

```javascript
// Reservations collection
db.reservations.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 } // TTL index - MongoDB auto-deletes expired docs
);

db.reservations.createIndex(
  { reservationId: 1 },
  { unique: true }
);

db.reservations.createIndex(
  { userId: 1, status: 1 }
);

// Seats collection
db.seats.createIndex(
  { eventId: 1, sectionId: 1, status: 1 }
);

db.seats.createIndex(
  { seatId: 1 },
  { unique: true }
);

// Orders collection
db.orders.createIndex(
  { userId: 1, createdAt: -1 }
);

db.orders.createIndex(
  { "payment.idempotencyKey": 1 },
  { unique: true, sparse: true }
);

db.orders.createIndex(
  { eventId: 1, status: 1 }
);
```

---

## 5. API Endpoints

### POST /api/reserve
**Purpose**: Reserve a seat with distributed locking
**Request**:
```json
{
  "eventId": "concert_2026_vegas",
  "seatId": "s_101_a_120"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "reservationId": "res_abc123def456",
  "seatDetails": {
    "section": "s_101",
    "row": "a",
    "number": 120,
    "price": 150.00
  },
  "expiresAt": "2026-04-22T14:35:00Z",
  "expiresInSeconds": 600
}
```

**Response (409 Conflict)** - Seat already locked:
```json
{
  "success": false,
  "error": "SEAT_LOCKED",
  "message": "Another user is completing their purchase for this seat",
  "retryAfter": 5
}
```

---

### POST /api/confirm-purchase
**Purpose**: Complete payment and convert reservation to order
**Request**:
```json
{
  "reservationId": "res_abc123def456",
  "paymentToken": "tok_visa_4242",
  "idempotencyKey": "idem_abc123def456",
  "billingDetails": {
    "email": "user@example.com",
    "phone": "+1234567890"
  }
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "orderId": "order_xyz789",
  "tickets": [{
    "ticketId": "ticket_qwerty123",
    "qrCode": "data:image/png;base64,iVBORw0KG...",
    "pdf": "https://tickets.example.com/ticket_qwerty123.pdf"
  }],
  "total": 150.00
}
```

**Response (409 Conflict)** - Reservation expired:
```json
{
  "success": false,
  "error": "RESERVATION_EXPIRED",
  "message": "Your 10-minute reservation has expired"
}
```

---

### GET /api/reservation/:reservationId
**Purpose**: Check reservation status and time remaining
**Response**:
```json
{
  "reservationId": "res_abc123def456",
  "status": "ACTIVE",
  "seatId": "s_101_a_120",
  "expiresAt": "2026-04-22T14:35:00Z",
  "expiresInSeconds": 450
}
```

---

### WebSocket: /socket.io

**Event: seat:status-change**
Broadcast to all connected clients when a seat status changes
```json
{
  "event": "seat:status-change",
  "seatId": "s_101_a_120",
  "status": "SOLD",
  "timestamp": "2026-04-22T14:25:00Z"
}
```

**Event: seat:lock**
Notify others when a seat is being purchased
```json
{
  "event": "seat:lock",
  "seatId": "s_101_a_120",
  "status": "RESERVED",
  "expiresInSeconds": 600
}
```

**Event: seat:release**
Notify when a reservation expires
```json
{
  "event": "seat:release",
  "seatId": "s_101_a_120",
  "status": "AVAILABLE",
  "reason": "reservation_expired"
}
```

---

## 6. Performance Considerations

### Latency Budget
- Seat lock acquisition: **< 50ms**
- Reservation creation: **< 100ms**
- Total reserve endpoint: **< 200ms**
- Payment processing: **< 2s** (gateway dependent)

### Throughput Target
- Peak: **10,000 concurrent users** attempting to click seats
- Reservation rate: **1,000 operations/second**
- Order completion rate: **100 orders/second**

### Optimization Strategies

1. **Redis Caching Layer**
   - Keep active reservations in Redis (fast lookup)
   - Copy to MongoDB for durability
   - Dual-write pattern for consistency

2. **Connection Pooling**
   - Redis: 20 connections
   - MongoDB: 50 connections
   - HTTP (payment gateway): 10 connections

3. **Batch Operations**
   - Aggregate WebSocket broadcasts (batch every 100ms)
   - Use MongoDB bulk writes for order creation

4. **CDN for Static Assets**
   - QR code generation → cache at edge
   - Ticket PDFs → serve from S3 CloudFront

---

## 7. Error Handling & Resilience

### Idempotency Keys
Every payment request uses an idempotency key to ensure that:
- Duplicate requests return the same result (no double-charging)
- Cache hits avoid re-processing payments
- Safe for retries

### Reservation Expiration Handling
```javascript
// Automatic cleanup via MongoDB TTL index
db.reservations.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Fallback: Background worker cleans up expired reservations
// every 30 seconds and releases seats back to AVAILABLE
```

### Payment Webhook Verification
- All webhooks verified using HMAC-SHA256 signature
- Stripe/Paystack signature validated before processing
- Webhook deduplication using event ID in Redis

---

## 8. Security Measures

### Rate Limiting
```
- Reserve endpoint: 5 requests/minute per user
- Confirm purchase: 3 requests/minute per session
- Payment endpoint: 10 requests/day per user
```

### JWT Ticket Token
```javascript
{
  iss: "concert.example.com",
  aud: "venue_scanner",
  sub: "ticket_qwerty123",
  userId: "user_12345",
  eventId: "concert_2026_vegas",
  seatId: "s_101_a_120",
  seatNumber: 120,
  iat: 1713786900,
  exp: 1744322900 // 1 year expiration
}
```

### QR Code Security
- Generated server-side with unique identifier
- Links to verify endpoint that checks ticket status
- Prevents screenshot duplication through one-time scanning flag

---

## 9. Deployment Architecture

```
                         ┌─────────────┐
                         │  CloudFlare │
                         │    CDN      │
                         └──────┬──────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              ┌─────▼──┐   ┌────▼────┐ ┌──▼─────┐
              │ Node.js│   │   Node  │ │ Node   │
              │Instance│   │ Instance│ │Instance│
              │   1    │   │    2    │ │   3    │
              └────┬───┘   └────┬────┘ └──┬─────┘
                   │           │         │
        ┌──────────┴───────────┴─────────┴──────┐
        │                                       │
   ┌────▼────┐                          ┌──────▼──┐
   │  Redis  │                          │ MongoDB │
   │ Cluster │                          │Replica  │
   │(Cashier │                          │ Set     │
   │ Rules)  │                          │         │
   └─────────┘                          └─────────┘
        │
        └─────► Background Workers (BullMQ)
                ├─ TTL Expiration Handler
                ├─ Webhook Processor
                └─ Ticket Generator
```

---

## 10. Testing Strategy

### Unit Tests
- Lock acquisition logic
- Idempotency key parsing
- JWT generation/validation

### Integration Tests
- Complete reserve → confirm flow
- Concurrent seat reservations
- TTL expiration cleanup
- WebSocket broadcast accuracy

### Load Tests
- 10,000 concurrent reservation attempts
- Verify only 1,000 seats get reserved (distribution)
- Measure p95 latency: < 200ms

### Chaos Engineering
- Redis failure → graceful fallback to direct DB
- MongoDB downtime → memory queue until recovery
- Payment gateway timeout → automatic retry with exponential backoff

---


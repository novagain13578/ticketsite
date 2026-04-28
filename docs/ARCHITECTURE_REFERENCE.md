# Ticketmaster Checkout System - Visual Architecture & Checklists

## System Components Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                     TICKETMASTER-STYLE CHECKOUT SYSTEM                     ║
║                          Production Architecture                           ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─ FRONTEND (User-Facing) ─────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐                     │
│  │  Seat Selection      │    │  Checkout Overlay    │                     │
│  │  ────────────────    │    │  ──────────────────  │                     │
│  │  - Venue Map         │───▶│  - Payment Form      │                     │
│  │  - Section Details   │    │  - Countdown Timer   │                     │
│  │  - Price Display     │    │  - QR Code Display   │                     │
│  └──────────────────────┘    └─────────┬────────────┘                     │
│                                        │                                   │
│                         WebSocket Connection (Socket.IO)                   │
│                                        │                                   │
└────────────────────────────────────────┼───────────────────────────────────┘
                                         │
                                    HTTP REST
                                         │
┌─ BACKEND (Node.js/Express) ──────────┼──────────────────────────────────┐
│                                       ▼                                    │
│  ┌───────────────────────────────────────────────────────────┐            │
│  │            Express Route Handlers                         │            │
│  │  ──────────────────────────────────────────────────      │            │
│  │  • POST /api/reserve          (Seat Locking)            │            │
│  │  • POST /api/confirm-purchase (Payment Processing)       │            │
│  │  • POST /api/validate-ticket  (Verification)            │            │
│  │  • GET  /api/health           (Monitoring)              │            │
│  └──────────────┬────────────────────────────────────┬──────┘            │
│                 │                                    │                     │
│      ┌──────────▼──────────┐         ┌──────────────▼──────────┐          │
│      │   Redis Client      │         │   Socket.IO Handler     │          │
│      │  ──────────────     │         │  ─────────────────────  │          │
│      │  • Seat Locks       │         │  • Broadcast updates    │          │
│      │  • Reservation TTL  │         │  • Room management      │          │
│      │  • Idempotency Key  │         │  • Connection pooling   │          │
│      └──────────┬──────────┘         └────────────────┬────────┘          │
│                 │                                     │                    │
└─────────────────┼─────────────────────────────────────┼────────────────────┘
                  │                                     │
          ┌───────▼─────────┐                  ┌────────▼────────┐
          │   Redis Cache   │                  │  Socket.IO Rooms│
          │  ───────────    │                  │  ─────────────  │
          │  • seat:lock:*  │                  │  /event/{id}    │
          │  • reservation:*│                  │  /user/{id}     │
          │  • idempotent:* │                  └─────────────────┘
          │  • TTL 30-600s  │
          └────────────────┘
                  │
          ┌───────▼───────────────────────────────────────────┐
          │        Database Layer (MongoDB)                   │
          │        ───────────────────────────────────────   │
          │                                                   │
          │  ┌──────────────┐   ┌──────────────┐             │
          │  │  Seats       │   │ Reservations │             │
          │  │  ────────    │   │ ────────────  │             │
          │  │  _id         │   │ _id          │             │
          │  │  seatId ✓*   │   │ reservationId│             │
          │  │  eventId *   │   │ userId       │             │
          │  │  sectionId   │   │ seatId       │             │
          │  │  status      │   │ expiresAt ✓△ │             │
          │  │  price       │   │ status       │             │
          │  │  soldTo      │   │ createdAt    │             │
          │  └──────────────┘   └──────────────┘             │
          │                                                   │
          │  ┌──────────────┐   ┌──────────────┐             │
          │  │  Orders      │   │  Tickets     │             │
          │  │  ────────    │   │  ───────────  │             │
          │  │  _id         │   │  _id         │             │
          │  │  orderId ✓*  │   │  ticketId ✓* │             │
          │  │  userId *    │   │  jwt         │             │
          │  │  items[]     │   │  qrCode      │             │
          │  │  payment     │   │  scanned     │             │
          │  │  status      │   │  createdAt   │             │
          │  │  createdAt   │   │  expiresAt   │             │
          │  └──────────────┘   └──────────────┘             │
          │                                                   │
          │  Legend: ✓ = Unique Index, * = Compound Index    │
          │          △ = TTL Index (auto-delete)             │
          └───────────────────────────────────────────────────┘
                              │
┌─ EXTERNAL SERVICES ────────┼────────────────────────────────┐
│                             ▼                                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │        Stripe Payment Gateway                        │    │
│  │  ────────────────────────────────────────────────   │    │
│  │  POST /v1/charges                                    │    │
│  │  • Idempotency key protection                        │    │
│  │  • Card validation                                   │    │
│  │  • Webhook callbacks                                 │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │        BullMQ Worker (Job Queue)                     │    │
│  │  ───────────────────────────────────────────────    │    │
│  │  • TTL Cleanup Job (every 30 seconds)                │    │
│  │    - Query expired reservations                      │    │
│  │    - Release seat locks                              │    │
│  │    - Broadcast to WebSocket clients                  │    │
│  │                                                      │    │
│  │  • Async Tasks Queue                                 │    │
│  │    - Send confirmation emails                        │    │
│  │    - Log analytics events                            │    │
│  │    - Update external systems                         │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Request-Response Flow

```
                    USER INTERACTION
                           │
                           ▼
        ┌──────────────────────────────────┐
        │  Step 1: SEAT SELECTION          │
        │  ──────────────────────────────  │
        │  User clicks seat on mobile      │
        │                                   │
        │  Frontend action:                │
        │  → POST /api/reserve             │
        │    {eventId, seatId, userId}    │
        └────────────┬─────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────────────┐
        │  Step 2: DISTRIBUTED LOCK ACQUISITION   │
        │  ─────────────────────────────────────   │
        │  Backend receives reserve request       │
        │                                          │
        │  1. Try Redis LOCK:                      │
        │     SET seat:lock:ABC user:session       │
        │         NX EX 30                         │
        │     ✓ Lock acquired? → Continue ✓        │
        │     ✗ Lock exists? → 409 Conflict ✗     │
        │                                          │
        │  2. Fetch seat from MongoDB:             │
        │     status = AVAILABLE? → Continue ✓     │
        │     status != AVAILABLE? → 409 ✗        │
        │                                          │
        │  3. Create Reservation in MongoDB:       │
        │     INSERT {                             │
        │       reservationId,                     │
        │       seatId,                            │
        │       expiresAt: NOW + 10min,    ◄─ TTL │
        │       createdAt: NOW                     │
        │     }                                    │
        │                                          │
        │  4. Cache in Redis:                      │
        │     HSET reservation:ID                  │
        │     EXPIRE 600 seconds                   │
        │                                          │
        │  5. Update Seat Status:                  │
        │     UPDATE seats                         │
        │     SET status = 'RESERVED'              │
        │                                          │
        │  Response:                               │
        │  ← 201 CREATED                           │
        │    {                                     │
        │      reservationId,                      │
        │      expiresAt: "2026-04-22T14:35:00Z",  │
        │      expiresInSeconds: 600               │
        │    }                                     │
        └────────────┬─────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────┐
        │  Step 3: COUNTDOWN TIMER         │
        │  ────────────────────────────   │
        │  Frontend starts 10-min timer   │
        │  Updates every 1 second         │
        │  Shows WARNING at 2 min         │
        │  Shows CRITICAL at 30 sec       │
        │                                  │
        │  User can:                       │
        │  → Complete payment (go to 4)   │
        │  → Abandon (timer → 0:00)       │
        │  → Timeout (automatic cleanup) │
        └────────────┬─────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   USER PAYS (4A)         TIMER EXPIRES (4B)
          │                     │
          ▼                     ▼
┌─────────────────────┐  ┌──────────────────┐
│ Step 4A: PAYMENT    │  │ Step 4B: CLEANUP │
│ ─────────────────   │  │ ────────────────  │
│ User enters card    │  │ MongoDB TTL +     │
│                     │  │ BullMQ worker:    │
│ POST /confirm-pay   │  │                   │
│ {                   │  │ UPDATE seats:     │
│   reservation ID,   │  │ status='AVAIL'    │
│   payment token,    │  │                   │
│   idempotency key   │  │ DEL Redis locks   │
│ }                   │  │                   │
│                     │  │ Broadcast to all  │
│ Idempotency check:  │  │ connected users:  │
│ EXISTS cached? ✓    │  │ "Seat available"  │
│   → Return cached   │  │                   │
│   → No new charge   │  │ Repeat every 30s  │
│                     │  │ until all cleanup │
│ Process payment:    │  │ done              │
│ Stripe.charges      │  └──────────────────┘
│ .create() ✓         │
│                     │
│ Update DB:          │
│ - Create Order      │
│ - Create Ticket     │
│ - Update Seat.sold  │
│ - Sign JWT + QR     │
│                     │
│ Cache result:       │
│ SET idempotent:ID   │
│ {orderId, ticket}   │
│ EX 86400            │
│                     │
│ Cleanup Redis:      │
│ DEL seat:lock:ABC   │
│ DEL reservation:ID  │
│                     │
│ Broadcast via WS:   │
│ "Seat SOLD"         │
│                     │
│ Response:           │
│ ← 200 OK            │
│   {                 │
│     orderId,        │
│     ticket {        │
│       qrCode,       │
│       jwt           │
│     }               │
│   }                 │
└─────────────────────┘
          │
          ▼
     Success Screen
     - Show QR
     - Download ticket
     - Email link
```

---

## TTL Expiration Worker Timeline

```
┌─────────────────────────────────────────────────────────────┐
│            10-MINUTE RESERVATION LIFECYCLE                  │
└─────────────────────────────────────────────────────────────┘

T+0min    User reserves seat
│         ├─ Seat status: AVAILABLE → RESERVED
│         ├─ Reservation created (expiresAt: T+10min)
│         ├─ Redis lock set (expires in 30s)
│         └─ Timer starts on frontend

T+2min    Warning in UI (2:08 remaining)
│         └─ Timer turns yellow

T+5min    User enters payment form
│         └─ 5 minutes left

T+5:30min Payment processing starts
│         └─ Stripe API call in progress

T+5:40min Payment succeeds
│         ├─ Seat status: RESERVED → SOLD
│         ├─ Order created in MongoDB
│         ├─ Ticket generated
│         ├─ Redis lock deleted
│         ├─ Reservation deleted
│         └─ WebSocket broadcast: "SEAT_SOLD"
│            All users see this seat locked

T+9:30min TTL cleanup worker runs (every 30s)
│         ├─ Query: {status: ACTIVE, expiresAt < NOW}
│         ├─ Result: [] (no expired reservations)
│         └─ No action needed

T+10min   [If payment not completed]
│         ├─ MongoDB TTL index triggers
│         │  └─ Deletes reservation document
│         │
│         ├─ BullMQ worker also runs
│         │  └─ Releases seat lock from Redis
│         │  └─ Sets Seat.status back to AVAILABLE
│         │
│         ├─ Frontend timer reaches 0:00
│         │  └─ Shows "Reservation expired"
│         │  └─ Clears UI
│         │  └─ Redirects to seat selection
│         │
│         └─ WebSocket broadcasts:
│            "SEAT_AVAILABLE" {seatId: ABC}
│            All users can now click this seat again

T+10:05min Second TTL cleanup worker check
│         ├─ Query: {status: ACTIVE, expiresAt < NOW}
│         ├─ Result: [] (already cleaned)
│         └─ Complete


EDGE CASE: Multiple Cleanups
─────────────────────────────

Worker runs every 30 seconds:
  T+9:30min  ✓ Check 1: No expired
  T+10:00min ✓ Check 2: Found expired, cleanup
  T+10:30min ✓ Check 3: No expired (already cleaned)


EDGE CASE: High Volume Cleanup
──────────────────────────────

If 10,000 reservations expire at once:
  ├─ Worker queries: {status: ACTIVE, expiresAt < NOW}
  ├─ Result: [Res1, Res2, ..., Res10000]
  ├─ For each reservation (batched in groups of 100):
  │  ├─ UPDATE Seat.status = AVAILABLE
  │  ├─ DELETE reservation
  │  ├─ DEL Redis locks
  │  └─ Broadcast to WebSocket
  └─ Complete in <5 seconds (with proper indexing)
```

---

## State Transitions Diagram

```
┌──────────────────────────────────────────────────────────┐
│           SEAT STATUS STATE MACHINE                      │
└──────────────────────────────────────────────────────────┘

                    AVAILABLE
                        │
                POST /reserve
                        │
                        ▼
                    RESERVED ◄─── [User abandons]
                        │         [TTL expires]
                        │         [Back to AVAILABLE]
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   [Lock      [Payment        [Timeout]
    fails]     succeeds]
        │               │
        ▼               ▼
    UNAVAILABLE     SOLD ─────X
                    (Permanent)
```

---

## Performance Optimization Flowchart

```
                    SLOW API RESPONSE?
                            │
                            ▼
                    Is it /reserve?
                   /           \
                 YES             NO
                 │               │
                 ▼               ▼
            ┌─────────┐   Is it /confirm-purchase?
            │ MongoDB │  /            \
            │ Index?  │ YES            NO
            └────┬────┘ │              │
                 │      ▼              ▼
            ✓Check  Stripe    Rate
            Seat    Timeout?  Limited?
            Index   /    \    /    \
                   YES   NO  YES   NO
                   │     │   │     │
                   ▼     ▼   ▼     ▼
                   Retry Add  Check
                   Pool  Retri Conn
                       es    Pool


                    REDIS LATENCY?
                            │
                            ▼
                    Check Connection
                   /         │      \
                Local      Cloud   Cluster
                │            │         │
                ▼            ▼         ▼
              <5ms        <20ms      <50ms
              ✓OK         ✓OK         ⚠ Warn
```

---

## Deployment Environment Checklist

### Local Development
```
✓ MongoDB (local or Atlas)
✓ Redis (local or Redis Cloud)
✓ Node.js v16+
✓ .env file configured
✓ Stripe test keys
✓ Frontend build (npm run build)
→ Start: npm run dev
```

### Docker Compose (Recommended)
```
✓ Docker installed
✓ docker-compose.yml configured
✓ Environment variables set
✓ Port 3000 available
✓ Network connectivity test
→ Start: docker-compose up -d
→ Check: curl localhost:3000/health
```

### Heroku (Production-like)
```
✓ Heroku CLI installed
✓ MongoDB Atlas link
✓ RedisCloud link
✓ Stripe live keys (only!)
✓ CORS whitelist configured
✓ Health check endpoint
→ Deploy: git push heroku main
→ Logs: heroku logs --tail
```

### AWS (Enterprise Scale)
```
✓ EC2 instance(s)
✓ RDS for DB (optional)
✓ ElastiCache for Redis
✓ ALB + Security Groups
✓ IAM roles & policies
✓ CloudWatch monitoring
✓ Auto-scaling groups
→ Deploy: CI/CD pipeline (GitHub Actions/CodeDeploy)
```

---

## Monitoring & Alerts Dashboard

```
╔════════════════════════════════════════════════╗
║  TICKETMASTER CHECKOUT - METRICS DASHBOARD    ║
╠════════════════════════════════════════════════╣
║                                                ║
║  🟢 RESERVE ENDPOINT                          ║
║  ├─ P50: 42ms        [████░░░░░░]  ✓ OK      ║
║  ├─ P95: 85ms        [█████░░░░░░]  ✓ OK      ║
║  ├─ P99: 150ms       [██████░░░░░]  ✓ OK      ║
║  ├─ Success Rate: 99.2%  [████████░░] ✓ OK   ║
║  └─ RPS: 45/50       [█████████░░]  ✓ OK      ║
║                                                ║
║  🟡 CONFIRM PURCHASE ENDPOINT                 ║
║  ├─ P50: 1.2s        [██████░░░░░] ⚠ Warn    ║
║  ├─ P95: 2.1s        [██████░░░░░] ⚠ Warn    ║
║  ├─ P99: 4.5s        [██████████░] ⚠ Warn    ║
║  ├─ Success Rate: 94.8%  [████████░░] ✓ OK   ║
║  └─ RPS: 8.5/10      [████████░░░]  ✓ OK      ║
║                                                ║
║  🟢 REDIS CACHE                               ║
║  ├─ Connections: 24/50    [██████░░░░░░] ✓  ║
║  ├─ Memory: 128MB/1GB     [░░░░░░░░░░░░░░░░ ║
║  ├─ Hit Rate: 96.2%       [█████████░░░░░] ✓ ║
║  └─ Latency: 2.3ms        [░░░░░░░░░░░░░░░░ ║
║                                                ║
║  🟢 MONGODB                                    ║
║  ├─ Query Time: avg 12ms  [███░░░░░░░░░░░░░ ║
║  ├─ Connection Pool: 32/50 [███████░░░░░░░░ ║
║  ├─ Data Size: 4.2GB/10GB [██░░░░░░░░░░░░░░ ║
║  └─ TTL Cleanup: 100% ops [█████████████████ ║
║                                                ║
║  🟢 STRIPE INTEGRATION                        ║
║  ├─ Webhook Lag: 150ms    [█░░░░░░░░░░░░░░░░ ║
║  ├─ Success Rate: 95.7%   [████████░░░░░░░░ ║
║  └─ Failed Webhooks: 2    [░░░░░░░░░░░░░░░░ ║
║                                                ║
║  🟢 WEBSOCKET                                  ║
║  ├─ Connected Users: 3847 [█░░░░░░░░░░░░░░░░ ║
║  ├─ Broadcast Latency: 4ms [░░░░░░░░░░░░░░░░ ║
║  └─ Message Queue: 0      [░░░░░░░░░░░░░░░░ ║
║                                                ║
╚════════════════════════════════════════════════╝

ALERT THRESHOLDS:
  🔴 RED:    Response time >2s, Error rate >5%, RPS <50% capacity
  🟡 YELLOW: Response time >1s, Error rate >1%, Memory >80%
  🟢 GREEN:  Everything nominal
```

---

## Integration With Existing System

```
┌─────────────────────────────────────────────────┐
│   YOUR CURRENT TICKETING SYSTEM                │
│   (seat-selection.js, tickets-vegas.html, etc) │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────▼────────────────┐
        │ ADD CHECKOUT SYSTEM     │
        │ ──────────────────────  │
        │ 1. Import CSS           │
        │    <link rel="stylesheet"
        │     href="checkout-overlay.css">
        │                         │
        │ 2. Import JS           │
        │    <script src="checkout-
        │     frontend.jsx"></script>
        │                         │
        │ 3. Open on seat click  │
        │    checkout.open({      │
        │      seatDetails,       │
        │      reservationDetails │
        │    })                   │
        │                         │
        │ 4. Start backend server│
        │    npm start            │
        │                         │
        │ 5. Configure Socket.IO │
        │    const io = require   │
        │    ("socket.io")        │
        └────────┬────────────────┘
                 │
        ┌────────▼──────────┐
        │ FULLY INTEGRATED  │
        │ ✓ Mobile ready   │
        │ ✓ Desktop ready  │
        │ ✓ Real-time      │
        │ ✓ Payments       │
        │ ✓ Tickets        │
        └───────────────────┘
```

---

## Rollback Plan

```
ISSUE DETECTED: Payment processing failing

Step 1: Check Status
  - Stripe API status page
  - Application logs
  - Redis connection
  - MongoDB connection

Step 2: Quick Fix (1-5 minutes)
  - Restart Redis: `redis-cli SHUTDOWN && redis-server`
  - Restart MongoDB: `systemctl restart mongod`
  - Restart Node app: `npm restart`

Step 3: Rollback (5-30 minutes)
  - Keep previous Docker image tagged
  - `docker pull concert:v1.0.0` (previous stable)
  - `docker-compose down` (stop current)
  - Update docker-compose.yml to v1.0.0
  - `docker-compose up` (start previous)

Step 4: Investigate (Ongoing)
  - Check error logs
  - Review database state
  - Check payment provider status
  - Run unit tests

Step 5: Communicate
  - Notify users (maintenance message)
  - Update status page
  - Send email notification
```

---

## Security Hardening Checklist

```
┌─ INFRASTRUCTURE ────────────────────────────┐
│ ☐ Enable HTTPS/TLS 1.3+                    │
│ ☐ Configure firewall rules                 │
│ ☐ Enable VPN for database access           │
│ ☐ Set up DDoS protection (Cloudflare)      │
│ ☐ Enable rate limiting (10 req/min/user)   │
│ ☐ Configure CORS whitelist                 │
└─────────────────────────────────────────────┘

┌─ APPLICATION ───────────────────────────────┐
│ ☐ Validate all inputs server-side          │
│ ☐ Implement CSRF protection                │
│ ☐ Use secure cookies (httpOnly, secure)    │
│ ☐ Implement JWT signing                    │
│ ☐ Add request signing (hmac-sha256)        │
│ ☐ Sanitize error messages                  │
└─────────────────────────────────────────────┘

┌─ DATA PROTECTION ───────────────────────────┐
│ ☐ Encrypt sensitive data at rest           │
│ ☐ Use TLS for transit (DB, Redis, API)     │
│ ☐ Rotate API keys quarterly                │
│ ☐ Enable database backups (daily)          │
│ ☐ Enable point-in-time recovery            │
│ ☐ Audit user activity                      │
└─────────────────────────────────────────────┘

┌─ PAYMENT SECURITY ──────────────────────────┐
│ ☐ Never store raw card data                │
│ ☐ Use Stripe tokenization only             │
│ ☐ Implement 3D Secure (SCA required)       │
│ ☐ Validate webhook signatures              │
│ ☐ Implement PCI compliance logging         │
│ ☐ Monitor for fraud patterns               │
└─────────────────────────────────────────────┘
```

---

**Last Updated:** April 2026  
**Version:** 1.0.0-complete
**Status:** ✅ Ready for Implementation

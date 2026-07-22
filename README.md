<div align="center">

# 🏨 HavenStay

### A production-inspired full-stack hotel booking platform

[![CI](https://github.com/himanshu/havenstay/actions/workflows/ci.yml/badge.svg)](https://github.com/himanshu/havenstay/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-brightgreen.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg?logo=mongodb&logoColor=white)](https://mongodb.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Secure authentication · Real-time booking management · Concurrency-safe reservations · Dockerized deployment · Scalable REST API**

[Live Demo](https://client-frn6kczqo-friedrick2003s-projects.vercel.app) · [API Health](https://havenstay-backend-production.up.railway.app/api/health) · [Report Bug](https://github.com/himanshu/havenstay/issues/new?template=bug_report.md) · [Request Feature](https://github.com/himanshu/havenstay/issues/new?template=feature_request.md)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Engineering Highlights](#-key-engineering-highlights)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Authentication Flow](#-authentication-flow)
- [Booking Flow](#-booking-flow)
- [Docker Setup](#-docker-setup)
- [Deployment](#-deployment)
- [Database Schema](#-database-schema)
- [Design Decisions](#-design-decisions)
- [Future Improvements](#-future-improvements)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

HavenStay is a full-stack hotel booking platform built to demonstrate production engineering practices. It supports end-to-end hotel discovery, room booking with Razorpay payment processing, JWT-based authentication with role-based access control, and a complete admin dashboard.

The project prioritises engineering quality over feature breadth — every layer reflects decisions you'd make at a real company: atomic concurrency control, structured logging, environment variable validation, graceful shutdown, and clean separation of concerns.

**Demo Accounts**

| Role  | Email                   | Password   |
|-------|-------------------------|------------|
| Admin | admin@havenstay.com     | Admin@123  |
| User  | demo@havenstay.com      | Demo@1234  |

---

## ⚙️ Key Engineering Highlights

### 🔒 Concurrency-Safe Booking (No Double Bookings)
Uses MongoDB's atomic `findOneAndUpdate` with `$nin` conflict detection. Two simultaneous requests for the same room and dates result in **exactly one success and one `409 Conflict`** — without distributed locks or external coordination.

```js
// Critical section: $nin check + $addToSet in a single atomic operation
await Room.findOneAndUpdate(
  { _id: roomId, 'roomNumbers.bookedDates': { $nin: requestedDates } },
  { $addToSet: { 'roomNumbers.$.bookedDates': { $each: requestedDates } } },
);
```

### 🔑 JWT Authentication with Refresh Token Rotation
- **Access tokens** (15 min) stored in `httpOnly` cookies — never exposed to JavaScript
- **Refresh tokens** (7 days) stored as bcrypt hashes in MongoDB — raw tokens are never persisted
- On each refresh, the old token is invalidated (rotation) — prevents replay attacks
- Logout nullifies the stored hash — tokens cannot be reused after logout

### 📦 In-Memory Caching with node-cache
Hotel listings and detail pages are cached with per-query cache keys. Cache is invalidated on any mutation (create/update/delete). Architecture is designed to swap node-cache for Redis in multi-instance deployments with a single adapter change.

### 🛡️ Security-First Design
- `helmet()` — 14 security headers (CSP, HSTS, X-Frame-Options, etc.)
- `express-rate-limit` — separate stricter limits for auth endpoints vs. general API
- Input validation on all mutating endpoints (Joi + express-validator)
- Soft-delete pattern — data integrity preserved for historical bookings
- Bcrypt cost factor 12 for password hashing

### 📊 Structured Logging
Pino JSON logger with per-request IDs (`X-Request-Id` header) for distributed tracing. Log level configurable via `LOG_LEVEL` env var.

---

## 🛠 Tech Stack

| Layer          | Technology                                          |
|----------------|-----------------------------------------------------|
| **Frontend**   | React 18, React Router v6, Context API              |
| **Backend**    | Node.js 20, Express.js 4                            |
| **Database**   | MongoDB 6, Mongoose 8 (Atlas in production)         |
| **Auth**       | JWT (dual-token), bcryptjs, httpOnly cookies        |
| **Payments**   | Razorpay (order creation + HMAC signature verify)   |
| **Caching**    | node-cache (in-process, Redis-ready interface)      |
| **Logging**    | Pino + pino-http (structured JSON)                  |
| **Security**   | Helmet, CORS, express-rate-limit, input validation  |
| **DevOps**     | Docker, docker-compose, GitHub Actions CI           |
| **Deployment** | Railway (backend), Vercel (frontend), MongoDB Atlas |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│   React 18 · React Router · Context API · Fetch API     │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Express.js API                        │
│                                                         │
│  Middleware Stack (in order):                           │
│  pino-http → helmet → cors → compression →              │
│  cookie-parser → express.json → morgan → rate-limit     │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │  /auth   │  │ /hotels  │  │  /rooms  │  │/booking│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘ │
│       │             │              │             │      │
│  ┌────▼─────────────▼──────────────▼─────────────▼───┐ │
│  │              Controllers                          │ │
│  │  authController · hotelController ·               │ │
│  │  roomController · bookingController               │ │
│  └───────────────────────┬───────────────────────────┘ │
│                           │                             │
│  ┌─────────┐  ┌──────────▼──────────┐  ┌───────────┐  │
│  │  Cache  │  │   Mongoose Models    │  │ Razorpay  │  │
│  │node-cache│  │ User·Hotel·Room·     │  │  Payment  │  │
│  └─────────┘  │     Booking          │  │ Gateway   │  │
│               └──────────┬──────────┘  └───────────┘  │
└──────────────────────────┼─────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │       MongoDB          │
              │  (Atlas / local /      │
              │   Docker container)    │
              └────────────────────────┘
```

---

## 📁 Folder Structure

```
havenstay/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                  # GitHub Actions — test (Node 18+20) + client build
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── client/                         # React frontend (Create React App)
│   └── src/
│       ├── api/                    # Typed fetch wrapper + all API calls
│       ├── components/             # Navbar, CustomCursor, shared UI
│       ├── context/                # AuthContext (session restore + state)
│       ├── hooks/                  # useFetch, useHotels, useRooms, useMyBookings
│       └── pages/                  # Home, Hotels, HotelDetail, Auth, Bookings, Admin
│
├── server/                         # Node.js + Express REST API
│   ├── config/
│   │   └── index.js                # ✦ Centralised env config (single source of truth)
│   ├── constants/
│   │   └── index.js                # ✦ Shared enums + magic-number replacements
│   ├── controllers/                # Route handler logic (thin HTTP layer)
│   │   ├── authController.js
│   │   ├── bookingController.js    # ✦ Concurrency-safe atomic booking logic
│   │   ├── hotelController.js
│   │   └── roomController.js
│   ├── middleware/
│   │   ├── auth.js                 # verifyToken · verifyAdmin · optionalAuth
│   │   ├── errorHandler.js         # ✦ Global error handler (extracted for testability)
│   │   └── validate.js             # Joi request body validation middleware
│   ├── models/                     # Mongoose schemas with indexes + virtuals
│   │   ├── Booking.js
│   │   ├── Hotel.js
│   │   ├── Room.js
│   │   └── User.js
│   ├── routes/                     # Express Router — declares endpoints + middleware chain
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── hotels.js
│   │   └── rooms.js
│   ├── tests/                      # Jest integration tests (in-memory MongoDB)
│   ├── utils/
│   │   ├── errors.js               # AppError + catchAsync wrapper
│   │   └── seed.js                 # Database seeder (26 hotels, 54 rooms, 2 users)
│   ├── env.js                      # Startup env validation (exits early if vars missing)
│   ├── logger.js                   # Pino structured logger + pino-http middleware
│   └── server.js                   # App bootstrap (middleware stack + route mounting)
│
├── Dockerfile                      # Multi-stage build, non-root USER, HEALTHCHECK
├── docker-compose.yml              # Local stack: mongo + api with health dependencies
├── .dockerignore
├── CONTRIBUTING.md
└── LICENSE
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local) **or** a [MongoDB Atlas](https://cloud.mongodb.com) URI

### 1. Clone & Install

```bash
git clone https://github.com/himanshu/havenstay.git
cd havenstay
npm run install:all
```

### 2. Configure the Server

```bash
cp server/.env.example server/.env
```

Edit `server/.env` — at minimum, set:

```env
MONGO_URI=mongodb://127.0.0.1:27017/havenstay
JWT_ACCESS_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<run the same command again for a different value>
```

### 3. Seed the Database

```bash
npm run seed
```

Creates 26 hotels, 54 rooms, an admin user, and a demo user.

### 4. Start Development Servers

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| React client | http://localhost:3000 |
| API server | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

---

## 🔑 Environment Variables

### `server/.env`

| Variable               | Required | Default      | Description |
|------------------------|----------|--------------|-------------|
| `PORT`                 | No       | `5000`       | HTTP server port |
| `NODE_ENV`             | No       | `development`| `development` \| `production` \| `test` |
| `LOG_LEVEL`            | No       | `debug` (dev), `info` (prod) | Pino log level |
| `MONGO_URI`            | **Yes**  | —            | MongoDB connection string |
| `JWT_ACCESS_SECRET`    | **Yes**  | —            | 64-byte hex secret for access tokens |
| `JWT_REFRESH_SECRET`   | **Yes**  | —            | 64-byte hex secret for refresh tokens |
| `JWT_ACCESS_EXPIRES`   | No       | `15m`        | Access token expiry |
| `JWT_REFRESH_EXPIRES`  | No       | `7d`         | Refresh token expiry |
| `RAZORPAY_KEY_ID`      | No*      | —            | Razorpay API key (*required for payments) |
| `RAZORPAY_KEY_SECRET`  | No*      | —            | Razorpay secret (*required for payments) |
| `CLIENT_URL`           | No       | `http://localhost:3000` | CORS allowed origin |

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📡 API Reference

All responses follow a consistent envelope:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Human-readable error" }
```

### Authentication

| Method | Endpoint              | Access | Description |
|--------|-----------------------|--------|-------------|
| POST   | `/api/auth/register`  | Public | Register new user |
| POST   | `/api/auth/login`     | Public | Login, set token cookies |
| POST   | `/api/auth/refresh`   | Public | Rotate refresh token |
| POST   | `/api/auth/logout`    | Auth   | Invalidate tokens |
| GET    | `/api/auth/me`        | Auth   | Get current user profile |

### Hotels

| Method | Endpoint              | Access | Description |
|--------|-----------------------|--------|-------------|
| GET    | `/api/hotels`         | Public | List hotels (filters + pagination) |
| GET    | `/api/hotels/:id`     | Public | Single hotel with rooms |
| POST   | `/api/hotels`         | Admin  | Create hotel |
| PUT    | `/api/hotels/:id`     | Admin  | Update hotel |
| DELETE | `/api/hotels/:id`     | Admin  | Soft-delete hotel |

**Query params for `GET /api/hotels`:**
`city`, `category`, `featured`, `rating`, `minPrice`, `maxPrice`, `page`, `limit`, `sort`

### Rooms

| Method | Endpoint                         | Access | Description |
|--------|----------------------------------|--------|-------------|
| GET    | `/api/rooms?hotelId=`            | Public | Rooms for a hotel (+ availability if dates supplied) |
| GET    | `/api/rooms/:id`                 | Public | Single room |
| GET    | `/api/rooms/:id/availability`    | Public | Per-room-number availability |
| POST   | `/api/rooms`                     | Admin  | Create room |
| PUT    | `/api/rooms/:id`                 | Admin  | Update room |
| DELETE | `/api/rooms/:id`                 | Admin  | Soft-delete room |

### Bookings

| Method | Endpoint                              | Access | Description |
|--------|---------------------------------------|--------|-------------|
| POST   | `/api/bookings`                       | Auth   | Create booking + Razorpay order |
| GET    | `/api/bookings/my`                    | Auth   | User's bookings |
| GET    | `/api/bookings/:id`                   | Auth   | Single booking |
| PATCH  | `/api/bookings/:id/cancel`            | Auth   | Cancel + release dates |
| POST   | `/api/bookings/:id/verify-payment`    | Auth   | Verify Razorpay signature |
| GET    | `/api/bookings`                       | Admin  | All bookings + revenue |

---

## 🔐 Authentication Flow

```
Client                              Server
  │                                   │
  │──POST /api/auth/login──────────►  │
  │      { email, password }          │
  │                                   │  1. Find user by email
  │                                   │  2. bcrypt.compare(password, hash)
  │                                   │  3. Sign accessToken  (15 min, JWT)
  │                                   │  4. Sign refreshToken (7 days, JWT)
  │                                   │  5. bcrypt.hash(refreshToken) → DB
  │  ◄──Set-Cookie: accessToken ──────│
  │  ◄──Set-Cookie: refreshToken ─────│  (both httpOnly, sameSite: strict)
  │                                   │
  │  [15 min later — token expires]   │
  │──POST /api/auth/refresh────────►  │
  │      Cookie: refreshToken         │  1. Verify refresh token JWT
  │                                   │  2. Compare against stored hash
  │                                   │  3. Issue new access + refresh tokens
  │                                   │  4. Invalidate old refresh token (rotation)
  │  ◄──Set-Cookie: new tokens────────│
```

---

## 🏷️ Booking Flow

```
Client                              Server                    MongoDB
  │                                   │                          │
  │──POST /api/bookings────────────►  │                          │
  │   { roomId, checkIn, checkOut }   │  1. Validate input       │
  │                                   │  2. Find room            ├──► Room.findOne()
  │                                   │  3. Check guest count    │
  │                                   │  4. Find free room no.   ├──► Scan roomNumbers
  │                                   │  5. Atomic claim ─────────────► findOneAndUpdate
  │                                   │     ($nin + $addToSet)   │    (409 if conflict)
  │                                   │  6. Calculate price      │
  │                                   │     (subtotal × 1.12)    │
  │                                   │  7. Create Booking doc   ├──► Booking.create()
  │                                   │  8. Init Razorpay order  │
  │  ◄──{ razorpayOrderId, amount }───│                          │
  │                                   │                          │
  │  [User completes payment in UI]   │                          │
  │──POST /api/bookings/:id/verify──► │                          │
  │   { razorpay_signature, ... }     │  1. HMAC-SHA256 verify   │
  │                                   │  2. Signature matches?   │
  │                                   │  3. booking.status =     │
  │                                   │     'confirmed'          ├──► Booking.save()
  │  ◄──{ success: true }─────────────│                          │
```

---

## 🐳 Docker Setup

```bash
# Build and start (MongoDB + API)
docker-compose up --build

# Detached mode
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop and clean up
docker-compose down -v
```

The API will be available at `http://localhost:5000`. MongoDB data is persisted in a Docker named volume (`havenstay-mongo-data`).

> **Production note:** Override JWT secrets via environment variables or a `.env` file before deploying. The docker-compose defaults are for local development only.

---

## ☁️ Deployment

### MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → Add a database user
3. **Network Access** → Allow `0.0.0.0/0` (or your server's IP)
4. **Connect** → Drivers → Copy the connection string

### Backend → Railway

1. Push this repository to GitHub
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub → select `server/`
3. Add environment variables in the Railway dashboard:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<64-byte hex>
JWT_REFRESH_SECRET=<64-byte hex>
CLIENT_URL=https://your-frontend.vercel.app
```

4. Railway auto-deploys on every push to `main`.

### Frontend → Vercel

1. [vercel.com](https://vercel.com) → New Project → Import `client/`
2. Add environment variable:
```env
REACT_APP_API_URL=https://your-backend.railway.app/api
```
3. Deploy.

---

## 🗄 Database Schema

### User
```
_id, name, email (unique), password (bcrypt, select:false),
role (user|admin), refreshTokenHash (select:false),
isActive, lastLogin, createdAt, updatedAt
```

### Hotel
```
_id, name, city (indexed), country, address, description,
photos[], rating, reviewCount, cheapestPrice (indexed),
tag, category (enum), amenities[], featured (indexed),
isActive, createdAt, updatedAt
Compound index: { city: 1, cheapestPrice: 1, rating: -1 }
```

### Room
```
_id, hotelId (ref:Hotel), title, description, price,
maxPeople, beds, photos[], amenities[],
roomNumbers: [{ number, bookedDates: Date[] }],
isActive, createdAt, updatedAt
Index: { hotelId: 1 }
```

### Booking
```
_id, userId (ref:User, indexed), hotelId (ref:Hotel),
roomId (ref:Room), roomNumber, checkIn, checkOut,
guests, nights, pricePerNight, totalPrice,
status (pending|confirmed|cancelled|completed, indexed),
razorpayOrderId, razorpayPaymentId, razorpaySignature,
cancellationReason, cancelledAt, createdAt, updatedAt
Compound indexes: { userId, createdAt }, { hotelId, status }, { checkIn, checkOut }
```

---

## 🧠 Design Decisions

### Why node-cache instead of Redis?
Redis requires infrastructure (a running Redis server). node-cache provides equivalent in-process caching with zero setup for development. The caching interface is intentionally simple (`.get()` / `.set()` / `.flushAll()`) so swapping to a Redis adapter in production is a single-file change.

### Why soft deletes?
Historical bookings reference hotels and rooms by ID. Hard-deleting a hotel would orphan existing booking records and break booking history pages. Soft deletes (`isActive: false`) preserve referential integrity.

### Why bcrypt at cost factor 12?
OWASP recommends a minimum of 10 rounds. Cost 12 takes ~250ms per hash — high enough to be impractical for brute force, low enough to be imperceptible to users on login.

### Why httpOnly cookies for tokens?
`localStorage` tokens are accessible to any JavaScript on the page, making them vulnerable to XSS. httpOnly cookies cannot be read by JavaScript — even if XSS occurs, the attacker cannot steal the token.

### Why refresh token hashing?
Storing raw refresh tokens in the database creates a risk: if the database is compromised, all sessions can be impersonated. Storing the bcrypt hash means the stolen hash is useless without the original token.

---

## 🔮 Future Improvements

Ranked by impact:

| Priority | Improvement | Rationale |
|----------|-------------|-----------|
| High | **Redis cache** | Replace node-cache for multi-instance deployment support |
| High | **OpenAPI/Swagger spec** | Machine-readable API documentation |
| High | **End-to-end tests** (Playwright) | Booking flow regression coverage |
| Medium | **Elasticsearch** for hotel search | Full-text search with typo tolerance |
| Medium | **WebSocket notifications** | Real-time booking confirmation to admin |
| Medium | **Image upload** (Cloudinary/S3) | Replace Unsplash URLs with user-owned images |
| Low | **i18n support** | Multi-language hotel descriptions |
| Low | **Review/rating system** | User reviews after stay completion |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming conventions, commit format, code style guide, and PR process.

---

## 📄 License

[MIT](LICENSE) © 2024 Himanshu Kumar

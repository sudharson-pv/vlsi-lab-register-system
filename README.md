# VLSI Lab Register System

A production-oriented monorepo for the Department of Electronics Engineering (VLSI Design & Technology) that replaces the manual lab register with QR-based booking, realtime occupancy tracking, creator-managed system mapping, and female row-protection support.

## Stack

- Frontend: React + TailwindCSS + Vite
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt password hashing
- Realtime: Socket.IO
- Analytics: Chart.js
- Deployment: Docker + Docker Compose

## Project Structure

```text
frontend/
  src/
    components/
    context/
    pages/
    services/
    utils/
backend/
  src/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    socket/
    seed/
    utils/
database/
  schemas/
```

## Core Features

- Student login with register number and password
- Seat grid for Linux `L1-L36` and Windows `W1-W36`
- Green/Red/Black/Pink seat state visualization
- Single active booking per student
- Atomic duplicate-booking prevention through unique active indexes and optional Mongo transactions
- Female row protection so rows with active female bookings become female-only for remaining seats
- Realtime seat-status sync across connected clients via Socket.IO
- Admin realtime usage dashboard with maintenance toggles, row reservation visibility, and system blocking
- Creator panel for student CRUD, gender management, seat/device/IP mapping, and feature toggles
- Live seat updates over Socket.IO

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment files

Create `.env` files if you want to override defaults.

Backend example: `backend/.env.example`

Frontend example: `frontend/.env.example`

### 3. Start MongoDB

Recommended Mongo connection string:

```text
mongodb://localhost:27017/vlsi_lab_register
```

If your local MongoDB is configured as a replica set, backend transactions will be used automatically. If not, the backend falls back to the unique-index-based concurrency guard so local development still works.

### 4. Seed sample users and mappings

```bash
npm run seed
```

### 5. Start the app

```bash
npm run dev
```

Frontend: `http://localhost:5173`

Backend API: `http://localhost:4000/api`

Primary login page: `http://localhost:5173/auth`

## Default Seed Accounts

- Creator: `CREATOR001 / Creator@123`
- Admin: `ADMIN001 / Admin@123`
- Student: `EE2024001 / Student@123` (female)
- Student: `EE2024002 / Student@123` (male)

## Main API Endpoints

- `POST /api/login`
- `POST /api/book`
- `POST /api/cancelBooking`
- `GET /api/seatStatus`
- `GET /api/studentBookings`
- `GET /api/adminDashboard`
- `PATCH /api/creator/female-seat-protection`

Additional creator/admin endpoints are also included for student CRUD, maintenance toggles, system mapping, and simulation scenarios.

## Booking Flow

1. Student signs in from the QR landing page.
2. Student selects a system and time window.
3. Backend creates a single active booking.
4. If a female student books a row and protection is enabled, the remaining seats in that row become female-only.
5. Socket.IO pushes live seat updates to all connected dashboards.

## Docker

Start the full stack with a single-node Mongo replica set:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:8080`
- Backend: `http://localhost:4000/api`
- MongoDB: `mongodb://localhost:27017`

## Notes

- The creator simulation tool creates temporary simulation users and cancels those bookings automatically after the test run.
- The `database/schemas/` folder documents the Mongo collections used by the app.
- For multi-device local testing, set frontend/backend URLs to your machine LAN IP instead of `localhost`.

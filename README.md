# CanopyOS — Smart Grow Management Platform

CanopyOS is a full-stack platform for managing smart grow operations. It provides real-time monitoring, scheduling, and control of grow environments through a clean web interface backed by a robust REST API.

## Project Structure

```
CanopyOS/
├── backend/    # NestJS REST API (port 3001)
└── frontend/   # Next.js web application (port 3000)
```

## Core Features

- Grow room and zone management
- Environmental monitoring (temperature, humidity, CO2, VPD)
- Automated scheduling and lighting control
- Plant and strain tracking across grow cycles
- User authentication with role-based access control
- Real-time alerts and notifications
- Historical data and reporting

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm

> Alternatively, use Docker Compose to run PostgreSQL locally (see below).

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repo-url>
cd CanopyOS
```

### 2. Start PostgreSQL (optional — skip if you have PostgreSQL running locally)

```bash
docker-compose up -d
```

### 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL` and `JWT_SECRET`, then run migrations and seed the database:

```bash
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

The API will be available at `http://localhost:3001`.

### 4. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

The web app will be available at `http://localhost:3000`.

## Ports

| Service  | Port |
|----------|------|
| Frontend | 3000 |
| Backend  | 3001 |
| PostgreSQL | 5432 |

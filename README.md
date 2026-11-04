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

Edit `.env` and set your `DATABASE_URL` and `JWT_SECRET` (the backend refuses to start without a `JWT_SECRET`), then apply the migrations:

```bash
npx prisma migrate deploy      # fresh database; for an existing database see docs/MIGRATIONS.md
npm run prisma:seed            # optional: strain catalogue
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

## Documentation d'exploitation

| Document | Contenu |
|---|---|
| [docs/GO-NO-GO-BETA.md](docs/GO-NO-GO-BETA.md) | verdict de la bêta privée, conditions, risques résiduels |
| [docs/RECETTE-V1.md](docs/RECETTE-V1.md) | ce qui a été exécuté (et ce qui ne l'a pas été) |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | variables d'environnement, exigences de production |
| [docs/MIGRATIONS.md](docs/MIGRATIONS.md) | installation neuve, mise à niveau, retour arrière |
| [docs/PRODUCTION-COPY-RUNBOOK.md](docs/PRODUCTION-COPY-RUNBOOK.md) | migration d'une copie de production (sans toucher à la production) |
| [docs/PHOTO-STORAGE.md](docs/PHOTO-STORAGE.md) | stockage, persistance et sauvegarde des photos |
| [docs/RECETTE-ANDROID.md](docs/RECETTE-ANDROID.md) | procédure de recette sur téléphone réel (non exécutée) |

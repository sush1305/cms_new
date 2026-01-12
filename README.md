
# Chaishorts CMS

A professional, high-performance Content Management System designed for snackable educational content ("Shorts"). 

## Branding: Chaishorts
Zenith has been rebranded to **Chaishorts** to reflect our focus on quick, digestible, and high-impact educational pieces that you can finish in the time it takes to drink a cup of chai.

## Architecture Overview

- **Frontend**: React 18 SPA with Tailwind CSS + Plus Jakarta Sans Typography.
- **Branding**: Amber/Slate/Indigo palette for a premium content management experience.
- **Worker**: Real-time interval process (every 15s) within the app that publishes scheduled lessons.
- **UI/UX**: Mobile-first design principles for the public catalog and a desktop-optimized admin panel.

## Core Features & Logic

- **Scheduled Publishing**: Set `publish_at` for lessons. The internal "Chaishorts Worker" automatically flips status to `PUBLISHED` when the time arrives.
- **RBAC**: Multi-role support (Admin, Editor, Viewer).
- **Asset Engine**: Normalized asset management for different device form factors (Portrait, Landscape, Square, Banner).
- **API Simulation**: Integrated `/catalog` explorer for developers to test content consumption.

## Getting Started

1. Open the app in any modern browser.
2. Login with standard credentials:
   - **Admin**: `admin@chaishorts.com` / `admin123`
   - **Editor**: `editor@chaishorts.com` / `editor123`
3. Use the **Search Bar** in the dashboard to quickly find programs.
4. Create a program, add a term, and schedule a lesson to see the worker in action!

## Database Migrations & Seed

The project now includes proper SQL migrations and a migration runner.

Prerequisites:
- A Postgres database reachable via `DATABASE_URL` environment variable (e.g. `postgresql://postgres:postgres@db:5432/chaishorts`).

Install dependencies and run migrations:

```bash
npm install
# set your DATABASE_URL and JWT_SECRET in .env
npm run migrate
```

Seed demo data:

```bash
npm run seed
```

Run server and worker locally (in separate terminals):

```bash
# start API server
npm run server
# start worker
npm run worker
```

Notes:
- Seed includes demo users (admin/editor/viewer) and sample programs/terms/lessons.
- A scheduled lesson is seeded to publish within ~2 minutes of running the seed script to help you test the worker behavior.

## Public Catalog API

- GET `/api/catalog/programs` supports cursor-based pagination and the following query params: `limit`, `cursor`, `language`, `topic`.
- GET `/api/catalog/programs/:id` returns published program with assets (Cache-Control: public, max-age=60).
- GET `/api/catalog/lessons/:id` returns published lesson (Cache-Control: public, max-age=60).

## Deployment (Docker Compose)

Set a strong `JWT_SECRET` environment variable before running in production. For local testing you can export one.

```bash
export JWT_SECRET=supersecret
docker compose up --build
```

This will start the Postgres DB, API, worker, and web services. The API will run migrations on startup and the worker will pick up scheduled lessons.


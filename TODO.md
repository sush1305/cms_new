# TODO: Build Production-Ready Admin CMS + Public Catalog API with Scheduled Publishing

## Core Domain Model (DB-Enforced)
- [x] Implement Program table: id (uuid), title (required), description, language_primary, languages_available (array), status (draft|published|archived), published_at, created_at, updated_at
- [x] Implement Topic table: id, name (unique), many-to-many with Program
- [x] Implement Term table: id (uuid), program_id (fk), term_number (required, unique per program), title, created_at
- [x] Implement Lesson table: id (uuid), term_id (fk), lesson_number (required, unique per term), title, content_type (video|article), duration_ms, is_paid, content_language_primary, content_languages_available, content_urls_by_language, subtitle_languages, subtitle_urls_by_language, status (draft|scheduled|published|archived), publish_at, published_at, created_at, updated_at
- [x] Implement Media Assets tables (normalized, not JSON): Program assets (posters per language + variant: portrait|landscape|square|banner), Lesson assets (thumbnails per language + variant)
- [x] Add database constraints: Unique (program_id, term_number), Unique (term_id, lesson_number), Unique topic name, Primary language in available languages, scheduled → publish_at NOT NULL, published → published_at NOT NULL, Asset uniqueness
- [x] Add indexes: Lessons (status, publish_at), Lessons (term_id, lesson_number), Programs (status, language_primary, published_at), Topic join indexes, Asset lookup indexes

## Publishing Worker (Critical)
- [x] Implement worker that runs every minute: Finds lessons where status=scheduled and publish_at <= now(), publishes them transactionally, sets published_at once, auto-publishes parent Program on first published lesson
- [x] Ensure idempotent, concurrency-safe (row locking), safe under multiple workers

## Authentication & Roles (CMS)
- [x] Implement roles: Admin (full access + user management), Editor (manage programs/terms/lessons/publishing), Viewer (read-only)
- [x] Secure authentication, API-level RBAC enforcement

## CMS Web UI (Required Screens)
- [x] Login screen
- [x] Programs list with filters (status, language, topic), poster previews
- [x] Program detail: Edit metadata, manage posters, manage topics, create terms, list lessons with status badges
- [x] Lesson editor: Edit fields, content URLs per language, thumbnails per language + variant, subtitles, publish/schedule/archive actions, validation errors
- [x] Functional and usable UI (not design-heavy)

## Public Catalog API (Published-Only)
- [x] GET /catalog/programs (cursor-based pagination, filtering by language/topic, cache headers)
- [x] GET /catalog/programs/:id
- [x] GET /catalog/lessons/:id
- [x] Published content only, consistent error format

## Operational Requirements
- [x] /health endpoint with DB connectivity check
- [x] Structured logs
- [x] Secrets via environment variables (no secrets in repo)

## Local Development
- [x] Docker Compose setup: Web, API, Worker, Database
- [x] docker compose up --build works

## Seed Data (Mandatory)
- [x] Seed ≥2 Programs, ≥2 Terms, ≥6 Lessons, multi-language examples, posters + thumbnails (portrait + landscape), one scheduled lesson publishing within 2 minutes

## Documentation (README)
- [x] Architecture overview
- [x] Local setup steps
- [x] Migration instructions
- [x] Seed instructions
- [x] Deployed URLs
- [x] Demo flow walkthrough

## Deployment & Production
- [ ] Deployed CMS Web App URL (HTTPS)
- [ ] Deployed API URL (HTTPS)
- [ ] Managed relational database
- [ ] Worker/cron process deployed and running
- [ ] Database migrations reproducible from scratch

## Backend Fixes (Completed)
- [x] Update `src/db.ts`: Add missing functions (`initDb`, `updateUser`, `deleteUser`, `changePassword`) and fix function names to match imports (e.g., `getPrograms` -> `getAllPrograms`, `getTerms` -> `getTermsByProgramId`)
- [x] Create `src/routes/auth.ts`: Implement login/register routes
- [x] Create `src/routes/lessons.ts`: Implement lesson CRUD routes
- [x] Create `src/routes/catalog.ts`: Implement public catalog routes

## Setup and Run
- [x] Install dependencies (`npm install`)
- [x] Set up database: Run migrations and seed data
- [x] Check and fix any frontend errors
- [x] Run backend server (`npm run server`)
- [x] Run worker (`npm run worker`)
- [x] Run frontend dev server (`npm run dev`)
- [x] Test the app functionality

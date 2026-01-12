# Implementation Plan for TODO Functionalities

## Information Gathered
- Backend is largely implemented: migrations.sql has DB schema, src/db.ts has queries, routes for auth, users, programs, lessons, catalog.
- Worker for publishing is in src/worker.ts.
- Frontend has Login, Dashboard, ProgramDetail components.
- Missing: UserManagement component for admin user management, LessonEditor component for editing lessons.
- App.tsx needs navigation state for different screens.
- Seed data in seed.sql, migrations in migrations.sql.
- Docker setup in docker-compose.yml.

## Plan
1. Update App.tsx to handle navigation between screens (dashboard, program detail, user management, lesson editor).
2. Create UserManagement.tsx component for admin to manage users.
3. Create LessonEditor.tsx component for editing lesson details, including scheduling publish.
4. Update ProgramDetail.tsx to integrate LessonEditor.
5. Ensure API calls are connected in components.
6. Update package.json scripts for worker, server, dev.
7. Test local setup with docker-compose.

## Dependent Files
- App.tsx: Add navigation state.
- components/UserManagement.tsx: New component.
- components/LessonEditor.tsx: New component.
- components/ProgramDetail.tsx: Update to use LessonEditor.
- package.json: Add scripts.

## Followup Steps
- Run migrations and seed data.
- Test user management, program creation, lesson scheduling.
- Update README with setup instructions.

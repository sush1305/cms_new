# TODO: Fix Errors and Run App

## Backend Fixes
- [x] Update `src/db.ts`: Add missing functions (`initDb`, `updateUser`, `deleteUser`, `changePassword`) and fix function names to match imports (e.g., `getPrograms` -> `getAllPrograms`, `getTerms` -> `getTermsByProgramId`)
- [x] Create `src/routes/auth.ts`: Implement login/register routes
- [x] Create `src/routes/lessons.ts`: Implement lesson CRUD routes
- [x] Create `src/routes/catalog.ts`: Implement public catalog routes

## Setup and Run
- [ ] Install dependencies (`npm install`)
- [ ] Set up database: Run migrations and seed data
- [ ] Check and fix any frontend errors
- [ ] Run backend server (`npm run server`)
- [ ] Run worker (`npm run worker`)
- [ ] Run frontend dev server (`npm run dev`)
- [ ] Test the app functionality

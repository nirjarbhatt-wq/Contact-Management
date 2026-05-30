# Contact Collection App - TODO

## Phase 1 - Milestone 1: Database Schema
- [x] Define all tables in drizzle/schema.ts (regions, vendors, vendor_subcategories, clients, client_subcategories, consultants, contact_sources, contacts, audit_logs)
- [x] Generate and apply migrations
- [x] Seed pre-populated data (41 regions, 7 contact sources)

## Phase 1 - Milestone 2: Backend APIs
- [x] Generic CRUD helpers in server/db.ts
- [x] Metadata routers (regions, vendors, clients, consultants, sources)
- [x] Contact upload and management router
- [x] Audit log router
- [x] Admin master data management router

## Phase 1 - Milestone 3: Frontend - Layout & Auth
- [x] Global theme and design tokens in index.css
- [x] DashboardLayout with sidebar navigation
- [x] Auth-gated routing (login redirect)
- [x] Role-based nav (Admin section visible to admins only)

## Phase 1 - Milestone 4: Contact Upload Flow
- [x] Add Contacts page with device contact browser (Capacitor mock for web)
- [x] Multi-select contact list
- [x] Metadata form per contact (Region, Vendor+sub, Client+sub, Consultant, Source, Notes)
- [x] Inline entity creation (new Vendor, Client, Consultant, sub-categories)
- [x] Upload to backend

## Phase 1 - Milestone 5: My Uploads & All Contacts
- [x] My Uploads page with edit and delete
- [x] All Contacts shared paginated table
- [x] Search by name, phone, email
- [x] Advanced filtering by Region, Vendor, Client, Consultant, Source

## Phase 1 - Milestone 6: CSV Export
- [x] Export all contacts to CSV
- [x] Export filtered contacts to CSV

## Phase 2 - Milestone 1: Reports & Analytics
- [x] Reports dashboard with 8 report types
- [x] Recharts pie and bar charts
- [x] Drill-down from chart to contact list (Phase 2 enhancement)
- [x] Export individual report data to CSV

## Phase 2 - Milestone 2: Audit Log & Admin
- [x] Audit log viewer (admin only)
- [x] Admin master data management (CRUD for Vendors, Clients, Consultants, sub-categories)

## Phase 2 - Milestone 3: Polish & Testing
- [x] Responsive mobile-first polish
- [x] Vitest unit tests for all routers (14 tests passing)
- [x] Final checkpoint and delivery

## Category/Subcategory Redesign (Bug Fix)
- [x] Change Vendor, Client, Consultant to fixed top-level categories (not user-created) — remove create/delete from Admin Panel for these
- [x] In metadata form: show Vendor / Client / Consultant as radio/pill category selectors (fixed labels), then a sub-category dropdown below each
- [x] Sub-category dropdown is scoped to the selected category; user can create a new sub-category inline if it doesn't exist
- [x] Update database: seed fixed categories for Vendor, Client, Consultant; sub-categories remain user-managed
- [x] Update Admin Panel: only manage sub-categories (not the parent categories themselves)
- [x] Update AllContacts filters to reflect the new category/subcategory model
- [x] Update Reports to reflect the new model

## Category Selection Fix
- [x] Change Vendor/Client/Consultant from always-visible sections to a radio button group — user selects ONE category, then picks a sub-category under it
- [x] Update MyUploads edit form with the same radio-select pattern

## New Features (Phase 3)

### Duplicate Detection
- [x] On contact upload, check for existing phone/email matches in the database (contacts.checkDuplicates tRPC procedure)
- [x] Show a warning dialog listing duplicates before confirming upload
- [x] Allow user to skip duplicates or upload anyway

### Phonetic Matching Search
- [x] Implement server-side phonetic/fuzzy search using Soundex algorithm
- [x] Update All Contacts search to use phonetic matching (phoneticSearch toggle checkbox)
- [x] Phonetic toggle shown next to search bar in AllContacts page

### Bulk Edit
- [x] Add checkboxes to All Contacts and My Uploads tables
- [x] Bulk edit dialog: change Region, Source, Vendor/Client/Consultant Sub-Category for selected contacts
- [x] Bulk delete for all users (own contacts) and admins

### CSV Import / Export
- [x] CSV import: upload a CSV file with contacts (name, phone, email) + metadata columns
- [x] CSV import: validate, preview, and confirm before saving (ImportContacts.tsx page)
- [x] CSV export: already exists for All Contacts; includes all metadata columns

### Dashboard Homepage
- [x] New Dashboard.tsx as home page (/ and /dashboard routes)
- [x] Summary cards: total contacts, this week, this month, active users
- [x] Recent uploads feed (last 10 contacts added by any user)
- [x] Top regions bar chart and uploads-by-user bar chart
- [x] Import CSV added to sidebar navigation

## Phase 4 - Upcoming Enhancements

### Dashboard CSV Export
- [x] Add "Export CSV" button to Dashboard header that downloads all contacts as CSV
- [x] Button is visible in the dashboard quick-actions row, fetches all pages and triggers download

### Contact Detail Side Panel
- [ ] Clicking a contact row in All Contacts or Dashboard recent feed opens a slide-over drawer
- [ ] Drawer shows all fields, full metadata, notes, and audit history for that contact
- [ ] Inline edit form inside the drawer

### Owner Notifications
- [ ] Wire notifyOwner() into contacts upload procedure
- [ ] Notify owner when team member uploads or imports contacts

## Phase 5 - Capacitor Native App (iOS & Android)

### Capacitor Setup
- [x] Install @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android, @capacitor-community/contacts
- [x] Create capacitor.config.ts with appId com.reciclartpl.contactcollection, webDir dist/public
- [x] Build scripts added: cap:build, cap:ios, cap:android, cap:sync

### Native Contacts Integration
- [x] Replace SAMPLE_CONTACTS mock in AddContacts.tsx with real Capacitor Contacts.getContacts() call
- [x] Add permission request flow (requestPermissions before getContacts)
- [x] Add web/browser fallback (WEB_FALLBACK_CONTACTS) when native bridge is unavailable
- [x] Handle contact permission denied state with retry button

### Build Guide
- [x] CAPACITOR_BUILD_GUIDE.md produced with step-by-step iOS and Android local build instructions

## Phase 6 - Multi-User Google OAuth Login (replaced by custom auth)

- [x] Replaced with custom email/password auth (see Phase 6 below)

## Phase 6 - Custom Email/Password Authentication

- [x] Add passwordHash and isActive fields to users table in schema.ts
- [x] Generate and apply DB migration (0004_old_amphibian.sql)
- [x] Seed admin user: admin@reciclartpl.com / Rtpl@1234 (bcrypt hashed, isActive=1, role=admin)
- [x] Install bcryptjs for password hashing
- [x] Add auth.register and auth.login tRPC procedures (publicProcedure, bcrypt + JWT cookie)
- [x] Reuse existing JWT/cookie infrastructure from sdk.createSessionToken
- [x] Build Login page (email + password form, dark themed)
- [x] Build Register page (name + email + password + confirm, pending approval flow)
- [x] New users start with isActive=0 — pending admin approval
- [x] Build UserManagement page: list all users, approve/deactivate, change role (admin only)
- [x] Add User Management to admin sidebar nav items
- [x] App.tsx: add /login and /register as public routes, AuthGate redirects to /login
- [x] DashboardLayout unauthenticated panel redirects to /login
- [x] 14/14 tests passing, 0 TypeScript errors

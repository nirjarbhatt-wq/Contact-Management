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
- [ ] Drill-down from chart to contact list (Phase 2 enhancement)
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

## Client Visit MOM Portal — MVP

A public TanStack Start app for creating, viewing, and managing Minutes of Meeting, with AI-assisted generation and PDF export.

### Scope (MVP)
- Create / edit / list / view MOMs (no auth gate — anyone can create)
- Dynamic sections: Attendees, Discussion Points, Work Completed, Pending Points
- AI MOM Generator from rough notes (Lovable AI / Gemini)
- MOM detail page + PDF export + print
- Search & filter (client, employee, meeting type, date range, keyword)
- Light/dark mode, responsive corporate UI

### Out of scope (later)
Auth & roles, email notifications, file attachments, dashboard analytics, action items module, rich-text editor (use plain textarea for MVP summary).

### Tech
- Lovable Cloud (Supabase) for database
- Lovable AI Gateway (`google/gemini-2.5-flash`) via a `createServerFn` for AI generation
- `jspdf` + `jspdf-autotable` for client-side PDF
- shadcn/ui components, Tailwind, dark mode toggle

### Data model
```text
moms
  id uuid pk, created_at, updated_at
  client_name text, meeting_date date, meeting_type text (online|offline)
  employee_name text, location text, summary text
  attendees jsonb        [{name, designation, mobile}]
  discussion_points jsonb [{module, details}]
  work_completed jsonb    [{module, task}]
  pending_points jsonb    [{module, requirement, priority}]
```
Public RLS: SELECT/INSERT/UPDATE for `anon` + `authenticated` (per user's "public" choice). Grants for anon/authenticated/service_role.

### Routes
- `/` — MOM list with search + filters, "New MOM" button
- `/mom/new` — create form (with AI generator panel)
- `/mom/$id` — detail view (Edit / Download PDF / Print)
- `/mom/$id/edit` — edit form

### Server functions (`src/lib/mom.functions.ts`)
- `listMoms({ filters })`, `getMom({id})`, `createMom`, `updateMom`, `deleteMom`
- `generateMomFromNotes({notes})` → Lovable AI returns `{discussion_points, work_completed, pending_points, summary}` via structured output

### Design
Clean corporate CRM look: slate neutrals + indigo primary accent, generous spacing, rounded-md cards, sidebar-free top-nav layout. Full dark mode via class toggle persisted to localStorage.

### Build order
1. Enable Lovable Cloud + migration for `moms` table
2. Server functions (CRUD + AI generator)
3. List page with filters
4. Create/Edit form with dynamic row sections + AI panel
5. Detail page + PDF generator
6. Theme toggle + polish

Confirm to proceed.
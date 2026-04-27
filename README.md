# Joy CRM - Multi-Tenant SaaS Lead Generation Platform

Joy CRM is a tenant-based SaaS application built with Next.js, FastAPI, and Supabase.

Each customer works inside an isolated organization workspace (`/o/{orgSlug}/...`) with strict row-level security so data from one tenant cannot be accessed by another tenant.

## Current Status

- Multi-tenant workspace model: implemented
- Organization roles: `owner`, `admin`, `member`
- Invite flow: implemented (`/invite/{token}`)
- Campaign + leads flow: implemented
- Lead source support:
  - `google_maps`: working
  - `instagram`: present in UI/API contract but currently not working end-to-end in production use

## Tech Stack

- Frontend: Next.js 15 (App Router, TypeScript, TailwindCSS)
- Backend: FastAPI
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- External data source: Apify

## Architecture Overview

- Tenant boundary is organization-based.
- All business data (`campaigns`, `leads`) is organization-scoped.
- Workspace routes are path-based: `/o/{orgSlug}/dashboard/...`.
- Backend authentication uses `Authorization: Bearer <supabase_access_token>`.
- FastAPI validates user identity from Supabase and verifies organization membership before operations.
- Supabase RLS policies enforce organization isolation at the database layer.

## Core Features

- Email/password authentication with Supabase
- Automatic workspace resolution for authenticated users
- Organization member management (invite, role update, remove)
- Campaign creation and lead approval flow
- Campaign list and campaign detail pages per workspace
- Organization settings (editable by owner/admin)
- User profile updates in settings

## Workspace and Roles

Roles inside each organization:

- `owner`: full workspace control
- `admin`: manage members + invites + settings
- `member`: use workspace data with restricted admin actions

Important v1 rule:

- Single active organization per user is enforced in current implementation.

## Project Structure

```text
joy-crm/
  frontend/
    app/
      o/[orgSlug]/dashboard/
      api/fetch-leads/route.ts
      api/approve-leads/route.ts
      invite/[token]/page.tsx
    components/
    lib/
  backend/
    app/
      api/routes/leads.py
      core/
      schemas/
      services/
    bootstrap_owner.py
  supabase/
    schema.sql
```

## Environment Variables

### Frontend (`frontend/.env` or `frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
BACKEND_BASE_URL=http://127.0.0.1:8000
```

### Backend (`backend/.env`)

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
APIFY_API_TOKEN=your-apify-api-token
ALLOWED_ORIGINS=http://localhost:3000
```

## Setup and Run

### 1) Apply database schema

Run full SQL from:

- `supabase/schema.sql`

in Supabase SQL Editor.

### 2) Bootstrap initial owner workspace

After schema is applied and `admin@joy.com` exists in Supabase Auth, run:

```bash
cd backend
python bootstrap_owner.py
```

This makes `admin@joy.com` owner of the `joy` workspace.

### 3) Run backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

## Main Routes

Public:

- `/login`
- `/signup`
- `/invite/{token}`

Tenant workspace:

- `/o/{orgSlug}/dashboard`
- `/o/{orgSlug}/dashboard/campaigns`
- `/o/{orgSlug}/dashboard/create-campaign`
- `/o/{orgSlug}/dashboard/campaign/{id}`
- `/o/{orgSlug}/dashboard/users`
- `/o/{orgSlug}/dashboard/settings`

Legacy `/dashboard/*` routes redirect to tenant-scoped routes.

## API Endpoints

### `POST /fetch-leads`

- Validates bearer token
- Validates user membership in `organization_id`
- Fetches preview leads from Apify

Request example:

```json
{
  "organization_id": "org-uuid",
  "campaign_name": "Chennai Restaurants",
  "industries": ["restaurants"],
  "sources": ["google_maps"],
  "location": "Chennai",
  "keywords": "pizza,italian",
  "leads_count": 20
}
```

### `POST /approve-leads`

- Validates bearer token
- Validates user membership in `organization_id`
- Creates campaign in organization scope
- Inserts selected leads linked to campaign

Request example:

```json
{
  "organization_id": "org-uuid",
  "campaign_name": "Chennai Restaurants",
  "industries": ["restaurants"],
  "sources": ["google_maps"],
  "location": "Chennai",
  "selected_leads": []
}
```

## Security and Tenant Isolation

- Organization-level RLS on organizations, members, invites, campaigns, and leads
- Backend never trusts client `user_id` headers
- All writes are membership-validated
- Campaign/leads visibility is tenant-scoped

## Notes

- If you do not see old campaigns after migration, verify campaign `organization_id` mapping for your user and workspace slug.
- Settings page now includes:
  - Organization details form
  - User profile form
  - Theme preference

## Known Limitations (Current)

- Instagram source is not fully stable/working at this time.
- Single active org membership per user is enforced for v1.
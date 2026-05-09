# Joy CRM - Tenant Workspace Core

Joy CRM is a tenant-based SaaS app focused on secure workspace access, user management, and organization settings.

## What This Version Includes

- Email/password auth (signup, signin, logout)
- Forgot/reset password flow
- Auto workspace + organization membership creation after signup
- Tenant-scoped routing at `/o/{orgSlug}/dashboard`
- Sidebar modules only:
  - Dashboard
  - Users
  - Settings
- Invite users to organization and accept via `/invite/{token}`
- Supabase RLS isolation between tenants

## Tech Stack

- Frontend: Next.js 15 (App Router, TypeScript, TailwindCSS)
- Backend: FastAPI
- Database/Auth: Supabase PostgreSQL + Supabase Auth

## Main Routes

Public:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/invite/{token}`

Tenant workspace:

- `/o/{orgSlug}/dashboard`
- `/o/{orgSlug}/dashboard/users`
- `/o/{orgSlug}/dashboard/settings`

## Environment Variables

### Frontend (`frontend/.env` or `frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Backend (`backend/.env`)

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
ALLOWED_ORIGINS=http://localhost:3000
```

## Setup

1. Apply `supabase/schema.sql` in Supabase SQL Editor.
2. Run backend (`uvicorn app.main:app --reload --port 8000`).
3. Run frontend (`npm install && npm run dev`).

## Notes

- Schema is intentionally minimal and breaking-clean for tenant/auth core.
- Legacy project/ticket/task/report/hr/client-portal modules are removed from the app surface.

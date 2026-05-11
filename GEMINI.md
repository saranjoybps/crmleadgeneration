# Joy CRM - Project Documentation

## Project Purpose
Joy CRM is a multi-tenant SaaS application designed to provide a secure and scalable foundation for workspace management, user roles, and organization settings. It focuses on strict tenant isolation using Supabase Row Level Security (RLS) and provides a seamless experience for managing users within different organizations.

## Tech Stack
- **Frontend**: Next.js (App Router), TypeScript, TailwindCSS, Supabase SSR.
- **Backend**: FastAPI (Python), Pydantic, Supabase Python Client.
- **Database & Auth**: Supabase (PostgreSQL with RLS, Supabase Auth).
- **Deployment**: Configured for local development with environment variable support.

## Folder Structure
```text
C:\joy_b2b_crm\crmleadgeneration\
├── backend\                # FastAPI Backend
│   ├── app\
│   │   ├── api\            # API Routes & Utilities
│   │   ├── core\           # Auth, Config, Dependencies, Supabase Client
│   │   ├── schemas\        # Pydantic Models
│   │   └── services\       # Business Logic (to be expanded)
│   ├── requirements.txt
│   └── .env.example
├── frontend\               # Next.js Frontend
│   ├── app\                # App Router (Public & Tenant routes)
│   ├── components\         # Shared UI Components
│   ├── lib\                # Supabase clients & shared types
│   ├── package.json
│   └── .env.example
└── supabase\               # Database Schema & Migrations
    └── schema.sql          # Core DB structure and RLS policies
```

## Important Modules
- **Backend**:
  - `app/core/deps.py`: Manages `RequestContext`, extracting user and tenant info from the request and bootstrapping the Supabase client with the user's JWT.
  - `app/core/supabase_client.py`: Factory for Supabase clients, supporting both service-role and user-context authenticated clients.
  - `app/api/routes/`: Contains endpoint definitions for auth, workspace, and user management.
- **Frontend**:
  - `lib/supabase/`: Exports server, browser, and middleware Supabase clients for different Next.js contexts.
  - `app/o/[orgSlug]/`: Implements organization-scoped routing and layout.

## API Flow
1. **Authentication**: Handled via Supabase Auth on the frontend.
2. **Request Initialization**: The frontend sends requests to the FastAPI backend, including the Supabase JWT in the `Authorization` header and the current organization slug in `X-Org-Slug`.
3. **Context Bootstrapping**: `get_request_context` in the backend:
   - Validates the JWT.
   - Initializes a Supabase client with the user's context.
   - Calls `rpc` functions (`ensure_app_user`, `ensure_user_tenant`) to verify identity and tenant membership.
4. **Execution**: The backend performs operations (often via Supabase RPC or direct table calls). Because the client is initialized with the user's JWT, Supabase RLS policies are enforced automatically.
5. **Response**: Data is returned using a standard `response` helper in `app/api/utils.py`.

## Setup Instructions
### Prerequisites
- Python 3.10+
- Node.js 22+
- A Supabase Project
       
### Database
1. Execute the contents of `supabase/schema.sql` in your Supabase SQL Editor to set up tables, roles, and RLS policies.

### Backend
1. `cd backend`
2. `python -m venv .venv`
3. `source .venv/bin/activate` (or `.venv\Scripts\activate` on Windows)
4. `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill in Supabase credentials.
6. `uvicorn app.main:app --reload --port 8000`

### Frontend
1. `cd frontend`
2. `npm install`
3. Copy `.env.example` to `.env.local` and fill in Supabase credentials.
4. `npm run dev`

## Coding Conventions
- **Naming**: `snake_case` for Python, `camelCase` for TypeScript.
- **API Responses**: Always use the `response` helper in the backend for consistent JSON structure (`data`, `meta`, `error`, `trace_id`).
- **Authorization**: Use the `require_roles` dependency in FastAPI routes to enforce role-based access control.
- **Tenancy**: Always prefer organization-scoped routing (`/o/[orgSlug]`) for features that belong to a tenant.

## Improvement Suggestions
1. **Migrations**: Move from a single `schema.sql` to a proper migration tool (e.g., Supabase CLI or Alembic for backend-side DB management).
2. **Service Layer**: Fully decouple business logic from API routes into the `services/` directory.
3. **Frontend API Client**: Create a unified API client (e.g., using `axios` or `fetch` wrapper) that automatically injects the `X-Org-Slug` and `Authorization` headers.
4. **Testing**: Implement unit tests for backend services and E2E tests for core tenant flows (signup, invite, switch organization).
5. **Logging**: Centralize logging using a structured logger (e.g., `structlog`) to improve observability across tenant-specific operations.

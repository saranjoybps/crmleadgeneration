# Joy CRM — Multi-Tenant Workspace Platform

**Version:** 1.0.0 (Frontend) / 2.0.0 (API)

A full-featured, multi-tenant SaaS platform for workspace management, project tracking, HR operations, and AI-powered content creation. Built with Next.js 16 (App Router), FastAPI, and Supabase.

---

## Modules

### Overview
| Module | Description |
|--------|-------------|
| **Dashboard** | Landing page with stat cards, deadlines, activity feed |
| **Analytics** | Visual charts — revenue, task completion, ticket trends |
| **Reports** | Pre-built and custom report views |
| **Announcements** | Organization-wide announcements with target selection |

### Management
| Module | Description |
|--------|-------------|
| **Projects** | Full CRUD with milestones, tickets, tasks, members |
| **Roadmap** | Gantt-style milestone timeline across projects |
| **Calendar** | Monthly view of deadlines across all modules |
| **Tickets** | Support/feature requests with status workflow |
| **Tasks** | Kanban board with drag-and-drop, dependencies, WIP limits |
| **Todos** | Personal to-do list with filters |

### Human Resources
| Module | Description |
|--------|-------------|
| **Shifts** | Employee shift scheduling |
| **Attendance** | Check-in/check-out tracking |
| **Candidates** | Recruitment pipeline with interview management |
| **Leave** | Leave requests with approval workflow & balance tracking |
| **Payroll** | Salary components, tax slabs, PF/ESI configuration |

### Tools
| Module | Description |
|--------|-------------|
| **Vault** | Encrypted password/secret manager with team sharing |
| **Documents** | Document management with AI-powered generation |
| **AI Studio** | AI-assisted content creation (blogs, posters, social posts, emails) with calendar scheduling and multi-platform publishing |

### Administration
| Module | Description |
|--------|-------------|
| **Users** | Team member management, role assignment, invites |
| **Settings** | Profile, Organization, RBAC, Departments, Theme, System Info |

### Collaboration
| Module | Description |
|--------|-------------|
| **Chat** | Real-time messaging — workspace channel, DMs, group conversations |

---

## Tech Stack

### Frontend
- **Next.js** ^16.2.6 (App Router, TypeScript, Turbopack)
- **React** ^19.2.6 with React Compiler
- **TailwindCSS** ^3.4.17
- **Supabase SSR** ^0.5.2
- **Recharts** ^3.8.1, **GanttTaskReact** ^0.3.9
- **@dnd-kit** — Drag-and-drop Kanban
- **date-fns** ^4.1.0, **xlsx** ^0.18.5
- **next-themes** — Dark/light mode
- **Lucide React** — Icons

### Backend
- **FastAPI** ^0.116.1 (Python)
- **Supabase** ^2.15.3 (Database + Auth)
- **OpenAI** ^1.55.0 (Document generation)
- **Uvicorn** ^0.35.0
- **Playwright**, **cryptography**

### Database
- **Supabase PostgreSQL** with Row-Level Security (RLS)
- 15 custom enums, 40+ tables, 30+ functions, 70+ indexes

---

## Architecture

```
app/o/{orgSlug}/dashboard/
├── layout.tsx          # Auth guard, org context, permissions, sidebar + header
├── page.tsx            # Dashboard landing with stats
├── {module}/
│   ├── page.tsx        # Server component — fetches data & permissions
│   ├── XxxContent.tsx  # Client component — UI, state, modals
│   └── actions.ts      # Server Actions — CRUD mutations
└── ...
```

**Pattern:** Every module follows a strict 3-file pattern:
- `page.tsx` — async server component, fetches data, checks `can_view`
- `XxxContent.tsx` — `"use client"` component, modal-driven CRUD, filter state
- `actions.ts` — `"use server"` actions, permission enforcement, API calls

---

## AI Features

| Feature | Location | Model |
|---------|----------|-------|
| **Help Chat Assistant** | Frontend API route | `gpt-4o-mini` |
| **Document Generation** | Backend service | `gpt-4o` |
| **AI Studio** | Frontend (mock-ready) | Simulated (pluggable) |

AI Studio generates blog posts, social content, email newsletters, posters (8 templates), and hashtag suggestions. Platform targeting: LinkedIn, Twitter/X, Instagram, Facebook, Internal, Email.

---

## Routes

### Public
| Route | Purpose |
|-------|---------|
| `/login` | Email/password sign in |
| `/signup` | Registration |
| `/forgot-password` | Password reset request |
| `/reset-password` | Reset password with token |
| `/invite/{token}` | Accept organization invite |

### Tenant Workspace (`/o/{orgSlug}/dashboard`)
All 22 module routes plus Chat (`/o/{orgSlug}/dashboard/chat`).

---

## Role-Based Access Control

**4 built-in roles:** Owner, Admin, Member, Client

**Permissions per module:** Create, Read (View), Update, Delete — configurable via Settings → Roles & Permissions.

**Access scoping:**
- Multi-tenant isolation (RLS)
- Department-based access (members see own department)
- Project-membership scoping

---

## Environment Variables

### Frontend (`frontend/.env.local`)
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
OPENAI_API_KEY=sk-...                          # For AI document generation
VAULT_ENCRYPTION_KEY=your-32-byte-hex-key       # For password vault
```

---

## Setup

```bash
# 1. Database
Apply supabase/schema.sql in Supabase SQL Editor.

# 2. Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev              # Standard
npm run dev:turbo        # With Turbopack
```

---

## Scripts (Frontend)

| Script | Command |
|--------|---------|
| `dev` | `next dev` |
| `dev:turbo` | `next dev --turbopack` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `clean` | Removes `.next` directory |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open search bar |

---

## Supabase Schema

**File:** `supabase/schema.sql` (3,400+ lines)

15 enums, 40+ tables, 30+ PL/pgSQL functions, 15+ triggers, comprehensive RLS policies, 70+ performance indexes.

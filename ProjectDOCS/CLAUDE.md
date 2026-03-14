# CLAUDE.md — EduPlatform AI Agent Instructions

## Project in One Line

Multi-tenant SaaS for Egyptian tutoring centers. Each teacher gets a subdomain (ahmed.eduplatform.com) to track attendance, collect payments, and notify parents. Arabic-first, mobile-first.

## MVP Scope — What We Build Now

The MVP answers exactly TWO questions for the teacher: **"مين حضر؟" (Who attended?)** and **"مين دفع؟" (Who paid?)**

Anything that doesn't serve these two questions does NOT enter the first build.

**IN scope:** Teacher signup + OTP, subdomain, groups, students, manual attendance, payment tracking, SMS/WhatsApp notifications, weekly schedule, registration link, Arabic RTL, dark mode, basic offline queue.

**OUT of scope (all deferred):** AI exams, online quizzes, homework, file library, gamification (points/streaks/leaderboards), parent app, electronic payments (Fawry/VodafoneCash), marketplace, video library, Q&A forum, certificates, white-label, referral system.

## Architecture Decisions

- **Modular Monolith** — NOT microservices. One codebase, clean module boundaries.
- **Shared Database** — all tenants in one PostgreSQL DB, isolated by `tenantId`.
- **Subdomain-based routing** — `{slug}.eduplatform.com` resolved via middleware.
- **Feature-first modules** — each module owns its logic, queries, validations, and UI.
- **Server Components by default** — `'use client'` only for forms and interactive elements.
- **No state management library** — Server Components + Server Actions are enough for MVP.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ App Router, TypeScript strict |
| UI | Tailwind CSS + shadcn/ui |
| ORM | Prisma with PostgreSQL |
| Cache | Redis (tenant resolution, OTP, rate limiting) |
| Auth | Phone OTP + JWT sessions |
| Notifications | SMS provider (TBD) + WhatsApp Business API |
| File Storage | Cloudflare R2 or S3 (later phases) |
| Hosting | Vercel (wildcard subdomains) + managed PostgreSQL |

---

## CRITICAL RULES — Never Break These

### Rule 1: Tenant Isolation (THE Most Important Rule)

Every database query MUST include `WHERE tenantId = ?`. A query without tenantId is a security catastrophe — it leaks data between teachers.

The tenant is NEVER trusted from the client. It is ALWAYS inferred from the Host header / session.

```typescript
// ✅ CORRECT
const groups = await db.group.findMany({
  where: { tenantId: tenant.id, isActive: true }
})

// ❌ WRONG — data leak between tenants
const groups = await db.group.findMany({
  where: { isActive: true }
})
```

Use `requireTenant()` at the start of every server action and API route. No exceptions.

### Rule 2: Arabic RTL First

- Spacing: `ms-4` / `me-4` / `ps-4` / `pe-4` — NEVER `ml-` / `mr-` / `pl-` / `pr-`
- Alignment: `text-start` / `text-end` — NEVER `text-left` / `text-right`
- HTML: `<html dir="rtl" lang="ar">`
- Numbers: remain LTR → wrap in `<span dir="ltr">` when inside Arabic text
- Currency: `{amount} جنيه` (number first, then word)
- Font: "Cairo" primary, "Tajawal" fallback (Google Fonts)
- All UI labels, placeholders, toasts, error messages → Arabic
- Days: السبت، الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس، الجمعة

### Rule 3: Mobile First

- Design for 375px width, scale up
- Touch targets: minimum 44×44px
- Attendance marking must work with one thumb
- Test on slow 3G connection
- No fixed heights — use `min-h-screen`

### Rule 4: Module Ownership

Each person owns specific modules. You NEVER edit files in another person's module. You CAN import their exported queries (read-only).

- **Person A** owns: `modules/groups/`, `modules/students/`, `modules/schedule/`
- **Person B** owns: `modules/attendance/`, `modules/payments/`, `modules/notifications/`
- **Person C** owns: `modules/dashboard/`, `modules/public-pages/`, auth UI

### Rule 5: No Business Logic in Route Handlers

Route handlers (API routes) are thin wrappers. They:
1. Call `requireTenant()`
2. Call `requireAuth()`
3. Validate input with Zod
4. Delegate to a module's `actions.ts` or `queries.ts`
5. Return standardized response

The actual logic lives in the module's actions/queries.

---

## Middleware Chain (Order Matters)

```
1. Tenant Resolution    → Extract subdomain from Host, resolve to tenant
2. Auth Validation      → Validate JWT session, resolve user
3. Permission Check     → Check user role against route requirements
4. Request Validation   → Validate input with Zod schemas
5. Audit Logging        → Log critical actions (payments, attendance)
```

This order is fixed. Tenant resolution MUST come first — you can't authenticate a user without knowing which tenant they belong to.

---

## Module Structure (Flat — No DDD Layers)

Every module follows the same flat pattern:

```
modules/{name}/
├── actions.ts        ← Server actions (mutations: create, update, delete)
├── queries.ts        ← Data fetching (read-only, always tenant-scoped)
├── validations.ts    ← Zod schemas for input validation
└── components/       ← Feature-specific UI components
    ├── SomeForm.tsx
    ├── SomeList.tsx
    └── SomeCard.tsx
```

- `actions.ts` = what DDD calls "use cases" — simplified
- `queries.ts` = what DDD calls "repositories" — simplified  
- `validations.ts` = what DDD calls "domain rules" — simplified
- No DTOs, no value objects, no abstract repositories for MVP

### Cross-Module Imports

```typescript
// ✅ ALLOWED — import queries from another module (read-only)
import { getRevenueSummary } from '@/modules/payments/queries'

// ❌ FORBIDDEN — directly accessing another module's DB tables
const payments = await db.payment.findMany(...)  // only payments module does this

// ❌ FORBIDDEN — editing another module's files
```

---

## Code Patterns

### Server Action Pattern
```typescript
// modules/groups/actions.ts
'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { groupCreateSchema } from './validations'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createGroup(formData: FormData) {
  const tenant = await requireTenant()
  const user = await requireAuth()

  const data = groupCreateSchema.parse({
    name: formData.get('name'),
    subject: formData.get('subject'),
    // ...
  })

  const group = await db.group.create({
    data: { ...data, tenantId: tenant.id }
  })

  revalidatePath('/dashboard/groups')
  return { success: true, data: group }
}
```

### Query Pattern
```typescript
// modules/groups/queries.ts
import { db } from '@/lib/db'
import { cache } from 'react'

export const getGroups = cache(async (tenantId: string) => {
  return db.group.findMany({
    where: { tenantId, isActive: true },
    include: { _count: { select: { students: true } } },
    orderBy: { createdAt: 'desc' }
  })
})
```

### API Route Pattern (thin wrapper)
```typescript
// app/(tenant)/api/groups/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { getGroups } from '@/modules/groups/queries'

export async function GET(req: NextRequest) {
  try {
    const tenant = await requireTenant(req)
    await requireAuth(req)
    const groups = await getGroups(tenant.id)
    return NextResponse.json({ data: groups })
  } catch (error) {
    return NextResponse.json(
      { error: { code: 'FETCH_FAILED', message: 'فشل في تحميل المجموعات' } },
      { status: 500 }
    )
  }
}
```

### Standardized API Response Format
```typescript
// Success
{ data: any, meta?: { total: number, page: number } }

// Error
{ error: { code: string, message: string, details?: any } }
```

---

## Subdomain Routing

```
*.eduplatform.com           → Wildcard DNS to server
ahmed.eduplatform.com       → Teacher Ahmed's space
noor-academy.eduplatform.com → Noor Academy center
www.eduplatform.com         → Marketing site
app.eduplatform.com         → Platform admin (future)
```

**Middleware logic:**
1. Extract subdomain from `request.headers.host`
2. Special subdomains (`www`, `app`, `api`) → handle separately
3. Check Redis cache: `tenant:{slug}`
4. Cache miss → query DB → cache result (TTL 1 hour)
5. Tenant not found → redirect to `www.eduplatform.com`
6. Tenant inactive → show inactive page
7. Tenant found → inject into request context, proceed

**Local dev:** Use `ahmed.localhost:3000`

---

## Data Conventions

### Phone Numbers
- Store: E.164 format `+201012345678`
- Display: `010-1234-5678` (Egyptian)
- Validate: starts with `01`, 11 digits total (Egyptian mobile)
- OTP: 6 digits, expires 5 minutes

### Dates & Times
- Store: UTC in database
- Display: `Africa/Cairo` timezone, Arabic locale `ar-EG`
- Format dates: `13 مارس 2026`
- Format times: `4:00 م` (Arabic PM)
- Days: السبت through الجمعة

### Currency
- All amounts in whole Egyptian Pounds (no piasters)
- Store as integer: `400` = 400 EGP
- Display: `٤٠٠ جنيه` or `400 جنيه`

### IDs
- Use `cuid()` for all primary keys (shorter than UUID, URL-safe, sortable)

---

## Imports — Always Use Path Aliases

```typescript
import { db } from '@/lib/db'                          // ✅
import { Group } from '@/types'                         // ✅
import { getGroups } from '@/modules/groups/queries'    // ✅
import { db } from '../../../lib/db'                    // ❌ NEVER
```

## Common Commands

```bash
npm run dev                              # Start dev server
npm run build                            # Production build
npm run lint                             # ESLint
npx prisma generate                      # After schema changes
npx prisma migrate dev --name <name>     # Create migration
npx prisma db seed                       # Seed test data
npx prisma studio                        # Visual DB browser
```

## Top 10 Mistakes to Avoid

1. ❌ Query without `tenantId` — DATA LEAK
2. ❌ `ml-4` instead of `ms-4` — breaks RTL
3. ❌ `text-left` instead of `text-start` — breaks RTL
4. ❌ Everything as Client Component — kills performance
5. ❌ Business logic inside API route handlers
6. ❌ Raw SQL instead of Prisma
7. ❌ `any` type in TypeScript
8. ❌ Editing another person's module files
9. ❌ Schema changes without team agreement
10. ❌ Forgetting loading/error states in UI

## Quality Rules (from Day 1)

- No feature without clear module owner
- No query without tenant scoping
- No business logic inside route handlers
- Every input has validation (Zod)
- Every critical action has audit trail
- Every important screen is mobile-first
- Performance first in attendance and payments

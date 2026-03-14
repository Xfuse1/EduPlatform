# EduPlatform — Project Structure & Team Division (Final)

## Architecture: Modular Monolith

```
One codebase. Clean module boundaries. Shared database.
Each module owns its logic, queries, validations, and UI.
No DDD layers (domain/application/infrastructure) — flat modules.
Scale to DDD later if the project grows beyond MVP.
```

---

## Complete Folder Structure

```
eduplatform/
│
├── CLAUDE.md                         # AI agent instructions
├── .cursorrules                      # Symlink to CLAUDE.md (for Cursor users)
├── PRD.md                            # Product spec (reference, don't edit during dev)
├── tasks.md                          # Task breakdown per person per day
├── .env.example
├── .env.local                        # (gitignored)
├── next.config.ts
├── middleware.ts                      # Tenant resolution + auth + routing
├── tailwind.config.ts
├── tsconfig.json
├── package.json
│
├── prisma/
│   ├── schema.prisma                 # MVP-only schema — FROZEN after Day 1
│   ├── seed.ts                       # Test data
│   └── migrations/
│
├── src/
│   │
│   ├── lib/                          # 🔒 SHARED — Core infrastructure
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── tenant.ts                 # getTenantFromHost(), requireTenant()
│   │   ├── auth.ts                   # sendOTP(), verifyOTP(), requireAuth(), getCurrentUser()
│   │   ├── permissions.ts            # checkRole(), requireRole()
│   │   ├── validation.ts             # Shared Zod helpers
│   │   ├── cache.ts                  # Redis client + helpers
│   │   ├── api-response.ts           # successResponse(), errorResponse() standardized
│   │   ├── utils.ts                  # formatDate(), formatCurrency(), formatPhone()
│   │   └── constants.ts              # Plans, roles, days of week in Arabic
│   │
│   ├── types/                        # 🔒 SHARED — The contract between all 3 persons
│   │   └── index.ts                  # All TypeScript interfaces
│   │
│   ├── components/                   # 🔒 SHARED — Reusable UI
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Main layout: sidebar + header + content area
│   │   │   ├── Sidebar.tsx           # Role-based navigation
│   │   │   ├── Header.tsx            # Tenant name + user avatar + dark mode toggle
│   │   │   └── MobileNav.tsx         # Bottom nav for mobile
│   │   ├── shared/
│   │   │   ├── RTLProvider.tsx       # dir="rtl" + Arabic font context
│   │   │   ├── ThemeProvider.tsx     # Dark mode provider
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx        # "لا توجد بيانات" with icon
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── data-display/
│   │   │   ├── DataTable.tsx         # Reusable table with mobile card fallback
│   │   │   ├── StatsCard.tsx         # Dashboard stat card with trend arrow
│   │   │   └── Badge.tsx             # Status badge (paid/overdue/present/absent)
│   │   └── forms/
│   │       ├── PhoneInput.tsx        # Egyptian phone validation
│   │       ├── DaysPicker.tsx        # Multi-select for days of week
│   │       ├── ColorPicker.tsx       # Group color selection
│   │       └── FormField.tsx         # Label + input + error wrapper
│   │
│   ├── config/
│   │   ├── app.ts                    # App name, default theme, etc.
│   │   ├── env.ts                    # Type-safe env variable access
│   │   ├── routes.ts                 # Route constants to avoid magic strings
│   │   └── plans.ts                  # Plan limits: { FREE: { maxStudents: 30, smsQuota: 50 }, ... }
│   │
│   ├── i18n/
│   │   ├── ar.json                   # Arabic strings
│   │   └── config.ts
│   │
│   │
│   ├── modules/                      # ═══ FEATURE MODULES — OWNED BY PERSONS ═══
│   │   │
│   │   ├── auth/                     # 🔒 SHARED (set up Day 1, rarely changed)
│   │   │   ├── actions.ts            # sendOTP, verifyOTP, logout
│   │   │   ├── queries.ts            # getCurrentUser, getUserRole
│   │   │   ├── validations.ts        # phoneSchema, otpSchema
│   │   │   └── components/
│   │   │       ├── LoginForm.tsx
│   │   │       └── OTPInput.tsx
│   │   │
│   │   ├── groups/                   # ═══ PERSON A ═══
│   │   │   ├── actions.ts            # createGroup, updateGroup, archiveGroup, duplicateGroup
│   │   │   ├── queries.ts            # getGroups, getGroupById, getGroupStudents, getGroupSchedule
│   │   │   ├── validations.ts        # groupCreateSchema, groupUpdateSchema
│   │   │   └── components/
│   │   │       ├── GroupCard.tsx
│   │   │       ├── GroupForm.tsx
│   │   │       ├── GroupList.tsx
│   │   │       └── GroupScheduleGrid.tsx
│   │   │
│   │   ├── students/                 # ═══ PERSON A ═══
│   │   │   ├── actions.ts            # createStudent, updateStudent, enrollInGroup, removeFromGroup, bulkImport
│   │   │   ├── queries.ts            # getStudents, getStudentById, getStudentProfile, searchStudents
│   │   │   ├── validations.ts        # studentCreateSchema, studentImportSchema
│   │   │   └── components/
│   │   │       ├── StudentCard.tsx
│   │   │       ├── StudentForm.tsx
│   │   │       ├── StudentList.tsx
│   │   │       ├── StudentProfile.tsx
│   │   │       └── CSVImporter.tsx
│   │   │
│   │   ├── schedule/                 # ═══ PERSON A ═══
│   │   │   ├── queries.ts            # getWeeklySchedule, checkConflicts
│   │   │   └── components/
│   │   │       └── WeeklyCalendar.tsx
│   │   │
│   │   ├── attendance/               # ═══ PERSON B ═══
│   │   │   ├── actions.ts            # markAttendance (bulk), createManualSession, syncOfflineRecords
│   │   │   ├── queries.ts            # getTodaySessions, getSessionAttendance, getAttendanceReport, getStudentAttendanceRate
│   │   │   ├── validations.ts        # attendanceMarkSchema, offlineSyncSchema
│   │   │   └── components/
│   │   │       ├── AttendanceSheet.tsx       # THE main screen — student list with toggle
│   │   │       ├── StudentAttendanceRow.tsx  # Single row: name + status toggle + payment indicator
│   │   │       ├── SessionCard.tsx           # Today's session card
│   │   │       ├── AttendanceHistory.tsx
│   │   │       └── AttendanceReport.tsx
│   │   │
│   │   ├── payments/                 # ═══ PERSON B ═══
│   │   │   ├── actions.ts            # recordPayment, sendPaymentReminder, generateReceipt
│   │   │   ├── queries.ts            # getPayments, getStudentLedger, getOverdueStudents, getRevenueSummary
│   │   │   ├── validations.ts        # paymentRecordSchema
│   │   │   └── components/
│   │   │       ├── PaymentForm.tsx
│   │   │       ├── PaymentLedger.tsx        # Per-student month-by-month
│   │   │       ├── OverdueList.tsx
│   │   │       ├── RevenueCards.tsx
│   │   │       └── ReceiptPDF.tsx
│   │   │
│   │   ├── notifications/            # ═══ PERSON B ═══
│   │   │   ├── actions.ts            # sendNotification, sendBulkReminder, retryFailed
│   │   │   ├── queries.ts            # getNotificationLogs, getFailedNotifications
│   │   │   ├── templates.ts          # Arabic message templates for each notification type
│   │   │   └── providers/
│   │   │       ├── sms.ts            # SMS provider abstraction
│   │   │       └── whatsapp.ts       # WhatsApp Business API abstraction
│   │   │
│   │   ├── dashboard/                # ═══ PERSON C ═══
│   │   │   ├── queries.ts            # getTeacherDashboard, getStudentDashboard, getParentDashboard
│   │   │   └── components/
│   │   │       ├── TeacherDashboard.tsx
│   │   │       ├── StudentDashboard.tsx
│   │   │       ├── ParentDashboard.tsx
│   │   │       ├── RevenueCard.tsx
│   │   │       ├── AttendanceCard.tsx
│   │   │       ├── TodaySessionsCard.tsx
│   │   │       └── AlertsCard.tsx
│   │   │
│   │   └── public-pages/             # ═══ PERSON C ═══
│   │       ├── queries.ts            # getTeacherPublicProfile, getOpenGroups
│   │       ├── actions.ts            # registerStudent (public, no auth required)
│   │       ├── validations.ts        # publicRegistrationSchema
│   │       └── components/
│   │           ├── TeacherLanding.tsx
│   │           ├── RegistrationForm.tsx
│   │           └── GroupSelector.tsx
│   │
│   │
│   └── app/                          # ═══ NEXT.JS APP ROUTER ═══
│       │
│       ├── globals.css               # Tailwind base + RTL + dark mode + Arabic font
│       ├── layout.tsx                # Root layout: RTLProvider + ThemeProvider
│       │
│       ├── (marketing)/              # www.eduplatform.com
│       │   ├── layout.tsx
│       │   ├── page.tsx              # Landing page
│       │   └── pricing/
│       │       └── page.tsx
│       │
│       ├── (tenant)/                 # {slug}.eduplatform.com
│       │   ├── layout.tsx            # Resolves tenant, provides TenantContext
│       │   │
│       │   ├── page.tsx              # ═══ C ═══ Public teacher landing
│       │   ├── register/             # ═══ C ═══ Public student registration
│       │   │   └── page.tsx
│       │   │
│       │   ├── (auth)/
│       │   │   ├── login/
│       │   │   │   └── page.tsx      # ═══ C ═══ Phone + OTP login
│       │   │   └── verify/
│       │   │       └── page.tsx      # ═══ C ═══ OTP verification
│       │   │
│       │   ├── (dashboard)/          # Protected — requires auth
│       │   │   ├── layout.tsx        # AppShell + role-based sidebar + auth guard
│       │   │   │
│       │   │   ├── teacher/          # ═══ PERSON A (structure + data) ═══
│       │   │   │   ├── page.tsx      # ═══ PERSON C (dashboard) ═══ ← EXCEPTION
│       │   │   │   ├── groups/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── new/
│       │   │   │   │   │   └── page.tsx
│       │   │   │   │   └── [groupId]/
│       │   │   │   │       ├── page.tsx
│       │   │   │   │       └── edit/
│       │   │   │   │           └── page.tsx
│       │   │   │   ├── students/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── new/
│       │   │   │   │   │   └── page.tsx
│       │   │   │   │   ├── import/
│       │   │   │   │   │   └── page.tsx
│       │   │   │   │   └── [studentId]/
│       │   │   │   │       └── page.tsx
│       │   │   │   ├── schedule/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── settings/
│       │   │   │       └── page.tsx
│       │   │   │
│       │   │   ├── attendance/       # ═══ PERSON B ═══
│       │   │   │   ├── page.tsx      # Today's sessions
│       │   │   │   ├── take/
│       │   │   │   │   └── [sessionId]/
│       │   │   │   │       └── page.tsx   # THE attendance screen
│       │   │   │   ├── history/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── reports/
│       │   │   │       └── page.tsx
│       │   │   │
│       │   │   ├── payments/         # ═══ PERSON B ═══
│       │   │   │   ├── page.tsx      # Overview + recent
│       │   │   │   ├── record/
│       │   │   │   │   └── page.tsx
│       │   │   │   ├── overdue/
│       │   │   │   │   └── page.tsx
│       │   │   │   └── reports/
│       │   │   │       └── page.tsx
│       │   │   │
│       │   │   ├── student/          # ═══ PERSON C ═══
│       │   │   │   ├── page.tsx
│       │   │   │   └── schedule/
│       │   │   │       └── page.tsx
│       │   │   │
│       │   │   └── parent/           # ═══ PERSON C ═══
│       │   │       ├── page.tsx
│       │   │       └── [childId]/
│       │   │           └── page.tsx
│       │   │
│       │   └── api/                  # API routes — each person owns their module's APIs
│       │       ├── auth/
│       │       │   ├── send-otp/route.ts
│       │       │   ├── verify-otp/route.ts
│       │       │   ├── logout/route.ts
│       │       │   └── session/route.ts
│       │       ├── tenant/                    # ═══ A ═══
│       │       │   ├── current/route.ts
│       │       │   ├── public-profile/route.ts
│       │       │   └── settings/route.ts
│       │       ├── groups/                    # ═══ A ═══
│       │       │   ├── route.ts
│       │       │   └── [groupId]/
│       │       │       ├── route.ts
│       │       │       ├── archive/route.ts
│       │       │       └── students/route.ts
│       │       ├── students/                  # ═══ A ═══
│       │       │   ├── route.ts
│       │       │   ├── import/route.ts
│       │       │   └── [studentId]/route.ts
│       │       ├── sessions/                  # ═══ B ═══
│       │       │   ├── today/route.ts
│       │       │   ├── route.ts
│       │       │   └── [sessionId]/
│       │       │       └── attendance/route.ts
│       │       ├── attendance/                # ═══ B ═══
│       │       │   ├── offline-sync/route.ts
│       │       │   └── reports/route.ts
│       │       ├── payments/                  # ═══ B ═══
│       │       │   ├── route.ts
│       │       │   ├── summary/route.ts
│       │       │   ├── overdue/route.ts
│       │       │   ├── remind/route.ts
│       │       │   └── [paymentId]/
│       │       │       └── receipt/route.ts
│       │       ├── notifications/             # ═══ B ═══
│       │       │   ├── send/route.ts
│       │       │   └── logs/route.ts
│       │       ├── schedule/                  # ═══ A ═══
│       │       │   ├── week/route.ts
│       │       │   └── conflicts/route.ts
│       │       ├── dashboard/                 # ═══ C ═══
│       │       │   ├── teacher/route.ts
│       │       │   ├── student/route.ts
│       │       │   └── parent/route.ts
│       │       └── public/                    # ═══ C ═══
│       │           ├── register/route.ts
│       │           └── groups/route.ts
│       │
│       └── not-found.tsx
│
└── public/
    ├── fonts/
    │   └── Cairo-Variable.woff2
    └── images/
        └── logo.svg
```

---

## Ownership Map

### 🅰️ Person A — "البيانات والتنظيم" (Data & Structure)

| Owns | Modules | Pages | APIs |
|---|---|---|---|
| Groups | `modules/groups/` | `teacher/groups/**` | `api/groups/**` |
| Students | `modules/students/` | `teacher/students/**` | `api/students/**` |
| Schedule | `modules/schedule/` | `teacher/schedule/` | `api/schedule/**` |
| Settings | — | `teacher/settings/` | `api/tenant/**` |

### 🅱️ Person B — "الحضور والفلوس" (Tracking & Money)

| Owns | Modules | Pages | APIs |
|---|---|---|---|
| Attendance | `modules/attendance/` | `attendance/**` | `api/sessions/**`, `api/attendance/**` |
| Payments | `modules/payments/` | `payments/**` | `api/payments/**` |
| Notifications | `modules/notifications/` | — | `api/notifications/**` |

### 🅲 Person C — "العرض والتجربة" (Display & Experience)

| Owns | Modules | Pages | APIs |
|---|---|---|---|
| Dashboards | `modules/dashboard/` | `teacher/page.tsx`, `student/**`, `parent/**` | `api/dashboard/**` |
| Public Pages | `modules/public-pages/` | `(tenant)/page.tsx`, `register/` | `api/public/**` |
| Auth UI | `modules/auth/` (UI only) | `login/`, `verify/` | — |
| Marketing | — | `(marketing)/**` | — |

### Import Rules

```
✅ ALLOWED: Import queries.ts from another module
   Person C imports getRevenueSummary() from modules/payments/queries
   Person B imports getGroupStudents() from modules/groups/queries

❌ FORBIDDEN: Edit files in another person's module
❌ FORBIDDEN: Write direct DB queries for another module's tables
   (use their exported queries instead)

🤝 NEED SOMETHING? Ask the owner to add it to their queries.ts
```

---

## Dependency Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  app/ pages  │────→│  modules/   │────→│   lib/      │
│  (thin UI)   │     │  (logic)    │     │  (infra)    │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
                          ↓
                    ┌─────────────┐
                    │   prisma/   │
                    │  (schema)   │
                    └─────────────┘

Rules:
• Pages import from modules — never direct DB access
• Modules import from lib — never from other modules' internals
• Modules CAN import other modules' queries.ts (read-only)
• lib/ imports from prisma client only
• NO circular dependencies between modules
```

---

## Day 1 Morning Setup (ALL 3 — 2 hours)

```
 1. Create project: npx create-next-app@latest eduplatform
 2. Install deps: prisma, shadcn, zod, next-themes, lucide-react
 3. Create ALL folders (empty files as placeholders)
 4. Copy schema.prisma → npx prisma generate → npx prisma migrate dev
 5. Set up lib/ (db.ts, tenant.ts, auth.ts, api-response.ts, utils.ts)
 6. Set up types/index.ts (the contract)
 7. Set up middleware.ts (subdomain routing)
 8. Set up components/layout/ (AppShell, Sidebar, Header)
 9. Set up components/shared/ (RTLProvider, ThemeProvider, LoadingSpinner)
10. Set up globals.css (RTL, Arabic font, dark mode)
11. Set up config/ (routes.ts, plans.ts, env.ts)
12. Copy CLAUDE.md to root
13. Run seed.ts → test data in DB
14. Push to GitHub → everyone pulls → start individual work
```

---

## Git Strategy

```
main                 ← production (deploy on push)
  └── develop        ← integration branch
       ├── feat/a-*  ← Person A's branches (feat/a-groups-crud, feat/a-students-list)
       ├── feat/b-*  ← Person B's branches
       └── feat/c-*  ← Person C's branches

Daily:
  - Each person works on feat/ branch
  - End of day: PR to develop → quick review → merge
  - Day 4: develop → main (deploy)

Commits: conventional format
  feat: add group creation form
  fix: tenant isolation missing in payments query  
  chore: update Arabic translations
```

---

## Communication Protocol

| Situation | Action |
|---|---|
| Need data from another module | Import their `queries.ts`. If query doesn't exist → message the owner. |
| Found bug in shared code | Fix it immediately. Tell team in chat. |
| Need to change types/index.ts | STOP. Discuss with team first. This is the contract. |
| Need to change schema.prisma | STOP. Discuss with team first. This affects everyone. |
| Conflict in git | Resolve immediately. Don't leave conflicts overnight. |
| Blocked on another person's work | Use mock data temporarily. Replace with real import when their code is ready. |

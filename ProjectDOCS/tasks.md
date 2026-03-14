# EduPlatform — Task Breakdown (Final)

## How to Use This File

1. Each task has a **Prompt** — copy it and paste into Cursor / Claude Code
2. Before every prompt, the AI must have: `CLAUDE.md` + `schema.prisma` + `types/index.ts` in context
3. Check off tasks as you complete them
4. After each task: `npm run build` to catch TypeScript errors

---

## DAY 1 MORNING — Foundation (ALL 3 Together, ~2 hours)

> ⚠️ NOBODY starts individual work until ALL foundation tasks are done.

### Setup

- [ ] **S-01:** Create Next.js project
  ```bash
  npx create-next-app@latest eduplatform --typescript --tailwind --app --eslint
  cd eduplatform
  ```

- [ ] **S-02:** Install dependencies
  ```bash
  npm install prisma @prisma/client zod lucide-react next-themes redis ioredis
  npx shadcn@latest init
  npx shadcn@latest add button card input label select dialog toast table badge tabs separator dropdown-menu sheet avatar textarea
  ```

- [ ] **S-03:** Copy `schema.prisma` → run migration
  ```bash
  npx prisma generate
  npx prisma migrate dev --name init
  ```

- [ ] **S-04:** Create complete folder structure
  ```
  Prompt: "Create the entire folder structure from PROJECT_STRUCTURE.md.
  Create all folders and placeholder files (empty exports).
  Every module gets: actions.ts, queries.ts, validations.ts, components/ folder.
  Every app route gets: page.tsx with a placeholder component."
  ```

- [ ] **S-05:** Set up `src/lib/db.ts`
  ```
  Prompt: "Create a Prisma client singleton at src/lib/db.ts.
  Use the standard Next.js pattern to avoid multiple clients in dev mode."
  ```

- [ ] **S-06:** Set up `src/lib/tenant.ts`
  ```
  Prompt: "Create tenant utilities at src/lib/tenant.ts:
  - getTenantFromHost(host: string): extracts subdomain, checks Redis cache first, 
    then DB, caches result for 1 hour. Returns Tenant or null.
  - requireTenant(req?: NextRequest): calls getTenantFromHost, throws 404 if not found.
  For MVP, if Redis is not configured, skip cache and query DB directly."
  ```

- [ ] **S-07:** Set up `middleware.ts`
  ```
  Prompt: "Create Next.js middleware at middleware.ts for subdomain routing:
  1. Extract subdomain from request Host header
  2. 'www' or no subdomain → rewrite to /(marketing) routes
  3. 'app' → rewrite to /(platform-admin) routes (future)
  4. Any other subdomain → rewrite to /(tenant) routes, set x-tenant-slug header
  5. For local dev: support ahmed.localhost:3000 format
  Matcher: exclude _next, static files, api routes that don't need rewriting."
  ```

- [ ] **S-08:** Set up `src/lib/auth.ts`
  ```
  Prompt: "Create auth utilities at src/lib/auth.ts:
  - generateOTP(): returns 6-digit string
  - sendOTP(phone): creates OTP record in DB, calls SMS provider (console.log for now)
  - verifyOTP(phone, code): checks OTP table, marks as used, returns boolean
  - createSession(userId, tenantId): creates AuthSession with JWT token, returns { token, refreshToken }
  - requireAuth(req?): validates session from cookie/header, returns User or throws 401
  - getCurrentUser(): same as requireAuth but returns null instead of throwing
  Rate limit: max 3 OTPs per phone per 15 minutes. Max 3 verification attempts per OTP."
  ```

- [ ] **S-09:** Set up `src/types/index.ts`
  ```
  Prompt: "Create the shared types file at src/types/index.ts.
  Define TypeScript interfaces for ALL entities matching the Prisma schema:
  Tenant, User, Group, GroupStudent, Session, Attendance, Payment, Notification.
  
  Plus these aggregated types for dashboards:
  - TeacherDashboardData: { revenue: {thisMonth, lastMonth, change}, outstanding: {total, count}, students: {total, new}, attendance: {rate, change}, todaySessions: Session[], alerts: Alert[] }
  - StudentWithPaymentStatus: student + paymentStatus + attendanceRate
  - AttendanceRecord: { studentId, studentName, status, paymentStatus }
  - RevenueSummary: { collected, outstanding, total, collectionRate }
  - DashboardAlert: { type, message, severity, studentId? }
  
  Plus standardized API types:
  - ApiResponse<T>: { data: T, meta?: { total, page } }
  - ApiError: { error: { code: string, message: string, details?: any } }"
  ```

- [ ] **S-10:** Set up `src/lib/api-response.ts`
  ```
  Prompt: "Create standardized API response helpers at src/lib/api-response.ts:
  - successResponse(data, meta?) → NextResponse.json({ data, meta })
  - errorResponse(code, message, status) → NextResponse.json({ error: { code, message } }, { status })
  - notFound(message?) → errorResponse('NOT_FOUND', message || 'غير موجود', 404)
  - unauthorized() → errorResponse('UNAUTHORIZED', 'يرجى تسجيل الدخول', 401)
  - forbidden() → errorResponse('FORBIDDEN', 'ليس لديك صلاحية', 403)
  - validationError(details) → errorResponse('VALIDATION_ERROR', 'بيانات غير صحيحة', 422)"
  ```

- [ ] **S-11:** Set up shared components
  ```
  Prompt: "Create the shared layout components:
  1. src/components/layout/AppShell.tsx — main layout with sidebar (desktop) + bottom nav (mobile) + header + content area. Takes children. RTL.
  2. src/components/layout/Sidebar.tsx — role-based navigation. Props: role ('teacher'|'student'|'parent'). Shows different menu items per role. Arabic labels. Active state highlighting.
     Teacher menu: لوحة التحكم, المجموعات, الطلاب, الحضور, المصاريف, الجدول, الإعدادات
     Student menu: لوحة التحكم, جدولي
     Parent menu: لوحة التحكم, أبنائي
  3. src/components/layout/Header.tsx — tenant name + dark mode toggle + user avatar dropdown (profile, logout)
  4. src/components/shared/RTLProvider.tsx — wraps app in dir=rtl context
  5. src/components/shared/ThemeProvider.tsx — next-themes dark mode
  6. src/components/shared/LoadingSpinner.tsx — centered spinner with 'جاري التحميل...'
  7. src/components/shared/EmptyState.tsx — icon + message + optional action button
  All components: Tailwind + shadcn, RTL-safe (ms- not ml-), mobile-first."
  ```

- [ ] **S-12:** Set up globals.css + Tailwind config
  ```
  Prompt: "Set up styling:
  1. tailwind.config.ts: add Cairo font, custom colors (primary=#1A5276, secondary=#2E86C1), dark mode class strategy
  2. globals.css: import Cairo from Google Fonts, set RTL base styles, dark mode CSS variables, shadcn theme overrides
  3. src/app/layout.tsx: root layout with RTLProvider + ThemeProvider + Cairo font + dir=rtl + lang=ar"
  ```

- [ ] **S-13:** Set up seed data
  ```
  Prompt: "Create prisma/seed.ts that populates:
  - 2 tenants: 'ahmed' (solo teacher) and 'noor-academy' (center with 2 teachers)
  - 3 groups per tenant with realistic Arabic names ('رياضيات 3 ثانوي - مجموعة أ')
  - 15-20 students per group with realistic Egyptian Arabic names and phone numbers (010XXXXXXXX)
  - 2 weeks of attendance data (mix of present/absent)
  - 2 months of payment data (mix of paid/pending/overdue)
  - 5 notification records
  Add to package.json: 'prisma': { 'seed': 'ts-node prisma/seed.ts' }"
  ```

- [ ] **S-14:** Set up config files
  ```
  Prompt: "Create config files:
  1. src/config/routes.ts — export const ROUTES = { teacher: { dashboard: '/teacher', groups: '/teacher/groups', ... }, student: { ... }, parent: { ... } }
  2. src/config/plans.ts — export const PLAN_LIMITS = { FREE: { maxStudents: 30, smsQuota: 50 }, BASIC: { maxStudents: 100, smsQuota: 200 }, ... }
  3. src/config/env.ts — type-safe env access with validation
  4. .env.example — all required env vars with comments"
  ```

- [ ] **S-15:** Copy CLAUDE.md to root. Push to GitHub. Everyone pulls.

---

## DAY 1 PM + DAY 2 — Core Features (Split)

### 🅰️ Person A — Groups & Students

- [ ] **A-01: Groups Module — Logic**
  ```
  Prompt: "Build the groups module at src/modules/groups/:
  
  queries.ts:
  - getGroups(tenantId) → all active groups with student count
  - getGroupById(tenantId, groupId) → single group with students list
  - getGroupStudents(tenantId, groupId) → students in group with payment status
  
  actions.ts:
  - createGroup(formData) → validates with Zod, creates group, revalidates path
  - updateGroup(groupId, formData) → updates group
  - archiveGroup(groupId) → sets isActive=false (soft delete)
  - duplicateGroup(groupId) → copies group settings with '(نسخة)' suffix
  
  validations.ts:
  - groupCreateSchema: name(required, min 3), subject(required), gradeLevel(required), 
    days(array, min 1, values from ['saturday','sunday','monday','tuesday','wednesday','thursday','friday']),
    timeStart(required, HH:mm), timeEnd(required, HH:mm, after timeStart),
    maxCapacity(min 1, max 200), monthlyFee(min 0), color(hex), room(optional)
  
  CRITICAL: Every query must filter by tenantId."
  ```

- [ ] **A-02: Groups UI — List + Create**
  ```
  Prompt: "Create the groups pages:
  
  1. src/app/(tenant)/(dashboard)/teacher/groups/page.tsx (Server Component)
     - Fetches groups using getGroups(tenant.id)
     - Grid of GroupCard components (mobile: 1 col, tablet: 2 cols, desktop: 3 cols)
     - Each card: colored top border (group color), name, subject badge, days, time, 
       student count / capacity (e.g., '٣٢ / ٤٠'), monthly fee
     - 'إنشاء مجموعة جديدة' button → links to /teacher/groups/new
     - Empty state if no groups
  
  2. src/app/(tenant)/(dashboard)/teacher/groups/new/page.tsx
     - Uses GroupForm component
     - On success: redirect to /teacher/groups
  
  3. src/modules/groups/components/GroupForm.tsx (Client Component)
     - Fields: name, subject, gradeLevel, days (DaysPicker multi-select), 
       timeStart, timeEnd, room, maxCapacity, monthlyFee, color (ColorPicker)
     - Arabic labels and error messages
     - Submit calls createGroup server action
  
  4. src/modules/groups/components/GroupCard.tsx
  5. src/modules/groups/components/GroupList.tsx
  
  All Arabic. RTL (ms- not ml-). Mobile-first."
  ```

- [ ] **A-03: Students Module — Logic**
  ```
  Prompt: "Build the students module at src/modules/students/:
  
  queries.ts:
  - getStudents(tenantId, filters?: { search?, groupId?, paymentStatus? }) → students with groups and payment status
  - getStudentById(tenantId, studentId) → student with full details
  - getStudentProfile(tenantId, studentId) → student + attendance rate + payment history + enrolled groups
  - searchStudents(tenantId, query) → quick search by name
  
  actions.ts:
  - createStudent(formData) → create user with STUDENT role + optional group enrollment
  - updateStudent(studentId, formData) → update student details
  - enrollInGroup(studentId, groupId) → create GroupStudent (check capacity, handle waitlist)
  - removeFromGroup(studentId, groupId) → set enrollment status to DROPPED
  - bulkImport(tenantId, records[]) → create multiple students from CSV data
  
  validations.ts:
  - studentCreateSchema: name(required, min 2), phone(optional, Egyptian format), 
    parentName(required), parentPhone(required, starts with '01', 11 digits),
    gradeLevel(required), groupId(optional)
  
  For payment status: check if student has any PENDING/OVERDUE payments this month.
  CRITICAL: Every query must filter by tenantId."
  ```

- [ ] **A-04: Students UI — List + Add + Profile**
  ```
  Prompt: "Create students pages:
  
  1. src/app/(tenant)/(dashboard)/teacher/students/page.tsx
     - DataTable: name, grade, groups (badges), payment status (colored badge), parent phone
     - Mobile: card layout instead of table
     - SearchBar + filter by group + filter by payment status
     - 'إضافة طالب' button → modal with StudentForm
  
  2. src/modules/students/components/StudentForm.tsx (Client Component)
     - Fields: name, phone, parentName, parentPhone, gradeLevel, select group(s)
     - Arabic labels and validation errors
  
  3. src/app/(tenant)/(dashboard)/teacher/students/[studentId]/page.tsx
     - Student profile: personal info, groups, attendance history (last 10), payment ledger
     - Edit button, change group button
  
  4. src/app/(tenant)/(dashboard)/teacher/students/import/page.tsx
     - CSV upload → preview table → column mapping → import button
     - Results: 'تم إضافة ٤٥ طالب بنجاح | ٣ أخطاء'
  
  All Arabic. RTL. Mobile-first."
  ```

- [ ] **A-05: Schedule + Settings**
  ```
  Prompt: "Create schedule and settings:
  
  1. src/modules/schedule/queries.ts:
     - getWeeklySchedule(tenantId) → all groups organized by day/time for calendar view
     - checkConflicts(tenantId, days, timeStart, timeEnd, room?) → returns conflicting groups
  
  2. src/modules/schedule/components/WeeklyCalendar.tsx
     - Grid: days (cols) × time slots (rows)
     - Colored blocks for each session (group color)
     - Shows: group name, student count, room
     - Conflict highlighting (red border if overlap)
  
  3. src/app/(tenant)/(dashboard)/teacher/schedule/page.tsx — uses WeeklyCalendar
  
  4. src/app/(tenant)/(dashboard)/teacher/settings/page.tsx
     - Subdomain (read-only display)
     - Name, logo upload, theme color, bio, subjects, region
     - Save via updateTenant server action"
  ```

### 🅱️ Person B — Attendance & Payments

- [ ] **B-01: Attendance Module — Logic**
  ```
  Prompt: "Build the attendance module at src/modules/attendance/:
  
  queries.ts:
  - getTodaySessions(tenantId) → auto-generate sessions for today based on group schedules
    (if today is Saturday and a group meets on Saturdays, create a Session if none exists for today)
    Return sessions with group info and attendance count.
  - getSessionAttendance(tenantId, sessionId) → list of students with their status + payment status
  - getAttendanceReport(tenantId, month) → per-group attendance rate, students with most absences
  - getStudentAttendanceRate(tenantId, studentId) → attendance percentage over last 30 days
  
  actions.ts:
  - markAttendance(sessionId, records: { studentId, status }[]) → bulk upsert attendance records
    After marking: trigger notification for each student (async, don't block the response)
  - createManualSession(groupId, date, type) → create makeup/extra session
  - syncOfflineRecords(records[]) → process offline queue (server wins on conflict)
  
  validations.ts:
  - attendanceBulkSchema: sessionId(required), records(array of { studentId, status })
  
  CRITICAL: Every query must filter by tenantId.
  Session auto-generation logic: 
  - Get all active groups for tenant
  - Filter groups where today's day of week is in group.days[]
  - For each match: check if Session exists for (groupId, today's date)
  - If not: create Session with status SCHEDULED"
  ```

- [ ] **B-02: Attendance UI — The Most Important Screen**
  ```
  Prompt: "Create THE core attendance screen. This must be perfect — it's used 10+ times daily.
  
  1. src/app/(tenant)/(dashboard)/attendance/page.tsx — Today's Sessions
     - List of SessionCard components for today
     - Each card: group name (with color), time, '٢٨ / ٣٥ طالب', status
     - Tap card → navigate to /attendance/take/[sessionId]
     - If no sessions: 'لا توجد حصص اليوم 📅'
  
  2. src/app/(tenant)/(dashboard)/attendance/take/[sessionId]/page.tsx — Mark Attendance
     - This is THE attendance sheet. Requirements:
       a) List of ALL students in the group
       b) Each row: student name + toggle (حاضر ✅ / غائب ❌) + payment indicator (🟢 paid / 🔴 unpaid)
       c) Default ALL to ABSENT — teacher taps to mark PRESENT
       d) Banner at top if unpaid students: '⚠️ ٥ طلاب لم يدفعوا هذا الشهر'
       e) Counter: 'الحضور: ٢٨ / ٣٥'
       f) Sticky 'حفظ الحضور' button at bottom
       g) MUST complete in under 10 seconds for 40 students
       h) Must work with one thumb on mobile
     - Uses AttendanceSheet.tsx and StudentAttendanceRow.tsx
  
  3. src/modules/attendance/components/AttendanceSheet.tsx (Client Component)
  4. src/modules/attendance/components/StudentAttendanceRow.tsx
  5. src/modules/attendance/components/SessionCard.tsx"
  ```

- [ ] **B-03: Payments Module — Logic**
  ```
  Prompt: "Build the payments module at src/modules/payments/:
  
  queries.ts:
  - getPayments(tenantId, filters?: { studentId?, month?, status? })
  - getStudentLedger(tenantId, studentId) → month-by-month payment history
  - getOverdueStudents(tenantId) → students with PENDING/OVERDUE payments, sorted by amount
  - getRevenueSummary(tenantId, month?) → { collected, outstanding, total, collectionRate, comparedToLastMonth }
  
  actions.ts:
  - recordPayment(formData) → create Payment record, generate receipt number, update status
    Receipt format: 'RCP-{slug}-{YYYYMMDD}-{seq}'
  - sendPaymentReminder(studentIds[]) → queue notification for each student's parent
  - generateReceipt(paymentId) → return receipt data (for PDF generation)
  
  validations.ts:
  - paymentRecordSchema: studentId(required), amount(positive integer), month(YYYY-MM format),
    method(enum), notes(optional)
  
  Status calculation:
  - Get group monthlyFee for the student
  - Sum all payments for student+month
  - If sum >= fee → PAID. If sum > 0 but < fee → PARTIAL. If sum = 0 and past due → OVERDUE. Else → PENDING."
  ```

- [ ] **B-04: Payments UI**
  ```
  Prompt: "Create payment pages:
  
  1. src/app/(tenant)/(dashboard)/payments/page.tsx — Overview
     - Top: 4 RevenueCards (collected, outstanding, collection rate, compared to last month)
     - Recent payments list
  
  2. src/app/(tenant)/(dashboard)/payments/record/page.tsx
     - PaymentForm: select student (searchable), amount, method (cash only for MVP), month, notes
     - On save: show receipt number, option to print/share
  
  3. src/app/(tenant)/(dashboard)/payments/overdue/page.tsx
     - OverdueList: student name, amount owed, months overdue, parent phone
     - 'إرسال تذكير' per student + 'إرسال تذكير للكل' bulk button
  
  4. src/modules/payments/components/PaymentLedger.tsx
     - Month-by-month view for a single student
     - Each month: status badge, amount, date paid, receipt link
  
  5. src/modules/payments/components/ReceiptPDF.tsx
     - Simple receipt: platform logo, teacher name, student name, amount, date, receipt #, method
     - Use @react-pdf/renderer or generate HTML and print
  
  All amounts displayed as '{amount} جنيه'. Arabic. RTL."
  ```

- [ ] **B-05: Notifications Module**
  ```
  Prompt: "Build the notifications module at src/modules/notifications/:
  
  templates.ts — export functions returning Arabic messages:
  - attendancePresent(studentName, subject, time) → '✅ ابنكم/بنتكم {name} حضر/ت حصة {subject} الساعة {time}'
  - attendanceAbsent(studentName, subject) → '⚠️ ابنكم/بنتكم {name} لم يحضر/تحضر حصة {subject} اليوم'
  - paymentReminder(month, amount) → '💰 تذكير: مصاريف شهر {month} مستحقة ({amount} جنيه)'
  - paymentOverdue(amount) → '⚠️ عليكم متأخرات بمبلغ {amount} جنيه — برجاء السداد'
  - classReminder(subject, time) → '📅 تذكير: حصة {subject} بكرة الساعة {time}'
  Each returns { title: string, body: string }
  
  providers/sms.ts — sendSMS(phone, message): for MVP, console.log the message and create Notification record with SENT status. When real SMS provider is configured, make HTTP call here.
  
  providers/whatsapp.ts — same pattern for WhatsApp.
  
  actions.ts:
  - sendNotification(payload: { userId, type, channel, recipientPhone, templateData })
    → get template text → call provider → create Notification record → return success/failure
  - sendBulkReminder(tenantId, studentIds[], type) → loop sendNotification for each
  
  queries.ts:
  - getNotificationLogs(tenantId, filters?) → recent notifications with status
  
  Wire into attendance: after markAttendance in modules/attendance/actions.ts, 
  call sendNotification for each student (PRESENT → attendancePresent, ABSENT → attendanceAbsent).
  Use Promise.allSettled so notification failures don't block attendance saving."
  ```

### 🅲 Person C — Dashboards & Public Pages

- [ ] **C-01: Auth UI**
  ```
  Prompt: "Create authentication pages:
  
  1. src/app/(tenant)/(auth)/login/page.tsx — centered card with:
     - Tenant logo + name at top
     - PhoneInput component (Egyptian format, starts with 01)
     - 'إرسال كود التحقق' button
     - Calls sendOTP server action → redirects to /verify
  
  2. src/app/(tenant)/(auth)/verify/page.tsx — centered card with:
     - 'أدخل كود التحقق المرسل إلى {phone}'
     - OTPInput: 6 individual digit boxes, auto-focus next on input
     - Auto-submit when all 6 digits entered
     - 'إعادة الإرسال' link (disabled for 60 seconds countdown)
     - On success: redirect to appropriate dashboard based on role
  
  3. src/modules/auth/components/LoginForm.tsx (Client Component)
  4. src/modules/auth/components/OTPInput.tsx (Client Component)
  
  Clean, centered, Arabic. Professional look."
  ```

- [ ] **C-02: Public Teacher Landing Page**
  ```
  Prompt: "Create the public teacher profile at src/app/(tenant)/page.tsx.
  This is what parents see when visiting ahmed.eduplatform.com (no login needed).
  
  - Hero: teacher name, subjects, region, bio
  - Theme colored header using tenant's themeColor
  - Available groups section: cards showing name, days, time, fee, available spots
  - 'سجّل ابنك الآن' CTA button → links to /register
  - Contact info (if teacher added phone)
  - Professional, trustworthy design
  
  Uses src/modules/public-pages/components/TeacherLanding.tsx
  Data from: src/modules/public-pages/queries.ts → getTeacherPublicProfile, getOpenGroups"
  ```

- [ ] **C-03: Self-Registration Page**
  ```
  Prompt: "Create student self-registration at src/app/(tenant)/register/page.tsx.
  Public page — no auth needed.
  
  - RegistrationForm: student name, parent name, parent phone, grade, select group
  - GroupSelector shows: group name, days, time, price, spots remaining ('٣٢ / ٤٠')
  - If group is full: show 'المجموعة ممتلئة' and disable, or offer waitlist
  - Submit → create student + enroll → success message: 'تم التسجيل بنجاح! ✅'
  - Prevent duplicate: same parentPhone + studentName in same group = error
  - No approval needed — student auto-enrolled (teacher can remove later)
  
  Uses src/modules/public-pages/components/RegistrationForm.tsx, GroupSelector.tsx"
  ```

- [ ] **C-04: Teacher Dashboard**
  ```
  Prompt: "Create the teacher's main dashboard:
  
  1. src/modules/dashboard/queries.ts → getTeacherDashboardData(tenantId):
     Aggregates from other modules:
     - Revenue: import getRevenueSummary from modules/payments/queries
     - Today sessions: import getTodaySessions from modules/attendance/queries  
     - Student count: import from modules/students/queries
     - Alerts: students with 3+ absences, overdue payments, groups at capacity
  
  2. src/modules/dashboard/components/TeacherDashboard.tsx
     Top row — 4 StatsCards:
     - 💰 إيرادات الشهر: {amount} جنيه (↑12% أو ↓5%)
     - ⚠️ المتأخرات: {amount} جنيه ({count} طالب)
     - 👨‍🎓 إجمالي الطلاب: {count} (+{new} جديد)
     - ✅ نسبة الحضور: {rate}% (↑ أو ↓)
     
     Middle — Today's Sessions list (reuse SessionCard from Person B)
     
     Bottom — Alerts list: critical items needing attention
  
  3. src/app/(tenant)/(dashboard)/teacher/page.tsx — renders TeacherDashboard
  
  Mobile: cards stack vertically. All Arabic."
  ```

- [ ] **C-05: Student + Parent Dashboards**
  ```
  Prompt: "Create student and parent views:
  
  1. src/app/(tenant)/(dashboard)/student/page.tsx + StudentDashboard.tsx
     - My next session card
     - My attendance rate this month (with visual bar)
     - My payment status (paid ✅ or due amount)
     - My groups list
  
  2. src/app/(tenant)/(dashboard)/parent/page.tsx + ParentDashboard.tsx
     - Per child card (support multiple children):
       - Name + grade
       - Today: attended ✅ or absent ⚠️ or no session today
       - Payment: paid ✅ or '{amount} جنيه متبقي'
       - Attendance rate
       - Next session
  
  3. src/app/(tenant)/(dashboard)/layout.tsx — Auth guard + role-based redirect:
     - Not logged in → redirect to /login
     - Teacher → /teacher
     - Student → /student  
     - Parent → /parent
     - Wraps content in AppShell with role-based Sidebar"
  ```

- [ ] **C-06: Marketing Site**
  ```
  Prompt: "Create marketing site at src/app/(marketing)/page.tsx.
  Shown at www.eduplatform.com.
  
  - Hero: 'نظّم سنترك في دقائق — مش في أيام' + 'سجّل مجاناً' CTA
  - 3 feature cards with icons: إدارة الحضور, تحصيل المصاريف, إشعارات الأهالي
  - How it works: 3 steps (سجّل → أضف طلابك → ابدأ)
  - Pricing: 4 plan cards from config/plans.ts
  - Footer
  
  Professional SaaS landing. Arabic. RTL. Responsive."
  ```

---

## DAY 3 — Polish & Integration

### 🅰️ Person A
- [ ] **A-06:** Add search/filter to students list (search by name, filter by group, filter by payment status)
- [ ] **A-07:** Group detail page with student list, add/remove students, recent sessions
- [ ] **A-08:** Edge cases: duplicate prevention, capacity enforcement, phone validation, empty states, loading states, error boundaries

### 🅱️ Person B
- [ ] **B-06:** Wire notifications into attendance (auto-send on mark)
- [ ] **B-07:** Attendance history + reports pages
- [ ] **B-08:** Payment reports page (monthly revenue breakdown)
- [ ] **B-09:** Edge cases: offline sync basic, notification retry logic, receipt number uniqueness

### 🅲 Person C
- [ ] **C-07:** Dashboard charts (revenue trend, attendance rate) using recharts
- [ ] **C-08:** Student schedule view (personal weekly calendar)
- [ ] **C-09:** Polish registration flow (capacity display, duplicate prevention, confirmation card)
- [ ] **C-10:** Dark mode testing + Arabic text alignment fixes across all pages

---

## DAY 4 — Test + Deploy

### Morning (ALL 3 Together)

- [ ] **T-01: Tenant Isolation** — Create 2 tenants. Verify complete data isolation.
- [ ] **T-02: Full User Journey** — Signup → create group → add students → take attendance → record payment → check dashboard
- [ ] **T-03: Mobile Test** — Test all critical screens on 375px width
- [ ] **T-04: RTL Test** — Verify Arabic rendering, no `ml-` instead of `ms-`, numbers correct
- [ ] **T-05: Fix Critical Bugs** — Priority: security > data accuracy > UI

### Afternoon (ALL 3 Together)

- [ ] **D-01:** Set up PostgreSQL (Supabase or Railway)
- [ ] **D-02:** Set up Redis (Upstash — free tier)
- [ ] **D-03:** Deploy to Vercel, configure wildcard subdomain
- [ ] **D-04:** DNS: point *.eduplatform.com to Vercel
- [ ] **D-05:** Seed first real teacher account
- [ ] **D-06:** Smoke test on production — full journey

---

## After-Task Checklist (Run After EVERY Task)

```
□ Does every DB query have tenantId?
□ Is all visible text in Arabic?
□ Are RTL classes correct? (ms- not ml-, text-start not text-left)
□ Does it work on mobile (375px)?
□ Does `npm run build` pass?
□ Are there loading and error states?
```

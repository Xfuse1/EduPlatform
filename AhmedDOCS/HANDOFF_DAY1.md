# 📦 HANDOFF — Person A → Person B & C
**التاريخ:** 14 مارس 2026  
**المنفذ:** Person A  
**الحالة:** ✅ يوم 1 مكتمل + تم إصلاح الأخطاء — جاهز للـ pull

---

## ✅ ما تم إنجازه (يوم 1)

| Task | Status | الملف |
|------|--------|-------|
| S-01: إنشاء مشروع Next.js 16 | ✅ Done | `eduplatform/` |
| S-02: تثبيت المكتبات + shadcn/ui | ✅ Done | `package.json` |
| S-03: Prisma schema + generate | ✅ Done | `prisma/schema.prisma` |
| S-08: src/lib/auth.ts | ✅ Done | `src/lib/auth.ts` |
| S-13: prisma/seed.ts | ✅ Done | `prisma/seed.ts` |

---

## 🔧 إصلاحات تمت بعد المراجعة

| # | المشكلة | الإصلاح |
|---|---------|--------|
| 1 | `getDateForDayOfWeek` كان يرجع 7 أيام لما diff=0 | تم إصلاح المعادلة: `(current - target + 7) % 7` — اليوم الحالي = 0 فرق |
| 2 | طلاب أحمد phone = parentPhone (نفس الرقم) | كل طالب له رقم مميز باستخدام index |
| 3 | طلاب نور: `+2${parentPhone}0` → رقم غير صالح (13 رقم) | parentPhone بصيغة `010XXXXXXXX` صحيحة + student phone مميز |
| 4 | أكاديمية نور بدون مدفوعات | تم إضافة شهرين مدفوعات لنور (نفس النمط) |
| 5 | لا يوجد `.env.example` | تم إنشاء الملف بكل المتغيرات المطلوبة |

---

## ⚠️ ملاحظة حول Migration

قاعدة البيانات PostgreSQL لم تكن مشغلة وقت التنفيذ.  
عند تشغيل PostgreSQL، شغّل:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

---

## 📁 الملفات التي أنشأتها

```
eduplatform/
├── prisma/
│   ├── schema.prisma          ← النسخة الكاملة من f:\منصه تعليميه\schema.prisma
│   └── seed.ts                ← بيانات تجريبية (S-13) ✅
├── src/
│   └── lib/
│       ├── auth.ts            ← OTP + JWT + requireAuth (S-08) ✅
│       └── db.ts              ← PLACEHOLDER — أنت تستبدله (Person B)
├── .env.local                 ← (gitignored) — DATABASE_URL + JWT_SECRET
├── .env                       ← DATABASE_URL للـ Prisma CLI
├── .env.example               ← نموذج المتغيرات (انسخه إلى .env.local)
└── package.json               ← prisma.seed script مضاف
```

---

## 🔑 ما يحتاجه Person B الآن (S-04 → S-15)

### ⭐ S-04 أولاً: إنشاء كل الفولدرات والملفات الفارغة

> هذه أول مهمة تنفذها — بدونها لا أحد يقدر يشتغل.
> أنشئ كل الفولدرات والملفات حسب PROJECT_STRUCTURE.md بملفات فارغة (empty exports).

```
src/modules/groups/          ← actions.ts, queries.ts, validations.ts, components/
src/modules/students/        ← actions.ts, queries.ts, validations.ts, components/
src/modules/schedule/        ← queries.ts, components/
src/modules/attendance/      ← actions.ts, queries.ts, validations.ts, components/
src/modules/payments/        ← actions.ts, queries.ts, validations.ts, components/
src/modules/notifications/   ← actions.ts, queries.ts, templates.ts, providers/
src/modules/dashboard/       ← queries.ts, components/
src/modules/public-pages/    ← actions.ts, queries.ts, validations.ts, components/
src/modules/auth/            ← actions.ts, queries.ts, validations.ts, components/
src/components/layout/       ← AppShell, Sidebar, Header, MobileNav
src/components/shared/       ← RTLProvider, ThemeProvider, LoadingSpinner, EmptyState, ErrorBoundary, ConfirmDialog, SearchBar
src/components/data-display/ ← DataTable, StatsCard, Badge
src/components/forms/        ← PhoneInput, DaysPicker, ColorPicker, FormField
src/app/(tenant)/            ← كل الـ routes حسب PROJECT_STRUCTURE.md
src/app/(marketing)/         ← layout.tsx, page.tsx, pricing/
src/types/
src/config/
src/i18n/
```

### الملفات المطلوبة منك (src/lib/)

```
src/lib/db.ts               ← استبدل الـ placeholder بالـ Prisma singleton الكامل (S-05)
src/lib/tenant.ts           ← getTenantFromHost() + requireTenant() (S-06)
src/lib/permissions.ts      ← checkRole() + requireRole()
src/lib/validation.ts       ← Shared Zod helpers
src/lib/cache.ts            ← Redis client + helpers (إذا Redis مش موجود → skip gracefully)
src/lib/utils.ts            ← formatDate() + formatCurrency() + formatPhone()
src/lib/constants.ts        ← Plans, roles, Arabic days of week
```

### الملفات المطلوبة منك (src/config/ + src/i18n/)

```
src/config/app.ts           ← ARABIC_DAYS_MAP, GRADE_LEVELS, DAYS_ORDER
src/config/routes.ts        ← Route constants (لا magic strings)
src/config/plans.ts         ← PLAN_LIMITS: { FREE: { maxStudents: 30, smsQuota: 50 }, ... }
src/config/env.ts           ← Type-safe env vars with validation
src/i18n/ar.json            ← Arabic UI strings
src/i18n/config.ts          ← i18n configuration
```

### S-07: middleware.ts

```
middleware.ts                    ← subdomain routing + auth guard
```

المنطق:
1. استخرج subdomain من `request.headers.host`
2. `www` أو بدون subdomain → rewrite إلى `/(marketing)`
3. `app` → rewrite إلى `/(platform-admin)` (مستقبلاً)
4. أي subdomain تاني → rewrite إلى `/(tenant)` + set `x-tenant-slug` header
5. للـ local dev: دعم `ahmed.localhost:3000`

### S-15: Git Commit + Push

بعد ما تخلص كل مهامك → commit + push.

### ما تستورده من ملفاتي

```typescript
// من src/lib/auth.ts — public API
import {
  generateOTP,          // () => string
  sendOTP,              // (phone: string) => Promise<OTPResult>
  verifyOTP,            // (phone: string, code: string) => Promise<true>
  createSession,        // (userId: string, tenantId: string, role: UserRole) => Promise<SessionResult>
  requireAuth,          // (req?: NextRequest) => Promise<AuthUser>
  getCurrentUser,       // (req?: NextRequest) => Promise<AuthUser | null>
  logout,               // () => Promise<void>
} from '@/lib/auth'

// Types
import type { AuthUser, OTPResult, SessionResult } from '@/lib/auth'
```

### AuthUser type (لا تعيد تعريفه في types/index.ts)

```typescript
// موجود في src/lib/auth.ts
interface AuthUser {
  id: string
  tenantId: string
  role: 'TEACHER' | 'STUDENT' | 'PARENT' | 'ASSISTANT'
}
```

### نمط requireTenant() المتوقع

Person A يستدعي هذا في كل action وquery:

```typescript
const tenant = await requireTenant()
// يجب أن يرجع: { id: string, slug: string, name: string, ...Tenant }
```

---

## 🎨 ما يحتاجه Person C الآن (S-09 → S-12)

### S-09: Types — العقد المشترك بين الفريق (الأولوية القصوى)

```
src/types/index.ts          ← الأنواع المشتركة بين الفريق
```

> أهم ملف للتنسيق بين الفريق. Person A و B يستوردوا منه الـ types.

### S-10: API Response Helpers

```
src/lib/api-response.ts     ← successResponse() + errorResponse() + notFound() + unauthorized() + forbidden() + validationError()
```

### S-11: Shared Components (Person A و B محتاجينها)

```
# Layout (S-11)
src/components/layout/AppShell.tsx    ← sidebar (desktop) + bottom nav (mobile) + header + content
src/components/layout/Sidebar.tsx     ← role-based navigation (teacher/student/parent)
src/components/layout/Header.tsx      ← tenant name + dark mode toggle + user avatar dropdown
src/components/layout/MobileNav.tsx   ← bottom navigation للموبايل

# Shared (S-11)
src/components/shared/RTLProvider.tsx      ← dir="rtl" + Arabic font context
src/components/shared/ThemeProvider.tsx    ← next-themes dark mode
src/components/shared/LoadingSpinner.tsx   ← centered spinner مع 'جاري التحميل...'
src/components/shared/EmptyState.tsx       ← icon + message + optional action button
src/components/shared/ErrorBoundary.tsx    ← error fallback UI
src/components/shared/ConfirmDialog.tsx    ← تأكيد قبل الحذف/الأرشفة
src/components/shared/SearchBar.tsx        ← بحث عربي

# Data Display — Person A و B محتاجينها بشدة
src/components/data-display/DataTable.tsx  ← جدول + card fallback للموبايل
src/components/data-display/StatsCard.tsx  ← كارت إحصائيات الداشبورد
src/components/data-display/Badge.tsx      ← status badge (paid/overdue/present/absent)

# Forms — Person A محتاجها في GroupForm و StudentForm
src/components/forms/PhoneInput.tsx    ← Egyptian phone validation (01XXXXXXXXX)
src/components/forms/DaysPicker.tsx    ← multi-select أيام الأسبوع بالعربي
src/components/forms/ColorPicker.tsx   ← اختيار لون المجموعة
src/components/forms/FormField.tsx     ← Label + input + error wrapper
```

### S-12: Styling + Root Layout

```
tailwind.config.ts        ← Cairo font + custom colors (primary=#1A5276, secondary=#2E86C1) + dark mode class
src/app/globals.css        ← RTL + Cairo from Google Fonts + dark mode CSS vars + shadcn overrides
src/app/layout.tsx         ← RTLProvider + ThemeProvider + Cairo font + dir="rtl" + lang="ar"
src/app/(tenant)/layout.tsx           ← Tenant resolution layout
src/app/(tenant)/(dashboard)/layout.tsx ← Auth guard + AppShell + role-based redirect
```

### ما تستورده من ملفاتي

```typescript
// من src/lib/auth.ts
import { getCurrentUser, requireAuth } from '@/lib/auth'
import type { AuthUser } from '@/lib/auth'
```

### قواعد RTL — لا تنسَ

```css
/* في globals.css */
html[dir="rtl"] .space-x-4 > * + * { margin-left: 0; margin-right: 1rem; }
```

```tsx
// في layout.tsx
<html dir="rtl" lang="ar">
```

### Sidebar menu items (لازم تتطابق مع routes)

```
Teacher: لوحة التحكم | المجموعات | الطلاب | الحضور | المصاريف | الجدول | الإعدادات
Student: لوحة التحكم | جدولي
Parent:  لوحة التحكم | أبنائي
```

---

## 🗃️ بيانات الـ Seed

عند تشغيل `npx prisma db seed` ستجد:

### Tenants
| slug | الاسم | الخطة |
|------|-------|-------|
| `ahmed` | أ. أحمد محمد | BASIC |
| `noor-academy` | أكاديمية نور | PRO |

### للتجربة (Local Dev)
```
ahmed.localhost:3000          → مركز أ. أحمد
noor-academy.localhost:3000   → أكاديمية نور
```

---

## 📦 بيانات الـ Seed الكاملة

| النوع | الكمية |
|-------|--------|
| Tenants | 2 |
| Users (teachers + assistant) | 3 |
| Students (Ahmed) | 49 |
| Students (Noor) | 15 |
| Groups | 6 |
| Enrollments | ~64 |
| Sessions | ~30+ |
| Attendance records | ~1000+ |
| Payments | ~230+ (كلا الـ tenantين) |
| Notifications | 5 |

---

## ⚠️ ملاحظة مهمة: auth.ts و AuthSession model

الـ schema فيه model `AuthSession` بـ `token` + `refreshToken`، لكن `auth.ts` حالياً يستخدم **JWT stateless** (الـ token في cookie بس — مش محفوظ في DB).  
ده OK للـ MVP. لو عايزين session revocation في المستقبل → Person B يضيف حفظ الـ session في جدول `AuthSession`.

---

## 🔐 Security Notes (للفريق)

### ما طُبّق في auth.ts

- ✅ OTP hashed بـ SHA-256 (لا plain text)
- ✅ Rate limiting: 3 OTPs / رقم / 15 دقيقة
- ✅ Rate limiting: 3 محاولات / OTP
- ✅ Timing-safe comparison (prevents timing attacks)
- ✅ JWT مُوقَّع بـ HS256 — 7 أيام TTL
- ✅ Cookie: httpOnly + secure (production) + sameSite: lax
- ✅ كل OTPs القديمة تُحذف عند التحقق الناجح

### ما ينقص (Person B يكمله)
- [ ] Redis rate limiting (بدلاً من DB queries)
- [ ] Tenant isolation في requireTenant()
- [ ] (اختياري) حفظ sessions في جدول AuthSession لدعم session revocation

---

## ⚡ أوامر سريعة

```bash
# تشغيل المشروع
npm run dev

# تحقق TypeScript
npx tsc --noEmit

# Lint
npm run lint

# بعد جهوز PostgreSQL
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio          # لعرض البيانات
```

---

## 📋 ملخص مهام يوم 1 — Person B

| # | المهمة | الملف | الوصف |
|---|--------|-------|-------|
| S-04 | إنشاء الفولدرات | الكل | كل الفولدرات والملفات الفارغة حسب PROJECT_STRUCTURE.md |
| S-05 | Prisma singleton | `src/lib/db.ts` | استبدل الـ placeholder |
| S-06 | Tenant utils | `src/lib/tenant.ts` | getTenantFromHost() + requireTenant() |
| S-07 | Middleware | `middleware.ts` | subdomain routing + auth guard |
| S-14 | Config + Lib | `src/config/*` + `src/lib/*` | routes, plans, env, permissions, validation, cache, utils, constants, i18n |
| S-15 | Git + Commit | — | commit + push كل شغلك |

**الترتيب:** S-04 أولاً (بدونها لا أحد يقدر يشتغل) → S-05 → S-06 → S-07 → S-14 → S-15

---

## 📋 ملخص مهام يوم 1 — Person C

| # | المهمة | الملف | الوصف |
|---|--------|-------|-------|
| S-09 | Types | `src/types/index.ts` | العقد المشترك بين الفريق |
| S-10 | API Response | `src/lib/api-response.ts` | successResponse + errorResponse + notFound + ... |
| S-11 | Components | `src/components/**` | Layout + Shared + DataDisplay + Forms |
| S-12 | Styling | `tailwind.config.ts` + `globals.css` + layouts | RTL + Cairo + dark mode |

**الترتيب:** S-09 أولاً (العقد المشترك) → S-10 → S-12 (styling) → S-11 (components)

---

## 🚀 بعد يوم 1 — Person A ينتظر هذه الملفات ليبدأ يوم 2:
- `src/lib/db.ts` ← من Person B
- `src/lib/tenant.ts` ← من Person B
- `src/types/index.ts` ← من Person C
- `src/config/app.ts` ← من Person B

**إذا تأخرت → Person A سيستخدم الـ Mocks المؤقتة الموثقة في PERSON_A_PLAN.md**

---

*آخر تحديث: 15 مارس 2026 | Person A — v4 (تصحيح تقسيم المهام)*

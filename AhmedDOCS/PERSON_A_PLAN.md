# خطة الشخص الأول (Person A) — دليل تنفيذي كامل
## مسؤوليتك: Groups · Students · Schedule · Settings · API Routes الخاصة بها

---

## ⚠️ الحدود الحمراء — لا تكسر أبدا

### ✅ أنت تلمس هذه الملفات فقط:
```
src/modules/groups/**
src/modules/students/**
src/modules/schedule/**
src/app/(tenant)/(dashboard)/teacher/groups/**
src/app/(tenant)/(dashboard)/teacher/students/**
src/app/(tenant)/(dashboard)/teacher/schedule/page.tsx
src/app/(tenant)/(dashboard)/teacher/settings/page.tsx
src/app/(tenant)/api/groups/**
src/app/(tenant)/api/students/**
src/app/(tenant)/api/schedule/**
src/app/(tenant)/api/tenant/**
src/lib/auth.ts               ← أنت تنشئه يوم 1 (S-08)
prisma/seed.ts                 ← أنت تنشئه يوم 1 (S-13)
```

### 🚫 لا تلمس هذه الملفات أبدا — ملك Person B و C:
```
middleware.ts                                       ← Person C
src/lib/tenant.ts                                   ← Person B
src/lib/db.ts                                       ← Person B
src/lib/api-response.ts                             ← Person B
src/types/index.ts                                  ← Person B (S-09)
src/config/**                                       ← Person B (S-14)
src/components/layout/**                            ← Person C
src/components/shared/**                            ← Person C
src/components/data-display/**                      ← Person C
src/components/forms/**                             ← Person C
src/modules/attendance/**                           ← Person B
src/modules/payments/**                             ← Person B
src/modules/notifications/**                        ← Person B
src/modules/dashboard/**                            ← Person C
src/modules/public-pages/**                         ← Person C
src/modules/auth/**                                 ← Person C
src/app/(tenant)/(auth)/**                          ← Person C
src/app/(tenant)/page.tsx                           ← Person C
src/app/(tenant)/register/**                        ← Person C
src/app/(tenant)/(dashboard)/teacher/page.tsx       ← Person C (EXCEPTION)
src/app/(tenant)/(dashboard)/attendance/**          ← Person B
src/app/(tenant)/(dashboard)/payments/**            ← Person B
src/app/(marketing)/**                              ← Person C
```

### ✅ مسموح لك تستورد منها (قراءة فقط — لا تعدل):
```typescript
import { db } from '@/lib/db'                    // ✅ استخدم
import { requireTenant } from '@/lib/tenant'     // ✅ استخدم
import { requireAuth } from '@/lib/auth'         // ✅ هذا ملفك — لكن الآخرون يستوردوا منه أيضا
import { successResponse } from '@/lib/api-response' // ✅ استخدم
```

---

## 📅 الجدول الزمني

```
يوم 1 (~3.5 ساعة)            يوم 2                      يوم 3
─────────────────────────    ──────────────────────────  ─────────────────────
S-01: إنشاء المشروع         A-01: Groups Logic          A-05: Schedule + Settings
S-02: المكتبات              A-02: Groups UI             A-06: API Routes
S-03: Prisma migration      A-03: Students Logic        A-07: Group Detail + Search
S-08: src/lib/auth.ts       A-04: Students UI           A-08: Edge Cases
S-13: prisma/seed.ts
S-15: GitHub ← HANDOFF
```

---

# 🌅 يوم 1 — مهام الأساس + الأمان (أنت تبدأ وحدك)

> Person B و C ينتظروا المشروع على GitHub قبل ما يبدأوا.
> مهمتك يوم 1: **أمان وإعداد** — S-01, S-02, S-03, S-08, S-13, S-15

---

## S-01 — إنشاء مشروع Next.js

```bash
npx create-next-app@latest eduplatform --typescript --tailwind --app --eslint
cd eduplatform
```

اختر هذه الإعدادات بالضبط:
```
✔ Would you like to use TypeScript? → Yes
✔ Would you like to use ESLint? → Yes
✔ Would you like to use Tailwind CSS? → Yes
✔ Would you like to use `src/` directory? → Yes
✔ Would you like to use App Router? → Yes
✔ Would you like to customize the default import alias? → Yes (@/*)
```

---

## S-02 — تثبيت المكتبات

```bash
npm install prisma @prisma/client zod lucide-react next-themes redis ioredis
npm install -D ts-node @types/node
npx shadcn@latest init
```

في shadcn init اختر:
```
✔ Which style? → Default
✔ Which color? → Slate
✔ CSS variables? → Yes
```

```bash
npx shadcn@latest add button card input label select dialog toast table badge tabs separator dropdown-menu sheet avatar textarea
```

---

## S-03 — إعداد Prisma + Migration

أنشئ `.env.local` في جذر المشروع:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/eduplatform"
NEXTAUTH_SECRET="any-random-secret-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

```bash
# انسخ schema.prisma من "f:\منصه تعليميه\schema.prisma" إلى "eduplatform\prisma\schema.prisma"
npx prisma generate
npx prisma migrate dev --name init
```

تحقق: ظهرت "✔ Generated Prisma Client" ومجلد prisma/migrations/ ✓

---

## S-08 — ملف المصادقة والأمان (src/lib/auth.ts)

> ⭐ هذا الملف حرج — كل الأشخاص يعتمدوا عليه. Person B و C يستوردوا `requireAuth()` منه.

```
Prompt للـ AI:
اعمل ملف src/lib/auth.ts لمشروع Next.js 14 إدارة مراكز تعليمية مصرية.

━━━ الوظائف المطلوبة ━━━

1. generateOTP():
   - يرجع string من 6 أرقام عشوائية
   - استخدم crypto.randomInt(100000, 999999).toString()

2. sendOTP(phone: string):
   - أنشئ سجل OTP في الداتا بيز (جدول OTP أو استخدم Redis)
   - خزن: phone, code (hashed), expiresAt (5 دقائق من الآن), attempts: 0
   - Rate limit: أقصى 3 OTPs لكل رقم كل 15 دقيقة
   - إذا تجاوز الحد → throw error 'تم تجاوز الحد المسموح — حاول بعد 15 دقيقة'
   - استدعي SMS provider (حاليا console.log فقط: `[SMS] OTP for ${phone}: ${code}`)
   - return { success: true, expiresAt }

3. verifyOTP(phone: string, code: string):
   - جلب آخر OTP لهذا الرقم (غير منتهي الصلاحية وغير مستخدم)
   - إذا لا يوجد → throw 'رمز التحقق غير صحيح أو منتهي الصلاحية'
   - تحقق من عدد المحاولات: أقصى 3 محاولات لكل OTP
   - إذا تجاوز → اقفل هذا الـ OTP + throw 'تم تجاوز عدد المحاولات'
   - قارن الكود (استخدم timing-safe comparison)
   - إذا صحيح → علمه كمستخدم (used: true) + return true
   - إذا خاطئ → زود attempts + throw 'رمز التحقق غير صحيح'

4. createSession(userId: string, tenantId: string):
   - أنشئ JWT token يحتوي: { userId, tenantId, role }
   - استخدم jsonwebtoken أو jose library
   - TTL: 7 أيام
   - خزن في cookie: httpOnly, secure, sameSite: 'lax', path: '/'
   - return { token }

5. requireAuth(req?: NextRequest):
   - اقرأ الـ token من cookie أو Authorization header
   - تحقق من صلاحية الـ JWT
   - إذا غير صالح → throw error مع status 401 'يجب تسجيل الدخول أولا'
   - return { id, tenantId, role } (بيانات المستخدم)

6. getCurrentUser():
   - نفس requireAuth() لكن يرجع null بدل throw error

━━━ قواعد أمان صارمة ━━━
- لا تخزن OTP كـ plain text — استخدم hash (bcrypt أو SHA-256)
- Rate limiting: أقصى 3 OTPs / رقم / 15 دقيقة
- Rate limiting: أقصى 3 محاولات تحقق / OTP
- استخدم timing-safe comparison لمنع timing attacks
- الـ JWT secret يأتي من env variable (NEXTAUTH_SECRET)
- OTP ينتهي بعد 5 دقائق بالضبط
- بعد التحقق الناجح: احذف/علم كل OTPs القديمة لنفس الرقم

━━━ TypeScript strict ━━━
- لا يوجد 'any'
- كل function typed بالكامل
- export كل الوظائف الـ 6
```

تحقق:
- الملف موجود في `src/lib/auth.ts` ✓
- يحتوي على الـ 6 functions مع export ✓
- Rate limiting موجود ✓
- OTP hashing موجود ✓
- `npx tsc --noEmit` ✓

---

## S-13 — بيانات تجريبية (prisma/seed.ts)

```
Prompt للـ AI:
اعمل ملف prisma/seed.ts لمشروع إدارة مراكز تعليمية مصرية.

━━━ البيانات المطلوبة ━━━

1. Tenants (2):
   - { slug: 'ahmed', name: 'أ. أحمد محمد', plan: 'BASIC', themeColor: '#1A5276', region: 'القاهرة', subjects: ['رياضيات', 'فيزياء'], isActive: true, smsQuota: 200 }
   - { slug: 'noor-academy', name: 'أكاديمية نور', plan: 'PRO', themeColor: '#2E86C1', region: 'الإسكندرية', subjects: ['رياضيات', 'كيمياء', 'أحياء'], isActive: true, smsQuota: 1000 }

2. Users لكل tenant:
   - Teacher: user واحد بدور TEACHER لكل tenant (هو صاحب المركز)
   - مساعد: user بدور ASSISTANT لـ noor-academy فقط

3. Groups (3 لكل tenant) بأسماء واقعية:
   - 'رياضيات 3 ثانوي - مجموعة أ' | days: ['saturday','tuesday'] | 16:00-18:00 | fee: 400 | maxCapacity: 30
   - 'رياضيات 3 ثانوي - مجموعة ب' | days: ['sunday','wednesday'] | 16:00-18:00 | fee: 400 | maxCapacity: 30
   - 'فيزياء 2 ثانوي' | days: ['monday','thursday'] | 18:00-20:00 | fee: 350 | maxCapacity: 25

4. Students (15-20 لكل مجموعة) بأسماء مصرية واقعية:
   - أحمد محمود, يوسف إبراهيم, عمر حسن, مريم أحمد, فاطمة علي, نور الدين خالد...
   - لكل طالب: parentName واقعي + parentPhone بصيغة 01XXXXXXXXX
   - gradeLevel مناسب للمجموعة

5. GroupStudent enrollments:
   - كل الطلاب status: 'ACTIVE'
   - 2-3 طلاب status: 'WAITLIST' في مجموعة ممتلئة

6. Sessions (2 أسابيع):
   - أنشئ sessions لكل مجموعة بناء على أيامها
   - الأسبوع الأول: كلها COMPLETED
   - الأسبوع الثاني: أول session COMPLETED, الباقي SCHEDULED

7. Attendance (للـ sessions المكتملة):
   - 80% PRESENT, 10% ABSENT, 5% LATE, 5% EXCUSED
   - توزيع عشوائي لكن واقعي

8. Payments (شهرين):
   - الشهر السابق: 70% PAID, 15% PARTIAL, 10% PENDING, 5% OVERDUE
   - الشهر الحالي: 40% PAID, 20% PARTIAL, 30% PENDING, 10% OVERDUE
   - method: أغلبها CASH, بعضها VODAFONE_CASH

9. Notifications (5 سجلات):
   - 2 ATTENDANCE_ABSENT (SMS, SENT)
   - 1 PAYMENT_REMINDER (WHATSAPP, SENT)
   - 1 PAYMENT_OVERDUE (SMS, PENDING)
   - 1 CLASS_REMINDER (WHATSAPP, QUEUED)

━━━ إعدادات إضافية ━━━
- أضف في package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
- استخدم cuid() أو بدائل للـ IDs
- console.log في نهاية الـ seed: عدد كل نوع تم إنشاؤه
- استخدم upsert أو deleteMany قبل الإنشاء لتجنب التكرار عند إعادة التشغيل

━━━ TypeScript strict — لا 'any' ━━━
```

تحقق:
```bash
npx prisma db seed
# يجب أن يظهر:
# ✅ Created 2 tenants
# ✅ Created X users
# ✅ Created X groups
# ✅ Created X students
# ✅ Created X sessions
# ✅ Created X attendance records
# ✅ Created X payments
# ✅ Created X notifications

npx prisma studio
# تحقق من البيانات في كل جدول
```

---

## S-15 — رفع GitHub 🚩 الـ HANDOFF

```bash
echo ".env.local" >> .gitignore
git init
git add .
git commit -m "feat: foundation setup (S-01, S-02, S-03, S-08, S-13)

- Next.js 14 + TypeScript + Tailwind + shadcn/ui
- Prisma schema + init migration + seed data
- src/lib/auth.ts — OTP + JWT + requireAuth
- prisma/seed.ts — 2 tenants, realistic test data"

git branch -M main
git remote add origin https://github.com/YOUR_ORG/eduplatform.git
git push -u origin main
```

### 🚩 أبلغ Person B و C بعد الرفع مباشرة:
```
✅ Foundation على GitHub — git pull وابدأوا:

Person B يعمل:
  S-04: إنشاء folder structure كامل من PROJECT_STRUCTURE.md
  S-05: src/lib/db.ts — Prisma client singleton
  S-06: src/lib/tenant.ts — getTenantFromHost + requireTenant
  S-09: src/types/index.ts — الأنواع المشتركة (العقد بين الـ 3)
  S-10: src/lib/api-response.ts — successResponse + errorResponse
  S-14: src/config/** — routes, plans, app, env

Person C يعمل:
  S-07: middleware.ts — subdomain routing
  S-11: AppShell + Sidebar + Header + RTLProvider + ThemeProvider + shared components
  S-12: globals.css + tailwind.config.ts + root layout.tsx
```

---

## ⏸️ انتهى يوم 1 — انتظر قبل A-01

يوم 1 مهمتك 5 tasks فقط: S-01, S-02, S-03, S-08, S-13 + رفع GitHub (S-15).
**لا تبدأ A-01 حتى يوم 2.**

قبل بداية يوم 2 تأكد من وجود هذه الملفات من زملائك:
```bash
Test-Path src/lib/db.ts          # Person B
Test-Path src/lib/tenant.ts      # Person B
Test-Path src/types/index.ts     # Person B
Test-Path src/config/routes.ts   # Person B
Test-Path middleware.ts          # Person C
```

إذا أي ملف ناقص → انظر قسم "Mock مؤقت" في آخر الملف

---

# 🌅 يوم 2 صباح — Groups Module (A-01 + A-02)

---

## A-01 — Groups Module Logic

الملفات: `src/modules/groups/queries.ts` + `actions.ts` + `validations.ts`

```
Prompt للـ AI:
اعمل Groups Module كامل في src/modules/groups/ — Next.js 14 + Prisma + TypeScript strict.

━━━━━ queries.ts ━━━━━
import { cache } from 'react'
import { db } from '@/lib/db'

getGroups(tenantId: string):
  return db.group.findMany({
    where: { tenantId, isActive: true },
    include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } },
    orderBy: { createdAt: 'desc' }
  })

getGroupById(tenantId: string, groupId: string):
  const group = await db.group.findFirst({
    where: { id: groupId, tenantId },
    include: { students: { where: { status: 'ACTIVE' }, include: { student: true } } }
  })
  if (!group) throw new Error('NOT_FOUND')
  return group

getGroupStudents(tenantId: string, groupId: string):
  const currentMonth = new Date().toISOString().slice(0, 7)
  const enrollments = await db.groupStudent.findMany({
    where: { groupId, status: 'ACTIVE', student: { tenantId } },
    include: { student: true }
  })
  return Promise.all(enrollments.map(async (e) => {
    const payment = await db.payment.findFirst({
      where: { studentId: e.studentId, groupId, month: currentMonth }
    })
    const paymentStatus = payment?.status ?? 'PENDING'
    return { student: e.student, enrollment: e, paymentStatus }
  }))

━━━━━ actions.ts ━━━━━
'use server'
import { requireTenant } from '@/lib/tenant'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { groupCreateSchema, groupUpdateSchema } from './validations'

createGroup(formData: FormData):
  1. const tenant = await requireTenant()
  2. await requireAuth()
  3. const data = groupCreateSchema.parse(Object.fromEntries(formData))
  4. const group = await db.group.create({ data: { ...data, tenantId: tenant.id } })
  5. revalidatePath('/teacher/groups')
  6. return { success: true, data: group }

updateGroup(groupId: string, formData: FormData):
  1. const tenant = await requireTenant()
  2. await requireAuth()
  3. const existing = await db.group.findFirst({ where: { id: groupId, tenantId: tenant.id } })
  4. if (!existing) throw new Error('NOT_FOUND')
  5. const data = groupUpdateSchema.parse(Object.fromEntries(formData))
  6. await db.group.update({ where: { id: groupId }, data })
  7. revalidatePath('/teacher/groups')

archiveGroup(groupId: string):
  1. const tenant = await requireTenant()
  2. await requireAuth()
  3. تحقق ownership: findFirst({ where: { id: groupId, tenantId: tenant.id } })
  4. await db.group.update({ where: { id: groupId }, data: { isActive: false } })
  5. revalidatePath('/teacher/groups')

duplicateGroup(groupId: string):
  1. const tenant = await requireTenant()
  2. await requireAuth()
  3. const source = await db.group.findFirst({ where: { id: groupId, tenantId: tenant.id } })
  4. if (!source) throw new Error('NOT_FOUND')
  5. const { id, createdAt, updatedAt, ...rest } = source
  6. await db.group.create({ data: { ...rest, name: source.name + ' (نسخة)' } })
  7. revalidatePath('/teacher/groups')

━━━━━ validations.ts ━━━━━
import { z } from 'zod'
const DAYS = ['saturday','sunday','monday','tuesday','wednesday','thursday','friday'] as const

groupCreateSchema = z.object({
  name: z.string().min(3, 'الاسم 3 أحرف على الأقل').max(100),
  subject: z.string().min(2, 'أدخل المادة'),
  gradeLevel: z.string().min(1, 'اختر المرحلة'),
  days: z.array(z.enum(DAYS)).min(1, 'اختر يوم واحد على الأقل'),
  timeStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'وقت غير صحيح'),
  timeEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'وقت غير صحيح'),
  maxCapacity: z.coerce.number().int().min(1).max(200).default(40),
  monthlyFee: z.coerce.number().int().min(0, 'المصاريف لا تكون سالبة'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2E86C1'),
  room: z.string().optional(),
}).refine(d => d.timeEnd > d.timeStart, {
  message: 'وقت الانتهاء يجب أن يكون بعد وقت البداية',
  path: ['timeEnd']
})

groupUpdateSchema = groupCreateSchema.partial()

CRITICAL: كل query فيه tenantId — لا استثناءات
```

تحقق: `npx tsc --noEmit` ✓

---

## A-02 — Groups UI

```
Prompt للـ AI:
اعمل واجهة Groups — Next.js 14 App Router عربي RTL mobile-first.

━━━ PAGES ━━━

src/app/(tenant)/(dashboard)/teacher/groups/page.tsx (Server Component):
  - const tenant = await requireTenant()
  - const groups = await getGroups(tenant.id)
  - Header: عنوان 'المجموعات' + زر 'إنشاء مجموعة جديدة' مع أيقونة Plus
  - Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
  - <GroupList groups={groups} />
  - EmptyState إذا groups.length === 0: أيقونة + 'لا توجد مجموعات بعد' + زر إنشاء

src/app/(tenant)/(dashboard)/teacher/groups/new/page.tsx:
  - عنوان 'إنشاء مجموعة جديدة'
  - <GroupForm />

src/app/(tenant)/(dashboard)/teacher/groups/[groupId]/page.tsx (Server Component):
  - const group = await getGroupById(tenant.id, params.groupId)
  - عرض: اسم + تفاصيل المجموعة في Card
  - قائمة الطلاب: name + badge حالة دفع
  - أزرار: 'تعديل' + 'أرشفة' + 'تكرار'

src/app/(tenant)/(dashboard)/teacher/groups/[groupId]/edit/page.tsx:
  - جلب المجموعة وتمريرها كـ defaultValues لـ <GroupForm groupId={groupId} />

━━━ COMPONENTS ━━━

src/modules/groups/components/GroupCard.tsx
Props: group: Group & { _count: { students: number } }
- Wrapper: rounded-xl border shadow-sm overflow-hidden
- شريط ملون في الأعلى: h-2 style={{ backgroundColor: group.color }}
- padding: p-4
- اسم المجموعة: text-lg font-bold text-start
- Badge للمادة
- الأيام بالعربي: {group.days.map(d => ARABIC_DAYS_MAP[d]).join(' ')}
  استيراد: import { ARABIC_DAYS_MAP } from '@/config/app'
- الوقت: {timeStart} - {timeEnd}
- 'الطلاب: {_count.students} / {maxCapacity} طالب'
- '{monthlyFee} جنيه / شهر'
- أزرار: 'عرض التفاصيل' + 'تعديل' — كلاهما min-h-[44px]

src/modules/groups/components/GroupList.tsx
Props: groups: GroupWithStudentCount[]
- عرض <GroupCard /> لكل مجموعة في نفس الـ grid

src/modules/groups/components/GroupForm.tsx ('use client')
Props: defaultValues?: Partial<GroupFormData>, groupId?: string
- useFormState(groupId ? updateGroup.bind(null, groupId) : createGroup, initialState)
- Fields:
  * name: Input + Label 'اسم المجموعة'
  * subject: Input + Label 'المادة'
  * gradeLevel: Select من GRADE_LEVELS + Label 'المرحلة الدراسية'
  * days: أزرار toggle لكل يوم من DAYS_ORDER (ARABIC_DAYS_MAP) — multi-select
  * timeStart: Input type="time" + Label 'من الساعة'
  * timeEnd: Input type="time" + Label 'إلى الساعة'
  * room: Input + Label 'الغرفة / القاعة (اختياري)'
  * maxCapacity: Input type="number" + Label 'الطاقة الاستيعابية'
  * monthlyFee: Input type="number" + Label 'المصاريف الشهرية (جنيه)'
  * color: 6 أزرار دوائر ملونة للاختيار + Label 'لون المجموعة'
- زر Submit: 'حفظ المجموعة' | 'جاري الحفظ...' أثناء pending
- عرض error messages تحت كل field باللون الأحمر

src/modules/groups/components/GroupScheduleGrid.tsx
Props: groups: Group[]
- جدول بسيط: الأيام كأعمدة (السبت → الجمعة)
- لكل مجموعة: block ملون في أعمدة أيامها يحتوي الاسم + الوقت
- Mobile: قائمة مرتبة بدلا من grid

قواعد صارمة:
- ms-* بدل ml-* في كل مكان
- me-* بدل mr-*
- text-start بدل text-left
- ps-* و pe-* بدل pl-* و pr-*
- كل النصوص عربي
- Buttons: min-h-[44px] min-w-[44px]
```

تحقق: `npm run build` ✓

---

# 🌇 يوم 2 بعد الظهر — Students Module (A-03 + A-04)

---

## A-03 — Students Module Logic

```
Prompt للـ AI:
اعمل Students Module في src/modules/students/ — Next.js 14 + Prisma + TypeScript strict.

━━━ queries.ts ━━━
import { cache } from 'react'
import { db } from '@/lib/db'

getStudents(tenantId: string, filters?: { search?: string, groupId?: string, paymentStatus?: string }):
  const where: Prisma.UserWhereInput = { tenantId, role: 'STUDENT', isActive: true }
  if filters.search: where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { parentName: { contains: search, mode: 'insensitive' } }]
  if filters.groupId: where.enrollments = { some: { groupId: filters.groupId, status: 'ACTIVE' } }
  const students = await db.user.findMany({ where, include: { enrollments: { where: { status: 'ACTIVE' }, include: { group: true } } }, orderBy: { name: 'asc' } })
  لكل طالب: جلب payment لهذا الشهر وإضافة paymentStatus
  Return: StudentWithPaymentStatus[]

getStudentById(tenantId: string, studentId: string):
  return db.user.findFirst({
    where: { id: studentId, tenantId, role: 'STUDENT' },
    include: { enrollments: { where: { status: 'ACTIVE' }, include: { group: true } } }
  })

getStudentProfile(tenantId: string, studentId: string):
  const student = await getStudentById(tenantId, studentId)
  const paymentHistory = await db.payment.findMany({ where: { studentId, tenantId }, orderBy: { month: 'desc' }, take: 6 })
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const attendanceRecords = await db.attendance.findMany({ where: { studentId, tenantId, createdAt: { gte: thirtyDaysAgo } } })
  const presentCount = attendanceRecords.filter(a => a.status === 'PRESENT').length
  const attendanceRate = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 0
  return { student, groups: student.enrollments.map(e => e.group), paymentHistory, attendanceRate }

searchStudents(tenantId: string, query: string):
  return db.user.findMany({
    where: { tenantId, role: 'STUDENT', isActive: true, OR: [{ name: { contains: query, mode: 'insensitive' } }, { parentName: { contains: query, mode: 'insensitive' } }] },
    take: 10, select: { id: true, name: true, gradeLevel: true, parentName: true }
  })

━━━ actions.ts ━━━
'use server'

createStudent(formData: FormData):
  1. const tenant = await requireTenant()
  2. await requireAuth()
  3. const data = studentCreateSchema.parse(Object.fromEntries(formData))
  4. const { groupId, ...studentData } = data
  5. تحقق التكرار: db.user.findFirst({ where: { tenantId: tenant.id, parentPhone: data.parentPhone, enrollments: { some: { groupId, status: { not: 'DROPPED' } } } } })
     إذا موجود → throw 'هذا الطالب مسجل بالفعل في هذه المجموعة'
  6. const student = await db.user.create({ data: { ...studentData, tenantId: tenant.id, role: 'STUDENT' } })
  7. إذا groupId → enrollInGroup(student.id, groupId)
  8. revalidatePath('/teacher/students')

updateStudent(studentId: string, formData: FormData):
  1. requireTenant() + requireAuth()
  2. تحقق ownership
  3. validate + update + revalidatePath

enrollInGroup(studentId: string, groupId: string):
  1. requireTenant() + requireAuth()
  2. const group = await db.group.findFirst({ where: { id: groupId, tenantId: tenant.id } })
  3. const activeCount = await db.groupStudent.count({ where: { groupId, status: 'ACTIVE' } })
  4. const status = activeCount >= group.maxCapacity ? 'WAITLIST' : 'ACTIVE'
  5. await db.groupStudent.create({ data: { studentId, groupId, status } })
  6. revalidatePath('/teacher/students')
  7. return { status, message: status === 'WAITLIST' ? 'تم التسجيل في قائمة الانتظار — المجموعة ممتلئة' : 'تم التسجيل في المجموعة بنجاح' }

removeFromGroup(studentId: string, groupId: string):
  1. requireTenant() + requireAuth()
  2. تحقق إن الطالب ينتمي لنفس الـ tenant
  3. await db.groupStudent.update({ where: { groupId_studentId: { groupId, studentId } }, data: { status: 'DROPPED', droppedAt: new Date() } })
  4. revalidatePath('/teacher/students')

bulkImport(records: StudentImportRow[]):
  1. requireTenant() + requireAuth()
  2. validate كل record
  3. تحويل phone: إذا يبدأ بـ 01 → +201...
  4. db.user.createMany({ data: records.map(r => ({ ...r, tenantId: tenant.id, role: 'STUDENT' })), skipDuplicates: true })
  5. return { created, skipped, errors }

━━━ validations.ts ━━━
const egyptianPhone = z.string().regex(/^01[0125][0-9]{8}$/, 'رقم الهاتف غير صحيح (مثال: 01012345678)')

studentCreateSchema = z.object({
  name: z.string().min(2, 'الاسم حرفان على الأقل').max(100),
  phone: egyptianPhone.optional().or(z.literal('')),
  parentName: z.string().min(2, 'اسم ولي الأمر مطلوب'),
  parentPhone: egyptianPhone,
  gradeLevel: z.string().min(1, 'اختر المرحلة الدراسية'),
  groupId: z.string().cuid().optional(),
})
studentUpdateSchema = studentCreateSchema.partial().omit({ groupId: true })

CRITICAL: كل query فيه tenantId
```

---

## A-04 — Students UI

```
Prompt للـ AI:
اعمل صفحات Students — Next.js 14 App Router عربي RTL mobile-first.

src/app/(tenant)/(dashboard)/teacher/students/page.tsx (Server Component):
  - searchParams: { search?, groupId?, paymentStatus? }
  - const students = await getStudents(tenant.id, searchParams)
  - الـ groups للفلتر: const groups = await getGroups(tenant.id)
  - Header: 'الطلاب ({students.length})' + زر 'إضافة طالب' + زر 'استيراد CSV'
  - Desktop: DataTable — عمود الاسم المرحلة المجموعات (Badges) حالة الدفع (Badge ملون) هاتف ولي الأمر actions
  - Mobile (md:hidden): StudentCard لكل طالب
  - FilterBar (Client Component): بحث + select المجموعة + select حالة الدفع
    يحدث URL params بـ router.push

src/app/(tenant)/(dashboard)/teacher/students/new/page.tsx:
  - عنوان 'إضافة طالب جديد'
  - <StudentForm />

src/app/(tenant)/(dashboard)/teacher/students/[studentId]/page.tsx (Server Component):
  - const profile = await getStudentProfile(tenant.id, params.studentId)
  - Section 1: بيانات شخصية — اسم هاتف ولي الأمر هاتف ولي الأمر المرحلة
  - Section 2: المجموعات — badge لكل مجموعة + زر 'إزالة'
  - Section 3: الحضور الأخير — آخر 10 جلسات (تاريخ + status badge)
  - Section 4: المدفوعات — آخر 3 شهور (شهر + مبلغ + status)
  - نسبة الحضور: شريط تقدم عربي + {attendanceRate}%
  - زر 'تعديل البيانات'

src/app/(tenant)/(dashboard)/teacher/students/import/page.tsx ('use client'):
  - Input file accept=".csv"
  - بعد الرفع: عرض preview table (أول 5 صفوف)
  - Column mapping: select لكل column ما يمثله
  - زر 'استيراد {count} طالب'
  - Toast نتيجة: 'تم إضافة X طالب ✅ | Y أخطاء ⚠️'

src/modules/students/components/StudentForm.tsx ('use client'):
  - fields: name, phone (optional), parentName, parentPhone, gradeLevel, groupId
  - groupId: Select يجلب المجموعات من API عند mount
  - Arabic validation messages
  - Submit → createStudent server action

src/modules/students/components/StudentCard.tsx:
  - اسم + مرحلة دراسية + badge حالة دفع + عدد المجموعات + هاتف ولي الأمر
  - زر 'عرض الملف' min-h-[44px]

src/modules/students/components/StudentList.tsx:
  - map على students → <StudentCard />

src/modules/students/components/StudentProfile.tsx:
  - Props: profile: StudentProfile
  - كل السكشنز الـ 4 المذكورة أعلاه

src/modules/students/components/CSVImporter.tsx ('use client'):
  - الـ upload + preview + mapping + import logic

RTL rules: ms- / me- / text-start — كالمعتاد
```

---

# 🌃 يوم 3 صباح — Schedule + Settings (A-05)

---

## A-05 — Schedule + Settings

```
Prompt للـ AI:
اعمل Schedule module وصفحة Settings:

━━━ src/modules/schedule/queries.ts ━━━
import { db } from '@/lib/db'
import { DAYS_ORDER } from '@/config/app'

getWeeklySchedule(tenantId: string):
  const groups = await db.group.findMany({ where: { tenantId, isActive: true }, include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } } })
  نظم في Record<string, GroupInfo[]>:
  return DAYS_ORDER.reduce((acc, day) => {
    acc[day] = groups.filter(g => g.days.includes(day))
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
    return acc
  }, {} as Record<string, typeof groups>)

checkConflicts(tenantId: string, days: string[], timeStart: string, timeEnd: string, room?: string, excludeGroupId?: string):
  const groups = await db.group.findMany({ where: { tenantId, isActive: true, ...(excludeGroupId && { id: { not: excludeGroupId } }) } })
  return groups.filter(g =>
    g.days.some(d => days.includes(d)) &&         // نفس اليوم
    g.timeStart < timeEnd &&                       // تبدأ قبل نهاية الجديدة
    g.timeEnd > timeStart &&                       // تنتهي بعد بداية الجديدة
    (!room || !g.room || g.room === room)          // نفس الغرفة
  )

━━━ src/modules/schedule/components/WeeklyCalendar.tsx ('use client') ━━━
Props: schedule: Record<string, GroupWithStudentCount[]>
Desktop view:
  - Grid 7 cols — عمود لكل يوم من DAYS_ORDER (كلهم بالعربي من ARABIC_DAYS_MAP)
  - في كل عمود: cards للمجموعات المرتبة بالوقت
  - كل card: colored border-s-4 (group.color) + اسم + وقت + room + عدد الطلاب
Mobile view (md:hidden):
  - Accordion أو tabs للأيام
  - يعرض نفس المعلومات كقائمة

━━━ src/app/(tenant)/(dashboard)/teacher/schedule/page.tsx (Server Component) ━━━
  const schedule = await getWeeklySchedule(tenant.id)
  عنوان 'الجدول الأسبوعي' + زر 'إنشاء مجموعة جديدة'
  <WeeklyCalendar schedule={schedule} />

━━━ src/app/(tenant)/(dashboard)/teacher/settings/page.tsx ━━━
Server Component:
  const tenant = await requireTenant()
  يعرض <SettingsForm tenant={tenant} />

SettingsForm ('use client'):
  Fields:
  - slug: Input مع label 'الرابط الخاص بك' + نص 'eduplatform.com/{slug}' — readonly
  - name: Input 'الاسم الظاهر للطلاب'
  - phone: PhoneInput 'رقم التواصل'
  - region: Input 'المحافظة / المنطقة'
  - bio: Textarea 'نبذة تعريفية (تظهر للأهالي)'
  - themeColor: 6 دوائر ملونة للاختيار + label 'لون المنصة'
  - subjects: input مع إمكانية إضافة وحذف المواد كـ tags
  - زر 'حفظ التغييرات'

updateTenant server action (في نفس الملف settings/page.tsx أو ملف منفصل):
  'use server'
  1. requireTenant() + requireAuth()
  2. تحقق role === 'TEACHER'
  3. validate input
  4. db.tenant.update({ where: { id: tenant.id }, data: validatedData })
  5. revalidatePath('/teacher/settings')
```

---

# 🌃 يوم 3 بعد الظهر — API Routes + Polish (A-06, A-07, A-08)

---

## A-06 — API Routes (ملكيتك الكاملة)

```
Prompt للـ AI:
اعمل API routes لـ groups, students, schedule, tenant في src/app/(tenant)/api/
كل route يتبع هذا النمط:
  1. requireTenant(req)
  2. requireAuth(req)
  3. Zod validation
  4. استدعاء module function
  5. successResponse() أو errorResponse()

src/app/(tenant)/api/groups/route.ts:
  GET  → getGroups(tenant.id)
  POST → createGroup(await req.formData())

src/app/(tenant)/api/groups/[groupId]/route.ts:
  GET    → getGroupById(tenant.id, groupId)
  PUT    → updateGroup(groupId, await req.formData())
  DELETE → archiveGroup(groupId) (soft delete)

src/app/(tenant)/api/groups/[groupId]/archive/route.ts:
  POST → archiveGroup(groupId)

src/app/(tenant)/api/groups/[groupId]/students/route.ts:
  GET  → getGroupStudents(tenant.id, groupId)
  POST → enrollInGroup(body.studentId, groupId)

src/app/(tenant)/api/students/route.ts:
  GET  → getStudents(tenant.id, searchParams)
  POST → createStudent(formData)

src/app/(tenant)/api/students/import/route.ts:
  POST → bulkImport(records from body)

src/app/(tenant)/api/students/[studentId]/route.ts:
  GET → getStudentById(tenant.id, studentId)
  PUT → updateStudent(studentId, formData)

src/app/(tenant)/api/schedule/week/route.ts:
  GET → getWeeklySchedule(tenant.id)

src/app/(tenant)/api/schedule/conflicts/route.ts:
  POST → checkConflicts(tenant.id, body)

src/app/(tenant)/api/tenant/current/route.ts:
  GET → successResponse(tenant) — requireTenant فقط

src/app/(tenant)/api/tenant/public-profile/route.ts:
  GET → db.tenant.findFirst بدون requireAuth (public)

src/app/(tenant)/api/tenant/settings/route.ts:
  PUT → updateTenant(tenant.id, formData) — requireAuth + role check
```

---

## A-07 — Group Detail + Search

```
Prompt للـ AI:
اعمل التحسينات:

1. Group Detail Page — teacher/groups/[groupId]/page.tsx:
   - قائمة الطلاب من getGroupStudents() بـ DataTable
   - أعمدة: الاسم حالة الدفع (Badge) actions (زر 'إزالة')
   - زر 'إضافة طالب للمجموعة' يفتح Dialog مع StudentSearch
   - زر 'عرض في الجدول'

2. StudentSearch component (src/modules/students/components/StudentSearch.tsx) ('use client'):
   - Input بحث
   - debounce 300ms → fetch /api/students?search={query}
   - عرض نتائج في dropdown: اسم + مرحلة
   - عند اختيار → enrollInGroup server action
   - رسالة نجاح/فشل

3. Group Conflict Warning في GroupForm:
   - عند تغيير days/timeStart/timeEnd/room →
     fetch /api/schedule/conflicts بالبيانات الجديدة
   - إذا رجع conflicts → إظهار تحذير أصفر: 'تعارض مع مجموعة: {اسم المجموعة}'
```

---

## A-08 — Edge Cases + Error States

```
Prompt للـ AI:
أضف edge cases ومعالجة أخطاء لـ Groups و Students:

1. Loading States:
   - كل page.tsx يحتوي على loading.tsx بجانبه
   - loading.tsx يعرض skeleton cards (نفس شكل الـ card لكن بـ animate-pulse)

2. Error Boundaries:
   - error.tsx بجانب كل page.tsx يعرض: 'حدث خطأ — يرجى المحاولة مرة أخرى' + زر إعادة المحاولة

3. Empty States:
   - groups: لا مجموعات → أيقونة + 'لم تقم بإنشاء أي مجموعة بعد' + زر 'إنشاء أول مجموعة'
   - students: لا طلاب → 'لم تقم بإضافة أي طالب بعد' + زر 'إضافة طالب'
   - group detail/students: المجموعة فارغة → 'لا يوجد طلاب في هذه المجموعة بعد'

4. Capacity Enforcement:
   - في enrollInGroup: إذا امتلأت المجموعة → status WAITLIST + toast 'تمت إضافة الطالب لقائمة الانتظار'
   - في GroupCard: إذا اقتربت من الامتلاء (>90%) → badge تحذير 'يوشك على الامتلاء'

5. Phone Validation:
   - تأكد phoneInput يقبل: 01012345678 أو 01012345678
   - يحول تلقائيا للـ E.164 قبل الحفظ: +201012345678
```

---

# ✅ Checklist قبل نهاية كل يوم

```bash
# شغل هذه الأوامر وتأكد من نجاحها
npx tsc --noEmit          # لا TypeScript errors
npm run lint              # لا ESLint errors
npm run build             # production build ناجح
```

```
□ كل query فيه where: { tenantId } بدون استثناء
□ كل action يبدأ بـ requireTenant() ثم requireAuth()
□ كل input validated بـ Zod قبل أي DB query
□ لا يوجد 'any' في TypeScript
□ لا raw SQL — Prisma فقط
□ كل النصوص عربي (labels, errors, placeholders, toasts)
□ spacing: ms-/me-/ps-/pe- وليس ml-/mr-/pl-/pr-
□ align: text-start/text-end وليس text-left/text-right
□ Buttons: min-h-[44px] للموبايل
□ لا تلمس ملفات Person B أو C
□ git commit + push قبل نهاية كل يوم
```

---

# 🗂️ خريطة ملفاتك الكاملة

```
eduplatform/
├── prisma/
│   └── seed.ts                                          ✅ S-13
├── src/
│   ├── lib/
│   │   └── auth.ts                                      ✅ S-08
│   ├── modules/
│   │   ├── groups/
│   │   │   ├── actions.ts                               ✅ A-01
│   │   │   ├── queries.ts                               ✅ A-01
│   │   │   ├── validations.ts                           ✅ A-01
│   │   │   └── components/
│   │   │       ├── GroupCard.tsx                        ✅ A-02
│   │   │       ├── GroupForm.tsx                        ✅ A-02
│   │   │       ├── GroupList.tsx                        ✅ A-02
│   │   │       └── GroupScheduleGrid.tsx                ✅ A-05
│   │   ├── students/
│   │   │   ├── actions.ts                               ✅ A-03
│   │   │   ├── queries.ts                               ✅ A-03
│   │   │   ├── validations.ts                           ✅ A-03
│   │   │   └── components/
│   │   │       ├── StudentCard.tsx                      ✅ A-04
│   │   │       ├── StudentForm.tsx                      ✅ A-04
│   │   │       ├── StudentList.tsx                      ✅ A-04
│   │   │       ├── StudentProfile.tsx                   ✅ A-04
│   │   │       ├── StudentSearch.tsx                    ✅ A-07
│   │   │       └── CSVImporter.tsx                      ✅ A-04
│   │   └── schedule/
│   │       ├── queries.ts                               ✅ A-05
│   │       └── components/
│   │           └── WeeklyCalendar.tsx                   ✅ A-05
│   └── app/(tenant)/
│       ├── (dashboard)/teacher/
│       │   ├── groups/
│       │   │   ├── page.tsx                             ✅ A-02
│       │   │   ├── loading.tsx                          ✅ A-08
│       │   │   ├── error.tsx                            ✅ A-08
│       │   │   ├── new/page.tsx                         ✅ A-02
│       │   │   └── [groupId]/
│       │   │       ├── page.tsx                         ✅ A-07
│       │   │       ├── loading.tsx                      ✅ A-08
│       │   │       └── edit/page.tsx                    ✅ A-02
│       │   ├── students/
│       │   │   ├── page.tsx                             ✅ A-04
│       │   │   ├── loading.tsx                          ✅ A-08
│       │   │   ├── error.tsx                            ✅ A-08
│       │   │   ├── new/page.tsx                         ✅ A-04
│       │   │   ├── import/page.tsx                      ✅ A-04
│       │   │   └── [studentId]/page.tsx                 ✅ A-04
│       │   ├── schedule/page.tsx                        ✅ A-05
│       │   └── settings/page.tsx                        ✅ A-05
│       └── api/
│           ├── groups/route.ts                          ✅ A-06
│           ├── groups/[groupId]/route.ts                ✅ A-06
│           ├── groups/[groupId]/archive/route.ts        ✅ A-06
│           ├── groups/[groupId]/students/route.ts       ✅ A-06
│           ├── students/route.ts                        ✅ A-06
│           ├── students/import/route.ts                 ✅ A-06
│           ├── students/[studentId]/route.ts            ✅ A-06
│           ├── schedule/week/route.ts                   ✅ A-06
│           ├── schedule/conflicts/route.ts              ✅ A-06
│           ├── tenant/current/route.ts                  ✅ A-06
│           ├── tenant/public-profile/route.ts           ✅ A-06
│           └── tenant/settings/route.ts                 ✅ A-06
```

---

# 🛟 Mock مؤقت — إذا Person B أو C لم يخلصوا بعد

استخدم هذه الـ mocks مؤقتا في أعلى أي ملف يحتاجها ثم احذفها فور جهوز الملفات:

```typescript
// ── TEMP — يحذف عند جهوز src/lib/db.ts من Person B ──
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
// ── END TEMP ──
```

```typescript
// ── TEMP — يحذف عند جهوز lib/tenant.ts من Person B ──
async function requireTenant() {
  return { id: 'mock-tenant-id', slug: 'ahmed', name: 'أ. أحمد' }
}
// ── END TEMP ──
```

```typescript
// ── TEMP — يحذف عند جهوز types/index.ts من Person B ──
// استخدم Prisma generated types مباشرة:
import type { Group, User, GroupStudent, Payment } from '@prisma/client'
type GroupWithStudentCount = Group & { _count: { students: number } }
type StudentWithPaymentStatus = User & { paymentStatus: string, attendanceRate: number, groups: Group[] }
// ── END TEMP ──
```

---

# 📦 ما تسلمه للفريق

| الوقت | ما يجد Person B | ما يجد Person C |
|-------|----------------|----------------|
| بعد S-15 (يوم 1) | auth.ts + seed.ts + المشروع الأساسي | نفس الشيء |
| بعد A-01 (يوم 2) | `getGroupStudents()` لـ AttendanceSheet | `getGroups()` للـ Dashboard |
| بعد A-03 (يوم 2) | — | `getStudentProfile()` + `searchStudents()` + student count |
| بعد A-05 (يوم 3) | — | `getWeeklySchedule()` للـ Dashboard |
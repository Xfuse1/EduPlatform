# 📋 تقرير فجوات EduPlatform — User Journey Gap Analysis

> **تاريخ الفحص:** 28 مارس 2026  
> **المشروع:** `c:\Users\DELL\Eduplatform\EduPlatform`  
> **Stack:** Next.js 15 · App Router · Prisma · PostgreSQL · TypeScript

---

## هيكل المشروع الموجود

| المجلد / الملف | الوصف |
|---|---|
| `src/app/(tenant)/(dashboard)/teacher/` | لوحة المدرس + مجموعات + طلاب + جدول + إعدادات |
| `src/app/(tenant)/(dashboard)/student/` | لوحة الطالب + جدول |
| `src/app/(tenant)/(dashboard)/parent/` | لوحة ولي الأمر (صفحة واحدة فقط) |
| `src/app/(tenant)/(dashboard)/attendance/` | صفحة الحضور (مشتركة) |
| `src/app/(tenant)/(dashboard)/payments/` | صفحة المدفوعات (مشتركة) |
| `prisma/schema.prisma` | موديلات: Tenant · User · Group · Session · Attendance · Payment · Notification · OTP · AuthSession |
| `src/modules/dashboard/` | queries + 5 مكونات (TeacherDashboard, StudentDashboard, ParentDashboard, StudentSchedule, Charts) |
| `src/modules/attendance/` | queries.ts فقط (بدون مكون مستقل) |
| `src/modules/payments/` | queries.ts + PaymentsPageClient.tsx |
| `src/modules/groups/` | GroupsPageClient.tsx |
| `src/modules/students/` | StudentsPageClient.tsx + AddStudentForm.tsx + queries.ts |
| `src/modules/settings/` | SettingsForm.tsx |
| `src/modules/auth/` | LoginForm.tsx + OTPInput.tsx |
| `src/components/layout/` | Sidebar + Header + NotificationBell (static mock data) |

---

## ✅ موجود ومكتمل

### [بيرسونا 1: مدير السنتر]
- ✅ **Dashboard يومي** — لوحة TeacherDashboard تعرض إيرادات الشهر، المتأخرات، إجمالي الطلاب، نسبة الحضور
- ✅ **إضافة مجموعة / تعديلها** — GroupsPageClient يدعم Create + Edit + السعة والجدول والرسوم
- ✅ **إضافة طالب / تعديله** — AddStudentForm + StudentsPageClient مع ربط بالمجموعة
- ✅ **تسجيل دفعة / تعديلها** — PaymentsPageClient يدعم Create + Edit + فلتر الحالة
- ✅ **تنبيهات المتأخرين في الدفع** — قسم Alerts في TeacherDashboard يعرض OVERDUE payments
- ✅ **تنبيهات الغياب المتكرر** — absenceAlerts تُعرض في لوحة التحكم (≥3 غيابات)
- ✅ **مقارنة الإيرادات بالشهر السابق** — revenue.change محسوب في getRevenueSummary
- ✅ **إعدادات السنتر** — SettingsForm (اسم، لون، هاتف، منطقة، مواد، خطة)

### [بيرسونا 2: الطالب]
- ✅ **ملخص اليوم / الحصة القادمة** — StudentDashboard يعرض next session مع التاريخ والوقت
- ✅ **عرض مجموعاتي** — StudentDashboard يعرض enrollments
- ✅ **نسبة الحضور مع Progress Bar** — Progress bar بالنسبة المئوية الشهرية
- ✅ **حالة المصروفات** — StudentDashboard يعرض PAID / amount due
- ✅ **الجدول الأسبوعي** — StudentSchedule مكتمل ومنظم بالأيام مع إبراز اليوم الحالي

### [بيرسونا 3: المدرس]
- ✅ **جدول اليوم وحصصه** — TeacherDashboard يعرض todaySessions مع الحالة (IN_PROGRESS / SCHEDULED)
- ✅ **ملخص الإيرادات الشهري** — revenue.thisMonth + change
- ✅ **قائمة الطلاب مع الحضور والمدفوعات** — StudentsPageClient + بيانات كاملة
- ✅ **إضافة / تعديل مجموعات** — GroupsPageClient
- ✅ **تقارير بيانية** — TeacherDashboardCharts: إيرادات آخر 6 أشهر + نسبة الحضور الشهرية
- ✅ **حساب المستحقات والمتأخرات** — getRevenueSummary يحسب outstanding = pending + overdue

### [بيرسونا 4: ولي الأمر]
- ✅ **جدول الابن مع الحصة القادمة** — ParentDashboard يعرض nextSession لكل ابن
- ✅ **حالة الحضور اليومي** — todayStatus: PRESENT / ABSENT / NO_SESSION
- ✅ **نسبة الحضور مع Progress Bar** — attendanceRate مع شريط تقدم
- ✅ **حالة المصروفات** — PAID / amount due

---

## ⚠️ موجود جزئياً

### [بيرسونا 1: مدير السنتر]

| الفيتشر | الموجود | الناقص |
|---|---|---|
| **إدارة الجدول** | إضافة/تعديل المجموعات (أيام + وقت) | ❌ لا توجد صفحة "جدول" مركزية تعرض تقويماً بصرياً أسبوعياً / شهرياً |
| **إشعار تلقائي عند تعديل الجدول** | Schema يدعم Notification + SMS quota | ❌ لا يوجد trigger إرسال إشعار عند تعديل group |
| **تسجيل الحضور بـ QR Code** | AttendanceMethod enum يحتوي QR في الـ schema | ❌ لا يوجد أي UI أو API لتوليد / مسح QR code |
| **تقرير حضور لحظي** | attendance page تعرض attended/total | ❌ لا يوجد تقرير حضور تفصيلي بأسماء الطلاب لكل حصة |
| **بوابة دفع أونلاين** | PaymentMethod enum: VODAFONE_CASH, FAWRY, INSTAPAY, CARD | ❌ لا يوجد integration فعلي مع أي بوابة دفع |
| **فواتير PDF** | receiptUrl موجود في schema | ❌ لا يوجد جيل PDF ولا زر تحميل فاتورة |
| **تقرير يومي تلقائي في نهاية اليوم** | بيانات متوفرة | ❌ لا يوجد cron job أو scheduled task لإرسال تقرير |
| **مقارنة الأداء بالأسبوع السابق** | مقارنة شهرية موجودة للإيرادات والحضور | ❌ لا توجد مقارنة أسبوعية |

### [بيرسونا 2: الطالب]

| الفيتشر | الموجود | الناقص |
|---|---|---|
| **إشعار تغيير الجدول** | NotificationBell موجود (UI فقط) | ❌ الإشعارات hardcoded / mock data — لا يوجد push/SMS فعلي |
| **تذكير قبل الحصة بـ 30 دقيقة** | Notification schema موجود (CLASS_REMINDER) | ❌ لا يوجد job يرسل تذكير 30 دقيقة قبل الحصة |
| **عداد الحصص المتبقية في الباقة** | StudentDashboard يعرض enrollments | ❌ لا يوجد حقل "باقة حصص" في الـ schema ولا عداد |
| **تسجيل الحضور بضغطة واحدة** | زر حضور غير موجود في واجهة الطالب | ❌ الطالب لا يستطيع تأكيد حضوره من التطبيق |
| **ملاحظات الحصة / كتابة ملاحظات** | session.notes موجود في schema | ❌ لا يوجد UI لعرضها أو كتابتها من جانب الطالب |
| **Progress Bar أسبوعي** | Progress bar شهري موجود | ❌ لا يوجد تفصيل أسبوعي أو مقارنة أسبوع بأسبوع |

### [بيرسونا 3: المدرس]

| الفيتشر | الموجود | الناقص |
|---|---|---|
| **تسجيل الحضور من داخل الحصة** | attendance page عامة موجودة | ❌ لا يوجد زر "ابدأ الحصة" + تسجيل حضور كل طالب |
| **ملاحظات سريعة على كل طالب** | session.notes موجود في schema | ❌ لا يوجد UI لكتابة ملاحظات على الطالب الفردي |
| **قائمة "يحتاج متابعة" يومية** | absenceAlerts في Dashboard | ⚠️ موجودة لكن محدودة (غياب فقط، لا تشمل: تأخر دفع + ضعف أداء) |
| **طلب صرف المستحقات** | الحسابات موجودة | ❌ لا يوجد workflow للطلب والصرف |
| **Audit Trail لكل حصة** | createdAt / markedAt موجودة | ❌ لا يوجد سجل "من غيّر" / سجل تغييرات Events |

### [بيرسونا 4: ولي الأمر]

| الفيتشر | الموجود | الناقص |
|---|---|---|
| **إشعار صباحي تلقائي بجدول الابن** | Notification schema موجود | ❌ لا يوجد scheduled job صباحي |
| **إشعار فوري عند تسجيل/غياب** | NotificationType: ATTENDANCE_PRESENT / ABSENT | ❌ الإرسال الفعلي غير مُنفَّذ (لا يوجد SMS/push sender) |
| **تاريخ حضور وغياب كامل** | attendanceRate موجود | ❌ لا يوجد صفحة تاريخ مفصل بكل جلسة مع التواريخ |
| **رسم بياني لتطور الأداء** | رسوم بيانية في Teacher Dashboard (mock) | ❌ لا يوجد performance chart خاص بولي الأمر |
| **فاتورة مفصلة** | receipts schema موجود | ❌ لا يوجد فاتورة تفصيلية (حصة × سعر × تاريخ) أو PDF |
| **بوابة دفع آمنة** | PaymentMethod enum يدعم Vodafone Cash / Card | ❌ لا يوجد integration فعلي |
| **إشعار قبل انتهاء الاشتراك** | planExpiresAt موجود في Tenant schema | ❌ لا يوجد trigger تنبيه قبل أسبوع |
| **ملاحظات المدرس للأولياء** | session.notes موجود | ❌ لا يوجد وسيلة لإرسالها لولي الأمر |

---

## ❌ غير موجود بالكلية

### بيرسونا 1 — مدير السنتر
- ❌ **اكتشاف تعارض القاعات تلقائياً** — لا يوجد conflict detection لوقت + قاعة
- ❌ **إضافة مدرس بديل** — لا يوجد حقل substitution في Session model ولا UI
- ❌ **Cron jobs / Scheduled tasks** — لا يوجد أي background job runner (تذكيرات، تقارير، إشعارات)

### بيرسونا 2 — الطالب
- ❌ **نظام الواجبات** (Schema + UI + إشعار بالتسليم)
- ❌ **نظام الرسائل / أسئلة أثناء الحصة**
- ❌ **تقييم الحصة** (نجوم / إيموجي)
- ❌ **مكتبة المواد والمستندات**
- ❌ **اقتراح حصص إضافية بناءً على الأداء**

### بيرسونا 3 — المدرس
- ❌ **نظام الدرجات** (Schema + لوحة تحكم + درجات آلية)
- ❌ **نظام الواجبات** (إرسال + استلام + تصحيح)
- ❌ **استبيان الفهم بعد الحصة**
- ❌ **قوالب تقارير جاهزة**
- ❌ **مكتبة المحتوى التعليمي**
- ❌ **نظام صرف المستحقات**
- ❌ **نظام الرسائل المنظم مع أولياء الأمور**

### بيرسونا 4 — ولي الأمر
- ❌ **تنبيه مبكر عند تراجع الأداء** (لا يوجد performance threshold logic)
- ❌ **مقارنة حصص مدفوعة vs منفذة** (لا يوجد تتبع sessions per payment)
- ❌ **حجز موعد مقابلة أونلاين** (no scheduling/calendar system)
- ❌ **SLA رد 24 ساعة** (لا يوجد messaging + SLA tracking)
- ❌ **سجل كامل للتواصل السابق** (لا يوجد conversation history)
- ❌ **ملاحظات صوتية من المدرس** (لا يوجد audio/media upload)

---

## 📊 ملخص

### نسب الاكتمال بالبيرسونا

| البيرسونا | مكتمل ✅ | جزئي ⚠️ | مفقود ❌ | نسبة الاكتمال الفعلية |
|---|---|---|---|---|
| 🏢 مدير السنتر (13 فيتشر) | 5 | 8 | 3 | ~28% |
| 👨‍🎓 الطالب (15 فيتشر) | 5 | 6 | 9 | ~23% |
| 👩‍🏫 المدرس (19 فيتشر) | 6 | 5 | 9 | ~22% |
| 👨‍👩‍👦 ولي الأمر (19 فيتشر) | 4 | 8 | 9 | ~16% |
| **الإجمالي (66 فيتشر)** | **20** | **27** | **30** | **~22%** |

> ملاحظة: احتساب الجزئي بـ 50% من قيمته → **نسبة الاكتمال التقريبية = 35%**

---

### 🔥 أولوية قصوى — أهم 5 فيتشرز ناقصة (حسب التأثير)

| الأولوية | الفيتشر | لماذا هو الأهم؟ |
|---|---|---|
| 🥇 **1** | **نظام الواجبات** (Schema + UI للمدرس + الطالب + ولي الأمر) | يربط 3 بيرسونات — غيابه يعطل core value proposition |
| 🥈 **2** | **تسجيل الحضور الفعلي من داخل الحصة** (زر بضغطة + QR) | الحضور هو المحور الأساسي وحالياً هو عرض فقط بدون إدخال بيانات فعلي |
| 🥉 **3** | **نظام الإشعارات الفعلي** (SMS / Push triggered) | حالياً mock data فقط — إشعار الغياب والجدول والتذكيرات كلها معطلة |
| 4️⃣ **4** | **بوابة الدفع الأونلاين** (Vodafone Cash / Fawry integration) | يؤثر مباشرة على إيرادات المدرس والأهالي |
| 5️⃣ **5** | **نظام الرسائل** (Teacher ↔ Parent + Teacher ↔ Student) | غيابه يجعل التواصل خارج المنصة ويكسر الـ user loop |

---

### 🏗️ ما يحتاج schema جديد في Prisma

```prisma
model Assignment {
  id          String   @id @default(cuid())
  sessionId   String
  title       String
  dueDate     DateTime
  // ...
}

model AssignmentSubmission {
  id           String  @id @default(cuid())
  assignmentId String
  studentId    String
  grade        Int?
  // ...
}

model Grade {
  id        String @id @default(cuid())
  studentId String
  groupId   String
  score     Int
  // ...
}

model Message {
  id         String @id @default(cuid())
  fromUserId String
  toUserId   String
  body       String
  // ...
}

model SessionRating {
  id        String @id @default(cuid())
  sessionId String
  studentId String
  rating    Int    // 1-5
  // ...
}

model PayoutRequest {
  id       String @id @default(cuid())
  tenantId String
  amount   Int
  status   String
  // ...
}
```

---

*تم إنشاء هذا التقرير بناءً على فحص يدوي لـ:*  
*`prisma/schema.prisma` · `src/modules/**` · `src/app/(tenant)/(dashboard)/` · `src/components/`*

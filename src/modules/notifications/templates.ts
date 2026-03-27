// ── B-05: Notification Templates ────────────────────────────────────────────
// قوالب الرسائل — نص فقط، لا يحتوي على DB calls

/**
 * رسالة حضور الطالب
 */
export function attendancePresent(
  studentName: string,
  subject: string,
  time: string,
) {
  return {
    title: 'تم تسجيل الحضور ✅',
    body: `✅ ابنكم/بنتكم ${studentName} حضر/ت حصة ${subject} الساعة ${time}`,
  }
}

/**
 * رسالة غياب الطالب
 */
export function attendanceAbsent(studentName: string, subject: string) {
  return {
    title: 'غياب ⚠️',
    body: `⚠️ ابنكم/بنتكم ${studentName} لم يحضر/تحضر حصة ${subject} اليوم`,
  }
}

/**
 * تذكير بالمصاريف المستحقة
 */
export function paymentReminder(month: string, amount: number) {
  return {
    title: 'تذكير بالمصاريف 💰',
    body: `💰 تذكير: مصاريف شهر ${month} مستحقة (${amount} جنيه)`,
  }
}

/**
 * تنبيه بمتأخرات مستحقة
 */
export function paymentOverdue(amount: number) {
  return {
    title: 'متأخرات مستحقة ⚠️',
    body: `⚠️ عليكم متأخرات بمبلغ ${amount} جنيه — برجاء السداد فوراً`,
  }
}

/**
 * تذكير بموعد الحصة القادمة
 */
export function classReminder(subject: string, time: string) {
  return {
    title: 'تذكير بالحصة 📅',
    body: `📅 تذكير: حصة ${subject} بكرة الساعة ${time}`,
  }
}

// ── B-05: SMS Provider ───────────────────────────────────────────────────────
// MVP: console.log — استبدل بـ SMS provider حقيقي لاحقاً

/**
 * إرسال رسالة SMS
 * @returns true لو نجح، false لو فشل
 *
 * للإنتاج: استبدل بـ Vonage, Twilio, أو أي SMS provider مصري
 * مثال:
 *   const response = await fetch(process.env.SMS_API_URL!, {
 *     method: 'POST',
 *     headers: { Authorization: `Bearer ${process.env.SMS_API_KEY}` },
 *     body: JSON.stringify({ to: phone, message })\
 *   })
 *   return response.ok
 */
export async function sendSMS(
  phone: string,
  message: string,
): Promise<boolean> {
  console.log(`[SMS] → ${phone}: ${message}`)
  return true
}

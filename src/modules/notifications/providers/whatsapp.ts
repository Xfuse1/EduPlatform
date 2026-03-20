// ── B-05: WhatsApp Provider ──────────────────────────────────────────────────
// MVP: console.log — استبدل بـ WhatsApp Business API لاحقاً

/**
 * إرسال رسالة WhatsApp
 * @returns true لو نجح، false لو فشل
 *
 * للإنتاج: استخدم WhatsApp Cloud API أو Twilio WhatsApp
 * مثال:
 *   const response = await fetch(
 *     `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
 *     {
 *       method: 'POST',
 *       headers: {
 *         Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
 *         'Content-Type': 'application/json',
 *       },
 *       body: JSON.stringify({
 *         messaging_product: 'whatsapp',
 *         to: phone,
 *         type: 'text',
 *         text: { body: message },
 *       }),
 *     }
 *   )
 *   return response.ok
 */
export async function sendWhatsApp(
  phone: string,
  message: string,
): Promise<boolean> {
  console.log(`[WhatsApp] → ${phone}: ${message}`)
  return true
}

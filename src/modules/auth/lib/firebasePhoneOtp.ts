'use client';

import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";
import { normalizeEgyptPhone, toEgyptE164 } from "@/lib/phone";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let recaptchaContainerId: string | null = null;
let recaptchaRenderElement: HTMLDivElement | null = null;
let recaptchaRenderNonce = 0;

// Store confirmation on window to survive Turbopack cross-page module isolation
const getConfirmation = (): ConfirmationResult | null =>
  (typeof window !== "undefined" ? (window as any).__otp_confirmation as ConfirmationResult : null) ?? null;

const setConfirmation = (result: ConfirmationResult | null) => {
  if (typeof window !== "undefined") {
    (window as any).__otp_confirmation = result;
  }
};

function isLocalDevelopmentHost() {
  if (typeof window === "undefined") {
    return false;
  }

  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function mapFirebaseAuthError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  const message = typeof error === "object" && error !== null && "message" in error ? String(error.message) : "";

  if (message.includes("invalid-egypt-phone")) {
    return "رقم الهاتف غير صحيح";
  }

  switch (code) {
    case "auth/invalid-phone-number":
      return "رقم الهاتف غير صحيح";
    case "auth/invalid-verification-code":
      return "كود التحقق غير صحيح";
    case "auth/code-expired":
    case "auth/session-expired":
      return "انتهت صلاحية كود التحقق. أرسل كودًا جديدًا";
    case "auth/too-many-requests":
      return "تمت محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة";
    case "auth/quota-exceeded":
      return "تم تجاوز حصة الإرسال في Firebase";
    case "auth/billing-not-enabled":
      return isLocalDevelopmentHost()
        ? "خدمة تسجيل الدخول برقم الهاتف في Firebase تحتاج تفعيل Billing أو استخدام أرقام اختبار Firebase أثناء التطوير."
        : "خدمة التحقق برقم الهاتف غير مفعلة حاليًا. تواصل مع إدارة المنصة.";
    case "auth/captcha-check-failed":
      return "فشل التحقق الأمني من Firebase. أعد المحاولة";
    case "auth/missing-app-credential":
    case "auth/invalid-app-credential":
      return "تعذر إنشاء اعتماد التطبيق المطلوب من Firebase";
    case "auth/internal-error":
      return isLocalDevelopmentHost()
        ? "فشل Firebase في إرسال الكود محليًا. على localhost استخدم رقم اختبار مضافًا في Firebase أو جرّب الدومين المنشور."
        : "تعذر إكمال التحقق عبر Firebase الآن";
    default:
      console.error("[firebase-phone-otp] unhandled error:", error);
      return `خطأ Firebase غير معروف: ${
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code: string }).code)
          : String(error)
      }`;
  }
}

function clearRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }

  recaptchaRenderElement?.remove();
  recaptchaRenderElement = null;

  if (recaptchaContainerId) {
    const container = document.getElementById(recaptchaContainerId);
    container?.replaceChildren();
    recaptchaContainerId = null;
  }
}

function createRecaptchaRenderTarget(containerId: string) {
  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error(`Missing reCAPTCHA container: ${containerId}`);
  }

  const renderTarget = document.createElement("div");
  renderTarget.id = `${containerId}-widget-${++recaptchaRenderNonce}`;

  container.replaceChildren(renderTarget);
  recaptchaRenderElement = renderTarget;

  return renderTarget;
}

async function createRecaptcha(containerId: string) {
  const auth = await getFirebaseAuth();

  clearRecaptcha();
  const renderTarget = createRecaptchaRenderTarget(containerId);
  recaptchaRenderElement = renderTarget;
  recaptchaVerifier = new RecaptchaVerifier(auth, renderTarget, {
    size: "invisible",
  });
  recaptchaContainerId = containerId;

  return {
    auth,
    verifier: recaptchaVerifier,
  };
}

export async function sendFirebasePhoneOtp(phone: string, containerId: string) {
  try {
    const normalizedPhone = normalizeEgyptPhone(phone);
    const { auth, verifier } = await createRecaptcha(containerId);

    const result = await signInWithPhoneNumber(auth, toEgyptE164(normalizedPhone), verifier);
    setConfirmation(result);
    clearRecaptcha();

    return {
      success: true,
      normalizedPhone,
      message: `تم إرسال كود التحقق إلى ${normalizedPhone}`,
    };
  } catch (error) {
    setConfirmation(null);
    clearRecaptcha();

    return {
      success: false,
      message: mapFirebaseAuthError(error),
    };
  }
}

export async function confirmFirebasePhoneOtp(code: string) {
  const confirmation = getConfirmation();

  if (!confirmation) {
    return {
      success: false,
      message: "يجب إرسال كود تحقق جديد أولًا",
    };
  }

  try {
    const result = await confirmation.confirm(code);
    const idToken = await result.user.getIdToken(true);
    const normalizedPhone = normalizeEgyptPhone(result.user.phoneNumber ?? "");

    await signOut(await getFirebaseAuth());
    setConfirmation(null);
    clearRecaptcha();

    return {
      success: true,
      idToken,
      normalizedPhone,
      message: "تم التحقق من رقم الهاتف بنجاح",
    };
  } catch (error) {
    return {
      success: false,
      message: mapFirebaseAuthError(error),
    };
  }
}

export async function resetFirebasePhoneOtp() {
  try {
    const auth = await getFirebaseAuth();
    await signOut(auth).catch(() => {});
  } finally {
    setConfirmation(null);
    clearRecaptcha();
  }
}

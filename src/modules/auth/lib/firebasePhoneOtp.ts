'use client';

import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber, signOut } from "firebase/auth";

import { getFirebaseAuth } from "@/lib/firebase";
import { normalizeEgyptPhone, toEgyptE164 } from "@/lib/phone";

let recaptchaVerifier: RecaptchaVerifier | null = null;
let recaptchaContainerId: string | null = null;
let confirmationResult: ConfirmationResult | null = null;

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
      if (process.env.NODE_ENV !== "production") {
        console.error("[firebase-phone-otp]", error);
      }
      return "تعذر إكمال التحقق عبر Firebase الآن";
  }
}

async function clearRecaptcha() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
    recaptchaContainerId = null;
  }
}

async function getOrCreateRecaptcha(containerId: string) {
  const auth = await getFirebaseAuth();

  if (recaptchaVerifier && recaptchaContainerId === containerId) {
    return { auth, verifier: recaptchaVerifier };
  }

  await clearRecaptcha();

  const container = document.getElementById(containerId);

  if (!container) {
    throw new Error(`Missing reCAPTCHA container: ${containerId}`);
  }

  container.innerHTML = "";
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
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
    const { auth, verifier } = await getOrCreateRecaptcha(containerId);

    confirmationResult = await signInWithPhoneNumber(auth, toEgyptE164(normalizedPhone), verifier);

    return {
      success: true,
      normalizedPhone,
      message: `تم إرسال كود التحقق إلى ${normalizedPhone}`,
    };
  } catch (error) {
    confirmationResult = null;
    await clearRecaptcha();

    return {
      success: false,
      message: mapFirebaseAuthError(error),
    };
  }
}

export async function confirmFirebasePhoneOtp(code: string) {
  if (!confirmationResult) {
    return {
      success: false,
      message: "يجب إرسال كود تحقق جديد أولًا",
    };
  }

  try {
    const result = await confirmationResult.confirm(code);
    const idToken = await result.user.getIdToken(true);
    const normalizedPhone = normalizeEgyptPhone(result.user.phoneNumber ?? "");

    await signOut(await getFirebaseAuth());
    confirmationResult = null;

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
    confirmationResult = null;
    await clearRecaptcha();
  }
}

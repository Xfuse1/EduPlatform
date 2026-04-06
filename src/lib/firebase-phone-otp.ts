'use client';

import type { ConfirmationResult, RecaptchaVerifier as RecaptchaVerifierType } from "firebase/auth";

// Store on window so it survives Next.js client-side navigation
// across different module chunks (Turbopack/webpack code splitting)
declare global {
  interface Window {
    __firebaseConfirmation?: ConfirmationResult | null;
    __firebaseRecaptcha?: RecaptchaVerifierType | null;
  }
}

export function setConfirmationResult(result: ConfirmationResult) {
  window.__firebaseConfirmation = result;
}

export function getConfirmationResult(): ConfirmationResult | null {
  return window.__firebaseConfirmation ?? null;
}

export function clearConfirmationResult() {
  window.__firebaseConfirmation = null;
}

export async function getOrCreateRecaptchaVerifier(containerId: string): Promise<RecaptchaVerifierType> {
  if (window.__firebaseRecaptcha) {
    return window.__firebaseRecaptcha;
  }

  const { RecaptchaVerifier } = await import("firebase/auth");
  const { getFirebaseAuth } = await import("@/lib/firebase");
  const auth = await getFirebaseAuth();

  window.__firebaseRecaptcha = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
  });

  return window.__firebaseRecaptcha;
}

export function clearRecaptchaVerifier() {
  if (window.__firebaseRecaptcha) {
    window.__firebaseRecaptcha.clear();
    window.__firebaseRecaptcha = null;
  }
}

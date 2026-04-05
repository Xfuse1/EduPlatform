'use client';

import type { ConfirmationResult, RecaptchaVerifier as RecaptchaVerifierType } from "firebase/auth";

// Module-level store for the confirmation result.
// Survives client-side navigation but resets on full page reload.
let storedConfirmation: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifierType | null = null;

export function setConfirmationResult(result: ConfirmationResult) {
  storedConfirmation = result;
}

export function getConfirmationResult(): ConfirmationResult | null {
  return storedConfirmation;
}

export function clearConfirmationResult() {
  storedConfirmation = null;
}

export async function getOrCreateRecaptchaVerifier(containerId: string): Promise<RecaptchaVerifierType> {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  const { RecaptchaVerifier } = await import("firebase/auth");
  const { firebaseAuth } = await import("@/lib/firebase");

  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
  });

  return recaptchaVerifier;
}

export function clearRecaptchaVerifier() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

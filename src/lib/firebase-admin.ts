import { App, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { normalizeEgyptPhone } from "@/lib/phone";

function getFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not fully configured");
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function getFirebaseAdminApp() {
  if (!getApps().length) {
    const config = getFirebaseAdminConfig();

    return initializeApp({
      credential: cert(config),
      projectId: config.projectId,
    });
  }

  return getApp();
}

function isLocalCertificateVerificationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";

  return (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN" ||
    message.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
    message.includes("SELF_SIGNED_CERT_IN_CHAIN") ||
    message.includes("unable to verify the first certificate")
  );
}

function decodeFirebasePhoneFromJwt(idToken: string) {
  const [, payload] = idToken.split(".");
  if (!payload) {
    throw new Error("Firebase token payload is missing");
  }

  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    phone_number?: string;
    sub?: string;
  };

  if (!decoded.phone_number) {
    throw new Error("Firebase token does not contain a phone number");
  }

  return {
    uid: decoded.sub ?? "",
    phoneNumber: normalizeEgyptPhone(decoded.phone_number),
  };
}

export async function verifyFirebasePhoneIdToken(idToken: string) {
  const app: App = getFirebaseAdminApp();
  let decodedToken: Awaited<ReturnType<ReturnType<typeof getAuth>["verifyIdToken"]>>;

  try {
    decodedToken = await getAuth(app).verifyIdToken(idToken);
  } catch (error) {
    if (process.env.NODE_ENV !== "production" && isLocalCertificateVerificationError(error)) {
      return decodeFirebasePhoneFromJwt(idToken);
    }

    throw error;
  }

  const firebasePhoneNumber = decodedToken.phone_number;

  if (!firebasePhoneNumber) {
    throw new Error("Firebase token does not contain a phone number");
  }

  return {
    uid: decodedToken.uid,
    phoneNumber: normalizeEgyptPhone(firebasePhoneNumber),
  };
}

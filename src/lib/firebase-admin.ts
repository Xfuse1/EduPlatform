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

export async function verifyFirebasePhoneIdToken(idToken: string) {
  const app: App = getFirebaseAdminApp();
  const decodedToken = await getAuth(app).verifyIdToken(idToken);
  const firebasePhoneNumber = decodedToken.phone_number;

  if (!firebasePhoneNumber) {
    throw new Error("Firebase token does not contain a phone number");
  }

  return {
    uid: decodedToken.uid,
    phoneNumber: normalizeEgyptPhone(firebasePhoneNumber),
  };
}

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Define the required environment variables for the Service Account
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
// The private key may contain escaped newlines (\n) that must be converted to actual newlines.
const PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

/**
 * Initializes the Firebase Admin SDK if it hasn't been initialized already.
 * It strictly checks for required environment variables.
 */
function initFirebaseAdmin() {
  const apps = getApps();

  // 1. Mandatory Environment Variable Check
  if (!PROJECT_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    const missingVars = [];
    if (!PROJECT_ID) missingVars.push("FIREBASE_PROJECT_ID");
    if (!CLIENT_EMAIL) missingVars.push("FIREBASE_CLIENT_EMAIL");
    if (!PRIVATE_KEY) missingVars.push("FIREBASE_PRIVATE_KEY");

    throw new Error(
      `Failed to initialize Firebase Admin SDK. The following environment variables are missing or empty: ${missingVars.join(", ")}`,
    );
  }

  // 2. Initialize App if no app exists
  if (!apps.length) {
    // We use 'as string' because we have just performed the null/undefined check above.
    if (!PRIVATE_KEY?.includes("BEGIN PRIVATE KEY")) {
      throw new Error("PRIVATE_KEY is not properly formatted");
    }

    initializeApp({
      credential: cert({
        projectId: PROJECT_ID as string,
        clientEmail: CLIENT_EMAIL as string,
        privateKey: PRIVATE_KEY as string,
      }),
    });
  }

  // 3. Return initialized services
  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}

export const { auth, db } = initFirebaseAdmin();

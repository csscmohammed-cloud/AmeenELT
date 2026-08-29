import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD9DRVt8c4Xk1V6_kSmUvyYtII5Xi318o0",
  authDomain: "gen-lang-client-0953869774.firebaseapp.com",
  projectId: "gen-lang-client-0953869774",
  storageBucket: "gen-lang-client-0953869774.firebasestorage.app",
  messagingSenderId: "715926037345",
  appId: "1:715926037345:web:405117b624c29b85ca1b20"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  "ai-studio-33da6a47-d0bd-462a-8bb0-0fc3c22789f5"
);

export const storage = getStorage(app);

/**
 * Recursively cleans and sanitizes data objects for Firestore.
 * Firestore strictly forbids nested arrays (e.g., string[][] inside a document).
 * Any array element that is itself an array will be safely converted to an object { cells: [...] }.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (Array.isArray(item)) {
        return { cells: sanitizeForFirestore(item) };
      }
      return sanitizeForFirestore(item);
    }) as unknown as T;
  }
  if (typeof data === "object") {
    if (data.constructor && data.constructor.name !== "Object") {
      return data;
    }
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    }
    return sanitized as T;
  }
  return data;
}

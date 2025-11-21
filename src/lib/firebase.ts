// Firebase configuration and initialization
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFirestore, Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// Replace these values with your Firebase project config
// You can find these in Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Authentication and get a reference to the service
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const db: Firestore = getFirestore(app);

// Initialize Analytics (only in browser environment)
let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics not supported or failed to initialize
    analytics = null;
  });
}

// Helper function to get analytics instance
export const getAnalyticsInstance = () => analytics;

export { analytics };
export default app;


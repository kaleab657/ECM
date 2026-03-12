import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromCache, getDocFromServer } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAGloaibYUVnqUVXIo3-7qi4-e3m2YhWu0",
  authDomain: "ethiocars-dd66e.firebaseapp.com",
  projectId: "ethiocars-dd66e",
  storageBucket: "ethiocars-dd66e.firebasestorage.app",
  messagingSenderId: "533268030508",
  appId: "1:533268030508:web:525f7941396df5e7969d89"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Test connection to Firestore
async function testConnection() {
  try {
    // Try to fetch a non-existent doc to test connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Firestore connection failed: The client is offline. Check your Firebase configuration.");
    }
    // Ignore other errors (like permission denied for this test path)
  }
}
testConnection();

export default app;

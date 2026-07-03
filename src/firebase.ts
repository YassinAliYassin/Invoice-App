import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, getDocs, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

// Check if credentials are correct or placeholder
const isRealFirebase = firebaseConfig && !firebaseConfig.isPlaceholder && firebaseConfig.apiKey !== "placeholder-api-key";

let app: any = null;
let database: any = null;
let firebaseAuth: any = null;

if (isRealFirebase) {
  try {
    app = initializeApp(firebaseConfig);
    // Secure firestoreDatabaseId handles optionally configured standard databases
    database = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
    firebaseAuth = getAuth(app);
    console.log("Firebase initialized successfully with config:", firebaseConfig.projectId);
  } catch (error) {
    console.error("Failed to initialize real Firebase:", error);
  }
}

export const db = database;
export const auth = firebaseAuth;
export const isCloudSyncEnabled = isRealFirebase && !!db;

// Exception handler constraint compliant
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || "mock-user",
      email: auth?.currentUser?.email || "mock-email@example.com",
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection constraint
export async function testConnection() {
  if (!isCloudSyncEnabled) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
export { isRealFirebase };
export { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, collection, getDocs, setDoc, updateDoc, deleteDoc, doc, getDoc, onSnapshot };
export type { FirebaseUser };

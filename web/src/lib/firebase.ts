import { PUBLIC_FIREBASE_CONFIG } from '$env/static/public';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

const firebaseConfig = PUBLIC_FIREBASE_CONFIG ? JSON.parse(PUBLIC_FIREBASE_CONFIG) : {};

let firebaseApp: FirebaseApp;
if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
} else {
    firebaseApp = getApp();
}

const functions = getFunctions(getApp());

if (import.meta.env.DEV) {
    connectFunctionsEmulator(functions, "localhost", 5001);
}

export { firebaseApp, functions };
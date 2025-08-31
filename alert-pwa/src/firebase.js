// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken as getTokenCompat,
  onMessage as onMessageCompat,
  deleteToken as deleteTokenCompat,
} from "firebase/messaging";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAbohcONTb1FGRjPiVxWblTc-esImwEcI8",
  authDomain: "bbs-alert.firebaseapp.com",
  projectId: "bbs-alert",
  storageBucket: "bbs-alert.appspot.com",
  messagingSenderId: "188088530343",
  appId: "1:188088530343:web:63f5a52963276ed0cdf282",
  measurementId: "G-3E21ZRM641",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Messaging
const messaging = getMessaging(app);

export {
  messaging,
  getTokenCompat as getToken,      // For subscribing
  onMessageCompat as onMessage,    // For receiving foreground messages
  deleteTokenCompat as deleteToken // For unsubscribing
};

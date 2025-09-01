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

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = getMessaging(app);

/**
 * Subscribe to notifications
 * @param {string} vapidKey - VAPID key from Firebase console
 * @returns {Promise<string>} - FCM token
 */
const getToken = (vapidKey) => getTokenCompat(messaging, { vapidKey });

/**
 * Listen to foreground messages
 * @param {function} callback - function(payload)
 * @returns {function} unsubscribe
 */
const onMessage = (callback) => onMessageCompat(messaging, callback);

/**
 * Unsubscribe / delete token
 * @returns {Promise<void>}
 */
const deleteToken = () => deleteTokenCompat(messaging);

export { messaging, getToken, onMessage, deleteToken };

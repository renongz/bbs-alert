// src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, onMessage as onMessageCompat, getToken as getTokenCompat } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyAbohcONTb1FGRjPiVxWblTc-esImwEcI8",
  authDomain: "bbs-alert.firebaseapp.com",
  projectId: "bbs-alert",
  storageBucket: "bbs-alert.appspot.com",
  messagingSenderId: "188088530343",
  appId: "1:188088530343:web:63f5a52963276ed0cdf282",
  measurementId: "G-3E21ZRM641"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, onMessageCompat as onMessage, getTokenCompat as getToken };

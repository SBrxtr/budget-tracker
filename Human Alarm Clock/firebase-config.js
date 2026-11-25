import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAU71gVrPg0Rp7PT95aPMtmmSabhEUvnzw",
  authDomain: "human-alarm-clock.firebaseapp.com",
  databaseURL: "https://human-alarm-clock-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "human-alarm-clock",
  storageBucket: "human-alarm-clock.firebasestorage.app",
  messagingSenderId: "813237490780",
  appId: "1:813237490780:web:ea7f0e16368c2be9fd4299"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const database = getDatabase(firebaseApp);
export const USER_ROLES = Object.freeze({
  "2K3WQfcQIqPS7AIkuN4T91chYsw1": "admin",
  "gSQITjZdFkPEgBN7Fx0g6RpfwL72": "client"
});
export function getUserRole(user) {
  return user ? USER_ROLES[user.uid] || null : null;
}

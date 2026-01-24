// js/firebase.js

// 1. CONFIGURACIÓN (Tus claves reales adaptadas al modo Compat)
const firebaseConfig = {
  apiKey: "AIzaSyDdGlG0eEbh5yE77YRkVlV-LmijBG3BHSk",
  authDomain: "mis-videojuegos.firebaseapp.com",
  projectId: "mis-videojuegos",
  storageBucket: "mis-videojuegos.firebasestorage.app",
  messagingSenderId: "156172344529",
  appId: "1:156172344529:web:b3d77637346ff2ec6af9f0"
};

// 2. INICIALIZAR FIREBASE (Usando el namespace global 'firebase')
const app = firebase.initializeApp(firebaseConfig);

// 3. INICIALIZAR BASE DE DATOS
const db = firebase.firestore();

// 4. CONFIRMACIÓN EN CONSOLA
console.log("🔥 Firebase conectado:", app.name);
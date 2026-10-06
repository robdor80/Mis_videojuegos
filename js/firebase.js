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

// 3. INICIALIZAR BASE DE DATOS Y AUTENTICACIÓN
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Mantener la sesión iniciada en este navegador.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
  console.error("No se pudo configurar la persistencia de Firebase Auth:", error);
});

/**
 * Exige autenticación Google antes de cualquier operación que modifique Firestore.
 *
 * IMPORTANTE:
 * Esta primera fase solo crea el usuario autenticado para obtener su UID.
 * La autorización definitiva del administrador se hará después mediante el UID
 * y las reglas de seguridad de Firestore.
 *
 * @returns {Promise<firebase.User|null>}
 */
async function requireAuthForWrite() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    const result = await auth.signInWithPopup(googleProvider);
    console.info("🔐 Firebase Auth correcto. UID:", result.user.uid);
    return result.user;
  } catch (error) {
    if (error.code !== "auth/popup-closed-by-user" &&
        error.code !== "auth/cancelled-popup-request") {
      console.error("Error de autenticación:", error);
      alert("No se pudo iniciar sesión con Google. No se realizará ningún cambio.");
    }
    return null;
  }
}

window.requireAuthForWrite = requireAuthForWrite;

// 4. CONFIRMACIÓN EN CONSOLA
console.log("🔥 Firebase conectado:", app.name);

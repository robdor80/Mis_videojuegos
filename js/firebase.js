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

// 2. INICIALIZAR FIREBASE
const app = firebase.initializeApp(firebaseConfig);

// 3. INICIALIZAR FIRESTORE Y AUTH
const db = firebase.firestore();
const auth = firebase.auth();

const ADMIN_UID = "wAzU5JnS8bVJUyQEZu84LJFCe5A3";

const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Mantener la sesión iniciada en este navegador.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch((error) => {
  console.error("No se pudo configurar la persistencia de Firebase Auth:", error);
});

/**
 * Devuelve true si el usuario indicado es el administrador autorizado.
 */
function isAdminUser(user) {
  return !!user && user.uid === ADMIN_UID;
}

/**
 * Exige autenticación con la cuenta administradora antes de permitir
 * cualquier operación que modifique Firestore.
 *
 * La web sigue siendo pública para lectura y navegación.
 * La seguridad real también debe reforzarse con reglas de Firestore.
 *
 * @returns {Promise<firebase.User|null>}
 */
async function requireAuthForWrite() {
  let user = auth.currentUser;

  // Si ya está iniciada la sesión correcta, continuar sin volver a preguntar.
  if (isAdminUser(user)) {
    return user;
  }

  // Si quedó iniciada una cuenta distinta (por ejemplo, durante pruebas),
  // cerramos esa sesión para permitir elegir la cuenta administradora.
  if (user && !isAdminUser(user)) {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("No se pudo cerrar la sesión no autorizada:", error);
    }
  }

  try {
    const result = await auth.signInWithPopup(googleProvider);
    user = result.user;

    if (!isAdminUser(user)) {
      await auth.signOut();
      alert("Esta cuenta de Google no está autorizada para modificar el inventario.");
      return null;
    }

    console.info("🔐 Administrador autenticado correctamente.");
    return user;
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
window.isAdminUser = isAdminUser;

/**
 * Botón de cierre de sesión.
 * Solo se muestra mientras haya una sesión Firebase activa.
 */
function setupAuthUi() {
  const btnLogout = document.getElementById("btnLogout");
  if (!btnLogout) return;

  auth.onAuthStateChanged((user) => {
    btnLogout.classList.toggle("hidden", !user);
  });

  btnLogout.addEventListener("click", async () => {
    try {
      await auth.signOut();
      alert("Sesión cerrada correctamente.");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      alert("No se pudo cerrar la sesión.");
    }
  });
}

setupAuthUi();

// 4. CONFIRMACIÓN EN CONSOLA
console.log("🔥 Firebase conectado:", app.name);

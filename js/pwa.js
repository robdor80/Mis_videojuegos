// js/pwa.js

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si el navegador soporta Service Workers
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration.scope);
                })
                .catch(error => {
                    console.log('Fallo al registrar Service Worker:', error);
                });
        });
    }
});
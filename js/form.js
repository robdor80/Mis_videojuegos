// js/form.js

document.addEventListener('DOMContentLoaded', () => {
    initFormLogic();
});

function initFormLogic() {
    const ubicacionSelect = document.getElementById('ubicacion');
    const tipoSelect = document.getElementById('tipo');

    // Checkboxes principales
    const checkUpdates = document.getElementById('tieneUpdatesLocales');
    const checkSavegame = document.getElementById('tieneSavegame');
    const checkDlss = document.getElementById('dlss');
    const checkMods = document.getElementById('tieneMods');

    // --- 1. EVENTO: CAMBIO DE UBICACIÓN ---
    // Si es disco físico -> Mostrar opciones locales. Si es nube -> Ocultar.
    if (ubicacionSelect) {
        ubicacionSelect.addEventListener('change', () => {
            const val = ubicacionSelect.value;
            const locationFields = document.getElementById('locationFields');
            
            // IDs definidos en especificación como físicos
            const esFisico = ['hdd1', 'hdd2', 'm2'].includes(val);

            if (esFisico) {
                locationFields.classList.remove('hidden');
            } else {
                locationFields.classList.add('hidden');
                // Resetear valores para limpieza
                if(checkUpdates) checkUpdates.checked = false;
                if(checkSavegame) checkSavegame.checked = false;
                toggleSubField('subFieldUpdates', false);
                toggleSubField('subFieldSavegame', false);
            }
        });
    }

    // --- 2. EVENTO: CAMBIO DE TIPO ---
    // Si es videojuego -> Mostrar DLSS/Mods. Si es programa -> Ocultar.
    if (tipoSelect) {
        tipoSelect.addEventListener('change', () => {
            const val = tipoSelect.value;
            const typeFields = document.getElementById('typeFields');

            if (val === 'videojuego') {
                typeFields.classList.remove('hidden');
            } else {
                typeFields.classList.add('hidden');
                // Resetear valores
                if(checkDlss) checkDlss.checked = false;
                if(checkMods) checkMods.checked = false;
                toggleSubField('subFieldDlss', false);
                toggleSubField('subFieldMods', false);
            }
        });
    }

    // --- 3. EVENTOS: CHECKBOXES (Mostrar sub-campos) ---
    setupCheckboxToggle(checkUpdates, 'subFieldUpdates');
    setupCheckboxToggle(checkSavegame, 'subFieldSavegame');
    setupCheckboxToggle(checkDlss, 'subFieldDlss');
    setupCheckboxToggle(checkMods, 'subFieldMods');

    // --- 4. ESTADO INICIAL ---
    // Forzamos el evento change para que el formulario arranque con el estado correcto
    if (ubicacionSelect) ubicacionSelect.dispatchEvent(new Event('change'));
    if (tipoSelect) tipoSelect.dispatchEvent(new Event('change'));
}

// Función auxiliar para conectar checkbox con su área oculta
function setupCheckboxToggle(checkbox, targetId) {
    if(!checkbox) return;
    checkbox.addEventListener('change', () => {
        toggleSubField(targetId, checkbox.checked);
    });
}

function toggleSubField(id, shouldShow) {
    const el = document.getElementById(id);
    if (!el) return;
    
    if (shouldShow) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}
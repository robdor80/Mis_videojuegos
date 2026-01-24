// js/form.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Iniciar lógica visual (mostrar/ocultar campos)
    initFormLogic();
    
    // 2. Iniciar lógica de guardado
    setupFormSubmit();
});

// --- PARTE 1: LÓGICA VISUAL (Ya la tenías) ---
function initFormLogic() {
    const ubicacionSelect = document.getElementById('ubicacion');
    const tipoSelect = document.getElementById('tipo');

    // Checkboxes principales
    const checkUpdates = document.getElementById('tieneUpdatesLocales');
    const checkSavegame = document.getElementById('tieneSavegame');
    const checkDlss = document.getElementById('dlss');
    const checkMods = document.getElementById('tieneMods');

    // EVENTO: CAMBIO DE UBICACIÓN
    if (ubicacionSelect) {
        ubicacionSelect.addEventListener('change', () => {
            const val = ubicacionSelect.value;
            const locationFields = document.getElementById('locationFields');
            const esFisico = ['hdd1', 'hdd2', 'm2'].includes(val);

            if (esFisico) {
                locationFields.classList.remove('hidden');
            } else {
                locationFields.classList.add('hidden');
                // Limpiar checkboxes visualmente
                if(checkUpdates) checkUpdates.checked = false;
                if(checkSavegame) checkSavegame.checked = false;
                toggleSubField('subFieldUpdates', false);
                toggleSubField('subFieldSavegame', false);
            }
        });
    }

    // EVENTO: CAMBIO DE TIPO
    if (tipoSelect) {
        tipoSelect.addEventListener('change', () => {
            const val = tipoSelect.value;
            const typeFields = document.getElementById('typeFields');

            if (val === 'videojuego') {
                typeFields.classList.remove('hidden');
            } else {
                typeFields.classList.add('hidden');
                // Limpiar checkboxes visualmente
                if(checkDlss) checkDlss.checked = false;
                if(checkMods) checkMods.checked = false;
                toggleSubField('subFieldDlss', false);
                toggleSubField('subFieldMods', false);
            }
        });
    }

    // EVENTOS: CHECKBOXES
    setupCheckboxToggle(checkUpdates, 'subFieldUpdates');
    setupCheckboxToggle(checkSavegame, 'subFieldSavegame');
    setupCheckboxToggle(checkDlss, 'subFieldDlss');
    setupCheckboxToggle(checkMods, 'subFieldMods');

    // ESTADO INICIAL
    if (ubicacionSelect) ubicacionSelect.dispatchEvent(new Event('change'));
    if (tipoSelect) tipoSelect.dispatchEvent(new Event('change'));
}

function setupCheckboxToggle(checkbox, targetId) {
    if(!checkbox) return;
    checkbox.addEventListener('change', () => {
        toggleSubField(targetId, checkbox.checked);
    });
}

function toggleSubField(id, shouldShow) {
    const el = document.getElementById(id);
    if (!el) return;
    if (shouldShow) el.classList.remove('hidden');
    else el.classList.add('hidden');
}


// --- PARTE 2: LÓGICA DE GUARDADO (NUEVO) ---
function setupFormSubmit() {
    const form = document.getElementById('gameForm');
    
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        // 1. Recoger datos básicos
        const nombre = document.getElementById('nombre').value;
        const tipo = document.getElementById('tipo').value;
        const ubicacion = document.getElementById('ubicacion').value;
        const tamano = parseFloat(document.getElementById('tamano').value);
        const descripcion = document.getElementById('descripcion').value;
        const imagenUrl = document.getElementById('imagenUrl').value;

        // Objeto base
        let nuevoItem = {
            nombre: nombre,
            tipo: tipo,
            ubicacion: ubicacion,
            tamano: tamano,
            descripcion: descripcion,
            imagenUrl: imagenUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp() // Fecha automática
        };

        // 2. Añadir datos condicionales (Solo si corresponden)
        
        // A) Si es Disco Físico (HDD/M2)
        if (['hdd1', 'hdd2', 'm2'].includes(ubicacion)) {
            const checkUpdates = document.getElementById('tieneUpdatesLocales');
            const checkSavegame = document.getElementById('tieneSavegame');

            if (checkUpdates && checkUpdates.checked) {
                nuevoItem.tieneUpdatesLocales = true;
                nuevoItem.tamanoUpdates = parseFloat(document.getElementById('tamanoUpdates').value) || 0;
            }

            if (checkSavegame && checkSavegame.checked) {
                nuevoItem.tieneSavegame = true;
                nuevoItem.savegameNotas = document.getElementById('savegameNotas').value;
            }
        }

        // B) Si es Videojuego
        if (tipo === 'videojuego') {
            const checkDlss = document.getElementById('dlss');
            const checkMods = document.getElementById('tieneMods');

            if (checkDlss && checkDlss.checked) {
                nuevoItem.dlss = true;
                nuevoItem.dlssVersion = document.getElementById('dlssVersion').value;
            }

            if (checkMods && checkMods.checked) {
                nuevoItem.tieneMods = true;
                nuevoItem.tamanoMods = parseFloat(document.getElementById('tamanoMods').value) || 0;
                nuevoItem.modsDescripcion = document.getElementById('modsDescripcion').value;
            }
        }

        // 3. ENVIAR A FIRESTORE
        try {
            const btn = form.querySelector('button[type="submit"]');
            const textoOriginal = btn.innerText;
            btn.innerText = "Guardando...";
            btn.disabled = true;

            // Guardamos en la colección "inventario"
            await db.collection("inventario").add(nuevoItem);

            // 4. ÉXITO
            alert("¡Guardado correctamente!");
            form.reset(); // Limpiar formulario
            
            // Cerrar modal
            document.getElementById('formModal').classList.remove('active');
            
            // Restaurar botón
            btn.innerText = textoOriginal;
            btn.disabled = false;
            
            // Resetear lógica visual (ocultar campos extra)
            initFormLogic();

        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al guardar: " + error.message);
            
            const btn = form.querySelector('button[type="submit"]');
            btn.innerText = "Guardar";
            btn.disabled = false;
        }
    });
}
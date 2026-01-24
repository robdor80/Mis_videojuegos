// js/form.js

document.addEventListener('DOMContentLoaded', () => {
    initFormLogic();
    setupFormSubmit();
});

// --- LÓGICA VISUAL (Mostrar/Ocultar campos) ---
function initFormLogic() {
    const ubicacionSelect = document.getElementById('ubicacion');
    const tipoSelect = document.getElementById('tipo');

    if (ubicacionSelect) {
        ubicacionSelect.addEventListener('change', () => {
            const val = ubicacionSelect.value;
            const fields = document.getElementById('locationFields');
            const esFisico = ['hdd1', 'hdd2', 'm2'].includes(val);
            
            if (esFisico) fields.classList.remove('hidden');
            else {
                fields.classList.add('hidden');
                // No limpiamos valores por si es edición y cambian de disco
            }
        });
    }

    if (tipoSelect) {
        tipoSelect.addEventListener('change', () => {
            const val = tipoSelect.value;
            const fields = document.getElementById('typeFields');
            
            if (val === 'videojuego') fields.classList.remove('hidden');
            else fields.classList.add('hidden');
        });
    }

    // Checkboxes
    ['tieneUpdatesLocales', 'tieneSavegame', 'dlss', 'tieneMods'].forEach(id => {
        const check = document.getElementById(id);
        const subId = 'subField' + id.charAt(0).toUpperCase() + id.slice(1).replace('tiene','').replace('Locales',''); 
        // mapeo manual rápido:
        // tieneUpdatesLocales -> subFieldUpdates
        // tieneSavegame -> subFieldSavegame
        // dlss -> subFieldDlss
        // tieneMods -> subFieldMods
        
        // Corrección de IDs manual para evitar líos de strings
        const map = {
            'tieneUpdatesLocales': 'subFieldUpdates',
            'tieneSavegame': 'subFieldSavegame',
            'dlss': 'subFieldDlss',
            'tieneMods': 'subFieldMods'
        };

        if(check) {
            check.addEventListener('change', () => {
                const target = document.getElementById(map[id]);
                if(target) {
                    if(check.checked) target.classList.remove('hidden');
                    else target.classList.add('hidden');
                }
            });
        }
    });
}

// --- LIMPIAR FORMULARIO (Modo Crear) ---
function resetForm() {
    document.getElementById('gameForm').reset();
    document.getElementById('docId').value = ""; // Importante: vaciar ID
    document.getElementById('formTitle').innerText = "Añadir Nuevo Título";
    
    // Resetear visibilidad forzando eventos
    document.getElementById('ubicacion').dispatchEvent(new Event('change'));
    document.getElementById('tipo').dispatchEvent(new Event('change'));
    
    // Ocultar subs manualmente
    document.querySelectorAll('.sub-field').forEach(el => el.classList.add('hidden'));
}

// --- CARGAR DATOS PARA EDITAR (Modo Edición) ---
// Esta función se llama desde ui.js al pulsar "Editar"
function openEditForm(docId, data) {
    const formModal = document.getElementById('formModal');
    document.getElementById('formTitle').innerText = "Editar: " + data.nombre;
    document.getElementById('docId').value = docId;

    // Rellenar básicos
    document.getElementById('nombre').value = data.nombre;
    document.getElementById('tipo').value = data.tipo;
    document.getElementById('ubicacion').value = data.ubicacion;
    document.getElementById('tamano').value = data.tamano;
    document.getElementById('descripcion').value = data.descripcion || '';
    document.getElementById('imagenUrl').value = data.imagenUrl || '';

    // Disparar cambios para mostrar secciones condicionales
    document.getElementById('tipo').dispatchEvent(new Event('change'));
    document.getElementById('ubicacion').dispatchEvent(new Event('change'));

    // Rellenar Checkboxes y Subcampos
    setCheckAndFill('tieneUpdatesLocales', 'subFieldUpdates', data.tieneUpdatesLocales, 
        () => document.getElementById('tamanoUpdates').value = data.tamanoUpdates || '');

    setCheckAndFill('tieneSavegame', 'subFieldSavegame', data.tieneSavegame,
        () => document.getElementById('savegameNotas').value = data.savegameNotas || '');

    setCheckAndFill('dlss', 'subFieldDlss', data.dlss,
        () => document.getElementById('dlssVersion').value = data.dlssVersion || '');

    setCheckAndFill('tieneMods', 'subFieldMods', data.tieneMods,
        () => {
            document.getElementById('tamanoMods').value = data.tamanoMods || '';
            document.getElementById('modsDescripcion').value = data.modsDescripcion || '';
        });

    formModal.classList.add('active');
}

// Helper para rellenar checkboxes y mostrar su área
function setCheckAndFill(checkId, subId, isChecked, fillFn) {
    const chk = document.getElementById(checkId);
    chk.checked = !!isChecked;
    if(isChecked) {
        document.getElementById(subId).classList.remove('hidden');
        fillFn();
    } else {
        document.getElementById(subId).classList.add('hidden');
    }
}


// --- GUARDAR (CREAR O ACTUALIZAR) ---
function setupFormSubmit() {
    const form = document.getElementById('gameForm');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Recoger datos
        const docId = document.getElementById('docId').value; // Si tiene valor, es EDICIÓN
        
        const item = {
            nombre: document.getElementById('nombre').value,
            tipo: document.getElementById('tipo').value,
            ubicacion: document.getElementById('ubicacion').value,
            tamano: parseFloat(document.getElementById('tamano').value) || 0,
            descripcion: document.getElementById('descripcion').value,
            imagenUrl: document.getElementById('imagenUrl').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() // Fecha actualización
        };

        if(!docId) {
            // Solo si es nuevo ponemos fecha creación
            item.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        }

        // Condicionales físicos
        if(['hdd1','hdd2','m2'].includes(item.ubicacion)) {
            if(document.getElementById('tieneUpdatesLocales').checked) {
                item.tieneUpdatesLocales = true;
                item.tamanoUpdates = parseFloat(document.getElementById('tamanoUpdates').value) || 0;
            } else {
                item.tieneUpdatesLocales = false;
                item.tamanoUpdates = 0;
            }

            if(document.getElementById('tieneSavegame').checked) {
                item.tieneSavegame = true;
                item.savegameNotas = document.getElementById('savegameNotas').value;
            } else {
                item.tieneSavegame = false;
                item.savegameNotas = "";
            }
        }

        // Condicionales Videojuego
        if(item.tipo === 'videojuego') {
            if(document.getElementById('dlss').checked) {
                item.dlss = true;
                item.dlssVersion = document.getElementById('dlssVersion').value;
            } else {
                item.dlss = false;
                item.dlssVersion = "";
            }

            if(document.getElementById('tieneMods').checked) {
                item.tieneMods = true;
                item.tamanoMods = parseFloat(document.getElementById('tamanoMods').value) || 0;
                item.modsDescripcion = document.getElementById('modsDescripcion').value;
            } else {
                item.tieneMods = false;
                item.tamanoMods = 0;
                item.modsDescripcion = "";
            }
        }

        // ENVIAR A FIRESTORE
        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true; 
            btn.innerText = "Guardando...";

            if (docId) {
                // UPDATE
                await db.collection("inventario").doc(docId).update(item);
                alert("¡Juego actualizado correctamente!");
            } else {
                // CREATE
                await db.collection("inventario").add(item);
                alert("¡Juego añadido correctamente!");
            }

            // Cerrar y limpiar
            document.getElementById('formModal').classList.remove('active');
            resetForm();
            btn.disabled = false;
            btn.innerText = "Guardar Datos";
            
            // Si estábamos en una ubicación, refrescar
            const gamesSec = document.getElementById('gamesSection');
            if(!gamesSec.classList.contains('hidden')) {
                // Truco sucio para refrescar: simular click en volver y luego... 
                // Mejor: simplemente volver al dashboard para forzar recarga al entrar de nuevo
                // O recargar página. Para SPA simple, volver al dashboard es seguro.
                document.getElementById('btnBack').click();
                updateDiskSpace();
            } else {
                updateDiskSpace();
            }

        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = false;
            btn.innerText = "Guardar Datos";
        }
    });
}
// js/form.js

document.addEventListener('DOMContentLoaded', () => {
    populateLocationSelect();
    initFormLogic();
    setupFormSubmit();
});

// --- LÓGICA VISUAL ---
function initFormLogic() {
    const ubicacionSelect = document.getElementById('ubicacion');
    const tipoSelect = document.getElementById('tipo');

    if (ubicacionSelect) {
        ubicacionSelect.addEventListener('change', () => {
            const val = ubicacionSelect.value;
            const fields = document.getElementById('locationFields');
            const esFisico = getPhysicalLocationIds().includes(val);
            if (esFisico) fields.classList.remove('hidden');
            else fields.classList.add('hidden');
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

    const map = {
        'tieneUpdatesLocales': 'subFieldUpdates',
        'tieneSavegame': 'subFieldSavegame',
        'dlss': 'subFieldDlss',
        'tieneMods': 'subFieldMods'
    };
    Object.keys(map).forEach(id => {
        const check = document.getElementById(id);
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

// --- RESETEAR ---
function resetForm() {
    document.getElementById('gameForm').reset();
    document.getElementById('docId').value = ""; 
    document.getElementById('formTitle').innerText = "Añadir Nuevo Título";
    populateLocationSelect();
    document.getElementById('ubicacion').dispatchEvent(new Event('change'));
    document.getElementById('tipo').dispatchEvent(new Event('change'));
    document.querySelectorAll('.sub-field').forEach(el => el.classList.add('hidden'));
}

function populateLocationSelect(selectedValue = '') {
    const select = document.getElementById('ubicacion');
    if(!select || typeof locationsData === 'undefined') return;

    const currentValue = selectedValue || select.value;
    select.innerHTML = '';

    locationsData.forEach(location => {
        const option = document.createElement('option');
        option.value = location.id;
        option.textContent = location.nombre;
        select.appendChild(option);
    });

    if(currentValue && locationsData.some(location => location.id === currentValue)) {
        select.value = currentValue;
    }
}

window.populateLocationSelect = populateLocationSelect;

// --- CARGAR EDICIÓN ---
function openEditForm(docId, data) {
    const formModal = document.getElementById('formModal');
    document.getElementById('formTitle').innerText = "Editar: " + data.nombre;
    document.getElementById('docId').value = docId;

    document.getElementById('nombre').value = data.nombre;
    document.getElementById('tipo').value = data.tipo;
    populateLocationSelect(data.ubicacion);
    document.getElementById('ubicacion').value = data.ubicacion;
    document.getElementById('tamano').value = data.tamano;
    document.getElementById('descripcion').value = data.descripcion || '';
    document.getElementById('imagenUrl').value = data.imagenUrl || '';

    document.getElementById('tipo').dispatchEvent(new Event('change'));
    document.getElementById('ubicacion').dispatchEvent(new Event('change'));

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

function setCheckAndFill(checkId, subId, isChecked, fillFn) {
    const chk = document.getElementById(checkId);
    if (!chk) return;
    chk.checked = !!isChecked;
    if(isChecked) {
        document.getElementById(subId).classList.remove('hidden');
        if(fillFn) fillFn();
    } else {
        document.getElementById(subId).classList.add('hidden');
    }
}

// --- GUARDAR Y MANTENER PANTALLA ---
function setupFormSubmit() {
    const form = document.getElementById('gameForm');
    if(!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = document.getElementById('docId').value;
        
        const item = {
            nombre: document.getElementById('nombre').value,
            tipo: document.getElementById('tipo').value,
            ubicacion: document.getElementById('ubicacion').value,
            tamano: parseFloat(document.getElementById('tamano').value) || 0,
            descripcion: document.getElementById('descripcion').value,
            imagenUrl: document.getElementById('imagenUrl').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if(!docId) item.createdAt = firebase.firestore.FieldValue.serverTimestamp();

        // Lógica Físicos
        if(getPhysicalLocationIds().includes(item.ubicacion)) {
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
        } else {
            item.tieneUpdatesLocales = false; item.tamanoUpdates = 0; item.tieneSavegame = false; item.savegameNotas = "";
        }

        // Lógica Videojuego
        if(item.tipo === 'videojuego') {
            if(document.getElementById('dlss').checked) {
                item.dlss = true;
                item.dlssVersion = document.getElementById('dlssVersion').value;
            } else {
                item.dlss = false; item.dlssVersion = "";
            }
            if(document.getElementById('tieneMods').checked) {
                item.tieneMods = true;
                item.tamanoMods = parseFloat(document.getElementById('tamanoMods').value) || 0;
                item.modsDescripcion = document.getElementById('modsDescripcion').value;
            } else {
                item.tieneMods = false; item.tamanoMods = 0; item.modsDescripcion = "";
            }
        } else {
            item.dlss = false; item.tieneMods = false; item.tamanoMods = 0;
        }

        // GUARDADO EN FIREBASE
        try {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true; 
            btn.innerText = "Guardando...";

            if (docId) {
                await db.collection("inventario").doc(docId).update(item);
                alert("¡Juego actualizado!");
            } else {
                await db.collection("inventario").add(item);
                alert("¡Añadido correctamente!");
            }

            document.getElementById('formModal').classList.remove('active');
            resetForm();
            btn.disabled = false;
            btn.innerText = "Guardar Datos";
            
            // --- AQUÍ ESTÁ LA MAGIA ---
            // Llamamos a la función de ui.js para recargar la vista donde estés
            if (window.refreshCurrentView) {
                window.refreshCurrentView();
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

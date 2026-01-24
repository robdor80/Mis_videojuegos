// js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    updateDiskSpace();
    setupModalEvents();
    
    // Botón volver
    const btnBack = document.getElementById('btnBack');
    if(btnBack) btnBack.addEventListener('click', goBackToDashboard);

    // Botón Editar dentro del modal de detalle
    const btnEdit = document.getElementById('btnEditGame');
    if(btnEdit) {
        btnEdit.addEventListener('click', () => {
            // "currentGameData" y "currentGameId" son variables globales temporales que definiremos abajo
            if(window.currentGameId && window.currentGameData) {
                // Cerrar modal detalle
                document.getElementById('detailModal').classList.remove('active');
                // Abrir modal formulario cargado
                openEditForm(window.currentGameId, window.currentGameData);
            }
        });
    }
});

// --- RENDERIZADO DEL DASHBOARD ---
function renderDashboard() {
    const container = document.getElementById('locationsContainer');
    if(!container) return;
    container.innerHTML = '';

    locationsData.forEach(loc => {
        let espacioHtml = '';
        if(loc.tipo === 'disk') {
            espacioHtml = `
                <div class="space-bar-container">
                    <div id="bar-${loc.id}" class="space-bar-fill" style="width: 0%"></div>
                </div>
                <small id="text-${loc.id}" style="color: #aaa; display:flex; justify-content:space-between;">
                    <span>Calculando...</span><span>Total: ${loc.capacidad} GB</span>
                </small>
            `;
        } else {
            espacioHtml = `<small style="color: #666">Nube / Librería Virtual</small>`;
        }

        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => openLocation(loc);
        card.innerHTML = `
            <div class="card-image-box"><img src="${loc.img}" alt="${loc.nombre}"></div>
            <div class="card-info"><h3>${loc.nombre}</h3>${espacioHtml}</div>
        `;
        container.appendChild(card);
    });
}

// --- CÁLCULO DE ESPACIO ---
async function updateDiskSpace() {
    try {
        const snapshot = await db.collection("inventario").get();
        let usage = {};
        locationsData.forEach(l => { if(l.tipo === 'disk') usage[l.id] = 0; });

        snapshot.forEach(doc => {
            const d = doc.data();
            if(usage.hasOwnProperty(d.ubicacion)) {
                let total = (d.tamano || 0) + (d.tamanoUpdates || 0) + (d.tamanoMods || 0);
                usage[d.ubicacion] += total;
            }
        });

        locationsData.forEach(l => {
            if(l.tipo === 'disk') {
                const used = usage[l.id];
                const free = l.capacidad - used;
                const percent = (used / l.capacidad) * 100;
                const bar = document.getElementById(`bar-${l.id}`);
                const txt = document.getElementById(`text-${l.id}`);
                
                if(bar && txt) {
                    let color = "#03dac6";
                    if(percent > 75) color = "#ffb74d";
                    if(percent > 90) color = "#cf6679";
                    
                    bar.style.width = `${percent}%`;
                    bar.style.backgroundColor = color;
                    txt.innerHTML = `<span style="color:${color};font-weight:bold">Libre: ${free.toFixed(1)} GB</span><span>Total: ${l.capacidad} GB</span>`;
                }
            }
        });
    } catch (e) { console.error(e); }
}

// --- ABRIR UBICACIÓN Y SEPARAR POR CATEGORÍA ---
async function openLocation(loc) {
    document.getElementById('locationsSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.remove('hidden');
    document.getElementById('currentLocationTitle').innerText = loc.nombre;
    
    const contentDiv = document.getElementById('gamesContent');
    contentDiv.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Cargando inventario...</p>';

    try {
        const snapshot = await db.collection("inventario").where("ubicacion", "==", loc.id).get();
        contentDiv.innerHTML = '';

        if(snapshot.empty) {
            contentDiv.innerHTML = '<p style="text-align:center;color:#666">No hay elementos aquí.</p>';
            return;
        }

        // SEPARAR RESULTADOS
        const videojuegos = [];
        const programas = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = createGameCard(data, doc.id); // Pasamos ID para editar luego
            
            if(data.tipo === 'programa') programas.push(card);
            else videojuegos.push(card);
        });

        // 1. RENDERIZAR VIDEOJUEGOS
        if(videojuegos.length > 0) {
            const header = document.createElement('h3');
            header.className = 'category-header';
            header.innerText = 'Videojuegos';
            contentDiv.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'games-grid';
            videojuegos.forEach(c => grid.appendChild(c));
            contentDiv.appendChild(grid);
        }

        // 2. RENDERIZAR PROGRAMAS
        if(programas.length > 0) {
            const header = document.createElement('h3');
            header.className = 'category-header';
            header.innerText = 'Programas / Software';
            contentDiv.appendChild(header);

            const grid = document.createElement('div');
            grid.className = 'games-grid';
            programas.forEach(c => grid.appendChild(c));
            contentDiv.appendChild(grid);
        }

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    }
}

// --- CREAR TARJETA Y EVENTO DETALLE ---
function createGameCard(data, docId) {
    const div = document.createElement('div');
    div.className = 'game-card';
    
    let total = (data.tamano || 0) + (data.tamanoUpdates || 0) + (data.tamanoMods || 0);
    let badges = '';
    if(data.dlss) badges += `<span class="badge-dlss">DLSS ${data.dlssVersion||''}</span> `;
    if(data.tieneMods) badges += `<span class="badge-mods">MODS</span>`;

    const imgUrl = data.imagenUrl || 'assets/no-image.jpg';

    div.innerHTML = `
        <img src="${imgUrl}" class="game-cover" onerror="this.src='https://via.placeholder.com/200x300?text=Error'">
        <div class="game-info-overlay">
            <div class="game-title">${data.nombre}</div>
            <div class="game-meta"><span>${total.toFixed(1)} GB</span><span>${badges}</span></div>
        </div>
    `;

    // AL CLICK -> ABRIR DETALLE (NO EDITAR DIRECTAMENTE)
    div.onclick = () => openDetailModal(docId, data);

    return div;
}

// --- ABRIR MODAL DETALLE ---
function openDetailModal(docId, data) {
    // Guardamos en variables globales para usarlas al pulsar "Editar"
    window.currentGameId = docId;
    window.currentGameData = data;

    // Rellenar datos
    document.getElementById('detailImg').src = data.imagenUrl || '';
    document.getElementById('detailTitle').innerText = data.nombre;
    document.getElementById('detailDesc').innerText = data.descripcion || "Sin comentarios/notas.";
    
    const locName = locationsData.find(l => l.id === data.ubicacion)?.nombre || data.ubicacion;
    document.getElementById('detailLoc').innerText = locName;

    let total = (data.tamano || 0) + (data.tamanoUpdates || 0) + (data.tamanoMods || 0);
    document.getElementById('detailSize').innerText = total.toFixed(2);

    // Extra info
    const extraDiv = document.getElementById('detailExtra');
    extraDiv.innerHTML = '';
    if(data.tieneMods) extraDiv.innerHTML += `<p>• Mods: ${data.modsDescripcion}</p>`;
    if(data.tieneSavegame) extraDiv.innerHTML += `<p>• Savegame: ${data.savegameNotas}</p>`;
    
    extraDiv.className = (extraDiv.innerHTML === '') ? 'detail-extra-box hidden' : 'detail-extra-box';

    // Mostrar modal
    document.getElementById('detailModal').classList.add('active');
}

// --- NAVEGACIÓN ---
function goBackToDashboard() {
    document.getElementById('gamesSection').classList.add('hidden');
    document.getElementById('locationsSection').classList.remove('hidden');
    updateDiskSpace(); 
}

// --- EVENTOS MODALES ---
function setupModalEvents() {
    // Formulario (Añadir)
    const formModal = document.getElementById('formModal');
    const btnAdd = document.getElementById('btnAddGame');
    const closeForm = document.querySelector('.close-form-modal');

    if(btnAdd) btnAdd.addEventListener('click', () => {
        // Al dar al más, es ALTA NUEVA -> Limpiamos form
        resetForm();
        formModal.classList.add('active');
    });

    if(closeForm) closeForm.addEventListener('click', () => formModal.classList.remove('active'));

    // Detalle
    const detailModal = document.getElementById('detailModal');
    const closeDetail = document.querySelector('.close-detail-modal');
    if(closeDetail) closeDetail.addEventListener('click', () => detailModal.classList.remove('active'));
    
    // Cerrar con fondo
    window.addEventListener('click', (e) => {
        if(e.target === formModal) formModal.classList.remove('active');
        if(e.target === detailModal) detailModal.classList.remove('active');
    });
}
// js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    updateDiskSpace();
    setupModalEvents();
    setupSearch();

    // NUEVO: El botón "Home" del header ahora usa la navegación rápida
    const btnHome = document.getElementById('btnHome');
    if(btnHome) {
        btnHome.addEventListener('click', goBackToDashboard);
    }

    // (El listener de btnBack lo he borrado porque el botón ya no existe)

    // Botón Editar dentro del modal de detalle
    const btnEdit = document.getElementById('btnEditGame');
    if(btnEdit) {
        btnEdit.addEventListener('click', () => {
            if(window.currentGameId && window.currentGameData) {
                document.getElementById('detailModal').classList.remove('active');
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

// --- LÓGICA DE BÚSQUEDA ---
function setupSearch() {
    const input = document.getElementById('searchInput');
    const btn = document.getElementById('btnSearch');

    if(!input || !btn) return;

    btn.addEventListener('click', () => performSearch(input.value));
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') performSearch(input.value);
    });
}

function cleanText(text) {
    if (!text) return "";
    return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function performSearch(query) {
    const term = cleanText(query);
    
    if (term === '') {
        goBackToDashboard();
        return;
    }

    // Vista de resultados
    document.getElementById('locationsSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.remove('hidden');
    
    document.getElementById('currentLocationTitle').innerText = `Resultados: "${query}"`;
    
    const contentDiv = document.getElementById('gamesContent');
    contentDiv.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Buscando...</p>';

    try {
        const snapshot = await db.collection("inventario").get();
        
        if(snapshot.empty) {
            contentDiv.innerHTML = '<p style="text-align:center;color:#666">Inventario vacío.</p>';
            return;
        }

        const resultados = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.nombre) {
                const nombreJuego = cleanText(data.nombre);
                if (nombreJuego.includes(term)) {
                    resultados.push({ id: doc.id, data: data });
                }
            }
        });

        contentDiv.innerHTML = '';

        if (resultados.length === 0) {
            contentDiv.innerHTML = `<p style="text-align:center;color:#888; margin-top:20px;">No se encontraron juegos con "${query}".</p>`;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'games-grid';
        
        resultados.forEach(item => {
            const card = createGameCard(item.data, item.id);
            grid.appendChild(card);
        });
        
        contentDiv.appendChild(grid);

    } catch (error) {
        console.error("Error en búsqueda:", error);
        contentDiv.innerHTML = `<p style="color:red">Error al buscar: ${error.message}</p>`;
    }
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

// --- ABRIR UBICACIÓN ---
async function openLocation(loc) {
    document.getElementById('locationsSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.remove('hidden');
    document.getElementById('currentLocationTitle').innerText = loc.nombre;
    document.getElementById('searchInput').value = ''; 
    
    const contentDiv = document.getElementById('gamesContent');
    contentDiv.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Cargando inventario...</p>';

    try {
        const snapshot = await db.collection("inventario").where("ubicacion", "==", loc.id).get();
        contentDiv.innerHTML = '';

        if(snapshot.empty) {
            contentDiv.innerHTML = '<p style="text-align:center;color:#666">No hay elementos aquí.</p>';
            return;
        }

        const videojuegos = [];
        const programas = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = createGameCard(data, doc.id);
            if(data.tipo === 'programa') programas.push(card);
            else videojuegos.push(card);
        });

        if(videojuegos.length > 0) {
            const h = document.createElement('h3'); h.className='category-header'; h.innerText='Videojuegos';
            contentDiv.appendChild(h);
            const g = document.createElement('div'); g.className='games-grid';
            videojuegos.forEach(c => g.appendChild(c)); contentDiv.appendChild(g);
        }

        if(programas.length > 0) {
            const h = document.createElement('h3'); h.className='category-header'; h.innerText='Programas / Software';
            contentDiv.appendChild(h);
            const g = document.createElement('div'); g.className='games-grid';
            programas.forEach(c => g.appendChild(c)); contentDiv.appendChild(g);
        }

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<p style="color:red">Error: ${error.message}</p>`;
    }
}

// --- CREAR TARJETA ---
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

    div.onclick = () => openDetailModal(docId, data);
    return div;
}

// --- DETALLE MODAL ---
function openDetailModal(docId, data) {
    window.currentGameId = docId;
    window.currentGameData = data;

    document.getElementById('detailImg').src = data.imagenUrl || '';
    document.getElementById('detailTitle').innerText = data.nombre;
    document.getElementById('detailDesc').innerText = data.descripcion || "Sin comentarios/notas.";
    
    const locObj = locationsData.find(l => l.id === data.ubicacion);
    const locName = locObj ? locObj.nombre : data.ubicacion;
    document.getElementById('detailLoc').innerText = locName;

    let total = (data.tamano || 0) + (data.tamanoUpdates || 0) + (data.tamanoMods || 0);
    document.getElementById('detailSize').innerText = total.toFixed(2);

    const extraDiv = document.getElementById('detailExtra');
    extraDiv.innerHTML = '';
    if(data.tieneMods) extraDiv.innerHTML += `<p>• Mods: ${data.modsDescripcion}</p>`;
    if(data.tieneSavegame) extraDiv.innerHTML += `<p>• Savegame: ${data.savegameNotas}</p>`;
    
    extraDiv.className = (extraDiv.innerHTML === '') ? 'detail-extra-box hidden' : 'detail-extra-box';
    document.getElementById('detailModal').classList.add('active');
}

// --- NAVEGACIÓN (VOLVER AL DASHBOARD) ---
function goBackToDashboard() {
    document.getElementById('gamesSection').classList.add('hidden');
    document.getElementById('locationsSection').classList.remove('hidden');
    document.getElementById('searchInput').value = ''; 
    updateDiskSpace(); 
}

// --- EVENTOS MODALES ---
function setupModalEvents() {
    const formModal = document.getElementById('formModal');
    const btnAdd = document.getElementById('btnAddGame');
    const closeForm = document.querySelector('.close-form-modal');

    if(btnAdd) btnAdd.addEventListener('click', () => {
        document.getElementById('gameForm').reset();
        document.getElementById('docId').value = "";
        document.getElementById('formTitle').innerText = "Añadir Nuevo Título";
        document.getElementById('ubicacion').dispatchEvent(new Event('change'));
        document.getElementById('tipo').dispatchEvent(new Event('change'));
        document.querySelectorAll('.sub-field').forEach(el => el.classList.add('hidden'));

        formModal.classList.add('active');
    });

    if(closeForm) closeForm.addEventListener('click', () => formModal.classList.remove('active'));

    const detailModal = document.getElementById('detailModal');
    const closeDetail = document.querySelector('.close-detail-modal');
    if(closeDetail) closeDetail.addEventListener('click', () => detailModal.classList.remove('active'));
    
    window.addEventListener('click', (e) => {
        if(e.target === formModal) formModal.classList.remove('active');
        if(e.target === detailModal) detailModal.classList.remove('active');
    });
}
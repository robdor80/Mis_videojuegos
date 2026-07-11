// js/ui.js

// ESTADO GLOBAL DE LA APP
window.appState = {
    view: 'dashboard', 
    data: null         
};

const FALLBACK_COVER_URL = 'https://via.placeholder.com/200x300?text=Sin+imagen';

document.addEventListener('DOMContentLoaded', async () => {
    await loadLocationsData();
    if (window.populateLocationSelect) window.populateLocationSelect();

    renderDashboard();
    updateDiskSpace();
    setupModalEvents();
    setupLocationEvents();
    setupSearch();
    setupScrollTop();

    // Eventos de botones
    const btnHome = document.getElementById('btnHome');
    if(btnHome) btnHome.addEventListener('click', goBackToDashboard);

    const btnAll = document.getElementById('btnShowAll');
    if(btnAll) btnAll.addEventListener('click', showAllInventory);

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
    window.appState = { view: 'dashboard', data: null };

    const container = document.getElementById('locationsContainer');
    if(!container) return;
    container.innerHTML = '';

    locationsData.forEach(loc => {
        let espacioHtml = '';
        if(loc.tipo === 'disk') {
            espacioHtml = `
                <div class="space-bar-container">
                    <div id="bar-${escapeHtml(loc.id)}" class="space-bar-fill" style="width: 0%"></div>
                </div>
                <small id="text-${escapeHtml(loc.id)}" style="color: #aaa; display:flex; justify-content:space-between;">
                    <span>Calculando...</span><span>Total: ${Number(loc.capacidad).toFixed(1)} GB</span>
                </small>
            `;
        } else {
            espacioHtml = `<small style="color: #666">Nube / Librería Virtual</small>`;
        }

        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => openLocation(loc);
        card.innerHTML = `
            ${loc.custom ? `
                <div class="location-actions">
                    <button type="button" class="location-action-btn edit-location" title="Editar almacenamiento">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button type="button" class="location-action-btn delete-location" title="Eliminar almacenamiento">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            ` : ''}
            <div class="card-image-box"><img src="${escapeHtml(loc.img)}" alt="${escapeHtml(loc.nombre)}"></div>
            <div class="card-info"><h3>${escapeHtml(loc.nombre)}</h3>${espacioHtml}</div>
        `;

        const editBtn = card.querySelector('.edit-location');
        if(editBtn) {
            editBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                openLocationForm(loc);
            });
        }

        const deleteBtn = card.querySelector('.delete-location');
        if(deleteBtn) {
            deleteBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                deleteLocation(loc);
            });
        }

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

function escapeHtml(value) {
    return (value ?? '').toString().replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

async function performSearch(query) {
    const term = cleanText(query);
    if (term === '') {
        goBackToDashboard();
        return;
    }

    window.appState = { view: 'search', data: query };

    document.getElementById('locationsSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.remove('hidden');
    document.getElementById('currentLocationTitle').innerText = `Resultados: "${query}"`;
    
    const contentDiv = document.getElementById('gamesContent');
    contentDiv.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Buscando...</p>';

    try {
        const snapshot = await db.collection("inventario").get();
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
            contentDiv.innerHTML = `<p style="text-align:center;color:#888; margin-top:20px;">No se encontraron juegos con "${escapeHtml(query)}".</p>`;
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'games-grid';
        resultados.forEach(item => grid.appendChild(createGameCard(item.data, item.id)));
        contentDiv.appendChild(grid);

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<p style="color:red">Error al buscar.</p>`;
    }
}

// --- VER TODO EL INVENTARIO ---
async function showAllInventory() {
    window.appState = { view: 'all', data: null };

    document.getElementById('locationsSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.remove('hidden');
    document.getElementById('searchInput').value = ''; 
    document.getElementById('currentLocationTitle').innerText = "Inventario Completo";
    
    const contentDiv = document.getElementById('gamesContent');
    contentDiv.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Cargando toda la colección...</p>';

    try {
        const snapshot = await db.collection("inventario").orderBy("nombre").get();
        contentDiv.innerHTML = '';

        if(snapshot.empty) {
            contentDiv.innerHTML = '<p style="text-align:center;color:#666">Aún no has añadido nada.</p>';
            return;
        }

        // --- CLASIFICACIÓN EN 3 GRUPOS ---
        const videojuegos = [];
        const programas = [];
        const otros = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = createGameCard(data, doc.id);
            
            if(data.tipo === 'programa') programas.push(card);
            else if(data.tipo === 'otros') otros.push(card); // Nueva categoría
            else videojuegos.push(card); // Por defecto videojuego
        });

        // --- RENDERIZADO POR SECCIONES ---
        if(videojuegos.length > 0) {
            const h = document.createElement('h3'); h.className='category-header'; 
            h.innerText=`Videojuegos (${videojuegos.length})`;
            contentDiv.appendChild(h);
            const g = document.createElement('div'); g.className='games-grid';
            videojuegos.forEach(c => g.appendChild(c)); contentDiv.appendChild(g);
        }

        if(programas.length > 0) {
            const h = document.createElement('h3'); h.className='category-header'; 
            h.innerText=`Programas (${programas.length})`;
            contentDiv.appendChild(h);
            const g = document.createElement('div'); g.className='games-grid';
            programas.forEach(c => g.appendChild(c)); contentDiv.appendChild(g);
        }

        if(otros.length > 0) {
            const h = document.createElement('h3'); h.className='category-header'; 
            h.innerText=`Otros (${otros.length})`;
            contentDiv.appendChild(h);
            const g = document.createElement('div'); g.className='games-grid';
            otros.forEach(c => g.appendChild(c)); contentDiv.appendChild(g);
        }

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<p style="color:red">Error al cargar: ${escapeHtml(error.message)}</p>`;
    }
}

// --- ABRIR UBICACIÓN ---
async function openLocation(loc) {
    window.appState = { view: 'location', data: loc };

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

        // --- CLASIFICACIÓN EN 3 GRUPOS ---
        const videojuegos = [];
        const programas = [];
        const otros = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const card = createGameCard(data, doc.id);
            
            if(data.tipo === 'programa') programas.push(card);
            else if(data.tipo === 'otros') otros.push(card); // Nueva categoría
            else videojuegos.push(card);
        });

        // --- RENDERIZADO POR SECCIONES ---
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

        if(otros.length > 0) {
            const h = document.createElement('h3'); h.className='category-header'; h.innerText='Otros';
            contentDiv.appendChild(h);
            const g = document.createElement('div'); g.className='games-grid';
            otros.forEach(c => g.appendChild(c)); contentDiv.appendChild(g);
        }

    } catch (error) {
        console.error(error);
        contentDiv.innerHTML = `<p style="color:red">Error: ${escapeHtml(error.message)}</p>`;
    }
}

// --- CREAR TARJETA ---
function createGameCard(data, docId) {
    const div = document.createElement('div');
    div.className = 'game-card';
    
    let total = (data.tamano || 0) + (data.tamanoUpdates || 0) + (data.tamanoMods || 0);
    let badges = '';
    if(data.dlss) badges += `<span class="badge-dlss">DLSS ${escapeHtml(data.dlssVersion || '')}</span> `;
    if(data.tieneMods) badges += `<span class="badge-mods">MODS</span>`;

    const imgUrl = data.imagenUrl || FALLBACK_COVER_URL;
    div.innerHTML = `
        <img src="${escapeHtml(imgUrl)}" class="game-cover" onerror="this.onerror=null;this.src='${FALLBACK_COVER_URL}'">
        <div class="game-info-overlay">
            <div class="game-title">${escapeHtml(data.nombre)}</div>
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
    const locName = locationsData.find(l => l.id === data.ubicacion)?.nombre || data.ubicacion;
    document.getElementById('detailLoc').innerText = locName;
    let total = (data.tamano || 0) + (data.tamanoUpdates || 0) + (data.tamanoMods || 0);
    document.getElementById('detailSize').innerText = total.toFixed(2);
    
    const extraDiv = document.getElementById('detailExtra');
    extraDiv.innerHTML = '';
    if(data.tieneMods) extraDiv.innerHTML += `<p>• Mods: ${escapeHtml(data.modsDescripcion)}</p>`;
    if(data.tieneSavegame) extraDiv.innerHTML += `<p>• Savegame: ${escapeHtml(data.savegameNotas)}</p>`;
    extraDiv.className = (extraDiv.innerHTML === '') ? 'detail-extra-box hidden' : 'detail-extra-box';
    
    document.getElementById('detailModal').classList.add('active');
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
                    bar.style.width = `${Math.min(percent, 100)}%`;
                    bar.style.backgroundColor = color;
                    txt.innerHTML = `<span style="color:${color};font-weight:bold">Libre: ${free.toFixed(1)} GB</span><span>Total: ${l.capacidad} GB</span>`;
                }
            }
        });
    } catch (e) { console.error(e); }
}

// --- NAVEGACIÓN ---
function goBackToDashboard() {
    document.getElementById('gamesSection').classList.add('hidden');
    document.getElementById('locationsSection').classList.remove('hidden');
    document.getElementById('searchInput').value = ''; 
    renderDashboard();
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

    const locationModal = document.getElementById('locationModal');
    const closeLocation = document.querySelector('.close-location-modal');
    if(closeLocation) closeLocation.addEventListener('click', () => locationModal.classList.remove('active'));

    const detailModal = document.getElementById('detailModal');
    const closeDetail = document.querySelector('.close-detail-modal');
    if(closeDetail) closeDetail.addEventListener('click', () => detailModal.classList.remove('active'));
    window.addEventListener('click', (e) => {
        if(e.target === formModal) formModal.classList.remove('active');
        if(e.target === locationModal) locationModal.classList.remove('active');
        if(e.target === detailModal) detailModal.classList.remove('active');
    });
}

// --- GESTION DE UBICACIONES ---
function setupLocationEvents() {
    const btnManageLocations = document.getElementById('btnManageLocations');
    if(btnManageLocations) btnManageLocations.addEventListener('click', () => openLocationForm());

    const locationForm = document.getElementById('locationForm');
    if(locationForm) {
        locationForm.addEventListener('submit', saveLocation);
    }

    const btnDeleteLocation = document.getElementById('btnDeleteLocation');
    if(btnDeleteLocation) {
        btnDeleteLocation.addEventListener('click', () => {
            const docId = document.getElementById('locationDocId').value;
            const location = locationsData.find(loc => loc.docId === docId);
            if(location) deleteLocation(location);
        });
    }
}

function openLocationForm(location = null) {
    const locationModal = document.getElementById('locationModal');
    const deleteBtn = document.getElementById('btnDeleteLocation');

    document.getElementById('locationForm').reset();
    document.getElementById('locationDocId').value = location?.docId || '';
    document.getElementById('locationFormTitle').innerText = location ? `Editar: ${location.nombre}` : 'Añadir Almacenamiento';
    document.getElementById('locationName').value = location?.nombre || '';
    document.getElementById('locationImageUrl').value = location?.img || '';
    document.getElementById('locationCapacity').value = location?.capacidad || '';

    if(deleteBtn) deleteBtn.classList.toggle('hidden', !location);
    locationModal.classList.add('active');
}

async function saveLocation(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const docId = document.getElementById('locationDocId').value;
    const btn = form.querySelector('button[type="submit"]');
    const item = {
        nombre: document.getElementById('locationName').value.trim(),
        img: document.getElementById('locationImageUrl').value.trim(),
        capacidad: parseFloat(document.getElementById('locationCapacity').value) || 0,
        tipo: 'disk',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!item.nombre || !item.img || item.capacidad <= 0) {
        alert("Completa nombre, imagen y capacidad con valores válidos.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "Guardando...";

        if(docId) {
            await db.collection(STORAGE_LOCATIONS_COLLECTION).doc(docId).update(item);
            alert("Almacenamiento actualizado.");
        } else {
            item.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection(STORAGE_LOCATIONS_COLLECTION).add(item);
            alert("Almacenamiento añadido.");
        }

        document.getElementById('locationModal').classList.remove('active');
        form.reset();
        await reloadLocationsAndRefresh();
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Guardar Almacenamiento";
    }
}

async function deleteLocation(location) {
    if(!location?.custom) return;

    try {
        const usedSnapshot = await db.collection("inventario").where("ubicacion", "==", location.id).limit(1).get();
        if(!usedSnapshot.empty) {
            alert("No se puede eliminar porque contiene juegos o programas. Muévelos antes a otra ubicación.");
            return;
        }

        const confirmed = confirm(`¿Eliminar "${location.nombre}"?`);
        if(!confirmed) return;

        await db.collection(STORAGE_LOCATIONS_COLLECTION).doc(location.docId).delete();
        document.getElementById('locationModal').classList.remove('active');
        await reloadLocationsAndRefresh();
        alert("Almacenamiento eliminado.");
    } catch (error) {
        console.error(error);
        alert("Error: " + error.message);
    }
}

async function reloadLocationsAndRefresh() {
    await loadLocationsData();
    if (window.populateLocationSelect) window.populateLocationSelect();

    if(window.appState.view === 'location' && !locationsData.some(loc => loc.id === window.appState.data?.id)) {
        goBackToDashboard();
        return;
    }

    window.refreshCurrentView();
}

// --- FUNCIÓN INTELIGENTE PARA REFRESCAR LA VISTA ACTUAL ---
window.refreshCurrentView = function() {
    const state = window.appState;
    if (state.view === 'location' && state.data) {
        updateDiskSpace();
        openLocation(state.data);
    } else if (state.view === 'search' && state.data) {
        updateDiskSpace();
        performSearch(state.data);
    } else if (state.view === 'all') {
        updateDiskSpace();
        showAllInventory();
    } else {
        renderDashboard();
        updateDiskSpace();
    }
};

// --- BOTÓN VOLVER ARRIBA ---
function setupScrollTop() {
    const btn = document.getElementById('btnScrollTop');
    if(!btn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

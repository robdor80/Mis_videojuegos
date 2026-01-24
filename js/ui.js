// js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Renderizar Unidades en el Dashboard
    renderDashboard();

    // 2. Configurar eventos del Modal (Botón +)
    setupModalEvents();

    // 3. Configurar botón "Volver"
    const btnBack = document.getElementById('btnBack');
    if(btnBack) {
        btnBack.addEventListener('click', goBackToDashboard);
    }
});

// --- RENDERIZADO DEL DASHBOARD (UBICACIONES) ---
function renderDashboard() {
    const container = document.getElementById('locationsContainer');
    if(!container) return;
    
    container.innerHTML = '';

    locationsData.forEach(loc => {
        // Barra de espacio (Visual)
        let espacioHtml = '';
        if(loc.tipo === 'disk') {
            espacioHtml = `
                <div class="space-bar-container">
                    <div class="space-bar-fill" style="width: 50%"></div>
                </div>
                <small style="color: #aaa">Calculando espacio...</small>
            `;
        } else {
            espacioHtml = `<small style="color: #666">Nube / Librería Virtual</small>`;
        }

        const card = document.createElement('div');
        card.className = 'location-card';
        
        // AQUÍ ESTÁ LA CLAVE: Al hacer click, abrimos esa ubicación
        card.onclick = () => openLocation(loc);
        
        card.innerHTML = `
            <div class="card-image-box">
                <img src="${loc.img}" alt="${loc.nombre}">
            </div>
            <div class="card-info">
                <h3>${loc.nombre}</h3>
                ${espacioHtml}
            </div>
        `;
        container.appendChild(card);
    });
}

// --- LÓGICA DE ABRIR UBICACIÓN Y CARGAR DATOS ---
async function openLocation(locationData) {
    // 1. Cambio visual: Ocultar Dashboard, Mostrar Lista
    document.getElementById('locationsSection').classList.add('hidden');
    document.getElementById('gamesSection').classList.remove('hidden');
    
    // 2. Actualizar título
    document.getElementById('currentLocationTitle').innerText = locationData.nombre;

    // 3. Preparar contenedor y mostrar "Cargando..."
    const container = document.getElementById('gamesContainer');
    container.innerHTML = '<p style="text-align:center; color:#888; grid-column: 1/-1;">Cargando inventario...</p>';

    try {
        // 4. CONSULTA A FIREBASE
        // "Dame todos los documentos de 'inventario' donde 'ubicacion' sea igual al ID de esta tarjeta"
        const snapshot = await db.collection("inventario")
                                 .where("ubicacion", "==", locationData.id)
                                 .get();

        container.innerHTML = ''; // Limpiar mensaje de carga

        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center; color:#666; grid-column: 1/-1;">No hay elementos en esta ubicación.</p>';
            return;
        }

        // 5. PINTAR CADA JUEGO
        snapshot.forEach(doc => {
            const data = doc.data();
            const card = createGameCard(data, doc.id);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Error cargando juegos:", error);
        container.innerHTML = `<p style="color:red">Error al cargar datos: ${error.message}</p>`;
    }
}

// Función auxiliar para crear el HTML de la tarjeta de juego
function createGameCard(data, id) {
    const div = document.createElement('div');
    div.className = 'game-card';
    
    // Calcular tamaño total (Base + Updates + Mods) para mostrar
    let totalSize = data.tamano || 0;
    if(data.tamanoUpdates) totalSize += data.tamanoUpdates;
    if(data.tamanoMods) totalSize += data.tamanoMods;

    // Badges (Etiquetas pequeñas)
    let badges = '';
    if(data.dlss) badges += `<span class="badge-dlss">DLSS ${data.dlssVersion || ''}</span> `;
    if(data.tieneMods) badges += `<span class="badge-mods">MODS</span>`;

    // Imagen por defecto si falla la URL
    const imgUrl = data.imagenUrl || 'assets/no-image.jpg'; // Asegúrate de tener una imagen por defecto o que la URL sea válida

    div.innerHTML = `
        <img src="${imgUrl}" class="game-cover" alt="${data.nombre}" onerror="this.src='https://via.placeholder.com/200x300?text=Sin+Imagen'">
        <div class="game-info-overlay">
            <div class="game-title">${data.nombre}</div>
            <div class="game-meta">
                <span>${totalSize.toFixed(1)} GB</span>
                <span>${badges}</span>
            </div>
        </div>
    `;

    // Click en el juego (Futuro: Abrir detalles)
    div.onclick = () => alert(`Detalles de: ${data.nombre}\n\nDescripción: ${data.descripcion || 'Sin descripción'}`);

    return div;
}

// --- VOLVER AL DASHBOARD ---
function goBackToDashboard() {
    document.getElementById('gamesSection').classList.add('hidden');
    document.getElementById('locationsSection').classList.remove('hidden');
}

// --- MODAL EVENTS (Igual que antes) ---
function setupModalEvents() {
    const modal = document.getElementById('formModal');
    const btnAdd = document.getElementById('btnAddGame');
    const btnClose = document.querySelector('.close-modal');

    if (btnAdd) btnAdd.addEventListener('click', () => modal.classList.add('active'));
    if (btnClose) btnClose.addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
}
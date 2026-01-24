// js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Renderizar Unidades
    renderDashboard();

    // 2. Configurar eventos del Modal (Botón +)
    setupModalEvents();
});

function renderDashboard() {
    const container = document.getElementById('locationsContainer');
    if(!container) return;
    
    container.innerHTML = '';

    locationsData.forEach(loc => {
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
        card.onclick = () => alert('Aquí se abrirá la lista de: ' + loc.nombre);
        
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

function setupModalEvents() {
    const modal = document.getElementById('formModal');
    const btnAdd = document.getElementById('btnAddGame');
    const btnClose = document.querySelector('.close-modal');

    // Abrir
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            modal.classList.add('active');
        });
    }

    // Cerrar con X
    if (btnClose) {
        btnClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Cerrar click fuera
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}
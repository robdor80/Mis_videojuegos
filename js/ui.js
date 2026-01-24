// js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('locationsContainer');
    
    // Limpiamos (por seguridad)
    container.innerHTML = '';

    // Recorremos tus datos y creamos las tarjetas
    locationsData.forEach(loc => {
        
        // Determinar si mostramos barra de espacio (solo discos físicos)
        let espacioHtml = '';
        if(loc.tipo === 'disk') {
            // Placeholder: fingimos que está al 50% lleno para que veas la barra
            espacioHtml = `
                <div class="space-bar-container">
                    <div class="space-bar-fill" style="width: 50%"></div>
                </div>
                <small style="color: #aaa">Calculando espacio...</small>
            `;
        } else {
            espacioHtml = `<small style="color: #666">Nube / Librería Virtual</small>`;
        }

        // Crear tarjeta HTML
        const card = document.createElement('div');
        card.className = 'location-card';
        card.onclick = () => alert('Has hecho click en ' + loc.nombre); // Clickable
        
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
});
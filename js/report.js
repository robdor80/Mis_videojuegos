// js/report.js

let reportItems = [];
const REPORT_FALLBACK_COVER_URL = 'https://via.placeholder.com/200x300?text=Sin+imagen';

document.addEventListener('DOMContentLoaded', () => {
    setupReportEvents();
});

function setupReportEvents() {
    const btnOpenReport = document.getElementById('btnOpenReport');
    const reportModal = document.getElementById('reportModal');
    const closeReport = document.querySelector('.close-report-modal');
    const filter = document.getElementById('reportTypeFilter');
    const sortOrder = document.getElementById('reportSortOrder');
    const downloadBtn = document.getElementById('btnDownloadReport');

    if(btnOpenReport) btnOpenReport.addEventListener('click', openReportModal);
    if(closeReport) closeReport.addEventListener('click', () => reportModal.classList.remove('active'));
    if(filter) filter.addEventListener('change', renderReport);
    if(sortOrder) sortOrder.addEventListener('change', renderReport);
    if(downloadBtn) downloadBtn.addEventListener('click', downloadReportPdf);

    window.addEventListener('click', (event) => {
        if(event.target === reportModal) reportModal.classList.remove('active');
    });
}

async function openReportModal() {
    const reportModal = document.getElementById('reportModal');
    reportModal.classList.add('active');

    document.getElementById('reportSummary').innerHTML = '<p>Cargando informe...</p>';
    document.getElementById('reportTableBody').innerHTML = '';

    await loadLocationsData();
    if(window.populateLocationSelect) window.populateLocationSelect();
    await loadReportItems();
    renderReport();
}

async function loadReportItems() {
    const snapshot = await db.collection("inventario").orderBy("nombre").get();
    reportItems = [];

    snapshot.forEach(doc => {
        reportItems.push({
            id: doc.id,
            ...doc.data()
        });
    });
}

function getReportFilterValue() {
    return document.getElementById('reportTypeFilter')?.value || 'all';
}

function getFilteredReportItems() {
    const filter = getReportFilterValue();
    const filteredItems = filter === 'all'
        ? [...reportItems]
        : reportItems.filter(item => (item.tipo || 'videojuego') === filter);

    return sortReportItems(filteredItems);
}

function getReportSortOrder() {
    return document.getElementById('reportSortOrder')?.value || 'name';
}

function sortReportItems(items) {
    const sortOrder = getReportSortOrder();
    const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

    return items.sort((a, b) => {
        if(sortOrder === 'location') {
            const locationCompare = collator.compare(getLocationName(a.ubicacion), getLocationName(b.ubicacion));
            if(locationCompare !== 0) return locationCompare;
            return collator.compare(a.nombre || '', b.nombre || '');
        }

        if(sortOrder === 'size') {
            const sizeCompare = getItemTotalSize(b) - getItemTotalSize(a);
            if(sizeCompare !== 0) return sizeCompare;
            return collator.compare(a.nombre || '', b.nombre || '');
        }

        return collator.compare(a.nombre || '', b.nombre || '');
    });
}

function getItemTotalSize(item) {
    return (item.tamano || 0) + (item.tamanoUpdates || 0) + (item.tamanoMods || 0);
}

function getLocationName(locationId) {
    return locationsData.find(location => location.id === locationId)?.nombre || locationId || '';
}

function getReportTitle() {
    const titles = {
        all: 'Inventario completo',
        videojuego: 'Inventario de videojuegos',
        programa: 'Inventario de programas',
        otros: 'Inventario de otros'
    };
    return titles[getReportFilterValue()] || titles.all;
}

function getTypeLabel(type) {
    const labels = {
        videojuego: 'Videojuego',
        programa: 'Programa',
        otros: 'Otros'
    };
    return labels[type] || 'Videojuego';
}

function renderReport() {
    const items = getFilteredReportItems();
    renderReportSummary(items);
    renderReportTable(items);
}

function renderReportSummary(items) {
    const summary = document.getElementById('reportSummary');
    const totalGb = items.reduce((sum, item) => sum + getItemTotalSize(item), 0);
    const byLocation = {};

    items.forEach(item => {
        const locationName = getLocationName(item.ubicacion);
        byLocation[locationName] = (byLocation[locationName] || 0) + getItemTotalSize(item);
    });

    const locationsText = Object.entries(byLocation)
        .sort((a, b) => b[1] - a[1])
        .map(([location, gb]) => `${escapeReportHtml(location)}: ${gb.toFixed(1)} GB`)
        .join(' · ');

    summary.innerHTML = `
        <p><strong>${escapeReportHtml(getReportTitle())}</strong></p>
        <p>${items.length} elementos · ${totalGb.toFixed(1)} GB ocupados</p>
        <p>${locationsText || 'Sin datos para este filtro.'}</p>
    `;
}

function renderReportTable(items) {
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = '';

    if(items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9">No hay elementos para este filtro.</td></tr>';
        return;
    }

    let currentLocation = null;
    let locationTotal = 0;
    let locationCount = 0;
    const showLocationSubtotals = getReportSortOrder() === 'location';

    items.forEach((item, index) => {
        const locationName = getLocationName(item.ubicacion);

        if(showLocationSubtotals && currentLocation !== null && locationName !== currentLocation) {
            tbody.appendChild(createLocationSubtotalRow(currentLocation, locationTotal, locationCount));
            locationTotal = 0;
            locationCount = 0;
        }

        currentLocation = locationName;
        locationTotal += getItemTotalSize(item);
        locationCount += 1;

        const tr = document.createElement('tr');
        const total = getItemTotalSize(item);
        const dlss = item.dlss ? `Sí ${item.dlssVersion || ''}` : 'No';
        const imageUrl = item.imagenUrl || REPORT_FALLBACK_COVER_URL;

        tr.innerHTML = `
            <td><img class="report-thumb" src="${escapeReportHtml(imageUrl)}" alt="${escapeReportHtml(item.nombre || '')}" onerror="this.onerror=null;this.src='${REPORT_FALLBACK_COVER_URL}'"></td>
            <td>${escapeReportHtml(item.nombre || '')}</td>
            <td>${escapeReportHtml(getTypeLabel(item.tipo))}</td>
            <td>${escapeReportHtml(locationName)}</td>
            <td>${(item.tamano || 0).toFixed(1)} GB</td>
            <td>${(item.tamanoUpdates || 0).toFixed(1)} GB</td>
            <td>${(item.tamanoMods || 0).toFixed(1)} GB</td>
            <td>${total.toFixed(1)} GB</td>
            <td>${escapeReportHtml(dlss)}</td>
        `;
        tbody.appendChild(tr);

        if(showLocationSubtotals && index === items.length - 1) {
            tbody.appendChild(createLocationSubtotalRow(currentLocation, locationTotal, locationCount));
        }
    });
}

function createLocationSubtotalRow(locationName, totalGb, itemCount) {
    const tr = document.createElement('tr');
    tr.className = 'report-subtotal-row';
    tr.innerHTML = `
        <td colspan="7">Total en ${escapeReportHtml(locationName)} (${itemCount} elementos)</td>
        <td>${totalGb.toFixed(1)} GB</td>
        <td></td>
    `;
    return tr;
}

async function downloadReportPdf() {
    const items = getFilteredReportItems();
    if(items.length === 0) {
        alert("No hay elementos para exportar.");
        return;
    }

    const originalTitle = document.title;
    document.title = getReportTitle();
    window.print();
    document.title = originalTitle;
}

function escapeReportHtml(value) {
    return (value ?? '').toString().replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

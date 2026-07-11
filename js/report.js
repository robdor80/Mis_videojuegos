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
    const downloadBtn = document.getElementById('btnDownloadReport');

    if(btnOpenReport) btnOpenReport.addEventListener('click', openReportModal);
    if(closeReport) closeReport.addEventListener('click', () => reportModal.classList.remove('active'));
    if(filter) filter.addEventListener('change', renderReport);
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
    if(filter === 'all') return reportItems;
    return reportItems.filter(item => (item.tipo || 'videojuego') === filter);
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

    items.forEach(item => {
        const tr = document.createElement('tr');
        const total = getItemTotalSize(item);
        const dlss = item.dlss ? `Sí ${item.dlssVersion || ''}` : 'No';
        const imageUrl = item.imagenUrl || REPORT_FALLBACK_COVER_URL;

        tr.innerHTML = `
            <td><img class="report-thumb" src="${escapeReportHtml(imageUrl)}" alt="${escapeReportHtml(item.nombre || '')}" onerror="this.onerror=null;this.src='${REPORT_FALLBACK_COVER_URL}'"></td>
            <td>${escapeReportHtml(item.nombre || '')}</td>
            <td>${escapeReportHtml(getTypeLabel(item.tipo))}</td>
            <td>${escapeReportHtml(getLocationName(item.ubicacion))}</td>
            <td>${(item.tamano || 0).toFixed(1)} GB</td>
            <td>${(item.tamanoUpdates || 0).toFixed(1)} GB</td>
            <td>${(item.tamanoMods || 0).toFixed(1)} GB</td>
            <td>${total.toFixed(1)} GB</td>
            <td>${escapeReportHtml(dlss)}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function downloadReportPdf() {
    const items = getFilteredReportItems();
    if(items.length === 0) {
        alert("No hay elementos para exportar.");
        return;
    }

    if(!window.jspdf?.jsPDF) {
        alert("No se pudo cargar la librería PDF.");
        return;
    }

    const button = document.getElementById('btnDownloadReport');
    button.disabled = true;
    button.innerText = "Generando PDF...";

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        if(!doc.autoTable) {
            alert("No se pudo cargar la tabla PDF.");
            return;
        }

        const title = getReportTitle();
        const date = new Date().toLocaleDateString('es-ES');
        const totalGb = items.reduce((sum, item) => sum + getItemTotalSize(item), 0);
        const imageCache = {};

        await Promise.all(items.map(async (item, index) => {
            const imageUrl = item.imagenUrl || REPORT_FALLBACK_COVER_URL;
            imageCache[getReportItemKey(item, index)] = await loadImageAsDataUrl(imageUrl);
        }));

        doc.setFontSize(16);
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generado: ${date}`, 14, 22);
        doc.text(`Elementos: ${items.length} · Total: ${totalGb.toFixed(1)} GB`, 14, 28);

        doc.autoTable({
            startY: 34,
            head: [['Imagen', 'Nombre', 'Tipo', 'Ubicación', 'Base', 'Updates', 'Mods', 'Total', 'DLSS']],
            body: items.map(item => [
                '',
                item.nombre || '',
                getTypeLabel(item.tipo),
                getLocationName(item.ubicacion),
                `${(item.tamano || 0).toFixed(1)} GB`,
                `${(item.tamanoUpdates || 0).toFixed(1)} GB`,
                `${(item.tamanoMods || 0).toFixed(1)} GB`,
                `${getItemTotalSize(item).toFixed(1)} GB`,
                item.dlss ? `Sí ${item.dlssVersion || ''}` : 'No'
            ]),
            styles: { fontSize: 8, cellPadding: 2, minCellHeight: 18 },
            headStyles: { fillColor: [187, 134, 252], textColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 16 },
                1: { cellWidth: 52 },
                2: { cellWidth: 24 },
                3: { cellWidth: 42 }
            },
            didDrawCell: data => {
                if(data.section !== 'body' || data.column.index !== 0) return;

                const item = items[data.row.index];
                if(!item) return;

                const imageData = imageCache[getReportItemKey(item, data.row.index)];
                if(!imageData) return;

                doc.addImage(imageData, 'JPEG', data.cell.x + 3, data.cell.y + 2, 10, 14);
            }
        });

        const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
        doc.save(fileName);
    } catch (error) {
        console.error(error);
        alert("No se pudo generar el PDF: " + error.message);
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i> Descargar PDF';
    }
}

function getReportItemKey(item, index) {
    return item?.id || `row-${index}`;
}

function loadImageAsDataUrl(url) {
    return new Promise(resolve => {
        if(!url) {
            resolve(null);
            return;
        }

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const context = canvas.getContext('2d');
                context.drawImage(image, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            } catch (error) {
                resolve(null);
            }
        };
        image.onerror = () => resolve(null);
        image.src = url;
    });
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

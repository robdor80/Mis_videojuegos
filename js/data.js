// js/data.js

const STORAGE_LOCATIONS_COLLECTION = "ubicaciones";

const defaultLocationsData = [
    {
        id: 'steam',
        docId: 'steam',
        nombre: 'Steam Library',
        tipo: 'cloud',
        img: 'assets/locations/steam.png',
        custom: false
    },
    {
        id: 'ubisoft',
        docId: 'ubisoft',
        nombre: 'Ubisoft Connect',
        tipo: 'cloud',
        img: 'assets/locations/ubisoft.png',
        custom: false
    },
    {
        id: 'm2',
        docId: 'm2',
        nombre: 'SSD Fanxiang (M.2)',
        tipo: 'disk',
        capacidad: 1000, // 1000 GB = 1TB (CAMBIA ESTO SI ES DIFERENTE)
        img: 'assets/locations/fanxiang.png',
        custom: false
    },
    {
        id: 'hdd2',
        docId: 'hdd2',
        nombre: 'WD Elements 3.0',
        tipo: 'disk',
        capacidad: 1000, // 1000 GB
        img: 'assets/locations/wd_3.0.png',
        custom: false
    }
];

let locationsData = [...defaultLocationsData];

function normalizeStorageLocation(doc, baseLocation = null) {
    const data = doc.data();
    const tipo = data.tipo || baseLocation?.tipo || 'disk';
    const capacidad = data.capacidad !== undefined ? parseFloat(data.capacidad) : baseLocation?.capacidad;

    if (!data.nombre || !data.img || (tipo === 'disk' && (!Number.isFinite(capacidad) || capacidad <= 0))) {
        return null;
    }

    return {
        id: baseLocation?.id || doc.id,
        docId: doc.id,
        nombre: data.nombre,
        tipo,
        capacidad,
        img: data.img,
        custom: !baseLocation
    };
}

async function loadLocationsData() {
    try {
        const snapshot = await db.collection(STORAGE_LOCATIONS_COLLECTION).orderBy("nombre").get();
        const baseLocations = defaultLocationsData.map(location => ({ ...location }));
        const customLocations = [];

        snapshot.forEach(doc => {
            const baseIndex = baseLocations.findIndex(location => location.id === doc.id);
            const location = normalizeStorageLocation(doc, baseLocations[baseIndex]);

            if (!location) return;

            if (baseIndex >= 0) {
                baseLocations[baseIndex] = location;
            } else {
                customLocations.push(location);
            }
        });

        locationsData = [...baseLocations, ...customLocations];
    } catch (error) {
        console.error("Error cargando ubicaciones:", error);
        locationsData = defaultLocationsData.map(location => ({ ...location }));
    }

    window.locationsData = locationsData;
    return locationsData;
}

function getPhysicalLocationIds() {
    return locationsData
        .filter(location => location.tipo === 'disk')
        .map(location => location.id);
}

// js/data.js

const STORAGE_LOCATIONS_COLLECTION = "ubicaciones";

const defaultLocationsData = [
    {
        id: 'steam',
        nombre: 'Steam Library',
        tipo: 'cloud',
        img: 'assets/locations/steam.png' 
    },
    {
        id: 'ubisoft',
        nombre: 'Ubisoft Connect',
        tipo: 'cloud',
        img: 'assets/locations/ubisoft.png'
    },
    {
        id: 'm2',
        nombre: 'SSD Fanxiang (M.2)',
        tipo: 'disk',
        capacidad: 1000, // 1000 GB = 1TB (CAMBIA ESTO SI ES DIFERENTE)
        img: 'assets/locations/fanxiang.png'
    },
    {
        id: 'hdd2',
        nombre: 'WD Elements 3.0',
        tipo: 'disk',
        capacidad: 1000, // 1000 GB
        img: 'assets/locations/wd_3.0.png'
    }
];

let locationsData = [...defaultLocationsData];

function normalizeStorageLocation(doc) {
    const data = doc.data();
    const capacidad = parseFloat(data.capacidad);

    if (!data.nombre || !data.img || !Number.isFinite(capacidad) || capacidad <= 0) {
        return null;
    }

    return {
        id: doc.id,
        docId: doc.id,
        nombre: data.nombre,
        tipo: 'disk',
        capacidad,
        img: data.img,
        custom: true
    };
}

async function loadLocationsData() {
    try {
        const snapshot = await db.collection(STORAGE_LOCATIONS_COLLECTION).orderBy("nombre").get();
        const customLocations = [];

        snapshot.forEach(doc => {
            const location = normalizeStorageLocation(doc);
            if (location) customLocations.push(location);
        });

        locationsData = [...defaultLocationsData, ...customLocations];
    } catch (error) {
        console.error("Error cargando ubicaciones:", error);
        locationsData = [...defaultLocationsData];
    }

    window.locationsData = locationsData;
    return locationsData;
}

function getPhysicalLocationIds() {
    return locationsData
        .filter(location => location.tipo === 'disk')
        .map(location => location.id);
}

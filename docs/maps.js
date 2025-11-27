// maps.js
// Mapa mundial mostrando adopción de EN 301 549 usando Leaflet.

// Crear mapa
const map = L.map('map', {
  worldCopyJump: true
}).setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 6,
  minZoom: 2,
  attribution: '© OpenStreetMap'
}).addTo(map);

// Colores según estatus
const statusColors = {
  adopted: '#2ca02c',
  referenced: '#ff7f0e',
  unknown: '#d3d3d3'
};

// Cargar datos (GeoJSON + adoption.json)
Promise.all([
  fetch('world.geojson').then(r => r.json()),
  fetch('adoption.json').then(r => r.json())
]).then(([geojsonData, adoptionData]) => {

  const style = feature => {
    const iso = feature.properties.ISO_A3;
    const item = adoptionData[iso];
    const status = item ? item.status : 'unknown';

    return {
      fillColor: statusColors[status],
      weight: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature, layer) => {
    const iso = feature.properties.ISO_A3;
    const item = adoptionData[iso];

    let tooltip = `<strong>${feature.properties.ADMIN}</strong>`;

    if (!item) {
      tooltip += `<br>Estado: unknown`;
    } else {
      tooltip += `<br>Estado: ${item.status}`;

      if (item.version) {
        tooltip += `<br>Versión: ${item.version}`;
      }

      if (item.source) {
        tooltip += `<br><a href="${item.source}" target="_blank">Fuente</a>`;
      }
    }

    layer.bindTooltip(tooltip, { sticky: true });

    layer.on({
      mouseover: e => e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.9 }),
      mouseout: e => e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.7 })
    });
  };

  const geoLayer = L.geoJSON(geojsonData, {
    style,
    onEachFeature
  }).addTo(map);

  // Ajustar vista para que el mapa aparezca en tamaño correcto
  map.fitBounds(geoLayer.getBounds());
  setTimeout(() => map.invalidateSize(), 300);
});

// Leyenda
const legend = L.control({ position: 'topleft' });

legend.onAdd = () => {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.background = 'rgba(255,255,255,0.85)';
  div.style.padding = '8px 10px';
  div.style.borderRadius = '6px';
  div.style.fontFamily = 'Arial, sans-serif';
  div.style.fontSize = '14px';
  div.style.boxShadow = '0 0 8px rgba(0,0,0,0.2)';

  div.innerHTML = `<strong>EN 301 549</strong><br>`;

  for (const status in statusColors) {
    div.innerHTML += `
      <span style="
        display:inline-block;
        width:14px;
        height:14px;
        background:${statusColors[status]};
        margin-right:6px;
        border:1px solid #777;
      "></span>${status}<br>`;
  }

  return div;
};

legend.addTo(map);

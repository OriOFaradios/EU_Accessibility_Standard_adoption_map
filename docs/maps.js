// maps.js
// Mapa mundial mostrando adopción de EN 301 549 usando Leaflet.

// 1. Crear mapa
const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 6,
  minZoom: 2,
  attribution: '© OpenStreetMap'
}).addTo(map);

// 2. Colores según estatus
const statusColors = {
  adopted: '#2ca02c',    // verde
  referenced: '#ff7f0e', // naranja
  unknown: '#d3d3d3'     // gris
};

// 3. Cargar datos y dibujar mapa
Promise.all([
  fetch('world.geojson').then(r => r.json()),
  fetch('adoption.json').then(r => r.json())
]).then(([geojsonData, adoptionData]) => {

  const style = feature => {
    const code = feature.id;
    const item = adoptionData[code];
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
    const code = feature.id;
    const item = adoptionData[code];

    let tooltip = `<strong>${feature.properties.name}</strong>`;

    if (!item) {
      tooltip += `<br>Status: unknown`;
    } else {
      tooltip += `<br>Status: ${item.status}`;
      if (item.version) tooltip += `<br>Version: ${item.version}`;
      if (item.source) tooltip += `<br><a href="${item.source}" target="_blank">Source</a>`;
    }

    layer.bindTooltip(tooltip, { sticky: true });

    layer.on({
      mouseover: e => e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.9 }),
      mouseout: e => e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.7 })
    });
  };

  L.geoJSON(geojsonData, {
    style,
    onEachFeature
  }).addTo(map);
});

// 4. Leyenda
const legend = L.control({ position: 'topleft' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.background = 'rgba(255,255,255,0.85)';
  div.style.padding = '8px 10px';
  div.style.borderRadius = '6px';
  div.style.fontFamily = 'Arial, sans-serif';
  div.style.fontSize = '14px';
  div.style.boxShadow = '0 0 8px rgba(0,0,0,0.2)';

  div.innerHTML = `<strong>EN 301 549 status</strong><br>`;

  for (const status in statusColors) {
    div.innerHTML += `
      <span style="
        display:inline-block;
        width:14px;
        height:14px;
        background:${statusColors[status]};
        margin-right:6px;
        border:1px solid #777;
      "></span> ${status}<br>
    `;
  }

  return div;
};

legend.addTo(map);

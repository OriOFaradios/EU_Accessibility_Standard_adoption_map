// maps.js
// Mapa mundial con adopción EN 301 549, simple y claro

// Colores por estatus
const statusColors = {
  "adopted": "#2ca02c",       // verde
  "referenced": "#ff7f0e", // naranja
  "unknown": "#d3d3d3"         // gris
};

// Crear el mapa centrado en el mundo
let map = L.map('map').setView([20, 0], 2);

// Capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Cargar adoption.json y world.geojson
let adoptionData = {};
fetch('adoption.json')
  .then(res => res.json())
  .then(data => {
    adoptionData = data;
    fetch('world.geojson')
      .then(res => res.json())
      .then(geojson => {
        L.geoJSON(geojson, {
          style: feature => ({
            fillColor: statusColors[adoptionData[feature.id] || 'unknown'],
            weight: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
          }),
          onEachFeature: (feature, layer) => {
            const item = adoptionData[feature.id] || 'unknown';
            let tooltipContent = `<strong>${feature.properties.name}</strong><br>Status: ${item.status}`;
              if (item.source) {
              tooltipContent += `<br><a href="${item.source}" target="_blank">Source</a>`;
              }
              if (item.version) {
              tooltipContent += `<br>Versión: ${item.version}`;
              }
            layer.bindTooltip(`${feature.properties.name}<br>Status: ${status}`);
            layer.on({
              mouseover: e => e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.9 }),
              mouseout: e => e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.7 })
            });
          }
        }).addTo(map);
      });
  });

// Leyenda simple y visible
const legend = L.control({ position: 'topleft' });

legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'info legend');
  div.style.background = 'rgba(255,255,255,0.8)';
  div.style.padding = '8px';
  div.style.borderRadius = '6px';
  div.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
  div.style.fontFamily = 'Arial, sans-serif';
  div.style.fontSize = '14px';

  div.innerHTML = "<strong>EN 301 549 adoption</strong><br>";
  for (const status in statusColors) {
    div.innerHTML +=
      `<i style="background:${statusColors[status]}; width:18px; height:18px; display:inline-block; margin-right:6px;"></i>${status}<br>`;
  }
  return div;
};

legend.addTo(map);

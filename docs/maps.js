// maps.js
// Muestra un mapa mundial con estados de adopción EN 301 549

// Configuración de colores según estatus
const statusColors = {
  "adopted": "#2ca02c",       // verde
  "referenced only": "#ff7f0e", // naranja
  "unknown": "#d3d3d3"         // gris
};

let map = L.map('map').setView([20, 0], 2); // vista inicial centrada en el mundo

// Capa de OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Cargar adoption.json
let adoptionData = {};
fetch('adoption.json')
  .then(response => response.json())
  .then(data => {
    adoptionData = data;
    loadWorldGeoJSON();
  })
  .catch(err => console.error("Error loading adoption.json:", err));

// Cargar world.geojson
function loadWorldGeoJSON() {
  fetch('world.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      L.geoJSON(geojsonData, {
        style: styleFeature,
        onEachFeature: onEachFeature
      }).addTo(map);
    })
    .catch(err => console.error("Error loading world.geojson:", err));
}

// Definir estilo de cada país según adopción
function styleFeature(feature) {
  const countryCode = feature.id;  // usar 'id' del geojson
  const status = adoptionData[countryCode] || 'unknown';
  return {
    fillColor: statusColors[status],
    weight: 1,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.7
  };
}

// Tooltips y hover
function onEachFeature(feature, layer) {
  const countryCode = feature.id;
  const countryName = feature.properties.name;
  const status = adoptionData[countryCode] || 'unknown';
  
  layer.bindTooltip(`${countryName}<br>Status: ${status}`);
  
  layer.on({
    mouseover: function(e) {
      e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.9 });
    },
    mouseout: function(e) {
      e.target.setStyle({ weight: 1, color: 'white', fillOpacity: 0.7 });
    }
  });
}

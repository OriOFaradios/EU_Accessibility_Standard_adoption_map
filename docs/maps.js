// Muestra un mapa mundial interactivo con estados de adopción EN 301 549

// Configuración de colores según estatus
const statusColors = {
  "adopted": "#2ca02c",         // verde
  "referenced only": "#ff7f0e", // naranja
  "unknown": "#d3d3d3"          // gris
};

// Inicializar mapa centrado en el mundo
let map = L.map('map').setView([20, 0], 2);

// Capa base OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);


// Cargar datos de adopción y world.geojson
let adoptionData = {};
fetch('adoption.json')
  .then(response => response.json())
  .then(data => {
    adoptionData = data;
    loadWorldGeoJSON();
  })
  .catch(err => console.error("Error loading adoption.json:", err));

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

// Estilo de cada país según adopción
function styleFeature(feature) {
  const countryCode = feature.id;
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

// Leyenda profesional
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
  const div = L.DomUtil.create('div', 'info legend');
  const statuses = ["adopted", "referenced only", "unknown"];

  // Estilos de la caja
  div.style.background = 'rgba(255, 255, 255, 0.8)';
  div.style.padding = '10px';
  div.style.borderRadius = '8px';
  div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
  div.style.lineHeight = '1.5em';
  div.style.fontFamily = 'Arial, sans-serif';
  div.style.fontSize = '14px';

  let html = '<strong>EN 301 549 adoption</strong><br>';
  statuses.forEach(status => {
    html +=
      '<i style="background:' + statusColors[status] + 
      '; width:18px; height:18px; display:inline-block; margin-right:6px; vertical-align:middle;"></i> ' +
      status + '<br>';
  });

  div.innerHTML = html;
  return div;
};

legend.addTo(map);

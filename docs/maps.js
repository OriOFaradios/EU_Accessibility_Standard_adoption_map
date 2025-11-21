// Crear el mapa centrado en Europa .setView([54, 15], 4)
const map = L.map('map').setView([20, 0], 2);

// Capa base de OpenStreetMap
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 5,
  attribution: '© OpenStreetMap' 
}).addTo(map);

// Cargar datos de adopción
let adoptionData = {};
fetch('adoption.json')
  .then(response => response.json())
  .then(data => {
    adoptionData = data;
    loadGeoJSON();
  });

// Función para cargar la capa GeoJSON de países
function loadGeoJSON() {
  fetch('world.geojson')
    .then(response => response.json())
    .then(geojsonData => {
      L.geoJSON(geojsonData, {
        style: feature => {
          const countryCode = feature.properties.ISO_A2;
          const status = adoptionData[countryCode];
          let color;
          if (status === 'adopted') color = '#2ca02c';       // verde
          else if (status === 'referenced only') color = '#ff7f0e'; // naranja
          else if (status === 'pending') color = '#d62728';  // rojo
          else color = '#ccc';                                // gris
          return { color: '#333', weight: 1, fillColor: color, fillOpacity: 0.7 };
        },
        onEachFeature: (feature, layer) => {
          const countryCode = feature.properties.ISO_A2;
          const status = adoptionData[countryCode] || 'unknown';
          layer.bindPopup(`<strong>${feature.properties.ADMIN}</strong><br>Status: ${status}`);
        }
      }).addTo(map);
    });
}

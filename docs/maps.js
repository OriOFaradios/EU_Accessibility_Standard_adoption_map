const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 5
}).addTo(map);

Promise.all([
  fetch('world.geojson').then(r => r.json()),
  fetch('adopcion.json').then(r => r.json())
]).then(([world, adoption]) => {

  function colorFor(code) {
    if (code === 'IDT') return '#1a9850';
    if (code === 'Modified') return '#fee08b';
    if (code === 'Referenced') return '#d73027';
    if (code === 'Procurement') return '#4575b4';
    return '#cccccc';
  }

  L.geoJSON(world, {
    style: feature => {
      const iso = feature.properties.ISO_A2;
      const tipo = adoption[iso];
      return {
        color: '#444',
        weight: 1,
        fillColor: colorFor(tipo),
        fillOpacity: 0.85
      };
    },
    onEachFeature: (feature, layer) => {
      const iso = feature.properties.ISO_A2;
      const tipo = adoption[iso] ?? 'Sin datos';
      layer.bindPopup(`<strong>${feature.properties.ADMIN}</strong><br>${tipo}`);
    }
  }).addTo(map);
});

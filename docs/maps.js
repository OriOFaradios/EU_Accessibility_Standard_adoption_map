// maps.js
// Mapa Leaflet (usa world.geojson con feature.id = ISO_A3 y adoption.json con claves ISO_A3)

// --- Configuración base del mapa
let map;
let geojsonLayer;
let adoptionData;

function getColor(status) {
  // Solo los estados reales que usas
  if (status === "adopted") return "#2ca02c";    // verde
  if (status === "referenced") return "#ff7f0e"; // naranja
  return "#d3d3d3";                              // unknown / fallback (gris)
}

function buildTooltip(iso, props) {
  const name = props.name || props.ADMIN || "Unknown";
  const entry = adoptionData[iso];

  if (!entry) {
    return `<strong>${name}</strong><br>Estado: unknown`;
  }

  // Escapa valores simples (si van a ser controlados por usuario, considera sanitizar mejor)
  const status = entry.status || "unknown";
  const version = entry.version || "n/a";
  const source = entry.source ? `<a href="${entry.source}" target="_blank" rel="noopener noreferrer">Fuente</a>` : "n/a";

  return `
    <strong>${name}</strong><br>
    Status: ${status}<br>
    Version: ${version}<br>
    ${entry.source ? source : "Source: n/a"}
  `;
}

function styleFeature(feature) {
  const iso = feature.id;               // tu world.geojson usa "id": "AFG"
  const entry = adoptionData[iso];
  const status = entry ? entry.status : "unknown";

  return {
    fillColor: getColor(status),
    weight: 1,
    color: "#ffffff",
    dashArray: "2",
    fillOpacity: 0.8
  };
}

async function initMap() {
  map = L.map("map", {
    center: [20, 0],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  // Cargar datos
  const [adoptRes, geoRes] = await Promise.all([
    fetch("adoption.json"),
    fetch("world.geojson")
  ]);

  adoptionData = await adoptRes.json();
  const geoData = await geoRes.json();

  // Añadir GeoJSON con estilo y tooltips
  geojsonLayer = L.geoJSON(geoData, {
    style: styleFeature,
    onEachFeature: (feature, layer) => {
      const iso = feature.id;
      const tooltip = buildTooltip(iso, feature.properties);
      layer.bindTooltip(tooltip, { sticky: true });

      layer.on({
        mouseover: e => e.target.setStyle({ weight: 2, color: "#666", fillOpacity: 0.95 }),
        mouseout: e => geojsonLayer.resetStyle(e.target)
      });
    }
  }).addTo(map);

  // Ajustar vista y corregir tamaño si container estaba oculto o sin layout
  const bounds = geojsonLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
  }
  // Forzar recomputo de tamaño (evita mapa pequeño)
  setTimeout(() => map.invalidateSize(), 200);
  setTimeout(() => map.invalidateSize(), 800);
}

// Leyenda para los 3 estados reales
function buildLegend() {
  const legend = L.control({ position: "topleft" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "info legend");
    div.style.background = "rgba(255,255,255,0.9)";
    div.style.padding = "8px";
    div.style.borderRadius = "6px";
    div.style.fontFamily = "Arial, sans-serif";
    div.style.fontSize = "13px";
    div.style.boxShadow = "0 0 6px rgba(0,0,0,0.15)";

    div.innerHTML = "<strong>EN 301 549</strong><br>";

    const rows = [
      { key: "adopted", label: "Adopted" },
      { key: "referenced", label: "Referenced" },
      { key: "unknown", label: "Unknown" }
    ];

    rows.forEach(r => {
      div.innerHTML += `
        <div style="margin-top:6px; line-height:14px;">
          <span style="display:inline-block;width:14px;height:14px;background:${getColor(r.key)};margin-right:8px;border:1px solid #777;"></span>
          ${r.label}
        </div>
      `;
    });

    return div;
  };

  buildLegend.control = legend;
  legend.addTo(map);
}

// Inicializar
initMap().then(buildLegend).catch(err => {
  console.error("Error cargando mapa:", err);
});

// maps.js — resilient version (works even if adoption.json is invalid/missing)
// Expects world.geojson uses feature.id = ISO_A3 (but also checks properties.ISO_A3 / properties.iso_a3)

(async function(){
  // --- map init
  const map = L.map('map', { worldCopyJump: true, center:[20,0], zoom:2, minZoom:2, maxZoom:6 });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

  // --- color palette (exact statuses expected)
  const COLORS = {
    adopted: '#2ca02c',
    referenced: '#ff7f0e',
    unknown: '#d3d3d3'
  };

  function getColor(status) {
    return COLORS[status] || COLORS.unknown;
  }

  // --- helper to safely read ISO code from a feature
  function isoFromFeature(feature) {
    if (!feature) return null;
    return (
      feature.id ||
      (feature.properties && (feature.properties.ISO_A3 || feature.properties.iso_a3 || feature.properties.ADM0_A3)) ||
      null
    );
  }

  // --- Load adoption.json with graceful failure
  let adoptionData = {};
  try {
    const res = await fetch('adoption.json', {cache: "no-store"});
    if (!res.ok) throw new Error(`Fetch adoption.json failed: ${res.status} ${res.statusText}`);
    const txt = await res.text();
    try {
      adoptionData = JSON.parse(txt);
    } catch(parseErr) {
      console.error('adoption.json parse error:', parseErr);
      // Try to give a hint: print first 2k chars
      console.error('adoption.json snippet:', txt.slice(0, 2000));
      adoptionData = {};
    }
  } catch (err) {
    console.error('Could not load adoption.json:', err);
    adoptionData = {};
  }

  // --- Load geojson
  let geojsonData = null;
  try {
    const r = await fetch('world.geojson', {cache: "no-store"});
    if (!r.ok) throw new Error(`Fetch world.geojson failed: ${r.status} ${r.statusText}`);
    geojsonData = await r.json();
  } catch (err) {
    console.error('Could not load world.geojson:', err);
    // without geojson we can't continue
    return;
  }

  // --- Counters for diagnostics
  let totalFeatures = 0, matched = 0, unmatched = 0;

  // --- Build tooltip html from adoption entry (defensive)
  function tooltipHtml(feature) {
    const iso = isoFromFeature(feature) || '(no-iso)';
    const name = (feature.properties && (feature.properties.name || feature.properties.ADMIN)) || 'Unknown';
    const entry = adoptionData[iso];

    let html = `<strong>${name}</strong><br><small>ISO3: ${iso}</small><br>`;

    if (!entry) {
      html += `<em>No adoption entry (status: unknown)</em>`;
    } else {
      const status = entry.status || 'unknown';
      const version = entry.version || 'n/a';
      const source = entry.source || '';
      html += `Status: ${status}<br>Version: ${version}<br>`;
      if (source) {
        // sanitize minimal: allow only http/https
        const safe = String(source).startsWith('http') ? `<a href="${entry.source}" target="_blank" rel="noopener noreferrer">Source</a>` : `${entry.source}`;
        html += safe;
      } else {
        html += `Source: n/a`;
      }
    }
    return html;
  }

  // --- style per feature
  function styleFeature(feature) {
    const iso = isoFromFeature(feature);
    const entry = iso ? adoptionData[iso] : null;
    const status = entry && entry.status ? entry.status : 'unknown';
    return {
      fillColor: getColor(status),
      color: 'white',
      weight: 1,
      dashArray: '2',
      fillOpacity: 0.8
    };
  }

  // --- onEachFeature
  function onEachFeature(feature, layer) {
    totalFeatures++;
    const iso = isoFromFeature(feature);
    if (iso && adoptionData[iso]) matched++; else unmatched++;
    const tt = tooltipHtml(feature);
    layer.bindTooltip(tt, {sticky:true});
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.95 }),
      mouseout: (e) => geoLayer.resetStyle(e.target)
    });
  }

  // --- Add geo layer
  const geoLayer = L.geoJSON(geojsonData, {
    style: styleFeature,
    onEachFeature
  }).addTo(map);

  // --- Fit bounds (if valid)
  const bounds = geoLayer.getBounds();
  if (bounds && bounds.isValid && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
    setTimeout(()=>map.invalidateSize(), 250);
  }

  // --- Legend (always add)
  const legend = L.control({position:'topleft'});
  legend.onAdd = function(){
    const div = L.DomUtil.create('div','info legend');
    div.style.background = 'rgba(255,255,255,0.92)';
    div.style.padding = '8px';
    div.style.borderRadius = '6px';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.fontSize = '13px';
    div.innerHTML = '<strong>EN 301 549</strong><br>';
    const rows = [
      ['adopted','Adopted'],
      ['referenced','Referenced'],
      ['unknown','Unknown']
    ];
    rows.forEach(r=>{
      div.innerHTML += `<div style="margin-top:6px"><span style="display:inline-block;width:14px;height:14px;background:${getColor(r[0])};margin-right:8px;border:1px solid #777;"></span>${r[1]}</div>`;
    });
    return div;
  };
  legend.addTo(map);

  // --- Diagnostic log summary
  console.info(`adoption.json entries: ${Object.keys(adoptionData).length}`);
  console.info(`geojson features: ${totalFeatures}, matched entries: ${matched}, unmatched: ${unmatched}`);
  if (matched === 0) {
    console.warn('No adoption.json ISO3 keys matched geojson features. Possible causes: - adoption.json keys are wrong (not ISO3), - JSON parse failed, - feature.id or properties ISO field name differs. Use the diagnostic snippet provided to compare keys.');
  }
})();

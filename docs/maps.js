// maps.js — resilient version (works even if adoption.json is invalid/missing)
// Expects world.geojson uses feature.id = ISO_A3 (but also checks properties.ISO_A3 / properties.iso_a3 / properties.ADM0_A3)

(async function () {
  // --- map init with restricted bounds
  const southWest = L.latLng(-75, -180);
  const northEast = L.latLng(82, 180);
  const maxBounds = L.latLngBounds(southWest, northEast);

  const map = L.map('map', {
    worldCopyJump: true,
    center: [55, 10],
    zoom: 2,
    minZoom: 2,
    maxZoom: 6,
    maxBounds: maxBounds,
    maxBoundsViscosity: 1.0,
    preferCanvas: false
  });

  // Expose map globally so index.html fixes can use window.map.invalidateSize()
  window.map = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // --- color palette (exact statuses expected)
  const COLORS = {
    adopted: '#02488d',    // primary etsi.org
    referenced: '#007dc0', // secondary etsi.org
    unknown: '#d3d3d3'
  };

  function getColor(status) {
    return COLORS[String(status || '').toLowerCase()] || COLORS.unknown;
  }

  // --- helper to safely read ISO code from a feature (returns uppercase ISO3 or null)
  function isoFromFeature(feature) {
    if (!feature) return null;
    const candidate =
      feature.id ||
      (feature.properties && (feature.properties.ISO_A3 || feature.properties.iso_a3 || feature.properties.ADM0_A3 || feature.properties.iso3)) ||
      null;
    return candidate ? String(candidate).toUpperCase() : null;
  }

  // --- Load adoption.json with graceful failure
  let adoptionData = {};
  try {
    const res = await fetch('adoption.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch adoption.json failed: ${res.status} ${res.statusText}`);
    const txt = await res.text();
    try {
      adoptionData = JSON.parse(txt);
      adoptionData = Object.fromEntries(Object.entries(adoptionData).map(([k, v]) => [String(k).toUpperCase(), v]));
    } catch (parseErr) {
      console.error('adoption.json parse error:', parseErr);
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
    const r = await fetch('world.geojson', { cache: 'no-store' });
    if (!r.ok) throw new Error(`Fetch world.geojson failed: ${r.status} ${r.statusText}`);
    geojsonData = await r.json();
  } catch (err) {
    console.error('Could not load world.geojson:', err);
    return; // can't continue without geojson
  }

  // --- Counters for diagnostics
  let totalFeatures = 0, matched = 0, unmatched = 0;

  // --- Build tooltip html from adoption entry (defensive)
  function tooltipHtml(feature) {
    const iso = isoFromFeature(feature) || '(no-iso)';
    const name = (feature.properties && (feature.properties.name || feature.properties.ADMIN || feature.properties.ADMIN0)) || 'Unknown';
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
        const safe = String(source).startsWith('http') ? `<a href="${source}" target="_blank" rel="noopener noreferrer">Source</a>` : `${source}`;
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

  // --- placeholder for geoLayer so handlers can reference it
  let geoLayer;

  // --- onEachFeature
  function onEachFeature(feature, layer) {
    totalFeatures++;
    const iso3 = isoFromFeature(feature);
    if (iso3 && adoptionData[iso3]) matched++; else unmatched++;

    const props = feature.properties || {};
    const country = props.ADMIN || props.name || 'Unknown';
    const adopt = (iso3 && adoptionData[iso3]) ? adoptionData[iso3] : { status: "unknown", version: "N/A", source: "" };

    // quick hover tooltip (non-interactive)
    layer.bindTooltip(
      `<strong>${country}</strong><br>Status: ${adopt.status}`,
      { sticky: true }
    );

    // build popup (click -> persistent, links clickable)
    const sourceHtml = adopt.source && String(adopt.source).startsWith('http')
      ? `<a href="${adopt.source}" target="_blank" rel="noopener noreferrer">Official source</a>`
      : (adopt.source || "No official source");

    const popupContent = `
      <div style="min-width:200px;">
        <strong>${country}</strong><br>
        Status: ${adopt.status}<br>
        Version: ${adopt.version || 'n/a'}<br>
        Source: ${sourceHtml}
      </div>
    `;

    // highlight on hover and reset on out
    layer.on({
      mouseover: (e) => {
        e.target.setStyle({ weight: 2, color: '#666', fillOpacity: 0.95 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          try { e.target.bringToFront(); } catch (_) { /* ignore */ }
        }
      },
      mouseout: (e) => {
        if (geoLayer) geoLayer.resetStyle(e.target);
      },
      click: () => {
        layer.bindPopup(popupContent, { maxWidth: 360 }).openPopup();
      }
    });
  }

  // --- Add geo layer
  geoLayer = L.geoJSON(geojsonData, {
    style: styleFeature,
    onEachFeature
  }).addTo(map);

  // --- Fit bounds (if valid)
  const bounds = geoLayer.getBounds();
  if (bounds && bounds.isValid && bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
    // ensure Leaflet recomputes after fitBounds & layout changes
    setTimeout(() => map.invalidateSize(), 300);
    requestAnimationFrame(() => map.invalidateSize());
  }

  // --- Legend (responsive + zoom-friendly, preserves background/colors)
  const legend = L.control({ position: 'topright' });

  legend.onAdd = function () {
    // use leaflet-control + legend classes so CSS rules apply consistently
    const div = L.DomUtil.create('div', 'leaflet-control legend legend-container');

    div.innerHTML = `
      <div class="legend-container-inner">
        <div class="legend-title">
          Accessibility requirements for ICT products and services<br>
          <strong>ETSI EN 301 549</strong>
        </div>

        <div class="legend-items">
          <div class="legend-item"><span class="legend-color" data-status="adopted" style="background:${getColor('adopted')}"></span> Adopted</div>
          <div class="legend-item"><span class="legend-color" data-status="referenced" style="background:${getColor('referenced')}"></span> Referenced</div>
          <div class="legend-item"><span class="legend-color" data-status="unknown" style="background:${getColor('unknown')}"></span> Unknown</div>
        </div>

        <div class="legend-footer">
          Want to know more about the latest EN 301 549 revision?<br>
          <a href="https://labs.etsi.org/rep/HF/en301549" target="_blank" rel="noopener noreferrer">ETSI GitLab</a>
        </div>
      </div>
    `;

    // prevent clicks on legend from affecting map dragging/zoom
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
  };

  legend.addTo(map);

  // --- Legend behavior: adjust font-size/padding based on zoom (keeps background intact)
  function adjustLegendForZoom() {
    const z = map.getZoom();
    const legendEl = document.querySelector('.leaflet-control.legend');
    if (!legendEl) return;

    // base font size and padding per zoom — tune numbers if needed
    let fontSize = 14; // px
    let padV = 10;     // px vertical padding

    if (z <= 2) { fontSize = 11; padV = 8; }
    else if (z === 3) { fontSize = 12; padV = 9; }
    else if (z === 4) { fontSize = 14; padV = 10; }
    else if (z === 5) { fontSize = 15; padV = 11; }
    else if (z >= 6) { fontSize = 16; padV = 12; }

    legendEl.style.fontSize = fontSize + 'px';
    legendEl.style.padding = padV + 'px 12px';

    // ensure color squares keep correct colors in case CSS or runtime overrides
    const colorEls = legendEl.querySelectorAll('.legend-color');
    colorEls.forEach(el => {
      const s = el.getAttribute('data-status');
      if (s) el.style.background = getColor(s);
    });
  }

  // initial adjustment and listener
  adjustLegendForZoom();
  map.on('zoomend', adjustLegendForZoom);

  // also adapt on resize/orientation changes
  window.addEventListener('resize', () => {
    // small delay to let browser finish layout
    setTimeout(() => {
      map.invalidateSize();
      adjustLegendForZoom();
    }, 180);
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      map.invalidateSize();
      adjustLegendForZoom();
    }, 300);
  });

  // --- Diagnostic log summary
  console.info(`adoption.json entries: ${Object.keys(adoptionData).length}`);
  console.info(`geojson features: ${totalFeatures}, matched entries: ${matched}, unmatched: ${unmatched}`);
  if (matched === 0) {
    console.warn('No adoption.json ISO3 keys matched geojson features. Possible causes: - adoption.json keys are wrong (not ISO3), - JSON parse failed, - feature.id or properties ISO field name differs. Use the diagnostic snippet to compare keys.');
  }
})();

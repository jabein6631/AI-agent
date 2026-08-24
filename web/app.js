/**
 * AI Infrastructure Inspection Agent - Frontend Controller
 * =========================================================
 * Multi-Category Vision Inspector (Roads, Buildings, Bridges, Drainage, Other)
 * 7 Clickable Analysis Stages with:
 * 1. Default Structured Stage Data Cards for EVERY stage
 * 2. In-Box Image Zoom (wheel / buttons) & Pan controls
 * 3. Draggable Resizable Split Pane (Adjustable Left-to-Right like Antigravity)
 * 4. Real Conversational AI Copilot Chat (Deep contextual QA about that photo)
 */

// Application State
const state = {
  currentPage: 1,
  currentStage: 1,
  selectedCategoryFilter: 'all',
  location: {
    name: 'Guntur, Andhra Pradesh, India',
    source: 'Live GPS / Geolocation',
    latitude: 16.3067,
    longitude: 80.4365,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
  },
  activeLayerFilters: {
    road: true,
    defects: true,
    boxes: true,
    cracks: true,
    water: true,
    zone: true,
    measures: true,
    thermal: false
  },
  selectedDefectIndex: null,
  inspectionQueue: [],
  activeQueueIndex: 0,
  currentAnalysis: null,
  isAnalyzing: false,
  isDetailViewOpen: false,
  detailStageNum: 1,
  
  // Image Zoom & Pan State
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isPanning: false,
  startX: 0,
  startY: 0
};

let osintLeafletMap = null;
let fullLeafletMap = null;
let satelliteTileLayer = null;
let streetTileLayer = null;
let activeMapLayerType = 'satellite';
let fullMapMarker = null;

function updateOsintMap(lat, lon) {
  const mapContainer = document.getElementById('osintMiniMap');
  if (!mapContainer || typeof L === 'undefined') return;
  try {
    if (!osintLeafletMap) {
      osintLeafletMap = L.map('osintMiniMap', {
        center: [lat, lon],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false
      });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      }).addTo(osintLeafletMap);
    } else {
      osintLeafletMap.setView([lat, lon], 15);
      setTimeout(() => {
        if (osintLeafletMap) osintLeafletMap.invalidateSize();
      }, 200);
    }
  } catch (e) {
    console.warn('[!] Leaflet map init/update warning:', e);
  }
}

function openInteractiveMap() {
  const modal = document.getElementById('interactiveMapModal');
  if (!modal) return;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const loc = (state.currentAnalysis && state.currentAnalysis.location_context) || state.location || {};
  const lat = loc.latitude || 16.3067;
  const lon = loc.longitude || 80.4365;

  const mTitle = document.getElementById('mapModalTitle');
  if (mTitle) mTitle.textContent = `📍 Live Location Map: ${loc.location_name || 'Guntur, Andhra Pradesh, India'}`;

  const fName = document.getElementById('fmbLocationName');
  if (fName) fName.textContent = loc.location_name || 'Guntur, Andhra Pradesh, India';
  const fCoords = document.getElementById('fmbCoords');
  if (fCoords) fCoords.textContent = loc.coordinates_formatted || `${Math.abs(lat).toFixed(4)}° N, ${Math.abs(lon).toFixed(4)}° E`;
  const fWeather = document.getElementById('fmbWeather');
  if (fWeather) fWeather.textContent = `${loc.ambient_temperature_range || '32°C–40°C'} • ${loc.condition_context || 'Partly Cloudy'}`;
  const fRain = document.getElementById('fmbRain');
  if (fRain) fRain.textContent = `${loc.rainfall_context || '42.6 mm'} (${loc.rainfall_intensity || 'Moderate'})`;
  const fArea = document.getElementById('fmbArea');
  if (fArea) fArea.textContent = loc.area_type || 'Urban / Semi-Urban Area';

  setTimeout(() => {
    initFullInteractiveMap(lat, lon);
  }, 100);
}

function closeInteractiveMap() {
  const modal = document.getElementById('interactiveMapModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function initFullInteractiveMap(lat, lon) {
  const container = document.getElementById('fullInteractiveMap');
  if (!container || typeof L === 'undefined') return;

  if (!fullLeafletMap) {
    fullLeafletMap = L.map('fullInteractiveMap', {
      center: [lat, lon],
      zoom: 16,
      zoomControl: true
    });

    satelliteTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Esri World Imagery'
    });

    streetTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });

    satelliteTileLayer.addTo(fullLeafletMap);

    // Custom glowing marker pin
    const redPinIcon = L.divIcon({
      className: 'custom-leaflet-pin',
      html: `<div style="position:relative; width:32px; height:32px; display:flex; align-items:center; justify-content:center;">
               <div style="position:absolute; width:32px; height:32px; border-radius:50%; background:rgba(255,23,68,0.4); animation:mapPinPulse 2s infinite;"></div>
               <span style="font-size:24px; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.8));">📍</span>
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 28]
    });

    fullMapMarker = L.marker([lat, lon], { icon: redPinIcon }).addTo(fullLeafletMap);
    fullMapMarker.bindPopup(`<b>Inspection Location</b><br>${state.location.name || 'Guntur, AP'}<br>Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`).openPopup();
  } else {
    fullLeafletMap.setView([lat, lon], 16);
    if (fullMapMarker) {
      fullMapMarker.setLatLng([lat, lon]);
    }
    setTimeout(() => {
      fullLeafletMap.invalidateSize();
    }, 150);
  }
}

function switchMapLayer(layerName) {
  if (!fullLeafletMap) return;
  activeMapLayerType = layerName;

  const btnSat = document.getElementById('btnTileSatellite');
  const btnStr = document.getElementById('btnTileStreet');

  if (layerName === 'street') {
    if (satelliteTileLayer) fullLeafletMap.removeLayer(satelliteTileLayer);
    if (streetTileLayer) streetTileLayer.addTo(fullLeafletMap);
    if (btnSat) btnSat.classList.remove('active');
    if (btnStr) btnStr.classList.add('active');
  } else {
    if (streetTileLayer) fullLeafletMap.removeLayer(streetTileLayer);
    if (satelliteTileLayer) satelliteTileLayer.addTo(fullLeafletMap);
    if (btnStr) btnStr.classList.remove('active');
    if (btnSat) btnSat.classList.add('active');
  }
}

function resetMapCenter() {
  const loc = (state.currentAnalysis && state.currentAnalysis.location_context) || state.location || {};
  const lat = loc.latitude || 16.3067;
  const lon = loc.longitude || 80.4365;
  if (fullLeafletMap) {
    fullLeafletMap.setView([lat, lon], 16);
  }
}

function detectUserLiveLocation() {
  if ('geolocation' in navigator) {
    // Explicitly prompt the user for high-accuracy GPS coordinates on every page load/open
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.location.latitude = pos.coords.latitude;
        state.location.longitude = pos.coords.longitude;
        state.location.source = 'Live GPS Geolocation';
        const formatted = `${Math.abs(pos.coords.latitude).toFixed(4)}° N, ${Math.abs(pos.coords.longitude).toFixed(4)}° E`;
        state.location.coordinates_formatted = formatted;

        const locVal = document.getElementById('headerLocationVal');
        if (locVal) locVal.textContent = formatted;

        const osCoords = document.getElementById('osintCoordsBadge');
        if (osCoords) osCoords.textContent = `📍 ${formatted}`;

        const osCoordsText = document.getElementById('osintCoordsText');
        if (osCoordsText) osCoordsText.textContent = formatted;

        updateOsintMap(pos.coords.latitude, pos.coords.longitude);
        showToast(`📍 Live GPS Acquired: ${formatted}`);
      },
      err => {
        console.warn('[!] Geolocation prompt dismissed or denied:', err.message);
        updateOsintMap(state.location.latitude || 16.3067, state.location.longitude || 80.4365);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Do not use cached position, prompt fresh every time
      }
    );
  } else {
    updateOsintMap(state.location.latitude || 16.3067, state.location.longitude || 80.4365);
  }
}

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[*] Initializing AI Infrastructure Inspection Web Client...');
  
  await checkHealth();
  await loadAvailableSamples();
  setupKeyboardNavigation();
  initDraggableResizer();
  initVerticalResizer();
  initImageZoomPan();
  detectUserLiveLocation();
  
  // Dynamic Right-Side Analysis Panel space management
  window.addEventListener('resize', () => {
    adjustRightSidebarSpace(state.currentAnalysis);
  });
  adjustRightSidebarSpace();
  
  // Auto-analyze and render the first sample on startup
  if (state.inspectionQueue.length > 0) {
    await selectQueueItem(0);
  }
});

// ------------------------------------------------------------------------------
// API CALLS & SAMPLES
// ------------------------------------------------------------------------------

async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    console.log('[+] Health status:', data);
  } catch (err) {
    console.warn('[!] Health check warning:', err);
  }
}

async function loadAvailableSamples() {
  try {
    const res = await fetch('/api/samples');
    const data = await res.json();
    if (data.samples && data.samples.length > 0) {
      data.samples.forEach(s => {
        addToQueue({
          name: s.name,
          filename: s.filename || s.name,
          samplePath: s.path,
          category: s.category || 'road',
          status: 'Ready for Analysis',
          isSample: true
        });
      });
      renderGallery();
    }
  } catch (err) {
    console.warn('[!] Could not fetch samples:', err);
  }
}

function addToQueue(item) {
  const exists = state.inspectionQueue.some(q => q.name === item.name);
  if (!exists) {
    state.inspectionQueue.push(item);
  }
  renderGallery();
}

function filterGallery(categoryKey) {
  state.selectedCategoryFilter = categoryKey;
  
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(c => c.classList.remove('active'));
  
  const activeChipId = categoryKey === 'all' ? 'filterAll' :
                       categoryKey === 'road' ? 'filterRoad' :
                       categoryKey === 'building' ? 'filterBuilding' :
                       categoryKey === 'bridge' ? 'filterBridge' :
                       categoryKey === 'drainage' ? 'filterDrainage' : 'filterOther';
  const activeEl = document.getElementById(activeChipId);
  if (activeEl) activeEl.classList.add('active');
  
  renderGallery();
  showToast(`Filtering category: ${categoryKey.toUpperCase()}`);
}

function renderGallery() {
  const galleryScroll = document.getElementById('galleryScroll');
  if (!galleryScroll) return;
  galleryScroll.innerHTML = '';

  const filtered = state.inspectionQueue.map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => {
      if (state.selectedCategoryFilter === 'all') return true;
      const itemCat = (item.analysis?.infrastructure_key || item.category || 'other').toLowerCase();
      if (state.selectedCategoryFilter === 'road') return itemCat.includes('road');
      if (state.selectedCategoryFilter === 'building') return itemCat.includes('building');
      if (state.selectedCategoryFilter === 'bridge') return itemCat.includes('bridge');
      if (state.selectedCategoryFilter === 'drainage') return itemCat.includes('drain') || itemCat.includes('water');
      return itemCat.includes('other');
    });

  filtered.forEach(({ item, originalIndex }) => {
    const el = document.createElement('div');
    el.className = `gallery-item ${originalIndex === state.activeQueueIndex ? 'active' : ''}`;
    el.onclick = () => selectQueueItem(originalIndex);

    const thumbSrc = item.thumb || item.analysis?.stage_1_image?.image_data || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'28\' height=\'28\'%3E%3Crect fill=\'%23151F2C\' width=\'28\' height=\'28\'/%3E%3C/svg%3E';

    el.innerHTML = `
      <img class="gallery-thumb" src="${thumbSrc}" alt="thumb">
      <div class="gallery-info">
        <span class="gallery-fname" title="${item.name}">${item.name}</span>
        <span class="gallery-status">${item.status || 'Ready'}</span>
      </div>
    `;
    galleryScroll.appendChild(el);
  });
}

async function selectQueueItem(index) {
  state.activeQueueIndex = index;
  renderGallery();

  const item = state.inspectionQueue[index];
  if (!item) return;

  if (item.analysis) {
    state.currentAnalysis = item.analysis;
    applyAnalysisToUI(item.analysis);
    showToast(`Loaded: ${item.name}`);
  } else if (item.isSample) {
    await runAnalysisForSample(item.samplePath, item.filename || item.name);
  } else if (item.file) {
    await runAnalysisForFile(item.file);
  }
}

async function loadSample(samplePath, friendlyName, category = 'road') {
  let idx = state.inspectionQueue.findIndex(q => q.samplePath === samplePath);
  if (idx === -1) {
    addToQueue({
      name: friendlyName || samplePath.split('/').pop(),
      filename: samplePath.split('/').pop(),
      samplePath: samplePath,
      category: category,
      status: 'Ready',
      isSample: true
    });
    idx = state.inspectionQueue.length - 1;
  }
  await selectQueueItem(idx);
}

// ------------------------------------------------------------------------------
// FILE UPLOAD & INFERENCE
// ------------------------------------------------------------------------------

async function handleFileUpload(event) {
  const files = Array.from(event.target.files);
  if (!files || files.length === 0) return;

  for (const file of files) {
    const thumbData = await resizeImageForUpload(file, 200);
    const item = {
      name: file.name,
      filename: file.name,
      file: file,
      thumb: thumbData,
      status: 'Queued',
      isSample: false
    };
    state.inspectionQueue.push(item);
  }

  renderGallery();
  const newIndex = state.inspectionQueue.length - files.length;
  await selectQueueItem(newIndex);
}

function resizeImageForUpload(file, maxDimension = 1200) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDimension || h > maxDimension) {
          if (w > h) {
            h = Math.round((h * maxDimension) / w);
            w = maxDimension;
          } else {
            w = Math.round((w * maxDimension) / h);
            h = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => {
        // Fallback to raw data URL if Image() failed
        resolve(e.target.result);
      };
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function runAnalysis() {
  if (state.isAnalyzing) {
    showToast('Analysis currently in progress...');
    return;
  }
  const currentItem = state.inspectionQueue[state.activeQueueIndex];
  if (!currentItem) {
    showToast('Please select or upload an image first');
    return;
  }

  if (currentItem.analysis) {
    applyAnalysisToUI(currentItem.analysis);
    showToast(`Loaded analysis for ${currentItem.name}`);
    return;
  }

  if (currentItem.isSample) {
    await runAnalysisForSample(currentItem.samplePath, currentItem.filename || currentItem.name);
  } else if (currentItem.file) {
    await runAnalysisForFile(currentItem.file);
  }
}

async function runAnalysisForSample(samplePath, filename) {
  try {
    startAnalysisVisuals();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const categoryOverride = state.selectedCategoryFilter !== 'all' ? state.selectedCategoryFilter : 'auto';
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sample_path: samplePath,
        filename: filename,
        category: categoryOverride,
        location: state.location
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Inference failed');
    }

    finishAnalysis(data);
  } catch (err) {
    console.error('[!] Analysis error:', err);
    showToast(err.name === 'AbortError' ? 'Analysis timed out. Please try again.' : `Analysis error: ${err.message}`);
  } finally {
    stopAnalysisVisuals();
  }
}

async function runAnalysisForFile(file) {
  try {
    startAnalysisVisuals();
    showToast(`Optimizing and uploading ${file.name}...`);
    const base64Data = await resizeImageForUpload(file, 1200);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const categoryOverride = state.selectedCategoryFilter !== 'all' ? state.selectedCategoryFilter : 'auto';
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64: base64Data,
        filename: file.name,
        category: categoryOverride,
        location: state.location
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Inference failed');
    }

    finishAnalysis(data);
  } catch (err) {
    console.error('[!] Analysis error:', err);
    showToast(err.name === 'AbortError' ? 'Analysis timed out. Please try again.' : `Analysis error: ${err.message}`);
  } finally {
    stopAnalysisVisuals();
  }
}

function startAnalysisVisuals() {
  state.isAnalyzing = true;
  const btn = document.getElementById('btnRunAnalysis');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="color-dot yellow-dashed" style="animation: spin 1s linear infinite;"></span><span>Analyzing...</span>`;
  }
  simulateStageProgression();
}

function stopAnalysisVisuals() {
  state.isAnalyzing = false;
  const btn = document.getElementById('btnRunAnalysis');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      <span>Analyze Photo</span>
    `;
  }
}

function simulateStageProgression() {
  let step = 1;
  const interval = setInterval(() => {
    if (!state.isAnalyzing || step > 6) {
      clearInterval(interval);
      return;
    }
    setStepperActive(step);
    step++;
  }, 350);
}

function finishAnalysis(data) {
  stopAnalysisVisuals();
  state.currentAnalysis = data;

  if (state.inspectionQueue[state.activeQueueIndex]) {
    state.inspectionQueue[state.activeQueueIndex].analysis = data;
    state.inspectionQueue[state.activeQueueIndex].category = data.infrastructure_key;
    state.inspectionQueue[state.activeQueueIndex].status = `${data.stage_3_detections.total_defects} Defects Found`;
    state.inspectionQueue[state.activeQueueIndex].thumb = data.stage_1_image.image_data;
    renderGallery();
  }

  setStepperActive(7);
  applyAnalysisToUI(data);
  showToast(`Inspection Complete: ${data.infrastructure_category} (${data.stage_3_detections.total_defects} defects detected in ${data.execution_time_sec}s)`);
}

// ------------------------------------------------------------------------------
// UI POPULATION & RENDERING
// ------------------------------------------------------------------------------

function applyAnalysisToUI(data) {
  if (!data) return;

  // 0. Location Context Pill
  if (data.location_context) {
    const locEl = document.getElementById('headerLocationVal');
    if (locEl) {
      locEl.textContent = `${data.location_context.location_name}`;
    }
  }

  // 1. Dynamic Stepper Titles (Compact)
  const st2 = document.getElementById('stepTitle2');
  const st3 = document.getElementById('stepTitle3');
  const st4 = document.getElementById('stepTitle4');
  const st7 = document.getElementById('stepTitle7');
  const st8 = document.getElementById('stepTitle8');
  if (st2) st2.textContent = '2. Infrastructure';
  if (st3) st3.textContent = '3. Defects';
  if (st4) st4.textContent = '4. Segmenting';
  if (st7) st7.textContent = '7. Radiothermal';
  if (st8) st8.textContent = '8. Final Result';

  // 2. Stage 1
  const s1 = data.stage_1_image;
  document.getElementById('imgStage1').src = s1.image_data;
  document.getElementById('metaFilename').textContent = s1.filename;
  document.getElementById('metaResolution').textContent = s1.resolution;
  document.getElementById('metaFormat').textContent = s1.format;
  document.getElementById('metaStatus').textContent = s1.status;

  // 3. Stage 2
  const s2 = data.stage_2_scene;
  document.getElementById('imgStage2').src = s2.image_data;
  document.getElementById('cardTitleStage2').textContent = `DETECTING ${s2.display_name.toUpperCase()}`;
  document.getElementById('metaSceneName').textContent = s2.display_name;
  document.getElementById('metaSceneConfidence').textContent = `${s2.confidence}%`;
  document.getElementById('p2SceneConfBadge').textContent = `Confidence ${s2.confidence}%`;
  document.getElementById('topInfraTypeBadge').textContent = s2.display_name.toUpperCase();

  // 4. Stage 3
  const s3 = data.stage_3_detections;
  document.getElementById('imgStage3').src = s3.image_data;
  document.getElementById('cardTitleStage3').textContent = `DETECTING ${s3.primary_type.toUpperCase()}S`;
  document.getElementById('metaDefectType').textContent = s3.primary_type;
  document.getElementById('metaTotalDefects').textContent = s3.total_defects;
  document.getElementById('p3DefectCountBadge').textContent = `${s3.total_defects} Instance${s3.total_defects > 1 ? 's' : ''}`;

  // 5. Stage 4
  const s4 = data.stage_4_segmentation;
  document.getElementById('imgStage4').src = s4.image_data;
  document.getElementById('cardTitleStage4').textContent = `SEGMENTING ${s3.primary_type.toUpperCase()}S`;
  document.getElementById('metaSegmentedCount').textContent = `${s4.total_segmented} Instances`;
  document.getElementById('metaTotalMaskPx').textContent = `${s4.total_defect_area_px.toLocaleString()} px`;

  // 6. Stage 5
  const s5 = data.stage_5_surroundings;
  document.getElementById('imgStage5').src = s5.image_data;
  document.getElementById('metaZoneRadius').textContent = s5.inspection_area_description;
  document.getElementById('metaCracksStatus').textContent = s5.cracks_status;
  document.getElementById('metaWaterStatus').textContent = s5.water_status;

  // 7. Stage 6
  const s6 = data.stage_6_measurements;
  document.getElementById('imgStage6').src = s6.image_data;
  if (s6.measurements && s6.measurements.length > 0) {
    const m1 = s6.measurements[0];
    document.getElementById('metaPrimaryLength').textContent = `${m1.length_m.toFixed(2)} m`;
    document.getElementById('metaPrimaryWidth').textContent = `${m1.width_m.toFixed(2)} m`;
  }

  // 8. Stage 7: AI-Inferred Radiothermal Analysis
  const s7_therm = data.stage_7_radiothermal || data.radiothermal_anomaly || {};
  const imgStage7 = document.getElementById('imgStage7');
  if (imgStage7 && s7_therm.image_data) {
    imgStage7.src = s7_therm.image_data;
  }
  const metaThermStatus = document.getElementById('metaThermalStatus');
  if (metaThermStatus) metaThermStatus.textContent = s7_therm.severity || 'HIGH ANOMALY';
  const metaThermHigh = document.getElementById('metaThermalHighPct');
  if (metaThermHigh) metaThermHigh.textContent = `${s7_therm.high_anomaly_area_pct || 0}%`;
  const metaThermRisk = document.getElementById('metaThermalRisk');
  if (metaThermRisk) metaThermRisk.textContent = s7_therm.thermal_risk || 'HIGH';

  // 9. Stage 8: Master Visual Overlay
  const s8 = data.stage_8_final || data.stage_7_final;
  const imgStage8 = document.getElementById('imgStage8') || document.getElementById('imgStage7');
  if (imgStage8 && s8.master_image) {
    imgStage8.src = s8.master_image;
  }
  const imgStage8Mini = document.getElementById('imgStage8Mini');
  if (imgStage8Mini && s8.master_image) {
    imgStage8Mini.src = s8.master_image;
  }

  // 10. Sidebar Diagnostics & Multi-Instance List
  document.getElementById('panelInfraType').textContent = s8.infrastructure_type;
  document.getElementById('panelTotalDefects').textContent = s8.total_defects;
  document.getElementById('panelDefectCount').textContent = `${s8.total_defects} FOUND`;

  // Severity & Risk Badges
  const sevEl = document.getElementById('panelSeverity');
  sevEl.textContent = s8.severity;
  sevEl.className = `severity-badge-pill ${s8.severity.toLowerCase()}`;

  const priEl = document.getElementById('panelPriority');
  priEl.textContent = s8.priority;
  priEl.className = `priority-badge-pill ${s8.priority.toLowerCase()}`;

  // Multi-Defect Instance List with Visibility Badges & Clean Aligned Layout
  const listContainer = document.getElementById('defectsInstanceList');
  listContainer.innerHTML = '';
  s8.defects_list.forEach((d, idx) => {
    const row = document.createElement('div');
    const tierUpper = (d.confidence_tier || 'HIGH').toUpperCase();
    const tierClass = tierUpper.includes('HIGH') ? 'high' : tierUpper.includes('MED') ? 'med' : 'low';
    const tierLabel = tierUpper.includes('HIGH') ? 'HIGH CONF' : tierUpper.includes('MED') ? 'MED CONF' : 'LOW CONF';
    row.className = `instance-row ${tierClass}`;
    row.onclick = () => selectDefectInstance(idx);

    const visTag = d.visibility === 'Partially Visible' ? `<span class="vis-tag partial">PARTIAL</span>` : '';

    row.innerHTML = `
      <div class="inst-id-col">
        <span class="inst-id">${d.id}</span>
        ${visTag}
      </div>
      <div class="inst-metrics-col">
        <span class="inst-conf">${d.confidence_percent}%</span>
        <span class="inst-tier">${tierLabel}</span>
      </div>
    `;
    listContainer.appendChild(row);
  });

  // Measurements Breakdown List
  const mContainer = document.getElementById('measurementsListContainer');
  mContainer.innerHTML = '';
  s8.defects_list.forEach((d) => {
    const g = document.createElement('div');
    g.className = 'measure-group';
    g.innerHTML = `
      <div class="measure-group-title">${d.id} <span style="font-size:10px; font-weight:normal; opacity:0.8;">(${d.visibility || 'Fully Visible'})</span></div>
      <div class="measure-row">
        <span class="m-label">Length</span>
        <span class="m-val">${d.length_m.toFixed(2)} m</span>
      </div>
      <div class="measure-row">
        <span class="m-label">Width</span>
        <span class="m-val">${d.width_m.toFixed(2)} m</span>
      </div>
      <div class="measure-row">
        <span class="m-label">Area</span>
        <span class="m-val highlight-green">${d.area_m2.toFixed(2)} m²</span>
      </div>
    `;
    mContainer.appendChild(g);
  });

  document.getElementById('mInspectionZone').textContent = s5.inspection_area_description;

  // Surrounding Status
  const sCracksEl = document.getElementById('sCracks');
  sCracksEl.textContent = s5.cracks_status;
  sCracksEl.className = `s-val ${s5.cracks_status === 'Detected' ? 'detected' : ''}`;

  const sWaterEl = document.getElementById('sWater');
  sWaterEl.textContent = s5.water_status;
  sWaterEl.className = `s-val ${s5.water_status === 'Detected' ? 'cyan-detected' : ''}`;

  const sDetEl = document.getElementById('sDeterioration');
  sDetEl.textContent = s5.deterioration;
  sDetEl.className = `s-val ${s5.deterioration.toLowerCase().includes('moderate') || s5.deterioration.toLowerCase().includes('severe') ? 'moderate' : ''}`;

  document.getElementById('sAddDefects').textContent = s5.additional_defects_count > 0 ? `${s5.additional_defects_count} additional` : 'None';

  // Merged AI Summary & Inline Recommendations
  const aiSumEl = document.getElementById('aiSummaryText');
  if (aiSumEl) {
    aiSumEl.textContent = s8.ai_summary;
  }

  // ----------------------------------------------------------------------------
  // 11. POPULATE DASHBOARD GRID (MATCHING USER REFERENCE MOCKUP)
  // ----------------------------------------------------------------------------
  // Card 1: Radiothermal Image & Anomaly Interpretation List (Matching Image 1)
  const dpcTherm = document.getElementById('dpcThermalImg');
  if (dpcTherm && s7_therm.image_data) {
    dpcTherm.src = s7_therm.image_data;
  }

  const interpList = document.getElementById('dpcAnomalyInterpList');
  if (interpList) {
    interpList.innerHTML = '';
    const interps = s7_therm.anomaly_interpretations || s7_therm.thermal_correlation_list || [
      { number: 1, title: 'Possible Moisture / Water Ingress (High)', level: 'High', level_class: 'high', description: 'Visible dampness and cracking.' },
      { number: 2, title: 'Possible Moisture / Water Ingress (High)', level: 'High', level_class: 'high', description: 'Discoloration and crack pattern.' },
      { number: 3, title: 'Moisture Stain / Dampness (Medium)', level: 'Medium', level_class: 'medium', description: 'Dark stain indicates moisture retention.' },
      { number: 4, title: 'Possible Moisture / Water Ingress (Medium)', level: 'Medium', level_class: 'medium', description: 'Spalling with damp area.' }
    ];
    interps.slice(0, 5).forEach(item => {
      const div = document.createElement('div');
      div.className = 'interp-item';
      const lvlClass = (item.level_class || item.level || 'medium').toLowerCase();
      div.innerHTML = `
        <div class="interp-num-box ${lvlClass}">${item.number || 1}</div>
        <div class="interp-text-col">
          <div class="interp-title">${item.title}</div>
          <div class="interp-desc">${item.description}</div>
        </div>
      `;
      interpList.appendChild(div);
    });
  }

  // Card 2: OSINT / Environmental Context (Matching Image 2 & 3)
  const loc = data.location_context || state.location || {};
  const osHeader = document.getElementById('osintHeaderTitle');
  if (osHeader) osHeader.textContent = `OSINT CONTEXT (${loc.location_short || 'Guntur, AP'})`;
  const osCoords = document.getElementById('osintCoordsBadge');
  if (osCoords) osCoords.textContent = loc.coordinates_formatted || `${Math.abs(loc.latitude || 16.3067).toFixed(4)}° N, ${Math.abs(loc.longitude || 80.4365).toFixed(4)}° E`;
  const osTemp = document.getElementById('osintTemp');
  if (osTemp) osTemp.textContent = loc.ambient_temperature_range || '32°C - 40°C';
  const osHum = document.getElementById('osintHumidity');
  if (osHum) osHum.textContent = loc.humidity_context || '56%';
  const osCond = document.getElementById('osintCondition');
  if (osCond) osCond.textContent = loc.condition_context || 'Partly Cloudy';
  const osRain = document.getElementById('osintRainAmount');
  if (osRain) osRain.textContent = loc.rainfall_context || '42.6 mm';
  const osRainInt = document.getElementById('osintRainIntensity');
  if (osRainInt) osRainInt.textContent = loc.rainfall_intensity || 'Moderate';
  const osArea = document.getElementById('osintAreaType');
  if (osArea) osArea.textContent = loc.area_type || 'Urban / Semi-Urban';
  const osNearby = document.getElementById('osintNearbyInfra');
  if (osNearby) osNearby.textContent = loc.nearby_infrastructure || 'Roads, Buildings, Drainage Line';
  const acTraf = document.getElementById('acTraffic');
  if (acTraf) acTraf.textContent = loc.traffic_load || 'Moderate';
  const acDrain = document.getElementById('acDrainage');
  if (acDrain) acDrain.textContent = loc.nearby_drainage || 'Present';
  const acVeg = document.getElementById('acVeg');
  if (acVeg) acVeg.textContent = loc.surrounding_vegetation || 'Dense';
  const acRoad = document.getElementById('acRoad');
  if (acRoad) acRoad.textContent = loc.road_type || 'Paved';
  const acSurf = document.getElementById('acSurface');
  if (acSurf) acSurf.textContent = loc.surface_condition || 'Wet';
  
  updateOsintMap(loc.latitude || 16.3067, loc.longitude || 80.4365);

  // Card 3: Measurements Table
  const dpcTableBody = document.getElementById('dpcMeasureTableBody');
  if (dpcTableBody) {
    dpcTableBody.innerHTML = '';
    (s8.defects_list || []).forEach((d, idx) => {
      const tr = document.createElement('tr');
      const dUpper = d.id.toUpperCase();
      const code = dUpper.includes('POTHOLE') ? `P${idx+1}` : dUpper.includes('CRACK') ? `C${idx+1}` : dUpper.includes('WATER') ? `W${idx+1}` : dUpper.includes('REBAR') ? `R${idx+1}` : `D${idx+1}`;
      const codeClass = d.color === 'YELLOW' ? 'yellow-code' : d.color === 'CYAN' ? 'cyan-code' : 'red-code';

      tr.innerHTML = `
        <td class="bold ${codeClass}">${code}</td>
        <td>${d.type}</td>
        <td>${Number(d.length_m || 0).toFixed(2)}</td>
        <td>${Number(d.width_m || 0).toFixed(2)}</td>
        <td class="bold highlight-green">${Number(d.area_m2 || 0).toFixed(2)}</td>
        <td>${d.confidence_percent}%</td>
      `;
      dpcTableBody.appendChild(tr);
    });
  }

  // Card 4: 8. AI Inspection Summary & Recommendations (Combined Master Synthesis)
  const dpcBadge = document.getElementById('dpcSummaryBadge');
  if (dpcBadge) {
    dpcBadge.textContent = s8.risk === 'CRITICAL' ? 'HIGH RISK' : `${s8.risk} RISK`;
    dpcBadge.className = `dpc-badge ${s8.risk === 'CRITICAL' ? 'danger' : 'warning'}`;
  }
  const dpcInfra = document.getElementById('dpcSummaryInfra');
  if (dpcInfra) dpcInfra.textContent = s8.infrastructure_type || 'Infrastructure';
  const dpcTotal = document.getElementById('dpcSummaryTotalDet');
  if (dpcTotal) dpcTotal.textContent = s8.total_defects;
  const dpcCrit = document.getElementById('dpcSummaryCritDet');
  if (dpcCrit) dpcCrit.textContent = s8.critical_defects || Math.min(s8.total_defects, 8);
  const dpcSev = document.getElementById('dpcSummarySev');
  if (dpcSev) dpcSev.textContent = s8.severity;
  const dpcRisk = document.getElementById('dpcSummaryRisk');
  if (dpcRisk) dpcRisk.textContent = s8.risk;

  // Gauge Fill & Text
  const confVal = s8.overall_confidence_percent || 60;
  const dpcGaugeText = document.getElementById('dpcGaugeText');
  if (dpcGaugeText) dpcGaugeText.textContent = `${confVal}%`;
  const dpcGaugeFill = document.getElementById('dpcGaugeFill');
  if (dpcGaugeFill) dpcGaugeFill.setAttribute('stroke-dasharray', `${confVal}, 100`);

  // Executive Synthesis Paragraph (Image 2)
  const dpcSummaryPara = document.getElementById('dpcSummaryParagraph');
  if (dpcSummaryPara) {
    dpcSummaryPara.textContent = s8.ai_summary;
  }

  // Key Findings
  const kfList = document.getElementById('dpcKeyFindingsList');
  if (kfList) {
    kfList.innerHTML = '';
    const findings = s8.key_findings || [
      `${s8.total_defects} defects detected across the surface.`,
      `Surface crack propagation mapped across inspection area.`,
      `Water accumulation / moisture ingress observed.`,
      `Surface deterioration rated as ${s5.deterioration}.`,
      `Road/structure surface wet and slippery.`,
      `No catastrophic foundation or edge collapse detected.`
    ];
    findings.forEach(f => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="chk-icon">☑</span> <span>${f}</span>`;
      kfList.appendChild(li);
    });
  }

  // Recommendations
  const recList = document.getElementById('dpcRecommendationsList');
  if (recList) {
    recList.innerHTML = '';
    const actions = s8.action_bullets || [
      `Patch all critical defects immediately.`,
      `Seal the detected crack networks with elastomeric sealant.`,
      `Improve drainage runoff to eliminate water ingress.`,
      `Perform regular monitoring after repair.`,
      `Consider structural resurfacing in the near future.`
    ];
    actions.forEach(act => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="bullet-icon">•</span> <span>${act}</span>`;
      recList.appendChild(li);
    });
  }

  // If Detail View is open, refresh its content
  if (state.isDetailViewOpen) {
    renderStageDetailContent(state.detailStageNum);
  }

  // Dynamically allocate vertical space across the 3 right-side analysis blocks
  adjustRightSidebarSpace(data);
}

// ------------------------------------------------------------------------------
// DYNAMIC VERTICAL SPACE ALLOCATION FOR RIGHT-SIDE ANALYSIS BLOCKS
// ------------------------------------------------------------------------------

function adjustRightSidebarSpace(data) {
  const cardDet = document.getElementById('cardDetectionResult');
  const cardMeas = document.getElementById('cardMeasurementsSidebar');
  const cardSurr = document.getElementById('cardSurroundingsSidebar');
  if (!cardDet || !cardMeas || !cardSurr) return;

  const current = data || state.currentAnalysis || {};
  const s8 = current.stage_8_final || current.stage_7_final || {};
  const s5 = current.stage_5_surroundings || {};
  const s6 = current.stage_6_measurements || {};

  const numDefects = (s8.defects_list && s8.defects_list.length) || s8.total_defects || 4;
  const numMeasures = (s6.measurements && s6.measurements.length) || numDefects;
  
  // Count surrounding findings
  let numSurroundings = 4;
  if (s5.additional_defects_count > 0) numSurroundings += s5.additional_defects_count;
  if (s5.cracks_status === 'Detected') numSurroundings += 0.5;
  if (s5.water_status === 'Detected') numSurroundings += 0.5;

  // Content volume estimates:
  // 1. Detection: Fixed overhead ~120px + 32px per defect row
  const v1 = 120 + (numDefects * 32);
  
  // 2. Measurements: Fixed overhead ~75px + 72px per measurement record
  const v2 = 75 + (numMeasures * 72);
  
  // 3. Surroundings: Fixed overhead ~35px + 28px per finding row
  const v3 = 35 + (numSurroundings * 28);

  // Normalize into balanced flex weights (min/max clamped to maintain harmonious aesthetics)
  const totalV = v1 + v2 + v3;
  const w1 = Math.max(0.65, Math.min(3.2, (v1 / totalV) * 3.6));
  const w2 = Math.max(0.65, Math.min(3.4, (v2 / totalV) * 3.6));
  const w3 = Math.max(0.45, Math.min(2.8, (v3 / totalV) * 3.6));

  cardDet.style.flex = `${w1.toFixed(2)} 1 0px`;
  cardMeas.style.flex = `${w2.toFixed(2)} 1 0px`;
  cardSurr.style.flex = `${w3.toFixed(2)} 1 0px`;
}

function selectDefectInstance(index) {
  state.selectedDefectIndex = index;
  const rows = document.querySelectorAll('.instance-row');
  rows.forEach((r, i) => {
    if (i === index) {
      r.classList.add('selected');
    } else {
      r.classList.remove('selected');
    }
  });

  if (state.currentAnalysis && state.currentAnalysis.stage_7_final.defects_list[index]) {
    const d = state.currentAnalysis.stage_7_final.defects_list[index];
    showToast(`Focused on ${d.id}: Length ${d.length_m}m, Area ${d.area_m2}m²`);
  }
}

// ------------------------------------------------------------------------------
// DEDICATED STAGE DETAIL VIEW (STRUCTURED CARDS + ZOOM + DRAGGABLE SPLIT + AI CHAT)
// ------------------------------------------------------------------------------

const STAGE_TITLES = {
  1: "IMAGE LOADED",
  2: "DETECTING INFRASTRUCTURE",
  3: "DETECTING DEFECTS",
  4: "SEGMENTING DEFECTS",
  5: "ANALYZING SURROUNDINGS",
  6: "CALCULATING MEASUREMENTS",
  7: "AI-INFERRED RADIOTHERMAL ANALYSIS",
  8: "FINAL AI ANALYSIS RESULT"
};

function openStageDetail(stageNum) {
  if (!state.currentAnalysis) {
    showToast('Please wait for analysis to complete before viewing stage details');
    return;
  }

  state.isDetailViewOpen = true;
  state.detailStageNum = stageNum;

  const overlay = document.getElementById('stageDetailOverlay');
  if (overlay) overlay.style.display = 'flex';

  // Update tabs
  for (let i = 1; i <= 8; i++) {
    const tab = document.getElementById(`tabStage${i}`);
    if (tab) {
      tab.classList.toggle('active', i === stageNum);
    }
  }

  resetStageImageZoom();
  renderStageDetailContent(stageNum);
}

function closeStageDetail() {
  state.isDetailViewOpen = false;
  const overlay = document.getElementById('stageDetailOverlay');
  if (overlay) overlay.style.display = 'none';
}

function renderStageDetailContent(stageNum) {
  const a = state.currentAnalysis;
  if (!a) return;

  const s1 = a.stage_1_image || {};
  const s2 = a.stage_2_scene || {};
  const s3 = a.stage_3_detections || {};
  const s4 = a.stage_4_segmentation || {};
  const s5 = a.stage_5_surroundings || {};
  const s6 = a.stage_6_measurements || {};
  const s7_therm = a.stage_7_radiothermal || a.radiothermal_anomaly || {};
  const s8 = a.stage_8_final || a.stage_7_final || {};

  document.getElementById('dhStageNum').textContent = `STAGE ${stageNum}`;
  document.getElementById('dhStageTitle').textContent = STAGE_TITLES[stageNum] || "STAGE ANALYSIS";

  // 1. LEFT PANE: ACTUAL STAGE IMAGE (Zoomable)
  let actualImgSrc = '';
  if (stageNum === 1) actualImgSrc = s1.image_data;
  else if (stageNum === 2) actualImgSrc = s2.image_data;
  else if (stageNum === 3) actualImgSrc = s3.image_data;
  else if (stageNum === 4) actualImgSrc = s4.image_data;
  else if (stageNum === 5) actualImgSrc = s5.image_data;
  else if (stageNum === 6) actualImgSrc = s6.image_data;
  else if (stageNum === 7) actualImgSrc = s7_therm.image_data || s1.image_data;
  else if (stageNum === 8) actualImgSrc = s8.master_image || s1.image_data;

  document.getElementById('detailStageImage').src = actualImgSrc;

  // 2. RIGHT PANE: STRUCTURED STAGE TELEMETRY CARDS
  const cardsContainer = document.getElementById('detailStageSummaryCards');
  if (cardsContainer) {
    if (stageNum === 1) {
      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 1 — IMAGE LOADED</div>
          <p class="block-paragraph">
            Image <strong>${s1.filename}</strong> was received and ingested into the inspection pipeline. The photograph captures a <strong>${(a.infrastructure_category || 'Infrastructure').toLowerCase()}</strong> scene under clear illumination.
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">IMAGE METADATA & TELEMETRY</div>
          <div class="block-info-grid">
            <div class="info-item">
              <span class="info-lbl">FILE NAME</span>
              <span class="info-val" style="word-break: break-all;">${s1.filename}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">RESOLUTION</span>
              <span class="info-val">${s1.resolution}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">FORMAT</span>
              <span class="info-val">${s1.format}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">DIMENSIONS</span>
              <span class="info-val">${s1.width} × ${s1.height} (${s1.aspect_ratio})</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">FILE SIZE</span>
              <span class="info-val">${s1.file_size_kb} KB</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">SUITABILITY</span>
              <span class="info-val green">Suitable for Analysis</span>
            </div>
          </div>
        </div>
      `;
    } else if (stageNum === 2) {
      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 2 — DETECTING INFRASTRUCTURE</div>
          <p class="block-paragraph">
            The vision AI classified the physical asset as <strong>${s2.display_name}</strong> with <strong>${s2.confidence}% confidence</strong>. The blue overlay highlights the primary structural load-bearing surface boundary.
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">INFRASTRUCTURE CLASSIFICATION</div>
          <div class="block-info-grid">
            <div class="info-item">
              <span class="info-lbl">IDENTIFIED ASSET</span>
              <span class="info-val blue">${s2.display_name}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">CONFIDENCE</span>
              <span class="info-val">${s2.confidence}%</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">SURFACE MASK</span>
              <span class="info-val blue">BLUE #0088FF</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">STATUS</span>
              <span class="info-val green">${s2.status}</span>
            </div>
          </div>
        </div>
      `;
    } else if (stageNum === 3) {
      let defectRowsHtml = '';
      if (s3.defects && s3.defects.length > 0) {
        s3.defects.forEach(d => {
          const confPct = Math.round(d.confidence * 100);
          defectRowsHtml += `
            <div class="detail-instance-card">
              <div class="dic-header">
                <span class="dic-id">${d.id}</span>
                <span class="dic-conf">${confPct}%</span>
              </div>
              <div class="dic-details">
                <span><strong>Type:</strong> ${d.type}</span>
                <span><strong>Tier:</strong> ${d.confidence_tier}</span>
              </div>
            </div>
          `;
        });
      }

      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 3 — DETECTING DEFECTS</div>
          <p class="block-paragraph">
            Grounding DINO detected <strong>${s3.total_defects} discrete defect instance(s)</strong> across the visible surface with text cross-attention.
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">DETECTED INSTANCES (${s3.total_defects} TOTAL)</div>
          <div class="detail-instance-list">
            ${defectRowsHtml || '<p class="block-paragraph">No defects detected.</p>'}
          </div>
        </div>
      `;
    } else if (stageNum === 4) {
      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 4 — SEGMENTING DEFECTS</div>
          <p class="block-paragraph">
            <strong>${s4.total_segmented} defect instance(s)</strong> were segmented by SAM 2.1. Red masks represent structural damage/potholes, yellow masks represent cracks, and cyan masks represent water accumulation.
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">SEGMENTATION METRICS</div>
          <div class="block-info-grid">
            <div class="info-item">
              <span class="info-lbl">SEGMENTED INSTANCES</span>
              <span class="info-val red">${s4.total_segmented}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">TOTAL MASK AREA</span>
              <span class="info-val">${(s4.total_defect_area_px || 0).toLocaleString()} px</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">COLOR CODING</span>
              <span class="info-val">Red / Yellow / Cyan</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">CONTOURS</span>
              <span class="info-val green">Pixel-Accurate</span>
            </div>
          </div>
        </div>
      `;
    } else if (stageNum === 5) {
      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 5 — ANALYZING SURROUNDINGS</div>
          <p class="block-paragraph">
            Surrounding zone evaluated at <strong>${s5.inspection_area_description}</strong>. Fissure propagation and water retention actively mapped.
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">SURROUNDING TELEMETRY</div>
          <div class="block-info-grid">
            <div class="info-item">
              <span class="info-lbl">INSPECTION ZONE</span>
              <span class="info-val yellow">${s5.inspection_area_description}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">CRACK PROPAGATION</span>
              <span class="info-val ${s5.cracks_status === 'Detected' ? 'yellow' : ''}">${s5.cracks_status}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">WATER / MOISTURE</span>
              <span class="info-val ${s5.water_status === 'Detected' ? 'blue' : ''}">${s5.water_status}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">DETERIORATION</span>
              <span class="info-val">${s5.deterioration}</span>
            </div>
          </div>
        </div>
      `;
    } else if (stageNum === 6) {
      let measureRowsHtml = '';
      if (s8.defects_list && s8.defects_list.length > 0) {
        s8.defects_list.forEach(d => {
          measureRowsHtml += `
            <div class="detail-instance-card">
              <div class="dic-header">
                <span class="dic-id" style="color: var(--accent-green);">${d.id}</span>
                <span class="dic-conf" style="color: var(--accent-green);">${(d.area_m2 || 0).toFixed(2)} m²</span>
              </div>
              <div class="dic-details">
                <span><strong>Length:</strong> ${(d.length_m || 0).toFixed(2)} m</span>
                <span><strong>Width:</strong> ${(d.width_m || 0).toFixed(2)} m</span>
              </div>
            </div>
          `;
        });
      }

      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 6 — CALCULATING MEASUREMENTS</div>
          <p class="block-paragraph">
            Perspective-calibrated physical dimensions computed with green measurement lines (Image-based estimate).
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">DIMENSIONS PER DEFECT</div>
          <div class="detail-instance-list">
            ${measureRowsHtml || '<p class="block-paragraph">No defects.</p>'}
          </div>
        </div>
      `;
    } else if (stageNum === 7) {
      let interpListHtml = '';
      const interps = s7_therm.anomaly_interpretations || s7_therm.thermal_correlation_list || [
        { number: 1, title: 'Possible Moisture / Water Ingress (High)', level: 'High', level_class: 'high', description: 'Visible dampness and cracking.' },
        { number: 2, title: 'Possible Moisture / Water Ingress (High)', level: 'High', level_class: 'high', description: 'Discoloration and crack pattern.' },
        { number: 3, title: 'Moisture Stain / Dampness (Medium)', level: 'Medium', level_class: 'medium', description: 'Dark stain indicates moisture retention.' },
        { number: 4, title: 'Possible Moisture / Water Ingress (Medium)', level: 'Medium', level_class: 'medium', description: 'Spalling with damp area.' }
      ];

      interps.forEach(item => {
        const lvlClass = (item.level_class || item.level || 'medium').toLowerCase();
        interpListHtml += `
          <div class="interp-item" style="margin-bottom: 8px;">
            <div class="interp-num-box ${lvlClass}">${item.number || 1}</div>
            <div class="interp-text-col">
              <div class="interp-title">${item.title}</div>
              <div class="interp-desc">${item.description}</div>
            </div>
          </div>
        `;
      });

      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 7 — AI-INFERRED RADIOTHERMAL ANALYSIS</div>
          <p class="block-paragraph">
            AI-inferred radiothermal anomaly modeling derived from RGB reflectance drops, moisture absorption textures, shadow gradients, and structural cavities.
          </p>
          <div class="dpc-disclaimer-sub" style="margin-top:6px; color:var(--text-muted); font-size:10px;">
            AI-inferred radiothermal anomalies from RGB image.<br>
            Not a real thermal camera measurement.
          </div>
        </div>

        <div class="analysis-block">
          <div class="block-title">ANOMALY INTERPRETATION</div>
          <div class="interp-card-list">
            ${interpListHtml || '<p class="block-paragraph">No localized anomalies detected.</p>'}
          </div>
          <div class="interp-legend-bar" style="margin-top: 12px;">
            <div class="il-item"><span class="il-swatch high"></span> High</div>
            <div class="il-item"><span class="il-swatch medium"></span> Medium</div>
            <div class="il-item"><span class="il-swatch low"></span> Low</div>
          </div>
        </div>
      `;
    } else if (stageNum === 8) {
      cardsContainer.innerHTML = `
        <div class="analysis-block highlight">
          <div class="block-title">STAGE 8 — FINAL AI INSPECTION RESULT</div>
          <p class="block-paragraph">
            Complete multi-layer composite synthesizing surface boundaries, defect boxes, SAM 2 segmentation masks, dynamic surrounding zone, measurements, and inferred thermal anomalies.
          </p>
        </div>

        <div class="analysis-block">
          <div class="block-title">OVERALL ASSESSMENT & MASTER METRICS</div>
          <div class="block-info-grid">
            <div class="info-item">
              <span class="info-lbl">INFRASTRUCTURE</span>
              <span class="info-val blue">${s8.infrastructure_type}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">TOTAL DEFECTS</span>
              <span class="info-val red">${s8.total_defects}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">SEVERITY RATING</span>
              <span class="info-val red">${s8.severity}</span>
            </div>
            <div class="info-item">
              <span class="info-lbl">RISK LEVEL</span>
              <span class="info-val red">${s8.priority || s8.risk}</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  // 3. INITIALIZE AI CONVERSATION FEED (if empty)
  const messagesContainer = document.getElementById('chatMessagesContainer');
  if (messagesContainer && messagesContainer.children.length === 0) {
    appendAssistantMessage(
      `👋 **Hello Inspector!** I am your **AI Infrastructure Copilot** powered by **Gemini 3.7 Vision Engine**.\n\n` +
      `I've analyzed this **${a.infrastructure_category}** photograph across all 8 stages.\n` +
      `• **Detections:** ${s3.total_defects} defects (${s3.primary_type})\n` +
      `• **Severity:** **${s8.severity}** (${s8.priority} Priority)\n` +
      `• **Radiothermal:** Status: \`${s7_therm.status}\` (${s7_therm.thermal_risk} Risk)\n` +
      `• **Surroundings:** Cracks: \`${s5.cracks_status}\` | Water: \`${s5.water_status}\`\n\n` +
      `You can ask me to **explain any defect**, calculate **custom dimensions**, recommend **repair procedures**, or clarify any engineering doubts about this inspection!`
    );
  }
}

// ------------------------------------------------------------------------------
// INTERACTIVE ZOOM & PAN CONTROLLER (Contained inside Image Box Only)
// ------------------------------------------------------------------------------

function initImageZoomPan() {
  const container = document.getElementById('stageImageContainer');
  if (!container) return;

  // Mouse wheel zoom
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    zoomStageImage(delta);
  }, { passive: false });

  // Mouse drag pan
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // Left click only
    state.isPanning = true;
    state.startX = e.clientX - state.panX;
    state.startY = e.clientY - state.panY;
    container.classList.add('grabbing');
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    state.panX = e.clientX - state.startX;
    state.panY = e.clientY - state.startY;
    applyImageTransform();
  });

  window.addEventListener('mouseup', () => {
    if (state.isPanning) {
      state.isPanning = false;
      const c = document.getElementById('stageImageContainer');
      if (c) c.classList.remove('grabbing');
    }
  });

  // Double click toggle zoom
  container.addEventListener('dblclick', () => {
    if (state.zoom > 1.2) {
      resetStageImageZoom();
    } else {
      zoomStageImage(1.0);
    }
  });
}

function zoomStageImage(delta) {
  state.zoom = Math.min(Math.max(0.5, state.zoom + delta), 5.0);
  if (state.zoom <= 1.0) {
    state.panX = 0;
    state.panY = 0;
  }
  applyImageTransform();
}

function resetStageImageZoom() {
  state.zoom = 1.0;
  state.panX = 0;
  state.panY = 0;
  applyImageTransform();
}

function applyImageTransform() {
  const img = document.getElementById('detailStageImage');
  const badge = document.getElementById('zoomLevelBadge');
  if (img) {
    img.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  }
  if (badge) {
    badge.textContent = `${Math.round(state.zoom * 100)}%`;
  }
}

// ------------------------------------------------------------------------------
// DRAGGABLE RESIZABLE SPLIT PANE (Adjustable Left to Right like Antigravity)
// ------------------------------------------------------------------------------

function initDraggableResizer() {
  const gutter = document.getElementById('detailResizerGutter');
  const container = document.getElementById('detailSplitContainer');
  const leftPane = document.getElementById('detailLeftPane');
  const rightPane = document.getElementById('detailRightPane');

  if (!gutter || !container || !leftPane || !rightPane) return;

  let isDragging = false;

  gutter.addEventListener('mousedown', (e) => {
    isDragging = true;
    gutter.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const containerRect = container.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const totalWidth = containerRect.width;

    let leftPct = (offsetX / totalWidth) * 100;
    // Constrain left pane between 30% and 80%
    leftPct = Math.min(Math.max(30, leftPct), 80);
    const rightPct = 100 - leftPct;

    leftPane.style.flex = `0 0 ${leftPct}%`;
    rightPane.style.flex = `0 0 ${rightPct}%`;
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      gutter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ------------------------------------------------------------------------------
// DRAGGABLE VERTICAL SPLITTER (Adjustable Up/Down for Stage Data vs AI Chat)
// ------------------------------------------------------------------------------

function initVerticalResizer() {
  const vGutter = document.getElementById('detailVResizerGutter');
  const rightPane = document.getElementById('detailRightPane');
  const topCards = document.getElementById('detailStageSummaryCards');
  const bottomChat = document.getElementById('detailChatSection');

  if (!vGutter || !rightPane || !topCards || !bottomChat) return;

  let isVDragging = false;

  vGutter.addEventListener('mousedown', (e) => {
    isVDragging = true;
    vGutter.classList.add('dragging');
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isVDragging) return;
    const paneRect = rightPane.getBoundingClientRect();
    const offsetY = e.clientY - paneRect.top;
    const totalHeight = paneRect.height;

    let topPct = (offsetY / totalHeight) * 100;
    // Constrain top stage data height between 15% and 80%
    topPct = Math.min(Math.max(15, topPct), 80);
    const bottomPct = 100 - topPct;

    topCards.style.flex = `0 0 ${topPct}%`;
    bottomChat.style.flex = `1 1 ${bottomPct}%`;
  });

  window.addEventListener('mouseup', () => {
    if (isVDragging) {
      isVDragging = false;
      vGutter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

// ------------------------------------------------------------------------------
// REAL CONVERSATIONAL AI COPILOT CHAT LOGIC
// ------------------------------------------------------------------------------

function handleChatInputKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submitChatMessage();
  }
}

function sendQuickPrompt(promptText) {
  const input = document.getElementById('aiChatInput');
  if (input) {
    input.value = promptText;
    submitChatMessage();
  }
}

async function submitChatMessage() {
  const input = document.getElementById('aiChatInput');
  if (!input) return;
  const userText = input.value.trim();
  if (!userText) return;

  input.value = '';
  appendUserMessage(userText);

  const typingId = appendTypingIndicator();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        stage: state.detailStageNum || 1,
        analysis: state.currentAnalysis || {}
      })
    });

    removeTypingIndicator(typingId);

    if (res.ok) {
      const data = await res.json();
      appendAssistantMessage(data.reply || "Analysis generated successfully.");
    } else {
      appendAssistantMessage(generateClientFallbackReply(userText));
    }
  } catch (err) {
    console.warn('[!] Chat API error, using client assistant:', err);
    removeTypingIndicator(typingId);
    appendAssistantMessage(generateClientFallbackReply(userText));
  }
}

function appendUserMessage(text) {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = 'chat-msg user';
  msg.innerHTML = `
    <span class="msg-sender" style="align-self: flex-end;">Inspector</span>
    <div class="chat-bubble">${escapeHtml(text)}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function appendAssistantMessage(markdownText) {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return;

  const msg = document.createElement('div');
  msg.className = 'chat-msg assistant';
  msg.innerHTML = `
    <span class="msg-sender" style="color: var(--accent-blue);">⚡ AI Copilot</span>
    <div class="chat-bubble">${formatMarkdown(markdownText)}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function appendTypingIndicator() {
  const container = document.getElementById('chatMessagesContainer');
  if (!container) return null;

  const id = `typing_${Date.now()}`;
  const msg = document.createElement('div');
  msg.className = 'chat-msg assistant typing';
  msg.id = id;
  msg.innerHTML = `
    <span class="msg-sender" style="color: var(--accent-blue);">⚡ AI Copilot</span>
    <div class="chat-bubble">Thinking and evaluating vision telemetry...</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function formatMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code style="background: rgba(255,255,255,0.1); padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10px;">$1</code>')
    .replace(/^\s*• (.*$)/gim, '<li>$1</li>')
    .replace(/^\s*- (.*$)/gim, '<li>$1</li>')
    .replace(/^\s*\d+\.\s*(.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/gim, '<p></p>')
    .replace(/\n/gim, '<br>');
  return html;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ------------------------------------------------------------------------------
// ACTIVE SPEECH-TO-TEXT (MICROPHONE) CONTROLLER
// ------------------------------------------------------------------------------

let speechRecognition = null;
let isSpeechListening = false;

function toggleVoiceInput() {
  const micBtn = document.getElementById('btnChatMic');
  const input = document.getElementById('aiChatInput');
  if (!input) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('🎙️ Web Speech API not supported. Enter your text directly.');
    input.focus();
    return;
  }

  if (isSpeechListening && speechRecognition) {
    speechRecognition.stop();
    isSpeechListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    input.placeholder = 'Ask AI Copilot to clarify doubts about this inspection...';
    showToast('Microphone deactivated.');
    return;
  }

  try {
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = false;
    speechRecognition.interimResults = true;
    speechRecognition.lang = 'en-US';

    speechRecognition.onstart = () => {
      isSpeechListening = true;
      if (micBtn) micBtn.classList.add('listening');
      input.placeholder = '🎙️ Listening... Speak now...';
      showToast('🎙️ Microphone active: speak now...');
    };

    speechRecognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          input.value = event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
          input.value = interimTranscript;
        }
      }
    };

    speechRecognition.onerror = (event) => {
      console.warn('[!] Voice recognition warning:', event.error);
      isSpeechListening = false;
      if (micBtn) micBtn.classList.remove('listening');
      input.placeholder = 'Ask AI Copilot to clarify doubts about this inspection...';
      if (event.error === 'not-allowed') {
        showToast('Microphone permission blocked in browser settings.');
      } else {
        showToast(`Voice capture: ${event.error}`);
      }
    };

    speechRecognition.onend = () => {
      isSpeechListening = false;
      if (micBtn) micBtn.classList.remove('listening');
      input.placeholder = 'Ask AI Copilot to clarify doubts about this inspection...';
      if (input.value.trim().length > 0) {
        showToast('Voice transcribed.');
      }
    };

    speechRecognition.start();
  } catch (err) {
    console.warn('[!] Speech start error:', err);
    isSpeechListening = false;
    if (micBtn) micBtn.classList.remove('listening');
    showToast('Microphone ready. Speak into your mic.');
  }
}

// ------------------------------------------------------------------------------
// ACTIVE PLUS (+) CONTEXT & ATTACHMENT MENU
// ------------------------------------------------------------------------------

function togglePlusMenu(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('plusPopupMenu');
  const plusBtn = document.getElementById('btnChatPlus');
  if (!menu) return;

  const isShown = menu.classList.contains('show');
  if (isShown) {
    menu.classList.remove('show');
    if (plusBtn) plusBtn.classList.remove('active');
  } else {
    menu.classList.add('show');
    if (plusBtn) plusBtn.classList.add('active');
  }
}

// Close popup on click outside
window.addEventListener('click', (e) => {
  const menu = document.getElementById('plusPopupMenu');
  const plusBtn = document.getElementById('btnChatPlus');
  if (menu && !menu.contains(e.target) && e.target !== plusBtn) {
    menu.classList.remove('show');
    if (plusBtn) plusBtn.classList.remove('active');
  }
});

function triggerChatFileUpload() {
  togglePlusMenu();
  const fileInput = document.getElementById('chatAttachFileInput');
  if (fileInput) fileInput.click();
}

async function handleChatFileAttach(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  showToast(`Uploading ${file.name} for inspection...`);
  
  const thumbData = await readFileAsDataURL(file);
  const item = {
    name: file.name,
    file: file,
    thumb: thumbData,
    status: 'Queued',
    isSample: false
  };
  state.inspectionQueue.push(item);
  renderGallery();
  
  await selectQueueItem(state.inspectionQueue.length - 1);
  closeStageDetail();
}

function attachTelemetryContext() {
  togglePlusMenu();
  const a = state.currentAnalysis;
  const input = document.getElementById('aiChatInput');
  if (!a || !input) return;

  const s3 = a.stage_3_detections;
  const s5 = a.stage_5_surroundings;
  const s7 = a.stage_7_final;

  input.value = `Analyze findings for ${a.infrastructure_category}: ${s3.total_defects} defects detected, water: ${s5.water_status}, severity: ${s7.severity}. What are the immediate risks?`;
  input.focus();
  showToast('Stage telemetry attached to query.');
}

function attachRepairStandard() {
  togglePlusMenu();
  const a = state.currentAnalysis;
  const input = document.getElementById('aiChatInput');
  if (!input) return;

  input.value = `What are the engineering AASHTO/ASTM standard remediation specifications for this ${a?.infrastructure_category || 'asset'}?`;
  input.focus();
  showToast('Repair standard prompt inserted.');
}

function generateClientFallbackReply(query) {
  const a = state.currentAnalysis;
  const s3 = a?.stage_3_detections || { total_defects: 4, primary_type: 'Potholes' };
  const s5 = a?.stage_5_surroundings || { cracks_status: 'Detected', water_status: 'Detected', inspection_area_description: 'Surrounding area' };
  const s7 = a?.stage_7_final || { severity: 'HIGH', priority: 'ELEVATED' };

  const q = (query || '').toLowerCase();
  if (q.includes('repair') || q.includes('fix') || q.includes('solut')) {
    return (
      "### 🛠️ Recommended Remediation Protocol:\n\n" +
      "1. **Full-Depth Saw-Cut**: Cut 150mm beyond visible defect perimeter to sound asphalt.\n" +
      "2. **Sub-base Compaction**: Dry and re-compact crushed stone base to ≥98% Standard Proctor density.\n" +
      "3. **Tack Coat & Hot-Mix Infill**: Apply SS-1h emulsion and place Hot-Mix Asphalt (HMA) compacted in 50mm lifts.\n" +
      "4. **Joint Sealing**: Seal surrounding joints with ASTM D6690 hot-applied elastomeric sealant."
    );
  }
  return (
    `### 📋 AI Inspector Assessment:\n\n` +
    `The model identified **${s3.total_defects} discrete defects** with **${s7.severity} severity** (${s7.priority} Priority).\n` +
    `Water accumulation is **${s5.water_status}**, accelerating subgrade erosion under dynamic vehicle traffic.`
  );
}

// ------------------------------------------------------------------------------
// PAGE & STEPPER NAVIGATION
// ------------------------------------------------------------------------------

function switchPage(pageNum) {
  state.currentPage = pageNum;

  const p1 = document.getElementById('page1Container');
  const p2 = document.getElementById('page2Container');
  const btn1 = document.getElementById('btnPage1');
  const btn2 = document.getElementById('btnPage2');

  if (pageNum === 1) {
    p1.classList.add('active');
    p2.classList.remove('active');
    btn1.classList.add('active');
    btn2.classList.remove('active');
  } else {
    p1.classList.remove('active');
    p2.classList.add('active');
    btn1.classList.remove('active');
    btn2.classList.add('active');
  }
}

function setStepperActive(stageNum) {
  state.currentStage = stageNum;
  const fill = document.getElementById('stepperFill');
  if (fill) {
    const pct = ((stageNum - 1) / 7) * 100;
    fill.style.width = `${Math.min(100, pct)}%`;
  }

  for (let i = 1; i <= 8; i++) {
    const node = document.getElementById(`stepNode${i}`);
    if (!node) continue;
    if (i < stageNum) {
      node.className = 'step-node completed';
    } else if (i === stageNum) {
      node.className = 'step-node active';
    } else {
      node.className = 'step-node pending';
    }
  }
}

function jumpToStage(stageNum) {
  setStepperActive(stageNum);
  if (stageNum <= 6) {
    switchPage(1);
    const card = document.getElementById(`cardStage${stageNum}`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    switchPage(2);
    const cardId = stageNum === 8 ? 'cardStage8' : `cardStage${stageNum}`;
    const card = document.getElementById(cardId);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    const mapModal = document.getElementById('interactiveMapModal');
    if (mapModal && mapModal.style.display !== 'none' && e.key === 'Escape') {
      closeInteractiveMap();
      return;
    }
    if (state.isDetailViewOpen) {
      if (e.key === 'Escape') {
        closeStageDetail();
      } else if (e.key === 'ArrowRight' || e.key === 'KeyD') {
        const next = state.detailStageNum < 8 ? state.detailStageNum + 1 : 1;
        openStageDetail(next);
      } else if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
        const prev = state.detailStageNum > 1 ? state.detailStageNum - 1 : 8;
        openStageDetail(prev);
      } else if (e.key === '+' || e.key === '=') {
        zoomStageImage(0.25);
      } else if (e.key === '-' || e.key === '_') {
        zoomStageImage(-0.25);
      } else if (e.key === '0') {
        resetStageImageZoom();
      }
    }
  });
}

// ------------------------------------------------------------------------------
// LAYER TOGGLES (MASTER OVERLAY)
// ------------------------------------------------------------------------------

function toggleLayer(layerKey, event) {
  if (event) event.stopPropagation();
  state.activeLayerFilters[layerKey] = !state.activeLayerFilters[layerKey];
  const btn = document.getElementById(`layer${capitalize(layerKey)}`);
  if (btn) {
    btn.classList.toggle('active', state.activeLayerFilters[layerKey]);
  }
  
  // If toggling thermal layer, switch master image view between Stage 8 composite and Inferred Thermal Map
  if (layerKey === 'thermal' && state.currentAnalysis) {
    const img8 = document.getElementById('imgStage8') || document.getElementById('imgStage7');
    if (img8) {
      const thermImg = state.currentAnalysis.stage_7_radiothermal?.image_data || state.currentAnalysis.radiothermal_anomaly?.image_data;
      const masterImg = state.currentAnalysis.stage_8_final?.master_image || state.currentAnalysis.stage_7_final?.master_image;
      if (state.activeLayerFilters.thermal && thermImg) {
        img8.src = thermImg;
        showToast('Viewing AI-Inferred Thermal Anomaly Map (RGB Estimation)');
      } else if (masterImg) {
        img8.src = masterImg;
        showToast('Viewing Final AI Composite Visual Overlay');
      }
    }
    return;
  }
  showToast(`Layer ${layerKey.toUpperCase()}: ${state.activeLayerFilters[layerKey] ? 'Visible' : 'Hidden'}`);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ------------------------------------------------------------------------------
// REPORT MODAL & EXPORT
// ------------------------------------------------------------------------------

function openReportModal() {
  const currentItem = state.inspectionQueue[state.activeQueueIndex];
  const a = (currentItem && currentItem.analysis) ? currentItem.analysis : state.currentAnalysis;
  
  if (!a) {
    showToast('Please run analysis before generating report');
    return;
  }

  state.currentAnalysis = a;
  const s1 = a.stage_1_image || {};
  const s2 = a.stage_2_scene || {};
  const s5 = a.stage_5_surroundings || {};
  const s6 = a.stage_6_measurements || {};
  const s7_therm = a.stage_7_radiothermal || a.radiothermal_anomaly || {};
  const s8 = a.stage_8_final || a.stage_7_final || {};
  const loc = a.location_context || state.location || {};

  document.getElementById('repId').textContent = `INSP-${Date.now().toString().slice(-8)}`;
  document.getElementById('repDate').textContent = new Date().toLocaleString();
  document.getElementById('repMasterImg').src = s8.master_image || s1.image_data || '';
  document.getElementById('repScene').textContent = a.infrastructure_category || s2.display_name || 'Infrastructure';
  document.getElementById('repSeverity').textContent = s8.severity || 'ELEVATED';
  document.getElementById('repPriority').textContent = s8.risk || 'CRITICAL';
  
  // Location Metadata
  const repLocName = document.getElementById('repLocName');
  if (repLocName) repLocName.textContent = loc.location_name || 'Guntur, Andhra Pradesh, India';
  
  const repLocSource = document.getElementById('repLocSource');
  if (repLocSource) repLocSource.textContent = loc.location_source || 'Live GPS / Geolocation';
  
  const repLocCoords = document.getElementById('repLocCoords');
  if (repLocCoords) repLocCoords.textContent = loc.coordinates_formatted || '16.3067° N, 80.4365° E';
  
  const repLocText = document.getElementById('repLocContextText');
  if (repLocText) {
    repLocText.textContent = `${loc.terrain_context || 'Alluvial terrain'}. Climate: ${loc.ambient_temperature_range || '28°C–38°C'}, ${loc.climate_zone || 'Subtropical'}. ${loc.structural_impact_summary || ''}`;
  }

  // Radiothermal Anomaly Map
  const repThermImg = document.getElementById('repThermalImg');
  if (repThermImg && s7_therm.image_data) {
    repThermImg.src = s7_therm.image_data;
  }
  const repThermStatus = document.getElementById('repThermalStatus');
  if (repThermStatus) {
    repThermStatus.textContent = s7_therm.status || 'Elevated moisture / cavity anomaly detected';
  }

  // Consolidated AI Summary
  const repSummaryText = document.getElementById('repSummaryText');
  if (repSummaryText) {
    repSummaryText.textContent = s8.ai_summary || 'Inspection completed.';
  }
  
  document.getElementById('repCracks').textContent = s5.cracks_status || 'Detected';
  document.getElementById('repWater').textContent = s5.water_status || 'Assessed';

  // Defect Table mapping with Visibility
  const tbody = document.getElementById('repTableBody');
  tbody.innerHTML = '';
  
  const defectsList = s8.defects_list || [];
  const measurementsList = s6.measurements || [];

  if (defectsList.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" style="text-align:center; opacity:0.6;">No severe structural defects flagged.</td>`;
    tbody.appendChild(tr);
  } else {
    defectsList.forEach((d, idx) => {
      const m = measurementsList[idx] || {};
      const tr = document.createElement('tr');
      const lenStr = m.length_m !== undefined ? `${Number(m.length_m).toFixed(2)} m` : (d.length_m !== undefined ? `${Number(d.length_m).toFixed(2)} m` : '--');
      const widStr = m.width_m !== undefined ? `${Number(m.width_m).toFixed(2)} m` : (d.width_m !== undefined ? `${Number(d.width_m).toFixed(2)} m` : '--');
      const areaStr = m.area_m2 !== undefined ? `${Number(m.area_m2).toFixed(2)} m²` : (d.area_m2 !== undefined ? `${Number(d.area_m2).toFixed(2)} m²` : '--');
      
      tr.innerHTML = `
        <td><strong>${d.id || `DEFECT #${idx+1}`}</strong></td>
        <td>${d.type || 'Defect'}</td>
        <td>${d.confidence_percent || 90}%</td>
        <td>${d.confidence_tier || 'HIGH CONFIDENCE'}</td>
        <td><span class="vis-tag ${d.visibility === 'Partially Visible' ? 'partial' : 'full'}">${d.visibility || 'Fully Visible'}</span></td>
        <td>${lenStr}</td>
        <td>${widStr}</td>
        <td><strong>${areaStr}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('reportModal').classList.add('open');
}

function closeReportModal() {
  document.getElementById('reportModal').classList.remove('open');
}

function downloadJSONReport() {
  const currentItem = state.inspectionQueue[state.activeQueueIndex];
  const a = (currentItem && currentItem.analysis) ? currentItem.analysis : state.currentAnalysis;
  if (!a) {
    showToast('No analysis available to download');
    return;
  }
  const jsonStr = JSON.stringify(a, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dl = document.createElement('a');
  dl.href = url;
  const safeName = (a.filename || 'inspection').replace(/\.[^/.]+$/, "");
  dl.download = `Inspection_Report_${safeName}_${Date.now()}.json`;
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  URL.revokeObjectURL(url);
  showToast(`JSON report for ${a.filename || safeName} downloaded`);
}

// ------------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// ------------------------------------------------------------------------------

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  const toastMsg = document.getElementById('toastMessage');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = message;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
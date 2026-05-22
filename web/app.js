const ncCenter = [-22.25, 166.72];
const ncOperationalFocus = {
  lat: -19.9795167,
  lon: 166.8157,
  zoom: 6.44,
  globeHeight: 2600000,
};
const ncViewBounds = [
  [-22.75, 165.65],
  [-21.75, 166.85],
];

const vessels = [];
const alerts = [];
const satelliteTileUrl = "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const warmedTiles = new Set();
let coordinateFormat = localStorage.getItem("coss-watch-coord-format") || "dm";
if (!["dm", "dms", "dd"].includes(coordinateFormat)) coordinateFormat = "dm";

const map = L.map("map", {
  minZoom: 4,
  zoomControl: false,
  worldCopyJump: true,
  scrollWheelZoom: false,
  zoomAnimation: true,
  zoomAnimationThreshold: 8,
  fadeAnimation: false,
  markerZoomAnimation: true,
  inertia: true,
  inertiaDeceleration: 2600,
  inertiaMaxSpeed: 1200,
  zoomSnap: 0,
  zoomDelta: 0.25,
  wheelDebounceTime: 0,
  wheelPxPerZoomLevel: 240,
  easeLinearity: 0.12,
}).setView(ncCenter, 9);
window.cossMap = map;

L.control.zoom({ position: "bottomright" }).addTo(map);

L.tileLayer(satelliteTileUrl, {
  maxZoom: 13,
  attribution: "Satellite &copy; Esri",
  className: "base-tiles",
  zIndex: 1,
  keepBuffer: 10,
  updateWhenZooming: false,
  updateWhenIdle: true,
  updateInterval: 70,
  crossOrigin: true,
}).addTo(map);

function stabilizeMapView() {
  map.invalidateSize();
}

window.addEventListener("load", () => {
  stabilizeMapView();
  setTimeout(stabilizeMapView, 250);
  setTimeout(stabilizeMapView, 1000);
});

window.addEventListener("resize", () => {
  map.invalidateSize();
});

function removeVisibleMapMarkers() {
  markerLayer?.clearLayers();
  trafficLayer?.clearLayers();
  selectedTrackLayer?.clearLayers();
  markers?.clear();
  trafficMarkers.length = 0;
  trafficMarkerById.clear();
  const markerPane = map.getPane("markerPane");
  const shadowPane = map.getPane("shadowPane");
  [markerPane, shadowPane].filter(Boolean).forEach((pane) => {
    pane.replaceChildren();
    pane.style.display = "none";
    pane.style.visibility = "hidden";
    pane.style.opacity = "0";
    pane.style.pointerEvents = "none";
  });
  hideTrackPreview();
}

function markerScale() {
  const zoom = map.getZoom();
  return Math.max(0.38, Math.min(0.74, 0.42 + (zoom - 5) * 0.06));
}

function applyMarkerScale() {
  document.documentElement.style.setProperty("--track-scale", markerScale().toFixed(2));
}

let zoomMotionTimer = null;
function setZoomMotion(active) {
  const mapElement = document.getElementById("map");
  if (!mapElement) return;
  window.clearTimeout(zoomMotionTimer);
  mapElement.classList.toggle("zoom-motion", active);
  mapElement.classList.toggle("zoom-settling", active);
  if (active) {
    zoomMotionTimer = window.setTimeout(() => {
      mapElement.classList.remove("zoom-motion", "zoom-settling");
    }, 280);
  }
}

map.on("zoomstart", () => setZoomMotion(true));
map.on("zoom", () => setZoomMotion(true));
map.on("zoomend", () => {
  applyMarkerScale();
  renderCityLabels();
  window.clearTimeout(zoomMotionTimer);
  zoomMotionTimer = window.setTimeout(() => setZoomMotion(false), 80);
});

function bindSmoothWheelZoom() {
  const container = map.getContainer();
  const zoomPanes = ["tilePane", "overlayPane", "markerPane", "shadowPane"]
    .map((pane) => map.getPane(pane))
    .filter(Boolean);
  const baseTransforms = new Map();
  let baseZoom = map.getZoom();
  let targetZoom = baseZoom;
  let visualZoom = baseZoom;
  let anchorPoint = map.getSize().divideBy(2);
  let frame = null;
  let commitTimer = null;
  let active = false;

  function warmTilesForZoom(zoom) {
    const tileZoom = Math.round(Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), zoom)));
    const bounds = map.getBounds().pad(0.34);
    const northWest = map.project(bounds.getNorthWest(), tileZoom).divideBy(256).floor();
    const southEast = map.project(bounds.getSouthEast(), tileZoom).divideBy(256).floor();
    const minX = Math.max(0, northWest.x - 1);
    const maxX = southEast.x + 1;
    const minY = Math.max(0, northWest.y - 1);
    const maxY = southEast.y + 1;

    for (let x = minX; x <= maxX; x += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        const key = `${tileZoom}/${y}/${x}`;
        if (warmedTiles.has(key)) continue;
        warmedTiles.add(key);
        const image = new Image();
        image.decoding = "async";
        image.crossOrigin = "anonymous";
        image.src = satelliteTileUrl
          .replace("{z}", tileZoom)
          .replace("{y}", y)
          .replace("{x}", x);
      }
    }
  }

  function startVisualZoom() {
    if (active) return;
    active = true;
    baseZoom = map.getZoom();
    targetZoom = baseZoom;
    visualZoom = baseZoom;
    baseTransforms.clear();
    zoomPanes.forEach((pane) => {
      baseTransforms.set(pane, pane.style.transform || "");
      pane.style.transition = "none";
      pane.style.willChange = "transform";
    });
  }

  function applyVisualZoom() {
    const scale = Math.pow(2, visualZoom - baseZoom);
    zoomPanes.forEach((pane) => {
      pane.style.transformOrigin = `${anchorPoint.x}px ${anchorPoint.y}px`;
      pane.style.transform = `${baseTransforms.get(pane) || ""} scale(${scale})`;
    });
  }

  function resetVisualZoom() {
    zoomPanes.forEach((pane) => {
      pane.style.transform = baseTransforms.get(pane) || "";
      pane.style.transformOrigin = "";
      pane.style.transition = "";
      pane.style.willChange = "";
    });
    active = false;
  }

  function commitZoom() {
    const finalZoom = targetZoom;
    if (active && Math.abs(targetZoom - visualZoom) > 0.018) {
      window.clearTimeout(commitTimer);
      commitTimer = window.setTimeout(commitZoom, 55);
      if (!frame) frame = window.requestAnimationFrame(step);
      return;
    }
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = null;
    }
    visualZoom = finalZoom;
    applyVisualZoom();
    resetVisualZoom();
    map.setZoomAround(anchorPoint, finalZoom, { animate: false });
    targetZoom = map.getZoom();
    setZoomMotion(false);
    applyMarkerScale();
  }

  function step() {
    visualZoom += (targetZoom - visualZoom) * 0.17;
    applyVisualZoom();
    if (Math.abs(targetZoom - visualZoom) < 0.0025) {
      visualZoom = targetZoom;
      applyVisualZoom();
      frame = null;
      return;
    }
    frame = window.requestAnimationFrame(step);
  }

  container.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      startVisualZoom();
      anchorPoint = map.mouseEventToContainerPoint(event);
      const delta = Math.max(-220, Math.min(220, event.deltaY));
      const direction = delta > 0 ? -1 : 1;
      const force = Math.min(1.45, Math.max(0.28, Math.abs(delta) / 110));
      targetZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), targetZoom + direction * force * 0.15));
      warmTilesForZoom(targetZoom);
      warmTilesForZoom(targetZoom + direction * 0.55);
      setZoomMotion(true);
      window.clearTimeout(commitTimer);
      commitTimer = window.setTimeout(commitZoom, 470);
      if (!frame) frame = window.requestAnimationFrame(step);
    },
    { passive: false },
  );
  map.on("zoomend", () => {
    if (!active) targetZoom = map.getZoom();
  });
}

bindSmoothWheelZoom();

function formatCoordinate(value, axis, format = coordinateFormat) {
  if (!Number.isFinite(value)) return "--";
  const absolute = Math.abs(value);
  const hemisphere = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";

  if (format === "dd") return `${absolute.toFixed(6)}° ${hemisphere}`;
  if (format === "dms") {
    const degrees = Math.floor(absolute);
    const minuteFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minuteFloat);
    const seconds = (minuteFloat - minutes) * 60;
    return `${degrees}°${minutes.toString().padStart(2, "0")}'${seconds.toFixed(2).padStart(5, "0")}" ${hemisphere}`;
  }

  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;
  return `${degrees}°${minutes.toFixed(3)}' ${hemisphere}`;
}

function updateCoordinateHud(latlng = null) {
  const center = map.getCenter();
  const cursorLat = document.getElementById("cursorLat");
  const cursorLon = document.getElementById("cursorLon");
  const centerLat = document.getElementById("centerLat");
  const centerLon = document.getElementById("centerLon");
  const zoomLevel = document.getElementById("zoomLevel");

  if (latlng && cursorLat && cursorLon) {
    cursorLat.textContent = `LAT ${formatCoordinate(latlng.lat, "lat")}`;
    cursorLon.textContent = `LON ${formatCoordinate(latlng.lng, "lon")}`;
  }

  if (centerLat) centerLat.textContent = `LAT ${formatCoordinate(center.lat, "lat")}`;
  if (centerLon) centerLon.textContent = `LON ${formatCoordinate(center.lng, "lon")}`;
  if (zoomLevel) zoomLevel.textContent = `Z ${map.getZoom().toFixed(2)}`;
}

map.on("mousemove", (event) => updateCoordinateHud(event.latlng));
map.on("move zoom zoomend", () => updateCoordinateHud());
updateCoordinateHud();

const zoneLayer = L.layerGroup().addTo(map);
const landLayer = L.layerGroup().addTo(map);
const eezLayer = L.layerGroup().addTo(map);
const maritimeComplementLayer = L.layerGroup().addTo(map);
const protectedAreaLayer = L.layerGroup().addTo(map);
const cityLabelLayer = L.layerGroup().addTo(map);
const trackLayer = L.layerGroup().addTo(map);
const selectedTrackLayer = L.layerGroup().addTo(map);
const trafficLayer = L.layerGroup().addTo(map);
const markerLayer = L.layerGroup().addTo(map);
const markers = new Map();
const trafficMarkers = [];
const trafficMarkerById = new Map();
const tracks = new Map();
const globeTrackSymbols = new Map();
const globeTraceEntities = [];
const globeIconCache = new Map();
const globeCityEntities = [];
const globeReferenceSources = [];
const globeLaneEntities = [];
let globeTrackCollection = null;
let globeOceanEntity = null;
let globeViewer = null;
let globeMode = false;
let globePickHandler = null;
let globeReferencesLoaded = false;
let globeLanesLoaded = false;
let globeMarkerRefreshFrame = null;
let globeMarkerCleanupTimer = null;
let aisSocket = null;
let aisRelaySource = null;
const aisRelayBaseUrl = "http://127.0.0.1:8790";
let aisConnected = false;
const liveVesselByMmsi = new Map();
const liveShipProfiles = new Map();
const liveVessels = [];
let selectedTrackId = null;
let activeFilter = "all";
const maxLiveVessels = 650;

const trafficTypes = ["cargo", "fishing", "tanker", "passenger", "watch"];
const cityLabels = [
  { name: "Noumea", lat: -22.2758, lon: 166.458 },
  { name: "Mont-Dore", lat: -22.2833, lon: 166.5833 },
  { name: "Paita", lat: -22.1333, lon: 166.35 },
  { name: "Dumbea", lat: -22.15, lon: 166.45 },
  { name: "Bourail", lat: -21.5667, lon: 165.4833 },
  { name: "Moindou", lat: -21.6833, lon: 165.6833 },
  { name: "Sarramea", lat: -21.6333, lon: 165.85 },
  { name: "Farino", lat: -21.6667, lon: 165.7833 },
  { name: "Poya", lat: -21.35, lon: 165.15 },
  { name: "La Foa", lat: -21.71, lon: 165.82 },
  { name: "Boulouparis", lat: -21.87, lon: 166.05 },
  { name: "Thio", lat: -21.61, lon: 166.22 },
  { name: "Yate", lat: -22.1667, lon: 166.95 },
  { name: "Poindimie", lat: -20.9333, lon: 165.3333 },
  { name: "Hienghene", lat: -20.6833, lon: 164.95 },
  { name: "Pouebo", lat: -20.4, lon: 164.5667 },
  { name: "Poum", lat: -20.2333, lon: 164.0167 },
  { name: "Canala", lat: -21.5333, lon: 165.95 },
  { name: "Houailou", lat: -21.2833, lon: 165.6167 },
  { name: "Kouaoua", lat: -21.4, lon: 165.8167 },
  { name: "Kone", lat: -21.06, lon: 164.86 },
  { name: "Koumac", lat: -20.56, lon: 164.28 },
  { name: "Lifou", lat: -20.92, lon: 167.26 },
  { name: "Mare", lat: -21.52, lon: 167.98 },
  { name: "Ouvea", lat: -20.65, lon: 166.57 },
  { name: "Ile des Pins", lat: -22.61, lon: 167.48 },
  { name: "Port Vila", lat: -17.74, lon: 168.32 },
];
const trafficAnchors = [
  { lat: -22.36, lon: 166.42, spreadLat: 0.22, spreadLon: 0.34, count: 42 },
  { lat: -22.62, lon: 166.88, spreadLat: 0.28, spreadLon: 0.45, count: 34 },
  { lat: -21.3, lon: 168.35, spreadLat: 0.55, spreadLon: 0.75, count: 28 },
  { lat: -20.7, lon: 164.0, spreadLat: 0.7, spreadLon: 0.58, count: 28 },
  { lat: -23.15, lon: 167.15, spreadLat: 0.75, spreadLon: 0.9, count: 42 },
  { lat: -18.9, lon: 168.75, spreadLat: 0.75, spreadLon: 0.95, count: 20 },
  { lat: 1.22, lon: 104.05, spreadLat: 1.35, spreadLon: 2.6, count: 46 },
  { lat: 22.0, lon: 121.0, spreadLat: 3.2, spreadLon: 4.4, count: 38 },
  { lat: 35.2, lon: 140.2, spreadLat: 2.1, spreadLon: 3.6, count: 34 },
  { lat: 26.4, lon: 55.4, spreadLat: 2.3, spreadLon: 3.2, count: 34 },
  { lat: 30.1, lon: 32.6, spreadLat: 2.2, spreadLon: 2.8, count: 30 },
  { lat: 36.1, lon: -5.4, spreadLat: 2.2, spreadLon: 3.8, count: 32 },
  { lat: 51.1, lon: 2.0, spreadLat: 1.7, spreadLon: 4.4, count: 36 },
  { lat: 9.1, lon: -79.7, spreadLat: 2.1, spreadLon: 3.2, count: 28 },
  { lat: 33.6, lon: -118.2, spreadLat: 2.8, spreadLon: 4.4, count: 30 },
  { lat: 40.4, lon: -73.5, spreadLat: 2.5, spreadLon: 4.2, count: 28 },
  { lat: -34.2, lon: 18.2, spreadLat: 3.0, spreadLon: 4.2, count: 26 },
  { lat: -33.9, lon: 151.6, spreadLat: 2.8, spreadLon: 4.5, count: 28 },
];

const worldPortLabels = [
  { name: "Singapore", lat: 1.29, lon: 103.85 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Tokyo", lat: 35.68, lon: 139.76 },
  { name: "Sydney", lat: -33.86, lon: 151.21 },
  { name: "Los Angeles", lat: 33.74, lon: -118.27 },
  { name: "Panama", lat: 9.08, lon: -79.68 },
  { name: "Rotterdam", lat: 51.95, lon: 4.14 },
  { name: "Gibraltar", lat: 36.14, lon: -5.35 },
  { name: "Suez", lat: 29.97, lon: 32.55 },
  { name: "Cape Town", lat: -33.92, lon: 18.42 },
];

const shippingLanes = [
  [[1.29, 103.85], [5.5, 95.5], [12.0, 80.0], [14.0, 52.0], [29.97, 32.55], [36.14, -5.35], [51.95, 4.14]],
  [[31.23, 121.47], [22.3, 120.0], [1.29, 103.85], [-10.0, 112.0], [-33.86, 151.21]],
  [[35.68, 139.76], [22.3, 145.0], [5.0, 155.0], [-22.25, 166.72], [-33.86, 151.21]],
  [[33.74, -118.27], [20.0, -130.0], [5.0, -155.0], [-22.25, 166.72], [35.68, 139.76]],
  [[40.7, -74.0], [25.7, -80.1], [9.08, -79.68], [-15.0, -85.0], [-33.0, -72.0]],
  [[-33.92, 18.42], [-20.0, 45.0], [14.0, 52.0], [26.4, 55.4]],
];

const protectedAreaBaseUrl =
  "https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/aires_protegees_gouvnc/FeatureServer";
const maritimeComplementItemId = "32febf48278148ac844129800127424a";
const maritimeComplementFallbackUrls = [
  "https://data.gouv.nc/api/explore/v2.1/catalog/datasets/delimitations-maritimes-complements/exports/geojson?lang=fr&timezone=Pacific%2FNoumea",
  "https://data.gouv.nc/api/explore/v2.1/catalog/datasets/delimitations-maritimes/exports/geojson?lang=fr&timezone=Pacific%2FNoumea",
];

function featureServiceQueryUrl(layerId) {
  return `${protectedAreaBaseUrl}/${layerId}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Service indisponible: ${response.status}`);
  return response.json();
}

function arcgisQueryUrl(url) {
  const cleanUrl = url.replace(/\?.*$/, "").replace(/\/$/, "");
  if (/\/(FeatureServer|MapServer)\/\d+$/i.test(cleanUrl)) {
    return `${cleanUrl}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
  }
  return `${cleanUrl}/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson`;
}

async function resolveArcgisItemGeojsonUrls(itemId) {
  const sharingBases = [
    "https://dtsi-sgt.maps.arcgis.com/sharing/rest/content/items",
    "https://www.arcgis.com/sharing/rest/content/items",
  ];

  for (const base of sharingBases) {
    try {
      const item = await fetchJson(`${base}/${itemId}?f=json`);
      if (item.url && /(FeatureServer|MapServer)/i.test(item.url)) {
        const serviceInfo = await fetchJson(`${item.url.replace(/\/$/, "")}?f=json`).catch(() => null);
        if (serviceInfo?.layers?.length && !/\/(FeatureServer|MapServer)\/\d+$/i.test(item.url)) {
          return serviceInfo.layers.map((layer) => arcgisQueryUrl(`${item.url.replace(/\/$/, "")}/${layer.id}`));
        }
        return [arcgisQueryUrl(item.url)];
      }

      const data = await fetchJson(`${base}/${itemId}/data?f=json`).catch(() => null);
      const operationalLayers = data?.operationalLayers || data?.baseMap?.baseMapLayers || [];
      const urls = operationalLayers
        .map((layer) => layer.url)
        .filter((url) => url && /(FeatureServer|MapServer)/i.test(url))
        .map(arcgisQueryUrl);
      if (urls.length) return urls;
    } catch (error) {
      console.warn("Item ArcGIS non resolu", base, error);
    }
  }

  return [];
}

const backgroundTraffic = [];

async function renderEez() {
  eezLayer.clearLayers();
  const maritimeSpaceUrl =
    "https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/delimitation_espace_maritime/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson";

  try {
    const response = await fetch(maritimeSpaceUrl);
    if (!response.ok) throw new Error(`Service espace maritime indisponible: ${response.status}`);
    const geojson = await response.json();
    const maritimeFeature = geojson.features?.[0];
    const area = maritimeFeature?.properties?.surk_km2;

    if (area) {
      document.getElementById("maritimeArea").textContent = Math.round(area).toLocaleString("fr-FR");
    }

    L.geoJSON(geojson, {
      style: {
        color: "#52ead6",
        weight: 1.4,
        opacity: 0.62,
        fillColor: "#52ead6",
        fillOpacity: 0.01,
        dashArray: "10 8",
      },
      interactive: true,
      onEachFeature: (feature, layer) => {
        const properties = feature.properties || {};
        layer.bindTooltip(
          `Espace maritime NC | ${Math.round(properties.surk_km2 || 0).toLocaleString("fr-FR")} km2`,
          { sticky: true },
        );
      },
    }).addTo(eezLayer);
  } catch (error) {
    console.warn("Espace maritime officiel non charge", error);
  }
}

function maritimeComplementCategory(properties) {
  return Object.values(properties || {})
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
}

function maritimeComplementStyle(feature) {
  const category = maritimeComplementCategory(feature.properties);
  const isBase = category.includes("ligne de base") || category.includes("point de base");
  const isTerritorial = category.includes("territorial");
  const isContiguous = category.includes("contigu");
  const isTwoHundred = category.includes("200") || category.includes("unclos");
  const isBoundary = category.includes("front") || category.includes("bilateral") || category.includes("bilat");
  const isProvince = category.includes("province") || category.includes("commune");

  const color = isBase
    ? "#ffbf69"
    : isTerritorial
      ? "#52ead6"
      : isContiguous
        ? "#a78bfa"
        : isTwoHundred
          ? "#d8f5e4"
          : isBoundary
            ? "#ffd166"
            : isProvince
              ? "#72ff83"
              : "#8fd3ff";

  return {
    color,
    weight: isBase || isBoundary ? 1.5 : 1.05,
    opacity: isTwoHundred ? 0.56 : 0.68,
    fillColor: color,
    fillOpacity: 0.015,
    dashArray: isBase ? "3 5" : isBoundary ? "8 6" : isProvince ? "2 7" : "11 9",
  };
}

function maritimeComplementTooltip(properties) {
  const name =
    properties.nom ||
    properties.NOM ||
    properties.name ||
    properties.Name ||
    properties.libelle ||
    properties.LIBELLE ||
    properties.type ||
    properties.Type ||
    "Delimitation maritime";
  return `<div class="zone-tooltip"><strong>${name}</strong><span>Delimitations maritimes complementaires</span></div>`;
}

async function renderMaritimeComplements() {
  maritimeComplementLayer.clearLayers();
  const resolvedUrls = await resolveArcgisItemGeojsonUrls(maritimeComplementItemId);
  const urls = [...resolvedUrls, ...maritimeComplementFallbackUrls];

  for (const url of urls) {
    try {
      const geojson = await fetchJson(url);
      if (!geojson?.features?.length) continue;
      L.geoJSON(geojson, {
        style: maritimeComplementStyle,
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, {
            radius: 3,
            color: maritimeComplementStyle(feature).color,
            weight: 1,
            opacity: 0.82,
            fillOpacity: 0.28,
          }),
        interactive: true,
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(maritimeComplementTooltip(feature.properties || {}), { sticky: true });
        },
      }).addTo(maritimeComplementLayer);
      return;
    } catch (error) {
      console.warn("Delimitations maritimes complementaires non chargees", error);
    }
  }
}

async function renderLandReferences() {
  landLayer.clearLayers();
}

function formatAreaKm2(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString("fr-FR", { maximumFractionDigits: number >= 100 ? 0 : 1 });
}

function protectedAreaStyle(feature) {
  const properties = feature.properties || {};
  const type = String(properties.type || properties.Type || "").toLowerCase();
  const isIntegral = type.includes("integr");
  const isNatural = type.includes("nature");

  return {
    color: isIntegral ? "#ff5d8f" : isNatural ? "#ffc857" : "#a78bfa",
    weight: isIntegral ? 1.35 : 1.15,
    opacity: 0.82,
    fillColor: isIntegral ? "#ff5d8f" : isNatural ? "#ffc857" : "#a78bfa",
    fillOpacity: isIntegral ? 0.14 : 0.1,
    dashArray: isIntegral ? "4 4" : "8 7",
  };
}

function protectedAreaTooltip(properties) {
  const name = properties.nom || properties.NOM || properties.name || "Aire protegee";
  const zone = properties.zone || properties.Zone || "Nouvelle-Caledonie";
  const type = properties.type || properties.Type || "Zone reglementee";
  const surface = properties.surface_km || properties.surf_km || properties.Shape__Area;
  const areaText = surface === properties.Shape__Area ? formatAreaKm2(Number(surface) / 1000000) : formatAreaKm2(surface);

  return `
    <div class="zone-tooltip">
      <strong>${name}</strong>
      <span>${type}</span>
      <span>${zone} | ${areaText} km2</span>
    </div>
  `;
}

async function renderProtectedAreas() {
  protectedAreaLayer.clearLayers();
  const protectedCount = document.getElementById("protectedCount");

  const layers = [
    {
      url: featureServiceQueryUrl(1),
      style: {
        color: "#49f4e3",
        weight: 1.5,
        opacity: 0.66,
        fillColor: "#49f4e3",
        fillOpacity: 0.025,
        dashArray: "12 9",
      },
      interactive: true,
      tooltip: (properties) => {
        const name = properties.nom || properties.NOM || "Parc naturel de la mer de Corail";
        return `<div class="zone-tooltip"><strong>${name}</strong><span>Limite officielle du parc naturel</span></div>`;
      },
    },
    {
      url: featureServiceQueryUrl(0),
      style: protectedAreaStyle,
      interactive: true,
      tooltip: protectedAreaTooltip,
      countable: true,
    },
  ];

  try {
    const results = await Promise.all(
      layers.map(async (layer) => {
        const response = await fetch(layer.url);
        if (!response.ok) throw new Error(`Couche aires protegees indisponible: ${response.status}`);
        const geojson = await response.json();
        L.geoJSON(geojson, {
          style: layer.style,
          interactive: layer.interactive,
          onEachFeature: (feature, leafletLayer) => {
            leafletLayer.bindTooltip(layer.tooltip(feature.properties || {}), {
              className: "protected-tooltip",
              sticky: true,
              opacity: 0.98,
            });
          },
        }).addTo(protectedAreaLayer);
        return layer.countable ? geojson.features?.length || 0 : 0;
      }),
    );

    protectedCount.textContent = results.reduce((total, count) => total + count, 0).toLocaleString("fr-FR");
  } catch (error) {
    protectedCount.textContent = "--";
    console.warn("Aires protegees officielles non chargees", error);
  }
}

function renderCityLabels() {
  cityLabelLayer.clearLayers();
}

function hasCesium() {
  return typeof window.Cesium !== "undefined";
}

function globePosition(track, height = 13000) {
  return Cesium.Cartesian3.fromDegrees(track.lon, track.lat, height);
}

function globeMarkerColor(track) {
  if (track.status === "critical") return "#ff4242";
  if (track.status === "priority" || track.type === "watch") return "#ffbf69";
  if (track.type === "fishing") return "#cb38ff";
  if (track.type === "cargo") return "#72ff83";
  if (track.type === "tanker") return "#ff8a57";
  if (track.type === "passenger") return "#4aa3ff";
  if (track.type === "live") return "#39d7ff";
  return "#52ead6";
}

function globeMarkerImage(color) {
  if (globeIconCache.has(color)) return globeIconCache.get(color);

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.translate(32, 31);
  ctx.shadowColor = color;
  ctx.shadowBlur = 13;
  ctx.beginPath();
  ctx.moveTo(0, -25);
  ctx.lineTo(15, 19);
  ctx.lineTo(0, 11);
  ctx.lineTo(-15, 19);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.82;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.72)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const image = canvas.toDataURL("image/png");
  globeIconCache.set(color, image);
  return image;
}

function globeMarkerScale(track) {
  if (!globeViewer) return 0.45;
  const height = globeViewer.camera.positionCartographic.height;
  const base = Math.max(0.14, Math.min(0.58, 700000 / Math.max(height, 900000)));
  return track.id.startsWith("traffic-") ? base * 0.68 : base;
}

function offsetLatLon(lat, lon, bearingDeg, meters) {
  const radius = 6378137;
  const bearing = Cesium.Math.toRadians(bearingDeg);
  const latRad = Cesium.Math.toRadians(lat);
  const lonRad = Cesium.Math.toRadians(lon);
  const distance = meters / radius;
  const targetLat = Math.asin(
    Math.sin(latRad) * Math.cos(distance) +
      Math.cos(latRad) * Math.sin(distance) * Math.cos(bearing),
  );
  const targetLon =
    lonRad +
    Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(latRad),
      Math.cos(distance) - Math.sin(latRad) * Math.sin(targetLat),
    );
  return {
    lat: Cesium.Math.toDegrees(targetLat),
    lon: Cesium.Math.toDegrees(targetLon),
  };
}

function ensureGlobeTrackCollection() {
  if (!globeViewer) return null;
  if (!globeTrackCollection) {
    globeTrackCollection = globeViewer.scene.primitives.add(new Cesium.PolylineCollection());
  }
  return globeTrackCollection;
}

function globeTrackLength(track) {
  if (track.id.startsWith("traffic-")) return 15000;
  if (track.type === "live") return 17000;
  return 19000;
}

function globeTrackWidth(track) {
  if (track.id.startsWith("traffic-")) return 1.1;
  if (track.type === "live") return 1.35;
  return 1.45;
}

function globeTrackColor(track, alphaOverride) {
  const alpha = alphaOverride ?? (track.id.startsWith("traffic-") ? 0.72 : 0.86);
  return Cesium.Color.fromCssColorString(globeMarkerColor(track)).withAlpha(alpha);
}

function globePolylineMaterial(track, alphaOverride) {
  return Cesium.Material.fromType("Color", { color: globeTrackColor(track, alphaOverride) });
}

function globeTrackSegments(track) {
  const length = globeTrackLength(track);
  const heading = track.cog || 0;
  const nose = offsetLatLon(track.lat, track.lon, heading, length * 0.62);
  const tail = offsetLatLon(track.lat, track.lon, heading + 180, length * 0.42);
  const leftWing = offsetLatLon(nose.lat, nose.lon, heading + 148, length * 0.42);
  const rightWing = offsetLatLon(nose.lat, nose.lon, heading - 148, length * 0.42);
  return [
    [tail, nose],
    [nose, leftWing],
    [nose, rightWing],
  ];
}

function globeSegmentPositions(segment) {
  return Cesium.Cartesian3.fromDegreesArrayHeights(
    segment.flatMap((point) => [point.lon, point.lat, 14500]),
  );
}

function createGlobeTrackSymbol(track) {
  const collection = ensureGlobeTrackCollection();
  if (!collection) return null;

  const lines = globeTrackSegments(track).flatMap((segment) => [
    collection.add({
      id: { trackId: track.id },
      positions: globeSegmentPositions(segment),
      width: globeTrackWidth(track) + 5,
      material: globePolylineMaterial(track, 0.22),
    }),
    collection.add({
      id: { trackId: track.id },
      positions: globeSegmentPositions(segment),
      width: globeTrackWidth(track),
      material: globePolylineMaterial(track),
    }),
  ]);

  const symbol = { lines, color: globeMarkerColor(track) };
  globeTrackSymbols.set(track.id, symbol);
  return symbol;
}

function setGlobeSymbolVisible(trackId, visible) {
  const symbol = globeTrackSymbols.get(trackId);
  if (!symbol) return;
  symbol.lines.forEach((line) => {
    line.show = visible;
  });
}

function removeGlobeTrackSymbol(trackId) {
  const symbol = globeTrackSymbols.get(trackId);
  if (!symbol || !globeTrackCollection) return;
  symbol.lines.forEach((line) => globeTrackCollection.remove(line));
  globeTrackSymbols.delete(trackId);
}

function removeVisibleGlobeMarkers() {
  if (!globeViewer) return;
  globeTrackSymbols.clear();
  if (globeTrackCollection) {
    if (typeof globeTrackCollection.removeAll === "function") {
      globeTrackCollection.removeAll();
    }
    globeViewer.scene.primitives.remove(globeTrackCollection);
    globeTrackCollection = null;
  }
  const tooltip = document.getElementById("globeHover");
  if (tooltip) tooltip.hidden = true;
  globeViewer.scene.requestRender();
}

function globeDeclutterSpacing() {
  if (!globeViewer) return 0;
  const height = globeViewer.camera.positionCartographic.height;
  if (height < 900000) return 0;
  if (height < 2200000) return 20;
  if (height < 5200000) return 28;
  return 42;
}

function visibleGlobeTrackIds(tracks) {
  const spacing = globeDeclutterSpacing();
  if (!spacing) return new Set(tracks.map((track) => track.id));

  const scene = globeViewer.scene;
  const canvas = scene.canvas;
  const occupiedPoints = [];
  const visibleIds = new Set();

  tracks
    .filter((track) => Number.isFinite(track.lat) && Number.isFinite(track.lon))
    .map((track, index) => ({
      track,
      index,
      point: Cesium.SceneTransforms.worldToWindowCoordinates(scene, globePosition(track, 14500)),
    }))
    .filter(({ track, point }) => {
      if (track.id === selectedTrackId || track.status !== "normal") return true;
      return point && point.x >= 0 && point.y >= 0 && point.x <= canvas.clientWidth && point.y <= canvas.clientHeight;
    })
    .sort((a, b) => markerPriority(b.track) - markerPriority(a.track) || b.index - a.index)
    .forEach(({ track, point }) => {
      const pinned = track.id === selectedTrackId || track.status !== "normal";
      if (!point) {
        if (pinned) visibleIds.add(track.id);
        return;
      }

      const overlaps = occupiedPoints.some((usedPoint) => {
        const dx = point.x - usedPoint.x;
        const dy = point.y - usedPoint.y;
        return Math.hypot(dx, dy) < spacing;
      });
      if (pinned || !overlaps) {
        visibleIds.add(track.id);
        occupiedPoints.push(point);
      }
    });

  return visibleIds;
}

function updateGlobeEntity(track) {
  if (!globeViewer) return;
  const symbol = globeTrackSymbols.get(track.id) || createGlobeTrackSymbol(track);
  if (!symbol) return;

  const segments = globeTrackSegments(track);
  segments.forEach((segment, index) => {
    const halo = symbol.lines[index * 2];
    const core = symbol.lines[index * 2 + 1];
    const positions = globeSegmentPositions(segment);
    halo.positions = positions;
    halo.width = globeTrackWidth(track) + 5;
    core.positions = positions;
    core.width = globeTrackWidth(track);
    const color = globeMarkerColor(track);
    if (symbol.color !== color) {
      halo.material = globePolylineMaterial(track, 0.22);
      core.material = globePolylineMaterial(track);
    }
  });
  symbol.color = globeMarkerColor(track);
}

function renderGlobeCityLabels() {
  if (!globeViewer) return;
  globeCityEntities.splice(0).forEach((entity) => globeViewer.entities.remove(entity));
}

function renderGlobeOceanSurface() {
  if (!globeViewer || globeOceanEntity) return;
  globeOceanEntity = globeViewer.entities.add({
    rectangle: {
      coordinates: Cesium.Rectangle.fromDegrees(153.5, -30.5, 172.8, -14.5),
      height: 900,
      material: Cesium.Color.fromCssColorString("#063556").withAlpha(0.58),
      outline: false,
    },
  });
}

async function renderGlobeReferences() {
  if (!globeViewer || globeReferencesLoaded) return;
  const maritimeComplementUrls = await resolveArcgisItemGeojsonUrls(maritimeComplementItemId);
  const references = [
    {
      url: "https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/delimitation_espace_maritime/FeatureServer/1/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson",
      stroke: Cesium.Color.fromCssColorString("#d8f5e4").withAlpha(0.86),
      fill: Cesium.Color.fromCssColorString("#3fa66a").withAlpha(0.42),
      height: 2500,
    },
    {
      url: "https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/delimitation_espace_maritime/FeatureServer/2/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson",
      stroke: Cesium.Color.fromCssColorString("#80fff1").withAlpha(0.82),
      fill: Cesium.Color.fromCssColorString("#3de2d0").withAlpha(0.28),
      height: 3200,
    },
    {
      url: "https://services1.arcgis.com/TZcrgU6CIbqWt9Qv/arcgis/rest/services/delimitation_espace_maritime/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson",
      stroke: Cesium.Color.fromCssColorString("#52ead6").withAlpha(0.7),
      fill: Cesium.Color.fromCssColorString("#52ead6").withAlpha(0.02),
      height: 1500,
    },
    ...[...maritimeComplementUrls, ...maritimeComplementFallbackUrls].map((url) => ({
      url,
      stroke: Cesium.Color.fromCssColorString("#ffbf69").withAlpha(0.68),
      fill: Cesium.Color.fromCssColorString("#ffbf69").withAlpha(0.015),
      height: 5200,
    })),
  ];

  await Promise.all(
    references.map(async (reference) => {
      try {
        const source = await Cesium.GeoJsonDataSource.load(reference.url, {
          stroke: reference.stroke,
          fill: reference.fill,
          strokeWidth: 2,
          clampToGround: false,
        });
        source.entities.values.forEach((entity) => {
          if (entity.polygon) {
            entity.polygon.height = reference.height;
            entity.polygon.outline = true;
            entity.polygon.outlineColor = reference.stroke;
            entity.polygon.material = reference.fill;
          }
          if (entity.polyline) {
            entity.polyline.width = 2;
            entity.polyline.material = reference.stroke;
          }
        });
        globeViewer.dataSources.add(source);
        globeReferenceSources.push(source);
      } catch (error) {
        console.warn("Reference globe non chargee", error);
      }
    }),
  );

  globeReferencesLoaded = true;
  globeViewer.scene.requestRender();
}

function renderGlobeShippingLanes() {
  if (!globeViewer || globeLanesLoaded) return;
  shippingLanes.forEach((lane) => {
    const positions = lane.flatMap(([lat, lon]) => [lon, lat, 9000]);
    const entity = globeViewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
        width: 1.6,
        material: Cesium.Color.fromCssColorString("#52ead6").withAlpha(0.22),
        clampToGround: false,
      },
    });
    globeLaneEntities.push(entity);
  });
  globeLanesLoaded = true;
}

function renderGlobeMarkers() {
  if (!globeViewer) return;
  removeVisibleGlobeMarkers();
  renderGlobeCityLabels();
  renderGlobeShippingLanes();
  globeViewer.scene.requestRender();
}

function scheduleGlobeMarkerRefresh() {
  if (!globeMode || !globeViewer || globeMarkerRefreshFrame) return;
  globeMarkerRefreshFrame = window.requestAnimationFrame(() => {
    globeMarkerRefreshFrame = null;
    renderGlobeMarkers();
  });
}

function positionGlobeHover(track, tooltip) {
  if (!globeViewer || !track || !tooltip) return false;
  const stage = document.querySelector(".map-stage");
  const screenPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
    globeViewer.scene,
    globePosition(track, 9000),
  );
  if (!stage || !screenPosition) return false;

  const margin = 12;
  const offset = 16;
  const width = tooltip.offsetWidth || 260;
  const height = tooltip.offsetHeight || 82;
  const left = Math.min(
    Math.max(screenPosition.x + offset, margin),
    Math.max(margin, stage.clientWidth - width - margin),
  );
  const top = Math.min(
    Math.max(screenPosition.y - height - offset, margin),
    Math.max(margin, stage.clientHeight - height - margin),
  );

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  return true;
}

function clearGlobeTrace() {
  if (!globeViewer) return;
  globeTraceEntities.splice(0).forEach((entity) => globeViewer.entities.remove(entity));
}

function renderGlobeSelectedTrack(track) {
  clearGlobeTrace();
  if (!globeViewer || !track) return;

  const history = buildEightHourHistory(track);
  for (let index = 0; index < history.length - 1; index += 1) {
    const from = history[index];
    const to = history[index + 1];
    const entity = globeViewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([
          from.lon,
          from.lat,
          16500,
          to.lon,
          to.lat,
          16500,
        ]),
        width: 4,
        material: Cesium.Color.fromCssColorString(speedColor(to.speed)).withAlpha(0.82),
        clampToGround: false,
      },
    });
    globeTraceEntities.push(entity);
  }
  globeViewer.scene.requestRender();
}

function focusGlobeOnNc(animated = true) {
  if (!globeViewer) return;
  const cameraOptions = {
    destination: Cesium.Cartesian3.fromDegrees(ncOperationalFocus.lon, ncOperationalFocus.lat, ncOperationalFocus.globeHeight),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  };
  animated ? globeViewer.camera.flyTo({ ...cameraOptions, duration: 1.2 }) : globeViewer.camera.setView(cameraOptions);
}

function focusGlobeWorld(animated = true) {
  if (!globeViewer) return;
  const cameraOptions = {
    destination: Cesium.Cartesian3.fromDegrees(121.0, -14.0, 8800000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
  };
  animated ? globeViewer.camera.flyTo({ ...cameraOptions, duration: 1.4 }) : globeViewer.camera.setView(cameraOptions);
}

async function initGlobe() {
  if (globeViewer || !hasCesium()) return Boolean(globeViewer);

  let imageryProvider;
  try {
    Cesium.Ion.defaultAccessToken = "";
    imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
    );
  } catch (error) {
    console.warn("Imagerie Esri globe indisponible, bascule Natural Earth", error);
    imageryProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
      Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII/"),
    );
  }

  globeViewer = new Cesium.Viewer("globeMap", {
    baseLayer: new Cesium.ImageryLayer(imageryProvider),
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    navigationHelpButton: false,
    timeline: false,
    animation: false,
    fullscreenButton: false,
    requestRenderMode: false,
    targetFrameRate: 30,
  });

  globeViewer.scene.globe.depthTestAgainstTerrain = false;
  globeViewer.scene.globe.enableLighting = false;
  globeViewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#0a3554");
  globeViewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#020812");
  globeViewer.scene.skyAtmosphere.show = false;
  globeViewer.scene.skyBox.show = false;
  globeViewer.scene.fog.enabled = false;
  globeViewer.scene.screenSpaceCameraController.minimumZoomDistance = 65000;
  globeViewer.scene.screenSpaceCameraController.maximumZoomDistance = 38000000;
  globeViewer.camera.changed.addEventListener(scheduleGlobeMarkerRefresh);

  globePickHandler = new Cesium.ScreenSpaceEventHandler(globeViewer.scene.canvas);
  globePickHandler.setInputAction((movement) => {
    const picked = globeViewer.scene.pick(movement.position);
    const trackId = picked?.id?.trackId;
    if (trackId) selectTrack(trackId);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  globePickHandler.setInputAction((movement) => {
    const tooltip = document.getElementById("globeHover");
    const picked = globeViewer.scene.pick(movement.endPosition);
    const track = picked?.id?.trackId ? getTrackById(picked.id.trackId) : null;
    if (!track) {
      tooltip.hidden = true;
      return;
    }
    tooltip.innerHTML = hoverTooltipHtml(track);
    tooltip.hidden = false;
    if (!positionGlobeHover(track, tooltip)) tooltip.hidden = true;
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  renderGlobeMarkers();
  await renderGlobeReferences();
  return true;
}

async function setGlobeMode(active) {
  const button = document.getElementById("toggleGlobe");
  const stage = document.querySelector(".map-stage");
  const globeMap = document.getElementById("globeMap");
  const tooltip = document.getElementById("globeHover");

  if (active) {
    stage.classList.add("globe-active");
    globeMap.hidden = false;
  }

  if (active && !(await initGlobe())) {
    button.disabled = true;
    button.textContent = "Globe indispo";
    stage.classList.remove("globe-active");
    globeMap.hidden = true;
    return;
  }

  globeMode = active;
  button.classList.toggle("active", active);
  stage.classList.toggle("globe-active", active);
  globeMap.hidden = !active;
  tooltip.hidden = true;

  if (active) {
    globeViewer.resize();
    focusGlobeWorld(false);
    renderGlobeMarkers();
    if (!globeMarkerCleanupTimer) {
      globeMarkerCleanupTimer = window.setInterval(removeVisibleGlobeMarkers, 500);
    }
    renderGlobeSelectedTrack(getTrackById(selectedTrackId));
    globeViewer.scene.requestRender();
  } else {
    if (globeMarkerCleanupTimer) {
      window.clearInterval(globeMarkerCleanupTimer);
      globeMarkerCleanupTimer = null;
    }
    removeVisibleGlobeMarkers();
    map.invalidateSize();
  }
}

function statusClass(status) {
  if (status === "critical") return "critical";
  if (status === "priority") return "watch";
  return "";
}

function statusColor(status) {
  if (status === "critical") return "#ff6b6b";
  if (status === "priority") return "#ffbf69";
  return "#52ead6";
}

function typeClass(type) {
  return `type-${String(type || "unknown").toLowerCase().replace(/[^a-z0-9-]/g, "") || "unknown"}`;
}

function typeColor(type) {
  const colors = {
    cargo: "#72ff83",
    fishing: "#cb38ff",
    tanker: "#ff8a57",
    passenger: "#4aa3ff",
    pilot: "#ffd166",
    tug: "#52ead6",
    sar: "#ff5151",
    law: "#b7ff4a",
    military: "#d6dde8",
    sailing: "#f5f7ff",
    pleasure: "#a782ff",
    highspeed: "#00e5ff",
    service: "#7cf6c8",
    other: "#a8b8c8",
    unknown: "#39d7ff",
    live: "#39d7ff",
  };
  return colors[type] || colors.unknown;
}

function vesselMarkerHtml(vessel) {
  return `<div class="vessel-arrow ${statusClass(vessel.status)} ${typeClass(vessel.type)}" style="transform: translate(-50%, -50%) rotate(${vessel.cog}deg) scale(var(--track-scale))"></div>`;
}

function trafficMarkerHtml(target) {
  return `<div class="traffic-arrow ${statusClass(target.status)} ${typeClass(target.type)}" style="transform: translate(-50%, -50%) rotate(${target.cog}deg) scale(calc(var(--track-scale) * 0.84))"></div>`;
}

function receivedText(track) {
  return track.lastSignal || "moins d'une minute";
}

function routeText(track) {
  const destination = track.destination || "Non declaree";
  if (destination === "Noumea" || destination === "Port de Noumea") return "NC NOU";
  if (destination === "Port Vila") return "VU VLI";
  if (destination === "Suva") return "FJ SUV";
  if (destination === "Brisbane") return "AU BNE";
  return destination;
}

function hoverTooltipHtml(track) {
  const speed = Number.isFinite(track.sog) ? track.sog.toFixed(1) : "0.0";
  const course = Number.isFinite(track.cog) ? Math.round(track.cog) : 0;
  return `
    <div class="track-tooltip">
      <div class="track-tooltip-head">
        <span class="${typeClass(track.type)}">${typeLabel(track.type).slice(0, 3).toUpperCase()}</span>
        <strong>${track.name || track.mmsi || "Piste AIS"}</strong>
      </div>
      <div class="track-tooltip-grid">
        <span><b>${speed}</b> kn</span>
        <span><b>${course}</b> deg</span>
      </div>
      <p>Destination: <b>${track.destination || "Non declaree"}</b></p>
      <p>Signal: <b>${receivedText(track)}</b></p>
    </div>
  `;
}

let activePreviewTrackId = null;
let previewMoveFrame = null;
let pendingPreviewEvent = null;

function applyTrackPreviewPosition() {
  const preview = document.getElementById("trackHover");
  const event = pendingPreviewEvent;
  previewMoveFrame = null;
  if (!preview || preview.hidden || !event) return;
  const margin = 14;
  const offset = 24;
  const rect = preview.getBoundingClientRect();
  let left = event.clientX + offset;
  let top = event.clientY + offset;

  if (left + rect.width + margin > window.innerWidth) left = event.clientX - rect.width - offset;
  if (top + rect.height + margin > window.innerHeight) top = event.clientY - rect.height - offset;

  preview.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - rect.width - margin))}px`;
  preview.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin))}px`;
}

function positionTrackPreview(event) {
  if (!event) return;
  pendingPreviewEvent = event;
  if (!previewMoveFrame) previewMoveFrame = window.requestAnimationFrame(applyTrackPreviewPosition);
}

function showTrackPreview(track, event) {
  const preview = document.getElementById("trackHover");
  if (!preview || !track || !event) return;
  if (activePreviewTrackId !== track.id) {
    activePreviewTrackId = track.id;
    preview.innerHTML = hoverTooltipHtml(track);
  }
  preview.hidden = false;
  positionTrackPreview(event);
}

function hideTrackPreview() {
  const preview = document.getElementById("trackHover");
  activePreviewTrackId = null;
  pendingPreviewEvent = null;
  if (previewMoveFrame) {
    window.cancelAnimationFrame(previewMoveFrame);
    previewMoveFrame = null;
  }
  if (preview) preview.hidden = true;
}

function trackPopupHtml(track) {
  return `
    <article class="track-popup-card">
      <header>
        <div class="track-popup-title">
          <span class="flag ${typeClass(track.type)}">AIS</span>
          <div>
            <strong>${track.name}</strong>
            <small>${typeLabel(track.type)} | MMSI ${track.mmsi || "inconnu"}</small>
          </div>
        </div>
        <button type="button" aria-label="Reduire" data-close-track-card></button>
      </header>
      <div class="signal-panel">
        <div class="signal-orb" style="--course-angle: ${Math.round(track.cog)}deg"></div>
        <div class="signal-copy">
          <span>Signal maritime temps reel</span>
          <strong>${track.sog.toFixed(1)} kn</strong>
          <div class="signal-pills">
            <b>COG ${Math.round(track.cog)} deg</b>
            <b>${statusLabel(track.status)}</b>
            <b>${receivedText(track)}</b>
          </div>
        </div>
      </div>
      <div class="popup-actions">
        <button type="button" aria-label="Menu">☰</button>
        <button type="button">Ajouter veille</button>
        <button type="button" class="blue">Details piste</button>
      </div>
      <div class="route-row">
        <b>${routeText(track)}</b>
        <span>${track.destination || "Non declaree"}</span>
      </div>
      <div class="progress-row">
        <span></span>
        <i></i>
      </div>
      <div class="popup-buttons">
        <button type="button">Trace 8h</button>
        <button type="button">Route outil</button>
      </div>
      <dl class="popup-metrics">
        <div><dt>Statut navigation</dt><dd>${track.statusText || statusLabel(track.status)}</dd></div>
        <div><dt>Vitesse / Cap</dt><dd>${track.sog.toFixed(1)} kn / ${Math.round(track.cog)} deg</dd></div>
        <div><dt>Position</dt><dd>${Number.isFinite(track.lat) ? track.lat.toFixed(4) : "--"}, ${Number.isFinite(track.lon) ? track.lon.toFixed(4) : "--"}</dd></div>
        <div><dt>Destination</dt><dd>${track.destination || "Non declaree"}</dd></div>
        <div><dt>Dernier signal</dt><dd>${receivedText(track)}</dd></div>
        <div><dt>Tirant d'eau</dt><dd>${track.draught || "7.8"} m</dd></div>
      </dl>
      <footer>Source AISStream | Fiche deplacable par maintien du clic sur l'en-tete</footer>
    </article>
  `;
}

function openTrackPopup(track) {
  const card = document.getElementById("staticTrackCard");
  window.clearTimeout(card.closeTimer);
  card.innerHTML = trackPopupHtml(track);
  card.classList.remove("panel-closing");
  card.hidden = false;
  enableDraggable(card, ".track-popup-card header");
  const closeButton = card.querySelector("[data-close-track-card]");
  if (closeButton) {
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setFloatingPanelVisible(card, false, closeButton);
    });
  }
}

function statusLabel(status) {
  if (status === "critical") return "Critique";
  if (status === "priority") return "Veille";
  return "Normal";
}

function typeLabel(type) {
  const labels = {
    patrol: "Patrouille",
    cargo: "Cargo",
    passenger: "Passagers",
    fishing: "Peche",
    tanker: "Tanker",
    pilot: "Pilote",
    tug: "Remorqueur",
    sar: "SAR",
    law: "Controle / Etat",
    military: "Militaire",
    sailing: "Voilier",
    pleasure: "Plaisance",
    highspeed: "Grande vitesse",
    service: "Service",
    other: "Autre",
    unknown: "Type inconnu",
    watch: "Veille",
    live: "AIS live",
  };
  return labels[type] || type;
}

function fleetTracks() {
  return [...liveVessels];
}

function allTracks() {
  return fleetTracks();
}

function getTrackById(id) {
  return allTracks().find((item) => item.id === id);
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreSearchField(field, query) {
  const value = normalizeSearchText(field);
  if (!value) return -1;
  if (value === query) return 200;
  if (value.startsWith(query)) return 140;
  const index = value.indexOf(query);
  return index >= 0 ? Math.max(20, 100 - index * 4) : -1;
}

function bestTrackSearchMatch(query) {
  let best = null;
  let bestScore = -1;
  allTracks().forEach((track) => {
    const score = Math.max(
      scoreSearchField(track.name, query),
      scoreSearchField(track.mmsi, query),
      scoreSearchField(track.id, query),
      scoreSearchField(typeLabel(track.type), query),
      scoreSearchField(track.destination, query),
    );
    if (score > bestScore) {
      bestScore = score;
      best = track;
    }
  });
  return bestScore >= 0 ? best : null;
}

function bestLocationSearchMatch(query) {
  const knownLocations = [
    ...cityLabels.map((city) => ({ ...city, zoom: Math.max(7.4, ncOperationalFocus.zoom + 1.1) })),
    ...worldPortLabels.map((port) => ({ ...port, zoom: 8 })),
    { name: "Nouvelle-Caledonie", lat: ncOperationalFocus.lat, lon: ncOperationalFocus.lon, zoom: ncOperationalFocus.zoom },
    { name: "NC", lat: ncOperationalFocus.lat, lon: ncOperationalFocus.lon, zoom: ncOperationalFocus.zoom },
    { name: "ZEE NC", lat: ncOperationalFocus.lat, lon: ncOperationalFocus.lon, zoom: ncOperationalFocus.zoom - 0.2 },
    { name: "Ouvea", lat: -20.65, lon: 166.57, zoom: 9.6 },
  ];

  let best = null;
  let bestScore = -1;
  knownLocations.forEach((target) => {
    const score = scoreSearchField(target.name, query);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  });

  return bestScore >= 0 ? best : null;
}

function focusMapLocation(lat, lon, zoom = 8.8) {
  const targetZoom = Math.max(zoom, map.getZoom() < zoom ? zoom : map.getZoom());
  map.flyTo([lat, lon], targetZoom, {
    animate: true,
    duration: 1.05,
  });
}

function runMapSearch() {
  const input = document.getElementById("mapSearchInput");
  if (!input) return;
  const query = normalizeSearchText(input.value);
  if (!query) return;

  const track = bestTrackSearchMatch(query);
  if (track) {
    focusMapLocation(track.lat, track.lon, 9.2);
    selectTrack(track.id);
    return;
  }

  const location = bestLocationSearchMatch(query);
  if (location) {
    focusMapLocation(location.lat, location.lon, location.zoom || 8.5);
    return;
  }

  input.classList.add("search-miss");
  window.setTimeout(() => input.classList.remove("search-miss"), 480);
}

function trackMmsi(track) {
  return track.mmsi || track.id;
}

function speedColor(speed) {
  if (speed < 3) return "#ff4242";
  if (speed < 8) return "#ffbf69";
  if (speed < 15) return "#52ead6";
  return "#72ff83";
}

function buildEightHourHistory(track) {
  if (track.type === "live") {
    const liveHistory = [...(track.track || []), [track.lat, track.lon]]
      .filter((point) => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
      .slice(-80)
      .map(([lat, lon]) => ({
        lat,
        lon,
        speed: track.sog || 0,
        ageHours: 0,
      }));
    return liveHistory.length ? liveHistory : [{ lat: track.lat, lon: track.lon, speed: track.sog || 0, ageHours: 0 }];
  }

  const points = [];
  const steps = 32;
  const baseCog = track.cog || 0;
  const baseSpeed = Math.max(0.4, track.sog || 1);
  let lat = track.lat;
  let lon = track.lon;

  for (let i = steps; i >= 0; i -= 1) {
    const ageHours = i / 4;
    const angle = ((baseCog + Math.sin(i * 0.7) * 18 + 180) % 360) - 90;
    const speed = Math.max(0.3, baseSpeed + Math.sin(i * 0.55) * 4 + (i % 5) * 0.35);
    const distance = speed / 185;
    lat -= Math.sin(angle * (Math.PI / 180)) * distance;
    lon -= Math.cos(angle * (Math.PI / 180)) * distance;
    points.push({
      lat,
      lon,
      speed,
      ageHours,
    });
  }

  points.push({
    lat: track.lat,
    lon: track.lon,
    speed: track.sog || baseSpeed,
    ageHours: 0,
  });

  return points.reverse();
}

function renderSelectedTrack(track) {
  selectedTrackLayer.clearLayers();
  if (!track) return;

  const history = buildEightHourHistory(track);
  for (let index = 0; index < history.length - 1; index += 1) {
    const from = history[index];
    const to = history[index + 1];
    L.polyline(
      [
        [from.lat, from.lon],
        [to.lat, to.lon],
      ],
      {
        color: speedColor(to.speed),
        weight: 3,
        opacity: 0.68,
      },
    ).addTo(selectedTrackLayer);
  }

  L.circleMarker([track.lat, track.lon], {
    radius: 8,
    color: "#ffffff",
    weight: 2,
    fillColor: speedColor(track.sog || 0),
    fillOpacity: 0.95,
  }).addTo(selectedTrackLayer);
}

function createMarker(vessel) {
  const icon = L.divIcon({
    html: vesselMarkerHtml(vessel),
    className: "vessel-icon",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
  const marker = L.marker([vessel.lat, vessel.lon], { icon })
    .on("mouseover", (event) => showTrackPreview(vessel, event.originalEvent))
    .on("mousemove", (event) => positionTrackPreview(event.originalEvent))
    .on("mouseout", hideTrackPreview)
    .on("click", (event) => {
      L.DomEvent.stop(event);
      hideTrackPreview();
      selectTrack(vessel.id);
    });

  markers.set(vessel.id, marker);
}

function markerDeclutterSpacing() {
  const zoom = map.getZoom();
  if (zoom >= 8.85) return 0;
  return Math.round(Math.max(15, Math.min(34, 46 - zoom * 3.4)));
}

function markerPriority(track) {
  if (track.id === selectedTrackId) return 1000;
  if (track.status === "critical") return 900;
  if (track.status === "priority") return 800;
  if (["sar", "law", "military", "pilot", "tug"].includes(track.type)) return 700;
  return 100 + Math.min(80, Math.max(0, track.sog || 0));
}

function visibleFleetTrackIds() {
  const tracks = fleetTracks();
  const spacing = markerDeclutterSpacing();
  if (!spacing) return new Set(tracks.map((track) => track.id));

  const bounds = map.getBounds().pad(0.08);
  const occupiedPoints = [];
  const visibleIds = new Set();

  tracks
    .filter((track) => Number.isFinite(track.lat) && Number.isFinite(track.lon))
    .map((track, index) => ({
      track,
      index,
      point: map.latLngToLayerPoint([track.lat, track.lon]),
    }))
    .sort((a, b) => markerPriority(b.track) - markerPriority(a.track) || b.index - a.index)
    .forEach(({ track, point }) => {
      const pinned = track.id === selectedTrackId || track.status !== "normal";
      if (!pinned && !bounds.contains([track.lat, track.lon])) return;

      const overlaps = occupiedPoints.some((usedPoint) => point.distanceTo(usedPoint) < spacing);
      if (pinned || !overlaps) {
        visibleIds.add(track.id);
        occupiedPoints.push(point);
      }
    });

  return visibleIds;
}

function renderMarkers() {
  markerLayer.clearLayers();
  markers.clear();
  hideTrackPreview();
  return;
  const visibleIds = visibleFleetTrackIds();
  fleetTracks().forEach((vessel) => {
    if (!markers.has(vessel.id)) createMarker(vessel);
    const marker = markers.get(vessel.id);
    if (!visibleIds.has(vessel.id)) {
      if (markerLayer.hasLayer(marker)) markerLayer.removeLayer(marker);
      return;
    }
    if (!markerLayer.hasLayer(marker)) marker.addTo(markerLayer);
    marker.setLatLng([vessel.lat, vessel.lon]);
    marker.setIcon(
      L.divIcon({
        html: vesselMarkerHtml(vessel),
        className: "vessel-icon",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    );
  });
}

function scheduleMarkerRefresh() {
  window.requestAnimationFrame(renderMarkers);
}

map.on("moveend zoomend", scheduleMarkerRefresh);

function renderBackgroundTraffic() {
  trafficLayer.clearLayers();
  trafficMarkers.length = 0;
  trafficMarkerById.clear();
  return;
  backgroundTraffic.forEach((target) => {
    const marker = L.marker([target.lat, target.lon], {
      icon: L.divIcon({
        html: trafficMarkerHtml(target),
        className: "traffic-icon",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
      interactive: true,
    })
      .on("mouseover", (event) => showTrackPreview(target, event.originalEvent))
      .on("mousemove", (event) => positionTrackPreview(event.originalEvent))
      .on("mouseout", hideTrackPreview)
      .on("click", (event) => {
        L.DomEvent.stop(event);
        hideTrackPreview();
        selectTrack(target.id);
      });
    marker.addTo(trafficLayer);
    trafficMarkers.push(marker);
    trafficMarkerById.set(target.id, marker);
  });
}

function renderTracks() {
  trackLayer.clearLayers();
  tracks.clear();
  fleetTracks().forEach((vessel) => {
    if (vessel.track.length < 2) return;
    const line = L.polyline(vessel.track, {
      color: vessel.status === "critical" ? "#ff6b6b" : vessel.status === "priority" ? "#ffbf69" : typeColor(vessel.type),
      weight: selectedTrackId === vessel.id ? 2 : 1,
      opacity: selectedTrackId === vessel.id ? 0.5 : 0.16,
    }).addTo(trackLayer);
    tracks.set(vessel.id, line);
  });
}

function filteredVessels() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  return fleetTracks().filter((vessel) => {
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "priority" && vessel.status !== "normal") ||
      vessel.type === activeFilter;
    const matchesQuery =
      !query ||
      vessel.name.toLowerCase().includes(query) ||
      vessel.id.includes(query) ||
      typeLabel(vessel.type).toLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });
}

function renderFleetList() {
  const list = document.getElementById("fleetList");
  list.innerHTML = "";

  const visibleVessels = filteredVessels();
  if (!visibleVessels.length) {
    const empty = document.createElement("div");
    empty.className = "fleet-empty";
    empty.textContent = aisConnected
      ? "En attente de positions AISStream dans la zone selectionnee."
      : "Aucune piste affichee. Connecte AISStream pour recevoir les navires reels.";
    list.appendChild(empty);
  }

  visibleVessels.forEach((vessel) => {
    const card = document.createElement("button");
    card.className = `vessel-card ${typeClass(vessel.type)} ${selectedTrackId === vessel.id ? "selected" : ""}`;
    card.type = "button";
    card.style.setProperty("--type-color", typeColor(vessel.type));
    card.innerHTML = `
      <div>
        <h2>${vessel.name}</h2>
        <p><span class="type-chip ${typeClass(vessel.type)}">${typeLabel(vessel.type)}</span> MMSI ${trackMmsi(vessel)}</p>
        <p>${vessel.sog.toFixed(1)} nd | COG ${Math.round(vessel.cog)} deg | ${vessel.lastSignal}</p>
      </div>
      <span class="badge ${statusClass(vessel.status)}">${statusLabel(vessel.status)}</span>
    `;
    card.addEventListener("click", () => selectTrack(vessel.id));
    list.appendChild(card);
  });

  document.getElementById("vesselCount").textContent = liveVessels.length.toLocaleString("fr-FR");
}

function renderAlerts() {
  const list = document.getElementById("alertList");
  list.innerHTML = "";
  if (!alerts.length) {
    const empty = document.createElement("div");
    empty.className = "alert-empty";
    empty.textContent = "Aucune alerte active.";
    list.appendChild(empty);
  }
  alerts.forEach((alert) => {
    const vessel = getTrackById(alert.vesselId);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "alert-card";
    card.innerHTML = `
      <strong>${alert.level} | ${alert.title}</strong>
      <p>${vessel ? vessel.name : "Navire inconnu"} - ${alert.text}</p>
    `;
    card.addEventListener("click", () => selectTrack(alert.vesselId));
    list.appendChild(card);
  });
  document.getElementById("alertCount").textContent = alerts.length;
}

function renderDetail(vessel) {
  const title = document.getElementById("detailTitle");
  const subtitle = document.getElementById("detailSubtitle");
  const card = document.getElementById("detailCard");

  if (!vessel) {
    title.textContent = "Situation surface";
    subtitle.textContent = "Selectionne un navire";
    card.className = "detail-card empty";
    card.innerHTML = "<p>La fiche navire affichera cap, vitesse, position, dernier signal, statut et historique court.</p>";
    return;
  }

  const history = buildEightHourHistory(vessel);
  const averageSpeed =
    history.reduce((total, point) => total + point.speed, 0) / Math.max(1, history.length);
  const maxSpeed = Math.max(...history.map((point) => point.speed));

  title.textContent = vessel.name;
  subtitle.textContent = `${typeLabel(vessel.type)} | MMSI ${trackMmsi(vessel)}`;
  card.className = "detail-card";
  card.innerHTML = `
    <p>Destination: ${vessel.destination}</p>
    <div class="metric-grid">
      <div class="metric"><span>Vitesse</span><b>${vessel.sog.toFixed(1)} nd</b></div>
      <div class="metric"><span>Cap</span><b>${Math.round(vessel.cog)} deg</b></div>
      <div class="metric"><span>Position</span><b>${vessel.lat.toFixed(3)}, ${vessel.lon.toFixed(3)}</b></div>
      <div class="metric"><span>Dernier signal</span><b>${vessel.lastSignal}</b></div>
      <div class="metric"><span>Statut</span><b>${statusLabel(vessel.status)}</b></div>
      <div class="metric"><span>Trace affichee</span><b>8 h</b></div>
      <div class="metric"><span>Vitesse moy.</span><b>${averageSpeed.toFixed(1)} nd</b></div>
      <div class="metric"><span>Vitesse max.</span><b>${maxSpeed.toFixed(1)} nd</b></div>
    </div>
    <div class="speed-legend" aria-label="Legende vitesses">
      <span><i class="slow"></i>&lt; 3 nd</span>
      <span><i class="medium"></i>3-8 nd</span>
      <span><i class="cruise"></i>8-15 nd</span>
      <span><i class="fast"></i>&gt; 15 nd</span>
    </div>
  `;
}

function selectTrack(id) {
  window.clearTimeout(document.getElementById("staticTrackCard")?.closeTimer);
  selectedTrackId = id;
  const track = getTrackById(id);
  renderFleetList();
  renderDetail(track);
  renderMarkers();
  renderTracks();
  renderSelectedTrack(track);
  if (globeMode) renderGlobeSelectedTrack(track);
  if (track) {
    setFloatingPanelVisible(document.querySelector(".right-panel"), false, dockButtonForTarget("surface"));
    setToolActive("toggleSurfacePanel", false);
    openTrackPopup(track);
  }
}

function updateVesselPositions() {
  if (selectedTrackId) {
    const selected = getTrackById(selectedTrackId);
    renderDetail(selected);
    renderSelectedTrack(selected);
    if (globeMode) renderGlobeSelectedTrack(selected);
  }
}

function updateBackgroundTraffic() {
  return;
}

function aisBoundingBoxes(scope) {
  if (scope === "world") return [[[-90, -180], [90, 180]]];
  if (scope === "pacific") {
    return [
      [[-50, 120], [25, 180]],
      [[-50, -180], [25, -120]],
    ];
  }
  return [[[-26, 161], [-17, 171]]];
}

function setAisMessage(text) {
  const message = document.getElementById("aisMessage");
  if (message) message.textContent = text;
}

function setAisStatus(text, connected = false) {
  const status = document.getElementById("aisStatus");
  if (!status) return;
  status.textContent = text;
  status.classList.toggle("connected", connected);
}

function normalizeAisSpeed(value) {
  const speed = Number(value);
  if (!Number.isFinite(speed)) return 0;
  return speed > 70 ? speed / 10 : speed;
}

function normalizeAisCourse(value) {
  const course = Number(value);
  if (!Number.isFinite(course)) return 0;
  return (course > 360 ? course / 10 : course) % 360;
}

function cleanShipName(value, mmsi) {
  const name = String(value || "").trim();
  if (!name) return `AIS ${mmsi}`;
  return name.replace(/\s+/g, " ");
}

function normalizeAisShipType(value) {
  if (value === undefined || value === null || value === "") return "unknown";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    if (numeric === 30) return "fishing";
    if (numeric === 50) return "pilot";
    if (numeric === 51) return "sar";
    if (numeric === 52) return "tug";
    if (numeric === 55) return "law";
    if (numeric === 35) return "military";
    if (numeric === 36) return "sailing";
    if (numeric === 37) return "pleasure";
    if (numeric >= 40 && numeric <= 49) return "highspeed";
    if (numeric >= 60 && numeric <= 69) return "passenger";
    if (numeric >= 70 && numeric <= 79) return "cargo";
    if (numeric >= 80 && numeric <= 89) return "tanker";
    if ((numeric >= 31 && numeric <= 34) || numeric === 53 || numeric === 54 || numeric === 58) return "service";
    if (numeric >= 90 && numeric <= 99) return "other";
    return "unknown";
  }

  const label = String(value).toLowerCase();
  if (label.includes("fish")) return "fishing";
  if (label.includes("tank") || label.includes("oil") || label.includes("chemical")) return "tanker";
  if (label.includes("cargo") || label.includes("freight")) return "cargo";
  if (label.includes("passenger") || label.includes("ferry")) return "passenger";
  if (label.includes("pilot")) return "pilot";
  if (label.includes("search") || label.includes("rescue") || label.includes("sar")) return "sar";
  if (label.includes("tug") || label.includes("tow")) return "tug";
  if (label.includes("law") || label.includes("police")) return "law";
  if (label.includes("military")) return "military";
  if (label.includes("sail")) return "sailing";
  if (label.includes("pleasure") || label.includes("yacht")) return "pleasure";
  if (label.includes("high speed") || label.includes("hsc")) return "highspeed";
  if (label.includes("service") || label.includes("dredg") || label.includes("dive")) return "service";
  return "unknown";
}

function profileFromAisMessage(aisMessage) {
  const metadata = aisMessage.MetaData || aisMessage.Metadata || {};
  const message = aisMessage.Message || {};
  const staticData =
    message.ShipStaticData ||
    message.StaticDataReport ||
    message.StandardClassBShipStaticData ||
    message.StaticVoyageData ||
    {};
  const report = staticData.ReportA || staticData.ReportB || staticData;
  const mmsi = String(
    report.UserID ||
      report.MMSI ||
      report.Mmsi ||
      staticData.UserID ||
      staticData.MMSI ||
      staticData.Mmsi ||
      metadata.MMSI ||
      metadata.Mmsi ||
      "",
  ).trim();
  if (!mmsi) return null;

  return {
    mmsi,
    name: cleanShipName(report.Name || staticData.Name || metadata.ShipName || metadata.ShipNameRaw || metadata.Name, mmsi),
    type: normalizeAisShipType(report.Type ?? staticData.Type ?? report.ShipType ?? staticData.ShipType ?? metadata.ShipType ?? metadata.Type),
    destination: report.Destination || staticData.Destination || metadata.Destination || "",
    draught: report.MaximumStaticDraught || staticData.MaximumStaticDraught || metadata.MaximumStaticDraught || "",
  };
}

function mergeLiveProfile(profile) {
  if (!profile?.mmsi) return null;
  const previous = liveShipProfiles.get(profile.mmsi) || {};
  const merged = {
    ...previous,
    ...profile,
    type: profile.type && profile.type !== "unknown" ? profile.type : previous.type || "unknown",
    name: profile.name && !profile.name.startsWith("AIS ") ? profile.name : previous.name || profile.name,
    destination: profile.destination || previous.destination || "",
    draught: profile.draught || previous.draught || "",
  };
  liveShipProfiles.set(profile.mmsi, merged);
  return merged;
}

function bestKnownType(...types) {
  return types.find((type) => type && type !== "unknown") || "unknown";
}

function removeLiveVessel(track) {
  const index = liveVessels.findIndex((item) => item.id === track.id);
  if (index >= 0) liveVessels.splice(index, 1);
  liveVesselByMmsi.delete(track.mmsi);

  const marker = markers.get(track.id);
  if (marker) {
    markerLayer.removeLayer(marker);
    markers.delete(track.id);
  }

  const symbol = globeTrackSymbols.get(track.id);
  if (symbol && globeTrackCollection) {
    symbol.lines.forEach((line) => globeTrackCollection.remove(line));
    globeTrackSymbols.delete(track.id);
  }
  liveShipProfiles.delete(track.mmsi);
}

function trimLiveVessels() {
  while (liveVessels.length > maxLiveVessels) {
    const oldest = liveVessels.reduce((candidate, item) =>
      !candidate || (item.updatedAt || 0) < (candidate.updatedAt || 0) ? item : candidate,
    null);
    if (!oldest) return;
    removeLiveVessel(oldest);
  }
}

function upsertAisStaticData(aisMessage) {
  const profile = mergeLiveProfile(profileFromAisMessage(aisMessage));
  if (!profile) return;

  const track = liveVesselByMmsi.get(profile.mmsi);
  if (!track) return;

  track.name = profile.name || track.name;
  track.type = profile.type || track.type || "unknown";
  track.destination = profile.destination || track.destination;
  track.draught = profile.draught || track.draught;
  track.statusText = `${typeLabel(track.type)} | AISStream`;

  renderMarkers();
  renderTracks();
  renderFleetList();
  if (globeMode) renderGlobeMarkers();
  if (selectedTrackId === track.id) {
    renderDetail(track);
    renderSelectedTrack(track);
    if (globeMode) renderGlobeSelectedTrack(track);
  }
}

function upsertAisPosition(aisMessage) {
  const position = aisMessage.Message?.PositionReport || aisMessage.Message?.StandardClassBPositionReport;
  if (!position) return;

  const metadata = aisMessage.MetaData || aisMessage.Metadata || {};
  const mmsi = String(position.UserID || metadata.MMSI || metadata.Mmsi || "").trim();
  const lat = Number(position.Latitude ?? metadata.Latitude);
  const lon = Number(position.Longitude ?? metadata.Longitude);
  if (!mmsi || !Number.isFinite(lat) || !Number.isFinite(lon)) return;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return;

  const profile = mergeLiveProfile(profileFromAisMessage(aisMessage)) || liveShipProfiles.get(mmsi) || {};
  const metadataType = normalizeAisShipType(metadata.ShipType || metadata.Type);
  const initialType = bestKnownType(profile.type, metadataType);
  const existing = liveVesselByMmsi.get(mmsi);
  const now = Date.now();
  const track =
    existing ||
    {
      id: `ais-${mmsi}`,
      mmsi,
      name: profile.name || cleanShipName(metadata.ShipName || metadata.ShipNameRaw || metadata.Name, mmsi),
      type: initialType,
      status: "normal",
      lat,
      lon,
      cog: normalizeAisCourse(position.Cog ?? position.CourseOverGround ?? position.TrueHeading),
      sog: normalizeAisSpeed(position.Sog ?? position.SpeedOverGround),
      destination: profile.destination || metadata.Destination || "AISStream",
      lastSignal: "live",
      track: [],
      draught: profile.draught || metadata.MaximumStaticDraught,
      statusText: `${typeLabel(initialType)} | AISStream`,
      updatedAt: now,
    };

  if (!existing) {
    liveVesselByMmsi.set(mmsi, track);
    liveVessels.push(track);
  } else {
    track.track.push([track.lat, track.lon]);
    if (track.track.length > 80) track.track.shift();
  }

  track.name = profile.name || cleanShipName(metadata.ShipName || metadata.ShipNameRaw || track.name, mmsi);
  track.type = bestKnownType(profile.type, metadataType, track.type);
  track.lat = lat;
  track.lon = lon;
  track.cog = normalizeAisCourse(position.Cog ?? position.CourseOverGround ?? position.TrueHeading ?? track.cog);
  track.sog = normalizeAisSpeed(position.Sog ?? position.SpeedOverGround ?? track.sog);
  track.lastSignal = "live";
  track.updatedAt = now;
  track.destination = profile.destination || metadata.Destination || track.destination || "AISStream";
  track.draught = profile.draught || track.draught || metadata.MaximumStaticDraught;
  track.statusText = `${typeLabel(track.type)} | AISStream PositionReport`;

  trimLiveVessels();
  if (!markers.has(track.id)) createMarker(track);
  renderMarkers();
  renderTracks();
  renderFleetList();
  if (globeMode) renderGlobeMarkers();
  if (selectedTrackId === track.id) {
    renderDetail(track);
    renderSelectedTrack(track);
    if (globeMode) renderGlobeSelectedTrack(track);
  }
}

function stopRelayEventSource() {
  if (!aisRelaySource) return;
  try {
    aisRelaySource.close();
  } catch {
    // no-op
  }
  aisRelaySource = null;
}

function handleAisPayload(payload) {
  try {
    const aisMessage = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (aisMessage?.Message?.PositionReport || aisMessage?.Message?.StandardClassBPositionReport) {
      upsertAisPosition(aisMessage);
    } else if (
      aisMessage?.Message?.ShipStaticData ||
      aisMessage?.Message?.StaticDataReport ||
      aisMessage?.MessageType === "ShipStaticData"
    ) {
      upsertAisStaticData(aisMessage);
    }
  } catch (error) {
    console.warn("Message AISStream ignore", error);
  }
}

async function relayRequest(path, body) {
  const response = await fetch(`${aisRelayBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`${response.status} ${details}`.trim());
  }
  return response.json().catch(() => ({}));
}

function disconnectAisStream() {
  if (aisSocket) {
    try {
      aisSocket.onclose = null;
      aisSocket.onerror = null;
      aisSocket.onmessage = null;
      aisSocket.close();
    } catch {
      // no-op
    }
  }
  aisSocket = null;
  stopRelayEventSource();
  fetch(`${aisRelayBaseUrl}/disconnect`, { method: "POST" }).catch(() => {});
  aisConnected = false;
  document.getElementById("toggleAis")?.classList.remove("active");
  setAisStatus(liveVessels.length ? "AIS pause" : "AIS requis", false);
  setAisMessage("Flux AISStream coupe. Les dernieres pistes live restent visibles.");
  renderFleetList();
}

async function connectAisStream() {
  const apiKeyInput = document.getElementById("aisApiKey");
  const scopeInput = document.getElementById("aisScope");
  const apiKey = apiKeyInput.value.trim();
  const scope = scopeInput.value;

  if (!apiKey) {
    setAisMessage("Colle ta cle API AISStream pour lancer le flux live.");
    apiKeyInput.focus();
    return;
  }

  localStorage.setItem("coss-watch-ais-key", apiKey);
  localStorage.setItem("coss-watch-ais-scope", scope);
  disconnectAisStream();
  setAisStatus("Connexion AIS...", false);
  setAisMessage("Connexion au relais AIS local...");

  try {
    aisRelaySource = new EventSource(`${aisRelayBaseUrl}/events`);
  } catch (error) {
    setAisStatus("AIS erreur", false);
    setAisMessage("Relais AIS indisponible. Lance le service local AIS relay.");
    console.warn("EventSource relais indisponible", error);
    return;
  }

  aisRelaySource.onmessage = (event) => {
    try {
      const packet = JSON.parse(event.data);
      if (packet.kind === "ais") {
        handleAisPayload(packet.message);
        return;
      }
      if (packet.kind === "status") {
        if (packet.state === "connected") {
          aisConnected = true;
          document.getElementById("toggleAis")?.classList.add("active");
          setAisStatus(
            `AIS live | ${scope === "world" ? "monde" : scope === "pacific" ? "Pacifique" : "NC"}`,
            true,
          );
          setAisMessage("Flux AISStream actif via relais local.");
          renderFleetList();
        } else if (packet.state === "closed") {
          aisConnected = false;
          document.getElementById("toggleAis")?.classList.remove("active");
          setAisStatus("AIS coupe", false);
          setAisMessage(
            packet.reason
              ? `Flux AIS ferme (${packet.reason}).`
              : "Flux AIS ferme. Verifie la cle ou reduis la zone de reception.",
          );
        }
        return;
      }
      if (packet.kind === "error") {
        aisConnected = false;
        document.getElementById("toggleAis")?.classList.remove("active");
        setAisStatus("AIS erreur", false);
        setAisMessage(packet.message || "Erreur AISStream. Verifie la cle et la connexion.");
      }
    } catch (error) {
      console.warn("Paquet relais AIS invalide", error);
    }
  };

  aisRelaySource.onerror = () => {
    if (!aisConnected) {
      setAisStatus("AIS erreur", false);
      setAisMessage("Relais AIS indisponible. Demarre AIS relay puis reconnecte.");
    }
  };

  try {
    await relayRequest("/connect", { apiKey, scope });
  } catch (error) {
    stopRelayEventSource();
    aisConnected = false;
    setAisStatus("AIS erreur", false);
    setAisMessage("Connexion au relais impossible. Verifie AIS relay, la cle et la connexion internet.");
    console.warn("Connexion relais AIS impossible", error);
  }
}

function restoreAisSettings() {
  const apiKeyInput = document.getElementById("aisApiKey");
  const scopeInput = document.getElementById("aisScope");
  const savedKey = localStorage.getItem("coss-watch-ais-key");
  const savedScope = localStorage.getItem("coss-watch-ais-scope");
  if (savedKey) apiKeyInput.value = savedKey;
  if (savedScope) scopeInput.value = savedScope;
}

function setDockTarget(panel, dockTarget) {
  if (!panel || !dockTarget || typeof dockTarget.getBoundingClientRect !== "function") return;
  const panelRect = panel.getBoundingClientRect();
  const targetRect = dockTarget.getBoundingClientRect();
  const panelCenterX = panelRect.left + panelRect.width / 2;
  const panelCenterY = panelRect.top + panelRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  panel.style.setProperty("--dock-x", `${Math.round(targetCenterX - panelCenterX)}px`);
  panel.style.setProperty("--dock-y", `${Math.round(targetCenterY - panelCenterY)}px`);
}

function dockButtonForTarget(target) {
  const ids = {
    layers: "toggleLayersPanel",
    surveillance: "toggleSurveillancePanel",
    surface: "toggleSurfacePanel",
    aisPanel: "toggleAis",
    search: "toggleMapSearchPanel",
  };
  return document.getElementById(ids[target]);
}

function selectedMarkerElement() {
  const marker = selectedTrackId ? markers.get(selectedTrackId) || trafficMarkerById.get(selectedTrackId) : null;
  return marker && marker.getElement ? marker.getElement() : null;
}

function setFloatingPanelVisible(panel, visible, dockTarget = null) {
  if (!panel) return;
  window.clearTimeout(panel.closeTimer);
  panel.classList.remove("panel-closing");
  if (visible) {
    panel.style.animation = "";
    panel.hidden = false;
    return;
  }
  setDockTarget(panel, dockTarget);
  panel.style.animation = "";
  panel.classList.add("panel-closing");
  panel.closeTimer = window.setTimeout(() => {
    panel.hidden = true;
    panel.classList.remove("panel-closing");
  }, 210);
}

function setLayerMenuVisible(menu, visible, dockTarget = null) {
  if (!menu) return;
  window.clearTimeout(menu.closeTimer);
  menu.classList.remove("panel-closing");
  if (visible) {
    menu.style.animation = "";
    menu.classList.add("open");
    return;
  }
  if (!menu.classList.contains("open")) return;
  setDockTarget(menu, dockTarget);
  menu.style.animation = "";
  menu.classList.add("panel-closing");
  menu.closeTimer = window.setTimeout(() => {
    menu.classList.remove("open", "panel-closing");
  }, 210);
}

function setMapSearchVisible(panel, visible, dockTarget = null) {
  if (!panel) return;
  window.clearTimeout(panel.closeTimer);
  panel.classList.remove("panel-closing");
  if (visible) {
    panel.hidden = false;
    panel.classList.add("open");
    panel.style.animation = "";
    const input = panel.querySelector("input");
    if (input) {
      window.setTimeout(() => input.focus(), 90);
    }
    return;
  }
  if (panel.hidden) return;
  setDockTarget(panel, dockTarget);
  panel.classList.add("panel-closing");
  panel.closeTimer = window.setTimeout(() => {
    panel.hidden = true;
    panel.classList.remove("open", "panel-closing");
  }, 210);
}

function isPanelVisible(panel) {
  return panel && !panel.hasAttribute("hidden") && !panel.classList.contains("panel-closing");
}

function setToolActive(id, active) {
  const button = document.getElementById(id);
  if (button) button.classList.toggle("active", active);
}

function reduceTarget(target, dockTarget = null) {
  const targetButton = dockTarget || dockButtonForTarget(target);
  const layerMenu = document.querySelector(".command-bar");
  if (target === "layers") {
    setLayerMenuVisible(layerMenu, false, targetButton);
    setToolActive("toggleLayersPanel", false);
    return;
  }
  if (target === "surveillance") {
    setFloatingPanelVisible(document.querySelector(".left-panel"), false, targetButton);
    setToolActive("toggleSurveillancePanel", false);
    return;
  }
  if (target === "surface") {
    setFloatingPanelVisible(document.querySelector(".right-panel"), false, targetButton);
    setToolActive("toggleSurfacePanel", false);
    return;
  }
  if (target === "aisPanel") {
    setFloatingPanelVisible(document.getElementById("aisPanel"), false, targetButton);
    setToolActive("toggleAis", false);
    return;
  }
  if (target === "search") {
    setMapSearchVisible(document.getElementById("mapSearchPanel"), false, targetButton);
    setToolActive("toggleMapSearchPanel", false);
  }
}

function reduceFloatingPopups() {
  reduceTarget("surveillance");
  reduceTarget("surface");
  reduceTarget("aisPanel");
  reduceTarget("search");
  setFloatingPanelVisible(document.getElementById("staticTrackCard"), false, selectedMarkerElement());
}

function isInteractiveDragTarget(target) {
  return Boolean(target.closest("button, input, select, textarea, a, [role='button']"));
}

function safelySetPointerCapture(element, pointerId) {
  try {
    element.setPointerCapture?.(pointerId);
  } catch {
    // The pointer may already be owned by the browser during fast drag starts.
  }
}

function safelyReleasePointerCapture(element, pointerId) {
  try {
    element.releasePointerCapture?.(pointerId);
  } catch {
    // The pointer can be released automatically before the handler runs.
  }
}

function enableDraggable(panel, handleSelector) {
  if (!panel || panel.dataset.draggableReady === "true") return;
  panel.dataset.draggableReady = "true";
  panel.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || isInteractiveDragTarget(event.target)) return;
    if (panel.classList.contains("panel-closing")) return;
    const handle = handleSelector ? event.target.closest(handleSelector) : panel;
    if (!handle || !panel.contains(handle)) return;

    const rect = panel.getBoundingClientRect();
    const parentRect = panel.offsetParent?.getBoundingClientRect() || { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = rect.left - parentRect.left;
    const startTop = rect.top - parentRect.top;
    const maxLeft = () => Math.max(8, parentRect.width - rect.width - 8);
    const maxTop = () => Math.max(8, parentRect.height - rect.height - 8);

    panel.classList.add("dragging");
    panel.getAnimations?.().forEach((animation) => animation.cancel());
    panel.style.animation = "none";
    panel.style.width = `${rect.width}px`;
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.style.transform = "none";
    event.preventDefault();
    event.stopPropagation();

    const onMove = (moveEvent) => {
      const nextLeft = Math.min(Math.max(8, startLeft + moveEvent.clientX - startX), maxLeft());
      const nextTop = Math.min(Math.max(8, startTop + moveEvent.clientY - startY), maxTop());
      panel.style.left = `${nextLeft}px`;
      panel.style.top = `${nextTop}px`;
    };

    const onUp = () => {
      panel.classList.remove("dragging");
      safelyReleasePointerCapture(panel, event.pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    safelySetPointerCapture(panel, event.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  });
}

const homeScenes = [
  {
    id: "global-watch",
    eyebrow: "Theatre 01 | Veille oceanique",
    title: "COSS WATCH NC",
    body:
      "Une ouverture cinematographique pour lire le theatre maritime, suivre les routes longues distances et installer tout de suite une sensation de surveillance moderne, fluide et maitrisee.",
    ctaLabel: "Entrer dans la carte",
    secondaryLabel: "Voir le focus NC",
    secondaryTarget: 1,
    panelLabel: "Theatre",
    panelValue: "Pacifique Sud",
    panelCopy:
      "Routes inter-oceaniques, halos radar, trafic longue distance et axes de navigation presents dans une interface premium qui reste facile a parcourir.",
    chips: ["AIS mesh", "Routes mondiales", "Ocean watch"],
    metrics: [
      { label: "Couverture", value: "Pacifique / ZEE" },
      { label: "Mission", value: "Veille / Navigation" },
      { label: "Promesse", value: "Immersif mais lisible" },
    ],
    visualState: {
      glow: 1,
      routes: 1,
      particles: 1,
      focus: 0.08,
      hud: 0.4,
      alert: 0.06,
      horizonLift: 0.18,
    },
    hudVariant: "global",
    cameraDepth: 0.08,
    scrollStart: 0,
    scrollEnd: 0.333,
  },
  {
    id: "focus-nc",
    eyebrow: "Theatre 02 | Focus Nouvelle-Caledonie",
    title: "FOCUS NC",
    body:
      "Resserrement geospatial sur la ZEE, le lagon, les approches de Noumea et les couloirs de surveillance pour montrer un pilotage plus tactique de la zone.",
    ctaLabel: "Entrer dans la carte",
    secondaryLabel: "Voir la posture SAR",
    secondaryTarget: 2,
    panelLabel: "Zone",
    panelValue: "Nouvelle-Caledonie",
    panelCopy:
      "Focus sur Noumea, les iles, le lagon et les routes regionales avec une densite HUD plus forte, des reperes geospatiaux et une lecture de navigation plus directe.",
    chips: ["ZEE", "Lagon", "Approches Noumea"],
    metrics: [
      { label: "Zone maritime", value: "1.4M km2" },
      { label: "Lecture", value: "ZEE / Lagon" },
      { label: "Couloirs", value: "Veille regionale" },
    ],
    visualState: {
      glow: 0.9,
      routes: 0.72,
      particles: 0.82,
      focus: 0.66,
      hud: 0.7,
      alert: 0.18,
      horizonLift: -0.02,
    },
    hudVariant: "focus",
    cameraDepth: 0.36,
    scrollStart: 0.333,
    scrollEnd: 0.666,
  },
  {
    id: "sar-posture",
    eyebrow: "Theatre 03 | Posture SAR",
    title: "POSTURE SAR",
    body:
      "Posture de coordination pour croiser les alertes, accelerer la decision et basculer sans rupture vers la carte operationnelle, les navires et les panneaux de situation surface.",
    ctaLabel: "Ouvrir la carte",
    secondaryLabel: "Revenir au theatre global",
    secondaryTarget: 0,
    panelLabel: "Priorite",
    panelValue: "SAR / Alertes",
    panelCopy:
      "Cadence de decision plus rapide, points de veille critiques, signalisation renforcee et entree immediate dans le poste de conduite operationnel.",
    chips: ["Alertes actives", "Signal critique", "Search and rescue"],
    metrics: [
      { label: "Mission", value: "Veille / SAR" },
      { label: "Etat", value: "Ready to deploy" },
      { label: "Flux", value: "AIS ready" },
    ],
    visualState: {
      glow: 0.82,
      routes: 0.42,
      particles: 0.56,
      focus: 1,
      hud: 1,
      alert: 0.82,
      horizonLift: -0.12,
    },
    hudVariant: "sar",
    cameraDepth: 0.62,
    scrollStart: 0.666,
    scrollEnd: 1,
  },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerpNumber(start, end, amount) {
  return start + (end - start) * amount;
}

function initHomeExperience() {
  const homeScreen = document.getElementById("homeScreen");
  if (!homeScreen) return;
  const homeScroll = document.getElementById("homeScroll");
  const homeKicker = document.getElementById("homeKicker");
  const homeTitle = document.getElementById("homeTitle");
  const homeSubtitle = document.getElementById("homeSubtitle");
  const homePanelLabel = document.getElementById("homePanelLabel");
  const homePanelValue = document.getElementById("homePanelValue");
  const homePanelCopy = document.getElementById("homePanelCopy");
  const homeStatusChips = document.getElementById("homeStatusChips");
  const homeSceneCounter = document.getElementById("homeSceneCounter");
  const homeMetricLabels = [
    document.getElementById("homeMetricLabel1"),
    document.getElementById("homeMetricLabel2"),
    document.getElementById("homeMetricLabel3"),
  ];
  const homeMetricValues = [
    document.getElementById("homeMetricValue1"),
    document.getElementById("homeMetricValue2"),
    document.getElementById("homeMetricValue3"),
  ];
  const sceneButtons = Array.from(homeScreen.querySelectorAll("[data-home-scene]"));
  const jumpButtons = Array.from(homeScreen.querySelectorAll("[data-home-jump]"));
  const primaryButton = document.getElementById("enterOps");
  const secondaryButton = document.getElementById("previewMap");
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeSceneId = "";
  let activeSceneIndex = 0;
  let scrollFrame = null;
  let homeScrollAnimation = null;

  function bindPress(target, handler) {
    if (!target) return;
    let pointerHandled = false;
    target.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      pointerHandled = true;
      handler(event);
    });
    target.addEventListener("click", (event) => {
      if (pointerHandled) {
        pointerHandled = false;
        return;
      }
      handler(event);
    });
  }

  function maxHomeScroll() {
    return Math.max(1, homeScroll.scrollHeight - homeScroll.clientHeight);
  }

  function setHomeScrollTop(targetTop, smooth = false) {
    const finalTop = clamp(targetTop, 0, maxHomeScroll());
    if (homeScrollAnimation) {
      window.cancelAnimationFrame(homeScrollAnimation);
      homeScrollAnimation = null;
    }
    if (!smooth || reducedMotionQuery.matches) {
      homeScroll.scrollTop = finalTop;
      syncScrollState();
      return;
    }

    const startTop = homeScroll.scrollTop;
    const delta = finalTop - startTop;
    const startTime = performance.now();
    const duration = 520;

    function step(now) {
      const elapsed = clamp((now - startTime) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      homeScroll.scrollTop = startTop + delta * eased;
      if (elapsed < 1) {
        homeScrollAnimation = window.requestAnimationFrame(step);
      } else {
        homeScrollAnimation = null;
        syncScrollState();
      }
    }

    homeScrollAnimation = window.requestAnimationFrame(step);
  }

  function sceneFromProgress(progress) {
    const clampedProgress = clamp(progress, 0, 1);
    let activeIndex = homeScenes.findIndex((scene, index) => {
      if (index === homeScenes.length - 1) return clampedProgress >= scene.scrollStart;
      return clampedProgress >= scene.scrollStart && clampedProgress < scene.scrollEnd;
    });
    if (activeIndex === -1) activeIndex = homeScenes.length - 1;
    const baseIndex = activeIndex;
    const nextIndex = Math.min(homeScenes.length - 1, activeIndex + 1);
    const activeScene = homeScenes[activeIndex];
    const span = Math.max(0.001, activeScene.scrollEnd - activeScene.scrollStart);
    const blend = activeIndex === homeScenes.length - 1
      ? 0
      : clamp((clampedProgress - activeScene.scrollStart) / span, 0, 1);
    return {
      activeIndex,
      baseIndex,
      nextIndex,
      blend,
    };
  }

  function updateSceneCopy(scene) {
    if (activeSceneId === scene.id) return;
    activeSceneId = scene.id;
    homeScreen.dataset.scene = scene.id;
    homeKicker.textContent = scene.eyebrow;
    homeTitle.textContent = scene.title;
    homeSubtitle.textContent = scene.body;
    homePanelLabel.textContent = scene.panelLabel;
    homePanelValue.textContent = scene.panelValue;
    homePanelCopy.textContent = scene.panelCopy;
    primaryButton.textContent = scene.ctaLabel;
    secondaryButton.textContent = scene.secondaryLabel;

    scene.metrics.forEach((metric, index) => {
      if (homeMetricLabels[index]) homeMetricLabels[index].textContent = metric.label;
      if (homeMetricValues[index]) homeMetricValues[index].textContent = metric.value;
    });

    homeStatusChips.innerHTML = scene.chips
      .map((chip) => `<span class="home-chip">${chip}</span>`)
      .join("");
  }

  function updateSceneButtons(activeIndex) {
    sceneButtons.forEach((button, index) => {
      const active = index === activeIndex;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    homeSceneCounter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(homeScenes.length).padStart(2, "0")}`;
  }

  function pushCanvasState(sceneState) {
    window.CossHomeCanvas?.setState?.(sceneState);
  }

  function applyHomeProgress(progress) {
    const clampedProgress = clamp(progress, 0, 1);
    const { activeIndex, baseIndex, nextIndex, blend } = sceneFromProgress(clampedProgress);
    const activeScene = homeScenes[activeIndex];
    const fromScene = homeScenes[baseIndex];
    const toScene = homeScenes[nextIndex];
    const visualState = {};

    Object.keys(fromScene.visualState).forEach((key) => {
      visualState[key] = lerpNumber(fromScene.visualState[key], toScene.visualState[key], blend);
    });

    const span = Math.max(0.001, activeScene.scrollEnd - activeScene.scrollStart);
    const sceneProgress = clamp((clampedProgress - activeScene.scrollStart) / span, 0, 1);
    const cameraDepth = lerpNumber(fromScene.cameraDepth, toScene.cameraDepth, blend);

    homeScreen.style.setProperty("--home-progress", clampedProgress.toFixed(3));
    activeSceneIndex = activeIndex;
    updateSceneCopy(activeScene);
    updateSceneButtons(activeIndex);
    pushCanvasState({
      sceneIndex: activeIndex,
      sceneProgress,
      progress: clampedProgress,
      cameraDepth,
      hudVariant: activeScene.hudVariant,
      reducedMotion: reducedMotionQuery.matches,
      visualState,
    });
  }

  function syncScrollState() {
    scrollFrame = null;
    applyHomeProgress(homeScroll.scrollTop / maxHomeScroll());
  }

  const showHome = () => {
    window.clearTimeout(homeScreen.hideTimer);
    homeScreen.hidden = false;
    homeScreen.classList.remove("home-exiting");
    document.body.classList.add("home-open");
    homeScreen.setAttribute("aria-hidden", "false");
    setHomeScrollTop(0, false);
    homeScreen.style.setProperty("--home-pointer-x", "0px");
    homeScreen.style.setProperty("--home-pointer-y", "0px");
    window.history.replaceState(null, "", "#home");
    applyHomeProgress(0);
  };

  const openOps = () => {
    if (homeScreen.hidden || homeScreen.classList.contains("home-exiting")) return;
    homeScreen.classList.add("home-exiting");
    document.body.classList.remove("home-open");
    homeScreen.setAttribute("aria-hidden", "true");
    homeScreen.style.setProperty("--home-pointer-x", "0px");
    homeScreen.style.setProperty("--home-pointer-y", "0px");
    window.clearTimeout(homeScreen.hideTimer);
    homeScreen.hideTimer = window.setTimeout(() => {
      homeScreen.hidden = true;
      homeScreen.classList.remove("home-exiting");
      map.invalidateSize();
    }, 520);
    window.history.replaceState(null, "", "#ops");
  };

  function goToScene(index, smooth = true) {
    const scene = homeScenes[clamp(index, 0, homeScenes.length - 1)];
    setHomeScrollTop(maxHomeScroll() * scene.scrollStart, smooth);
  }

  function previewScene() {
    goToScene(homeScenes[activeSceneIndex].secondaryTarget, true);
  }

  homeScroll.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(syncScrollState);
  });

  homeScreen.addEventListener("pointermove", (event) => {
    if (reducedMotionQuery.matches) return;
    const rect = homeScreen.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 42;
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 28;
    homeScreen.style.setProperty("--home-pointer-x", `${x.toFixed(2)}px`);
    homeScreen.style.setProperty("--home-pointer-y", `${y.toFixed(2)}px`);
  });

  homeScreen.addEventListener("pointerleave", () => {
    homeScreen.style.setProperty("--home-pointer-x", "0px");
    homeScreen.style.setProperty("--home-pointer-y", "0px");
  });

  reducedMotionQuery.addEventListener?.("change", () => applyHomeProgress(homeScroll.scrollTop / maxHomeScroll()));

  bindPress(primaryButton, openOps);
  bindPress(secondaryButton, previewScene);
  bindPress(document.getElementById("homeMapLink"), openOps);

  jumpButtons.forEach((button) => {
    bindPress(button, () => {
      const sceneIndex = Number(button.dataset.homeJump || 0);
      goToScene(sceneIndex, true);
    });
  });

  sceneButtons.forEach((button, index) => {
    bindPress(button, () => {
      goToScene(index, false);
    });
  });

  bindPress(document.getElementById("showHome"), (event) => {
    event.stopPropagation();
    showHome();
  });

  if (window.location.hash === "#ops") {
    homeScreen.hidden = true;
    homeScreen.setAttribute("aria-hidden", "true");
  } else {
    showHome();
  }
}

function bindMinimizeButtons() {
  document.querySelectorAll("[data-minimize-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      reduceTarget(button.dataset.minimizeTarget);
    });
  });
}

function bindClickOutsideReduction() {
  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".panel, .static-track-card, .side-tools, .command-bar, .map-search, .leaflet-control, .leaflet-marker-icon")) {
      return;
    }
    reduceFloatingPopups();
  });
}

function bindControls() {
  const layerMenu = document.querySelector(".command-bar");
  bindMinimizeButtons();
  bindClickOutsideReduction();
  enableDraggable(document.querySelector(".left-panel"), ".panel-title");
  enableDraggable(document.querySelector(".right-panel"), ".panel-title");
  enableDraggable(document.getElementById("aisPanel"), ".panel-title");
  enableDraggable(layerMenu, null);

  document.getElementById("toggleLayersPanel").addEventListener("click", (event) => {
    event.stopPropagation();
    const active = !layerMenu.classList.contains("open");
    setLayerMenuVisible(layerMenu, active, event.currentTarget);
    event.currentTarget.classList.toggle("active", active);
  });

  document.getElementById("toggleSurveillancePanel").addEventListener("click", (event) => {
    event.stopPropagation();
    const panel = document.querySelector(".left-panel");
    const visible = panel.hasAttribute("hidden") || panel.classList.contains("panel-closing");
    setFloatingPanelVisible(panel, visible, event.currentTarget);
    event.currentTarget.classList.toggle("active", visible);
  });

  document.getElementById("toggleSurfacePanel").addEventListener("click", (event) => {
    event.stopPropagation();
    const panel = document.querySelector(".right-panel");
    const visible = panel.hasAttribute("hidden") || panel.classList.contains("panel-closing");
    setFloatingPanelVisible(panel, visible, event.currentTarget);
    event.currentTarget.classList.toggle("active", visible);
  });

  document.getElementById("toggleMapSearchPanel").addEventListener("click", (event) => {
    event.stopPropagation();
    const panel = document.getElementById("mapSearchPanel");
    const visible = panel.hidden || panel.classList.contains("panel-closing");
    setMapSearchVisible(panel, visible, event.currentTarget);
    event.currentTarget.classList.toggle("active", visible);
  });

  document.querySelectorAll(".fleet-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".fleet-tabs button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeFilter = button.dataset.filter;
      renderFleetList();
    });
  });

  document.getElementById("searchInput").addEventListener("input", renderFleetList);

  const mapSearchInput = document.getElementById("mapSearchInput");
  if (mapSearchInput) {
    mapSearchInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runMapSearch();
    });
  }
  document.getElementById("runMapSearch")?.addEventListener("click", runMapSearch);

  const coordFormatInput = document.getElementById("coordFormat");
  if (coordFormatInput) {
    coordFormatInput.value = coordinateFormat;
    coordFormatInput.addEventListener("change", (event) => {
      coordinateFormat = event.target.value || "dm";
      localStorage.setItem("coss-watch-coord-format", coordinateFormat);
      updateCoordinateHud();
    });
  }

  document.getElementById("toggleZones").addEventListener("click", (event) => {
    const active = event.currentTarget.classList.toggle("active");
    if (active) {
      map.addLayer(eezLayer);
      map.addLayer(maritimeComplementLayer);
    } else {
      map.removeLayer(eezLayer);
      map.removeLayer(maritimeComplementLayer);
    }
  });

  document.getElementById("toggleProtected").addEventListener("click", (event) => {
    const active = event.currentTarget.classList.toggle("active");
    active ? map.addLayer(protectedAreaLayer) : map.removeLayer(protectedAreaLayer);
  });

  document.getElementById("toggleTracks").addEventListener("click", (event) => {
    const active = event.currentTarget.classList.toggle("active");
    active ? map.addLayer(trackLayer) : map.removeLayer(trackLayer);
  });

  document.getElementById("toggleAis").addEventListener("click", (event) => {
    event.stopPropagation();
    const panel = document.getElementById("aisPanel");
    const visible = panel.hasAttribute("hidden") || panel.classList.contains("panel-closing");
    setFloatingPanelVisible(panel, visible, event.currentTarget);
    event.currentTarget.classList.toggle("active", visible);
  });

  document.getElementById("connectAis").addEventListener("click", connectAisStream);
  document.getElementById("disconnectAis").addEventListener("click", disconnectAisStream);

  document.getElementById("focusNc").addEventListener("click", () => {
    map.setView([ncOperationalFocus.lat, ncOperationalFocus.lon], ncOperationalFocus.zoom, { animate: true });
  });

  document.getElementById("createSar").addEventListener("click", () => {
    if (!selectedTrackId) {
      renderAlerts();
      return;
    }
    const now = new Date();
    alerts.unshift({
      level: "SAR",
      vesselId: selectedTrackId,
      title: "Nouveau dossier SAR",
      text: `Incident cree a ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}. Zone de recherche a definir.`,
    });
    renderAlerts();
  });
}

renderLandReferences();
renderEez();
renderMaritimeComplements();
renderProtectedAreas();
renderCityLabels();
renderBackgroundTraffic();
renderMarkers();
removeVisibleMapMarkers();
window.setInterval(removeVisibleMapMarkers, 750);
applyMarkerScale();
renderTracks();
renderFleetList();
renderAlerts();
initHomeExperience();
bindControls();
restoreAisSettings();
setAisStatus("AIS requis", false);

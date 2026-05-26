const staleAfterMs = 15 * 60 * 1000;

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeSpeed(value) {
  const speed = asNumber(value, 0);
  return speed > 70 ? speed / 10 : speed;
}

function normalizeCourse(value) {
  const course = asNumber(value, 0);
  return (course > 360 ? course / 10 : course) % 360;
}

function vesselTypeFromAis(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value || "unknown").toLowerCase();
  if (numeric === 30) return "fishing";
  if (numeric === 50) return "pilot";
  if (numeric === 51) return "sar";
  if (numeric >= 60 && numeric <= 69) return "passenger";
  if (numeric >= 70 && numeric <= 79) return "cargo";
  if (numeric >= 80 && numeric <= 89) return "tanker";
  return "unknown";
}

export function normalizeAisStreamMessage(message, source = "aisstream") {
  const meta = message?.MetaData || message?.Metadata || {};
  const payload = message?.Message || {};
  const position = payload.PositionReport || payload.StandardClassBPositionReport;
  const staticData = payload.ShipStaticData || payload.StaticDataReport || payload.StandardClassBShipStaticData || {};
  const report = staticData.ReportA || staticData.ReportB || staticData;
  const mmsi = String(position?.UserID || report.UserID || report.MMSI || meta.MMSI || meta.Mmsi || "").trim();
  if (!mmsi) return null;

  const lat = asNumber(position?.Latitude ?? meta.Latitude, NaN);
  const lon = asNumber(position?.Longitude ?? meta.Longitude, NaN);
  const lastUpdate = meta.time_utc || meta.TimeUtc || meta.Received || new Date().toISOString();
  const updatedAt = Date.parse(lastUpdate);

  return {
    id: `ais-${mmsi}`,
    mmsi,
    imo: String(report.ImoNumber || report.IMO || meta.IMO || ""),
    name: String(report.Name || meta.ShipName || meta.Name || `AIS ${mmsi}`).trim(),
    vesselType: vesselTypeFromAis(report.Type ?? report.ShipType ?? meta.ShipType ?? meta.Type),
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    course: normalizeCourse(position?.Cog ?? position?.CourseOverGround),
    heading: normalizeCourse(position?.TrueHeading ?? position?.Heading ?? position?.Cog),
    speed: normalizeSpeed(position?.Sog ?? position?.SpeedOverGround),
    destination: String(report.Destination || meta.Destination || ""),
    navigationStatus: String(position?.NavigationalStatus || meta.NavigationalStatus || "unknown"),
    lastUpdate,
    source,
    zone: "",
    isStale: Number.isFinite(updatedAt) ? Date.now() - updatedAt > staleAfterMs : false,
    trackHistory: [],
  };
}

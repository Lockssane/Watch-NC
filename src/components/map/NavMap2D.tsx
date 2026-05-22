import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import { useNavStore } from "../../store/navigation";

const ShipIcon = L.divIcon({
  html: "🚢",
  className: "text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function NavMap2D() {
  const vesselMap = useNavStore((state) => state.vessels);
  const selectVessel = useNavStore((state) => state.selectVessel);
  const vessels = Array.from(vesselMap.values());

  return (
    <MapContainer
      center={[-22.2758, 166.4572]}
      zoom={10}
      zoomControl={false}
      className="z-0 h-full w-full bg-abyss"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="OpenStreetMap / CARTO"
      />
      <TileLayer url="https://{s}.tile.openseamap.org/seamark/{z}/{x}/{y}.png" attribution="OpenSeaMap" />
      <ZoomControl position="bottomleft" />

      {vessels.map((vessel) => (
        <Marker
          key={vessel.mmsi}
          position={[vessel.lat, vessel.lon]}
          icon={ShipIcon}
          eventHandlers={{ click: () => selectVessel(vessel.mmsi) }}
        >
          <Popup>
            <strong className="mb-1 block">{vessel.name}</strong>
            <span>MMSI: {vessel.mmsi}</span>
            <br />
            <span>
              Cap: {Math.round(vessel.heading)} deg | Vit: {vessel.speed.toFixed(1)} kts
            </span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

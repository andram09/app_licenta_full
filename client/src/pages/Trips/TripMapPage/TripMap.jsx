import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet necesita iconite setate manual in Vite/Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Iconica rosie pentru obiectivul selectat
const highlightIcon = new L.Icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// Subcomponenta care face flyTo si deschide popup-ul la selectie.
// Primeste markerRefs din TripMap pentru a accesa instanta marker-ului.
function FlyController({ objectives, highlightedObjId, markerRefs }) {
    const map = useMap();

    useEffect(() => {
        if (!highlightedObjId) return;
        const obj = objectives.find((o) => o.id_objective === highlightedObjId);
        if (!obj || obj.coord_lat == null || obj.coord_lng == null) return;

        map.flyTo([parseFloat(obj.coord_lat), parseFloat(obj.coord_lng)], 16, { duration: 0.8 });

        const marker = markerRefs.current[highlightedObjId];
        if (marker) {
            setTimeout(() => marker.openPopup(), 850);
        }
    }, [highlightedObjId, objectives, map, markerRefs]);

    return null;
}

// Componenta Leaflet — afiseaza obiectivele cu coordonate pe harta
export default function TripMap({ objectives, highlightedObjId, onMarkerClick }) {
    const markerRefs = useRef({});

    const withCoords = objectives.filter(
        (o) => o.coord_lat != null && o.coord_lng != null
    );

    const defaultCenter =
        withCoords.length > 0
            ? [parseFloat(withCoords[0].coord_lat), parseFloat(withCoords[0].coord_lng)]
            : [45.9432, 24.9668];

    return (
        <MapContainer center={defaultCenter} zoom={13} className="trip-map-container">
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FlyController
                objectives={withCoords}
                highlightedObjId={highlightedObjId}
                markerRefs={markerRefs}
            />

            {withCoords.map((obj) => (
                <Marker
                    key={obj.id_objective}
                    position={[parseFloat(obj.coord_lat), parseFloat(obj.coord_lng)]}
                    icon={obj.id_objective === highlightedObjId ? highlightIcon : new L.Icon.Default()}
                    ref={(ref) => {
                        if (ref) markerRefs.current[obj.id_objective] = ref;
                    }}
                    eventHandlers={{
                        click: () => onMarkerClick(obj.id_objective),
                    }}
                >
                    <Popup>
                        <strong>{obj.title}</strong>
                        {obj.planned_time && (
                            <div>{obj.planned_time.slice(0, 5)}</div>
                        )}
                        {obj.description && (
                            <div style={{ marginTop: "0.3rem", fontSize: "0.85em", color: "#555" }}>
                                {obj.description.slice(0, 120)}
                                {obj.description.length > 120 ? "…" : ""}
                            </div>
                        )}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}

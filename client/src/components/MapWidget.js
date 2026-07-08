import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Spinner } from "./UI";

// Fix Leaflet's default icon path issues with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Custom icons for different POIs
const createIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const icons = {
  hotel: createIcon("gold"),
  restaurant: createIcon("orange"),
  attraction: createIcon("violet"),
  airport: createIcon("blue"),
};

export default function MapWidget({ hotel }) {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);

  const lat = hotel?.lat;
  const lng = hotel?.lng;

  useEffect(() => {
    if (!lat || !lng) {
      setLoading(false);
      return;
    }

    const fetchPOIs = async () => {
      try {
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"="restaurant"](around:2000,${lat},${lng});
            node["aeroway"="aerodrome"](around:20000,${lat},${lng});
            node["tourism"="attraction"](around:10000,${lat},${lng});
          );
          out body;
          >;
          out skel qt;
        `;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
        });
        const data = await res.json();
        const nodes = data.elements.filter((e) => e.type === "node" && e.tags && e.tags.name);
        setPois(nodes.slice(0, 50)); // limit to 50 POIs for performance
      } catch (err) {
        console.error("Failed to fetch POIs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPOIs();
  }, [lat, lng]);

  if (!lat || !lng) {
    return (
      <div style={{ padding: "40px", textAlign: "center", background: "rgba(10,8,6,0.5)", border: "1px solid rgba(184,148,63,0.2)" }}>
        <p style={{ color: "#9a8e7e" }}>Map data is not available for this property.</p>
      </div>
    );
  }

  const hotelLatLng = L.latLng(lat, lng);

  const getPOIType = (tags) => {
    if (tags.aeroway === "aerodrome") return "airport";
    if (tags.tourism === "attraction") return "attraction";
    return "restaurant";
  };

  return (
    <div style={{ width: "100%", height: "500px", border: "1px solid rgba(184,148,63,0.3)", position: "relative" }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 1000, background: "rgba(10,8,6,0.6)", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Spinner />
        </div>
      )}
      <MapContainer center={[lat, lng]} zoom={13} style={{ width: "100%", height: "100%", zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {/* Hotel Marker */}
        <Marker position={[lat, lng]} icon={icons.hotel}>
          <Popup>
            <div style={{ fontFamily: "'Inter', sans-serif" }}>
              <strong style={{ fontSize: 16, color: "#333" }}>{hotel.name}</strong>
              <p style={{ margin: "4px 0", color: "#666" }}>Your destination</p>
            </div>
          </Popup>
        </Marker>

        {/* POI Markers */}
        {!loading && pois.map((poi) => {
          const type = getPOIType(poi.tags);
          const icon = icons[type];
          const dist = hotelLatLng.distanceTo(L.latLng(poi.lat, poi.lon));
          
          return (
            <Marker key={poi.id} position={[poi.lat, poi.lon]} icon={icon}>
              <Popup>
                <div style={{ fontFamily: "'Inter', sans-serif" }}>
                  <strong style={{ fontSize: 14, color: "#333" }}>{poi.tags.name}</strong>
                  <p style={{ margin: "4px 0", fontSize: 12, color: "#666", textTransform: "capitalize" }}>{type}</p>
                  <p style={{ margin: "4px 0", fontSize: 12, fontWeight: 600, color: "#b8943f" }}>
                    {(dist / 1000).toFixed(1)} km away
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

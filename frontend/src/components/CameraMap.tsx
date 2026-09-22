"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Camera {
  id: string;
  camera_code: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
}

export default function CameraMap({ cameras }: { cameras: Camera[] }) {
  const validCameras = cameras.filter(
    (c) => c.latitude !== null && c.longitude !== null
  );

  const center: [number, number] =
    validCameras.length > 0
      ? [validCameras[0].latitude!, validCameras[0].longitude!]
      : [23.0225, 72.5714];

  return (
    <div className="h-96 rounded-xl overflow-hidden border shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validCameras.map((cam) => (
          <Marker
            key={cam.id}
            position={[cam.latitude!, cam.longitude!]}
            icon={icon}
          >
            <Popup>
              <strong>{cam.camera_code}</strong>
              <br />
              {cam.name}
              <br />
              Status: {cam.status}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
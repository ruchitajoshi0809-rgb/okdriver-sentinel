"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

export interface DetectionPoint {
  id: string;
  sequence: number;
  timestamp: string;
  confidence: number | null;
  camera_id: string;
  camera_name: string;
  camera_code: string;
  zone: string | null;
  department?: string | null;
  latitude: number;
  longitude: number;
}

export interface MovementMapProps {
  detections: DetectionPoint[];
  vehicleNumber?: string;
}

// Controller to auto-fit bounds or pan to the vehicle detections
function MapBoundsController({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
    }
  }, [points, map]);

  return null;
}

// Custom DivIcon for numbered markers 1, 2, 3...
function createNumberedIcon(sequence: number, isFirst: boolean, isLast: boolean) {
  let bgColor = "#2563eb"; // Blue
  let ringClass = "border-blue-400";
  let label = "Point";

  if (isFirst) {
    bgColor = "#059669"; // Emerald/Green (Start)
    ringClass = "border-emerald-300";
    label = "Start";
  } else if (isLast) {
    bgColor = "#dc2626"; // Red (Latest)
    ringClass = "border-red-300";
    label = "Latest";
  }

  return L.divIcon({
    className: "leaflet-numbered-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
        <div style="
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          background-color: ${bgColor};
          color: #ffffff;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2);
          border: 2px solid #ffffff;
        ">
          ${sequence}
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid ${bgColor};
          margin-top: -1px;
        "></div>
      </div>
    `,
  });
}

export default function MovementMap({ detections, vehicleNumber }: MovementMapProps) {
  const coordinates: [number, number][] = detections.map((d) => [
    d.latitude,
    d.longitude,
  ]);

  const defaultCenter: [number, number] =
    coordinates.length > 0 ? coordinates[0] : [23.0225, 72.5714];

  return (
    <div className="relative w-full h-[450px] sm:h-[500px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto fit bounds when points change */}
        <MapBoundsController points={coordinates} />

        {/* Chronological Polyline connecting all detection points */}
        {coordinates.length > 1 && (
          <Polyline
            positions={coordinates}
            pathOptions={{
              color: "#2563eb",
              weight: 4,
              opacity: 0.85,
              dashArray: "8, 8",
            }}
          />
        )}

        {/* Chronological Numbered Markers */}
        {detections.map((point, index) => {
          const isFirst = index === 0;
          const isLast = index === detections.length - 1 && detections.length > 1;
          const icon = createNumberedIcon(point.sequence, isFirst, isLast);

          return (
            <Marker
              key={point.id || `${point.camera_id}-${index}`}
              position={[point.latitude, point.longitude]}
              icon={icon}
            >
              <Popup>
                <div className="p-1 min-w-[200px] text-xs">
                  <div className="flex items-center justify-between border-b pb-1.5 mb-1.5 font-bold text-slate-800">
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFirst
                            ? "bg-emerald-500"
                            : isLast
                            ? "bg-red-500"
                            : "bg-blue-500"
                        }`}
                      />
                      Detection #{point.sequence}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                      {point.confidence != null
                        ? `${(point.confidence * 100).toFixed(0)}% Conf`
                        : "Detected"}
                    </span>
                  </div>

                  {vehicleNumber && (
                    <p className="font-mono text-xs font-bold text-blue-700 mb-1">
                      {vehicleNumber}
                    </p>
                  )}

                  <div className="space-y-1 text-slate-600">
                    <p>
                      <strong className="text-slate-800">Camera:</strong>{" "}
                      {point.camera_name}
                    </p>
                    <p className="font-mono text-[11px] text-slate-500">
                      {point.camera_code}
                    </p>
                    {point.zone && (
                      <p>
                        <strong className="text-slate-800">Zone:</strong>{" "}
                        {point.zone}
                      </p>
                    )}
                    <p className="border-t pt-1 text-[11px] text-slate-500">
                      <strong className="text-slate-700">Time:</strong>{" "}
                      {new Date(point.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legend overlay in bottom corner */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-md text-xs flex flex-wrap gap-3 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white" />
          <span className="text-slate-600 font-medium">1st Detection</span>
        </div>
        {detections.length > 2 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-white" />
            <span className="text-slate-600 font-medium">Intermediate</span>
          </div>
        )}
        {detections.length > 1 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 border border-white" />
            <span className="text-slate-600 font-medium">Latest Point</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 border-t-2 border-dashed border-blue-600" />
          <span className="text-slate-600 font-medium">Route</span>
        </div>
      </div>
    </div>
  );
}

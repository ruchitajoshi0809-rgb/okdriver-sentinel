"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import Cookies from "js-cookie";
import api from "@/lib/api";
import Header from "@/components/Header";
import { DetectionPoint } from "@/components/MovementMap";
import {
  Search,
  Navigation,
  Clock,
  Camera as CameraIcon,
  Radio,
  Car,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

// Dynamic import with ssr: false for Leaflet-based map
const MovementMap = dynamic(() => import("@/components/MovementMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[450px] sm:h-[500px] bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-200">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">Loading tracking map...</span>
    </div>
  ),
});

interface RawCamera {
  id: string;
  camera_code: string;
  name: string;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
  status: string;
}

interface RawEvent {
  id: string;
  camera_id: string;
  event_type: string;
  vehicle_number: string | null;
  confidence: number | null;
  timestamp: string;
}

interface EnrichedEvent {
  id: string;
  sequence: number;
  timestamp: string;
  confidence: number | null;
  vehicle_number: string;
  camera_id: string;
  camera_name: string;
  camera_code: string;
  zone: string | null;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default function VehicleTrackingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vehicleNumber, setVehicleNumber] = useState(
    searchParams?.get("vehicle") || ""
  );
  const [searchedVehicle, setSearchedVehicle] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [cameras, setCameras] = useState<RawCamera[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Trace vehicle function
  const handleTrace = useCallback(
    async (numberToTrace: string) => {
      const cleanNumber = numberToTrace.trim().toUpperCase();
      if (!cleanNumber) return;

      setLoading(true);
      setError(null);
      setSearched(true);
      setSearchedVehicle(cleanNumber);

      try {
        // Fetch cameras to resolve GPS coordinates and names, and fetch events for the vehicle
        const [camerasRes, eventsRes] = await Promise.all([
          cameras.length > 0 ? Promise.resolve({ data: cameras }) : api.get("/cameras/"),
          api.get(`/events/?vehicle_number=${encodeURIComponent(cleanNumber)}&limit=100`),
        ]);

        const fetchedCameras: RawCamera[] = camerasRes.data || [];
        if (cameras.length === 0) {
          setCameras(fetchedCameras);
        }

        const cameraMap = new Map<string, RawCamera>(
          fetchedCameras.map((c) => [c.id, c])
        );

        const rawEvents: RawEvent[] = eventsRes.data || [];

        // Sort events chronologically (timestamp ascending)
        const sorted = [...rawEvents].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Enrich events with camera information
        const enriched: EnrichedEvent[] = sorted.map((evt, index) => {
          const cam = cameraMap.get(evt.camera_id);
          return {
            id: evt.id,
            sequence: index + 1,
            timestamp: evt.timestamp,
            confidence: evt.confidence,
            vehicle_number: evt.vehicle_number || cleanNumber,
            camera_id: evt.camera_id,
            camera_name: cam?.name || "Unregistered Camera",
            camera_code: cam?.camera_code || evt.camera_id.slice(0, 8),
            zone: cam?.zone || null,
            department: cam?.department || null,
            latitude: cam?.latitude ?? null,
            longitude: cam?.longitude ?? null,
          };
        });

        setEvents(enriched);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosErr?.response?.data?.detail ||
            "Failed to fetch tracking data. Please ensure the backend is running."
        );
        setEvents([]);
      } finally {
        setLoading(false);
      }
    },
    [cameras]
  );

  // Authentication check
  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Auto-search if vehicle param is present in URL
    const urlVehicle = searchParams?.get("vehicle");
    if (urlVehicle) {
      handleTrace(urlVehicle);
    }
  }, [router, searchParams, handleTrace]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrace(vehicleNumber);
  };

  // Filter mapped points with valid lat/long for Leaflet
  const validMapPoints: DetectionPoint[] = useMemo(() => {
    return events
      .filter((e) => e.latitude !== null && e.longitude !== null)
      .map((e) => ({
        id: e.id,
        sequence: e.sequence,
        timestamp: e.timestamp,
        confidence: e.confidence,
        camera_id: e.camera_id,
        camera_name: e.camera_name,
        camera_code: e.camera_code,
        zone: e.zone,
        department: e.department,
        latitude: e.latitude as number,
        longitude: e.longitude as number,
      }));
  }, [events]);

  const confidenceBadge = (confidence: number | null) => {
    if (confidence == null) return "bg-slate-100 text-slate-600";
    if (confidence >= 0.9) return "bg-emerald-100 text-emerald-800 border border-emerald-200";
    if (confidence >= 0.75) return "bg-blue-100 text-blue-800 border border-blue-200";
    return "bg-yellow-100 text-yellow-800 border border-yellow-200";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Vehicle Movement History
              </h1>
              <p className="text-slate-500 text-sm">
                Trace chronological trajectory across Sentinel surveillance cameras
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
          <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Car className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="Enter license plate (e.g. GJ01XX0001)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !vehicleNumber.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Tracing Route...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Trace Vehicle</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Plate Chips */}
          <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-medium">Sample plate:</span>
            <button
              type="button"
              onClick={() => {
                setVehicleNumber("GJ01XX0001");
                handleTrace("GJ01XX0001");
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 font-mono font-medium transition-colors cursor-pointer"
            >
              GJ01XX0001
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results View */}
        {searched && !loading && (
          <>
            {events.length === 0 ? (
              /* Empty State when no events found */
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center max-w-lg mx-auto">
                <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4 text-slate-400">
                  <Car className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-1">
                  No Movement History Found
                </h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  No detection events recorded for vehicle{" "}
                  <strong className="font-mono text-slate-700">
                    {searchedVehicle}
                  </strong>
                  . Ensure the registration number is correct, or try another
                  vehicle plate.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVehicleNumber("GJ01XX0001");
                    handleTrace("GJ01XX0001");
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  Try Demo Plate GJ01XX0001
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Stats Summary Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Vehicle Plate
                    </p>
                    <p className="text-xl font-mono font-bold text-blue-700 mt-1">
                      {searchedVehicle}
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Total Detections
                    </p>
                    <p className="text-xl font-bold text-slate-800 mt-1">
                      {events.length} {events.length === 1 ? "Event" : "Events"}
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      First Sighting
                    </p>
                    <p className="text-xs font-semibold text-slate-700 mt-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{new Date(events[0].timestamp).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Latest Sighting
                    </p>
                    <p className="text-xs font-semibold text-slate-700 mt-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        {new Date(
                          events[events.length - 1].timestamp
                        ).toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Trajectory Map Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-blue-600" />
                      <h2 className="font-semibold text-slate-800">
                        Movement Trajectory Map
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500">
                      Chronological sequence: 1 &rarr; {events.length}
                    </span>
                  </div>

                  <div className="p-4 sm:p-6 bg-slate-50/50">
                    {validMapPoints.length > 0 ? (
                      <MovementMap
                        detections={validMapPoints}
                        vehicleNumber={searchedVehicle}
                      />
                    ) : (
                      <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                        Cameras for this vehicle do not have GPS coordinates configured.
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline List Section (Below Map) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-slate-800">
                        Movement Timeline
                      </h3>
                    </div>
                    <span className="text-xs text-slate-500">
                      {events.length} chronological sightings
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-5 py-3 font-medium text-slate-500 w-16">
                            #
                          </th>
                          <th className="text-left px-5 py-3 font-medium text-slate-500">
                            Time
                          </th>
                          <th className="text-left px-5 py-3 font-medium text-slate-500">
                            Camera
                          </th>
                          <th className="text-left px-5 py-3 font-medium text-slate-500">
                            Zone
                          </th>
                          <th className="text-left px-5 py-3 font-medium text-slate-500">
                            Confidence
                          </th>
                          <th className="text-right px-5 py-3 font-medium text-slate-500">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {events.map((evt, idx) => {
                          const isFirst = idx === 0;
                          const isLast = idx === events.length - 1 && events.length > 1;

                          return (
                            <tr
                              key={evt.id}
                              className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
                            >
                              {/* Sequence Badge */}
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shadow-xs ${
                                    isFirst
                                      ? "bg-emerald-600"
                                      : isLast
                                      ? "bg-red-600"
                                      : "bg-blue-600"
                                  }`}
                                >
                                  {evt.sequence}
                                </span>
                              </td>

                              {/* Time */}
                              <td className="px-5 py-3.5 text-slate-700 whitespace-nowrap">
                                <div className="font-medium text-slate-800">
                                  {new Date(evt.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {new Date(evt.timestamp).toLocaleDateString()}
                                </div>
                              </td>

                              {/* Camera */}
                              <td className="px-5 py-3.5">
                                <Link
                                  href={`/cameras/${evt.camera_id}`}
                                  className="font-medium text-slate-800 hover:text-blue-600 hover:underline flex items-center gap-1.5"
                                >
                                  <CameraIcon className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{evt.camera_name}</span>
                                </Link>
                                <div className="text-xs font-mono text-slate-400 mt-0.5">
                                  {evt.camera_code}
                                </div>
                              </td>

                              {/* Zone */}
                              <td className="px-5 py-3.5 text-slate-600">
                                {evt.zone ? (
                                  <span className="inline-flex items-center gap-1 text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                    <Radio className="w-3 h-3 text-slate-400" />
                                    {evt.zone}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Confidence */}
                              <td className="px-5 py-3.5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${confidenceBadge(
                                    evt.confidence
                                  )}`}
                                >
                                  {evt.confidence != null
                                    ? `${(evt.confidence * 100).toFixed(0)}%`
                                    : "—"}
                                </span>
                              </td>

                              {/* Action Link */}
                              <td className="px-5 py-3.5 text-right">
                                <Link
                                  href={`/cameras/${evt.camera_id}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <span>View Camera</span>
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Initial Prompt State (when no search executed yet) */}
        {!searched && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100">
              <Navigation className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              Ready to Trace Vehicle Movement
            </h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
              Enter any detected vehicle license plate above to view its chronological path
              across surveillance camera locations and timeline sightings.
            </p>
            <button
              type="button"
              onClick={() => {
                setVehicleNumber("GJ01XX0001");
                handleTrace("GJ01XX0001");
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <span>Trace Demo Vehicle (GJ01XX0001)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

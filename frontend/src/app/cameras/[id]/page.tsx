"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import api from "@/lib/api";
import Header from "@/components/Header";
import VideoPlayer, { DEFAULT_FALLBACK_STREAM_URL } from "@/components/VideoPlayer";
import {
  ArrowLeft,
  Camera as CameraIcon,
  VideoOff,
  MapPin,
  Building,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface Camera {
  id: string;
  camera_code: string;
  name: string;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  camera_type: string | null;
  source_protocol: string | null;
  stream_url: string | null;
  zone: string | null;
  status: string;
  is_active: boolean;
  last_heartbeat?: string | null;
  created_at?: string;
  updated_at?: string;
}

export default function CameraDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const [camera, setCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    if (!id) return;

    setLoading(true);
    setError(null);

    // Fetch single camera GET /cameras/{id}, fallback to GET /cameras/ and find by id if missing
    api
      .get(`/cameras/${id}`)
      .then((res) => {
        if (res.data) {
          setCamera(res.data);
        } else {
          throw new Error("No data returned");
        }
      })
      .catch(async () => {
        try {
          const listRes = await api.get("/cameras/");
          const cameras: Camera[] = listRes.data || [];
          const found = cameras.find((c) => c.id === id);
          if (found) {
            setCamera(found);
          } else {
            setError("Camera not found");
          }
        } catch {
          setError("Failed to load camera details");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, router]);

  const statusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "online") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "degraded") return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const statusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "online") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
    if (s === "degraded") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />;
    return <XCircle className="w-3.5 h-3.5 text-red-600" />;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation & Breadcrumbs */}
        <div className="mb-6">
          <Link
            href="/cameras"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Cameras</span>
          </Link>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading camera details...</p>
          </div>
        ) : error || !camera ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <CameraIcon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Camera Not Found</h3>
            <p className="text-slate-500 text-sm mb-6">
              {error || "The requested camera could not be located in the system."}
            </p>
            <Link
              href="/cameras"
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              Return to Camera Registry
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header / Title Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-800">{camera.name}</h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor(
                      camera.status
                    )}`}
                  >
                    {statusIcon(camera.status)}
                    <span className="capitalize">{camera.status}</span>
                  </span>
                  {!camera.is_active && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-sm mt-1">
                  Camera Code:{" "}
                  <span className="font-mono font-medium text-slate-700">
                    {camera.camera_code}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {camera.zone && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Radio className="w-3.5 h-3.5 text-slate-500" />
                    <span>Zone: <strong className="text-slate-800">{camera.zone}</strong></span>
                  </div>
                )}
                {camera.department && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>Dept: <strong className="text-slate-800">{camera.department}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Player Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CameraIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-slate-800">Live Video Stream</h2>
                </div>
                {camera.source_protocol && (
                  <span className="text-xs font-mono uppercase bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                    {camera.source_protocol}
                  </span>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-slate-900/5">
                {camera.stream_url && camera.stream_url.trim() !== "" ? (
                  <div className="max-w-4xl mx-auto">
                    <VideoPlayer
                      streamUrl={camera.stream_url}
                      title={`${camera.name} (${camera.camera_code})`}
                    />
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-3 text-slate-400 border border-slate-700">
                      <VideoOff className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-200 mb-1">
                      No Live Stream Configured
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                      This camera does not have an active stream URL configured. You can edit this camera
                      in the registry to assign an HLS or video feed source.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCamera((prev) => prev ? { ...prev, stream_url: DEFAULT_FALLBACK_STREAM_URL } : null)}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Preview Demo CCTV Stream
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Camera Details Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                Camera Specifications & Location
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Camera Code
                  </p>
                  <p className="text-sm font-mono font-medium text-slate-800 mt-1">
                    {camera.camera_code}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Status
                  </p>
                  <p className="text-sm font-medium text-slate-800 mt-1 capitalize">
                    {camera.status}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Department
                  </p>
                  <p className="text-sm text-slate-800 mt-1">
                    {camera.department || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Zone / Area
                  </p>
                  <p className="text-sm text-slate-800 mt-1">
                    {camera.zone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Protocol
                  </p>
                  <p className="text-sm font-mono text-slate-800 mt-1 uppercase">
                    {camera.source_protocol || "HLS"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Coordinates
                  </p>
                  <p className="text-sm text-slate-800 mt-1 flex items-center gap-1">
                    {camera.latitude != null && camera.longitude != null ? (
                      <>
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>
                          {camera.latitude.toFixed(4)}, {camera.longitude.toFixed(4)}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Operational Status
                  </p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {camera.is_active ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-slate-400">Disabled</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Stream URL
                  </p>
                  <p
                    className="text-xs font-mono text-slate-700 mt-1 truncate"
                    title={camera.stream_url || "Not configured"}
                  >
                    {camera.stream_url || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

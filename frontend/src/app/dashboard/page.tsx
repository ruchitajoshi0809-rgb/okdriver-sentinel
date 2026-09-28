"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import api from "@/lib/api";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import { Video, VideoOff, ArrowRight, Camera as CameraIcon } from "lucide-react";

interface Camera {
  id: string;
  camera_code?: string;
  name?: string;
  status: string;
  stream_url?: string | null;
  zone?: string | null;
  department?: string | null;
}

interface Alert {
  id: string;
  matched_identifier: string;
  severity: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [totalCameras, setTotalCameras] = useState(0);
  const [onlineCameras, setOnlineCameras] = useState(0);
  const [liveCameras, setLiveCameras] = useState<Camera[]>([]);
  const [activeAlerts, setActiveAlerts] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    Promise.all([
      api.get("/cameras/"),
      api.get("/alerts/?status=open"),
    ])
      .then(([camerasRes, alertsRes]) => {
        const cameras: Camera[] = camerasRes.data || [];
        const alerts: Alert[] = alertsRes.data || [];

        setTotalCameras(cameras.length);
        setOnlineCameras(cameras.filter((c) => c.status === "online").length);
        
        // Select up to 2 cameras for Live Feeds, prioritizing cameras with stream_url
        const sorted = [...cameras].sort((a, b) => {
          const aHas = Boolean(a.stream_url && a.stream_url.trim().length > 0);
          const bHas = Boolean(b.stream_url && b.stream_url.trim().length > 0);
          if (aHas === bHas) return 0;
          return aHas ? -1 : 1;
        });
        setLiveCameras(sorted.slice(0, 2));

        setActiveAlerts(alerts.length);
        setRecentAlerts(alerts.slice(0, 5));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load dashboard data");
        setLoading(false);
      });
  }, [router]);

  const severityClass = (severity: string) => {
    const v = severity?.toLowerCase();
    if (v === "high" || v === "critical") return "bg-red-100 text-red-700";
    if (v === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800">Operations Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">
            Live overview of cameras and alerts
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-medium text-slate-500">Total Cameras</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">{totalCameras}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <p className="text-sm font-medium text-slate-500">Online Cameras</p>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{onlineCameras}</p>
          </div>

          <div
            className={`rounded-xl border shadow-sm p-6 ${
              activeAlerts > 0
                ? "bg-red-950/40 border-red-800"
                : "bg-white border-slate-200"
            }`}
          >
            <p className="text-sm font-medium text-slate-500">Active Alerts</p>
            <p
              className={`text-3xl font-bold mt-2 ${
                activeAlerts > 0 ? "text-red-400" : "text-slate-100"
              }`}
            >
              {activeAlerts}
            </p>
          </div>
        </div>

        {/* Live Feeds Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-800">Live Feeds</h3>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">
                Surveillance feeds from active cameras
              </p>
            </div>
            <Link
              href="/cameras"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
            >
              <span>View all cameras</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {liveCameras.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {liveCameras.map((camera) => (
                <div
                  key={camera.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <Link
                        href={`/cameras/${camera.id}`}
                        className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition-colors"
                      >
                        {camera.name || camera.camera_code || "Camera Feed"}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {camera.camera_code} {camera.zone ? `• ${camera.zone}` : ""}
                      </p>
                    </div>
                    <Link
                      href={`/cameras/${camera.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Full View</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="p-3 bg-slate-950">
                    {camera.stream_url && camera.stream_url.trim().length > 0 ? (
                      <VideoPlayer
                        streamUrl={camera.stream_url}
                        title={camera.name || camera.camera_code}
                      />
                    ) : (
                      <div className="aspect-video w-full bg-slate-900 rounded-xl flex flex-col items-center justify-center p-6 text-center border border-slate-800">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-2.5 text-slate-400">
                          <VideoOff className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-slate-200">No stream configured</p>
                        <p className="text-xs text-slate-400 max-w-xs mt-1">
                          No live stream URL has been configured for this camera in the registry.
                        </p>
                        <Link
                          href={`/cameras/${camera.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                        >
                          <span>Configure in Registry</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
              <CameraIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No Live Feeds Available</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No cameras currently have a live stream URL configured. Configure stream URLs in the registry to preview feeds here.
              </p>
              <Link
                href="/cameras"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <span>Go to Camera Registry</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Recent Open Alerts</h3>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No open alerts
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Vehicle</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Severity</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-500">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((alert) => (
                  <tr key={alert.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-6 py-3.5 font-medium text-slate-800">
                      {alert.matched_identifier}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityClass(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 capitalize text-slate-600">{alert.status}</td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
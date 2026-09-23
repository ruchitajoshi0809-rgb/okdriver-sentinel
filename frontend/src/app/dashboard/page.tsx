"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/api";

interface Camera {
  id: string;
  status: string;
}

interface Alert {
  id: string;
  matched_identifier: string;
  severity: string;
  status: string;
  created_at: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function severityClass(severity: string) {
  const value = severity.toLowerCase();
  if (value === "high" || value === "critical") {
    return "bg-red-100 text-red-800";
  }
  if (value === "medium") {
    return "bg-yellow-100 text-yellow-800";
  }
  return "bg-gray-100 text-gray-800";
}

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (value === "open") return "bg-red-100 text-red-800";
  if (value === "acknowledged") return "bg-yellow-100 text-yellow-800";
  if (value === "resolved") return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800";
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalCameras, setTotalCameras] = useState(0);
  const [onlineCameras, setOnlineCameras] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      try {
        const [camerasRes, alertsRes] = await Promise.all([
          api.get<Camera[]>("/cameras/"),
          api.get<Alert[]>("/alerts/", { params: { status: "open" } }),
        ]);

        if (cancelled) return;

        const cameras = Array.isArray(camerasRes.data) ? camerasRes.data : [];
        const openAlerts = Array.isArray(alertsRes.data) ? alertsRes.data : [];

        setTotalCameras(cameras.length);
        setOnlineCameras(cameras.filter((c) => c.status === "online").length);
        setAlerts(openAlerts);
        setError("");
      } catch (err) {
        if (cancelled) return;

        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401) {
          Cookies.remove("token");
          router.push("/login");
          return;
        }

        setError("Unable to load dashboard data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard...
      </div>
    );
  }

  const activeAlerts = alerts.length;
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-blue-800">okDriver Sentinel</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-blue-600 font-medium">
                Dashboard
              </Link>
              <Link href="/cameras" className="text-gray-600 hover:text-blue-600">
                Cameras
              </Link>
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-gray-500 text-sm">Total Cameras</h3>
            <p className="text-3xl font-bold mt-2">{totalCameras}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-gray-500 text-sm">Online Cameras</h3>
            <p className="text-3xl font-bold mt-2">{onlineCameras}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h3 className="text-gray-500 text-sm">Active Alerts</h3>
            <p
              className={`text-3xl font-bold mt-2 ${
                activeAlerts > 0 ? "text-red-600" : ""
              }`}
            >
              {activeAlerts}
            </p>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Recent Alerts</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">Vehicle number</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created time</th>
              </tr>
            </thead>
            <tbody>
              {recentAlerts.map((alert) => (
                <tr key={alert.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {alert.matched_identifier || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${severityClass(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(
                        alert.status
                      )}`}
                    >
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(alert.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentAlerts.length === 0 && (
            <p className="text-center py-8 text-gray-500">No open alerts</p>
          )}
        </div>
      </main>
    </div>
  );
}

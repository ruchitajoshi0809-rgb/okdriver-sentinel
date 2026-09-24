"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/api";

type AlertStatus = "open" | "acknowledged" | "resolved";
type AlertSeverity = "high" | "medium" | "low";
type StatusFilter = "all" | AlertStatus;
type SeverityFilter = "all" | AlertSeverity;

interface Alert {
  id: string;
  matched_identifier: string;
  severity: string;
  status: string;
  camera_id: string;
  confidence: number | null;
  created_at: string;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatConfidence(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

function severityClass(severity: string) {
  const value = severity.toLowerCase();
  if (value === "high" || value === "critical") {
    return "bg-red-100 text-red-800";
  }
  if (value === "medium") {
    return "bg-yellow-100 text-yellow-800";
  }
  if (value === "low") {
    return "bg-blue-100 text-blue-800";
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

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "open" },
  { value: "acknowledged", label: "acknowledged" },
  { value: "resolved", label: "resolved" },
];

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "high", label: "high" },
  { value: "medium", label: "medium" },
  { value: "low", label: "low" },
];

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    Cookies.remove("token");
    router.push("/login");
  }, [router]);

  const loadAlerts = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const token = Cookies.get("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const showLoading = options?.showLoading ?? true;
      if (showLoading) setLoading(true);
      setError("");

      try {
        const params: { skip: number; limit: number; status?: string } = {
          skip: 0,
          limit: 200,
        };
        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        const res = await api.get<Alert[]>("/alerts/", { params });
        setAlerts(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 401) {
          redirectToLogin();
          return;
        }
        setError("Unable to load alerts. Please try again.");
        setAlerts([]);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [redirectToLogin, router, statusFilter]
  );

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "all") return alerts;
    return alerts.filter(
      (alert) => alert.severity.toLowerCase() === severityFilter
    );
  }, [alerts, severityFilter]);

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  const updateStatus = async (alertId: string, nextStatus: AlertStatus) => {
    setUpdatingId(alertId);
    setError("");

    try {
      await api.patch(`/alerts/${alertId}/status`, { status: nextStatus });
      await loadAlerts({ showLoading: false });
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401) {
        redirectToLogin();
        return;
      }
      setError("Unable to update alert status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-blue-800">okDriver Sentinel</h1>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-600 hover:text-blue-600">
                Dashboard
              </Link>
              <Link href="/cameras" className="text-gray-600 hover:text-blue-600">
                Cameras
              </Link>
              <Link href="/alerts" className="text-blue-600 font-medium">
                Alerts
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
        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">Alerts</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">
              Status
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="ml-2 border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-600">
              Severity
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as SeverityFilter)
                }
                className="ml-2 border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <p className="text-center py-16 text-gray-500">Loading alerts...</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3">Vehicle Number</th>
                      <th className="text-left px-4 py-3">Severity</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="text-left px-4 py-3">Camera ID</th>
                      <th className="text-left px-4 py-3">Confidence</th>
                      <th className="text-left px-4 py-3">Created At</th>
                      <th className="text-left px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert) => {
                      const status = alert.status.toLowerCase();
                      const busy = updatingId === alert.id;

                      return (
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
                          <td className="px-4 py-3 font-mono text-xs text-gray-700">
                            {alert.camera_id || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {formatConfidence(alert.confidence)}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {formatDate(alert.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            {status === "open" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  updateStatus(alert.id, "acknowledged")
                                }
                                className="text-sm bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {busy ? "Updating..." : "Acknowledge"}
                              </button>
                            )}
                            {status === "acknowledged" && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                  updateStatus(alert.id, "resolved")
                                }
                                className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {busy ? "Updating..." : "Resolve"}
                              </button>
                            )}
                            {status === "resolved" && (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filteredAlerts.length === 0 && (
                <p className="text-center py-8 text-gray-500">No alerts found</p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

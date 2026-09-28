"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";
import Header from "@/components/Header";

interface Alert {
  id: string;
  matched_identifier: string;
  severity: string;
  status: string;
  camera_id: string;
  confidence: number | null;
  created_at: string;
}

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAlerts = useCallback(() => {
    const params: string[] = [];
    if (statusFilter !== "all") params.push(`status=${statusFilter}`);
    const query = params.length ? `?${params.join("&")}` : "";

    return api.get(`/alerts/${query}`).then((res) => {
      let data: Alert[] = res.data || [];
      if (severityFilter !== "all") {
        data = data.filter(
          (a) => a.severity?.toLowerCase() === severityFilter.toLowerCase()
        );
      }
      setAlerts(data);
      setLoading(false);
    });
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    fetchAlerts().catch(() => {
      Cookies.remove("token");
      router.push("/login");
    });
  }, [router, fetchAlerts]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/alerts/${id}/status`, { status });
      await fetchAlerts();
    } catch {
      alert("Failed to update alert status");
    } finally {
      setActionLoading(null);
    }
  };

  const severityClass = (severity: string) => {
    const v = severity?.toLowerCase();
    if (v === "high" || v === "critical") return "bg-red-100 text-red-700";
    if (v === "medium") return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const statusClass = (status: string) => {
    if (status === "open") return "bg-red-100 text-red-700";
    if (status === "acknowledged") return "bg-yellow-100 text-yellow-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Alerts</h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage watchlist matches and alert lifecycle
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Severity</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No alerts found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-slate-500">Vehicle</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500">Severity</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500">Confidence</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500">Time</th>
                    <th className="text-left px-5 py-3 font-medium text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {alert.matched_identifier}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusClass(
                            alert.status
                          )}`}
                        >
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {alert.confidence != null
                          ? `${(alert.confidence * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(alert.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        {alert.status === "open" && (
                          <button
                            onClick={() => updateStatus(alert.id, "acknowledged")}
                            disabled={actionLoading === alert.id}
                            className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        {alert.status === "acknowledged" && (
                          <button
                            onClick={() => updateStatus(alert.id, "resolved")}
                            disabled={actionLoading === alert.id}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                        {alert.status === "resolved" && (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
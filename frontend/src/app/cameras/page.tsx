"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";
import dynamic from "next/dynamic";
import Link from "next/link";
import Header from "@/components/Header";
import { Video } from "lucide-react";

const MapComponent = dynamic(() => import("@/components/CameraMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
      Loading map...
    </div>
  ),
});

interface Camera {
  id: string;
  camera_code: string;
  name: string;
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  zone: string | null;
  is_active: boolean;
  stream_url?: string | null;
}

export default function CamerasPage() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/login");
      return;
    }

    api
      .get("/cameras/")
      .then((res) => {
        setCameras(res.data || []);
        setLoading(false);
      })
      .catch(() => {
        Cookies.remove("token");
        router.push("/login");
      });
  }, [router]);

  const filtered = cameras.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.camera_code.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) => {
    if (status === "online") return "bg-emerald-100 text-emerald-700";
    if (status === "degraded") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
          Loading cameras...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Camera Registry</h2>
            <p className="text-slate-500 text-sm mt-1">
              {filtered.length} camera{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-slate-300 rounded-lg px-3.5 py-2 w-full sm:w-72 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mb-8 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          <MapComponent cameras={filtered} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Code</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Name</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Department</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Zone</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500">Status</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cam) => (
                <tr
                  key={cam.id}
                  onClick={() => router.push(`/cameras/${cam.id}`)}
                  className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5 font-mono font-medium text-slate-800">{cam.camera_code}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/cameras/${cam.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-slate-800 group-hover:text-blue-600 hover:underline"
                      >
                        {cam.name}
                      </Link>
                      {cam.stream_url && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                          <Video className="w-3 h-3 text-blue-600" />
                          Live
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{cam.department || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-600">{cam.zone || "—"}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(
                        cam.status
                      )}`}
                    >
                      {cam.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/cameras/${cam.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Live &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">No cameras found</p>
          )}
        </div>
      </main>
    </div>
  );
}
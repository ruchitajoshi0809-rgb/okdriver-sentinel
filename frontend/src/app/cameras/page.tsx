"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("@/components/CameraMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center">
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
        setCameras(res.data);
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
    if (status === "online") return "bg-green-100 text-green-800";
    if (status === "degraded") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading cameras...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-blue-800">okDriver Sentinel</h1>
            <nav className="flex gap-4 text-sm">
              <a href="/dashboard" className="text-gray-600 hover:text-blue-600">
                Dashboard
              </a>
              <a href="/cameras" className="text-blue-600 font-medium">
                Cameras
              </a>
            </nav>
          </div>
          <button
            onClick={() => {
              Cookies.remove("token");
              router.push("/login");
            }}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Camera Registry</h2>
          <input
            type="text"
            placeholder="Search cameras..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-8">
          <MapComponent cameras={filtered} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Department</th>
                <th className="text-left px-4 py-3">Zone</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cam) => (
                <tr key={cam.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{cam.camera_code}</td>
                  <td className="px-4 py-3">{cam.name}</td>
                  <td className="px-4 py-3">{cam.department || "—"}</td>
                  <td className="px-4 py-3">{cam.zone || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(
                        cam.status
                      )}`}
                    >
                      {cam.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center py-8 text-gray-500">No cameras found</p>
          )}
        </div>
      </main>
    </div>
  );
}
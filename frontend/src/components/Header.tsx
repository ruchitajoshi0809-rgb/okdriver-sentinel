"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/api";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/cameras", label: "Cameras" },
  { href: "/tracking", label: "Tracking" },
  { href: "/alerts", label: "Alerts" },
] as const;

interface Me {
  email: string;
  role?: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    api
      .get<Me>("/auth/me")
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, []);

  const handleLogout = () => {
    Cookies.remove("token");
    router.push("/login");
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-blue-800">
            okDriver Sentinel
          </Link>
          <nav className="flex flex-wrap gap-3 sm:gap-4 text-sm">
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    active
                      ? "text-blue-600 font-medium"
                      : "text-gray-600 hover:text-blue-600"
                  }
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {me?.email && (
            <div className="hidden sm:block text-right text-xs text-gray-500">
              <p className="font-medium text-gray-700">{me.email}</p>
              {me.role && <p className="capitalize">{me.role}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

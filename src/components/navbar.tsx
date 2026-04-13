"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/students" className="text-lg font-semibold text-gray-900">
          School Admin
        </Link>
        <Link
          href="/students"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Alumnos
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {user.first_name} {user.last_name}{" "}
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            {user.role}
          </span>
        </span>
        <button
          onClick={logout}
          className="text-sm text-red-600 hover:text-red-800"
        >
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}

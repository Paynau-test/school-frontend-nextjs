"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { searchStudents, deleteStudent, Student } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

export default function StudentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const hasFetched = useRef(false);

  const isAdmin = user?.role === "admin";

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch students with debounce on search/filter changes
  useEffect(() => {
    if (!user) return;

    // First load: fetch immediately
    if (!hasFetched.current) {
      hasFetched.current = true;
      setLoading(true);
      searchStudents({
        term: term || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }).then((res) => {
        if (res.success && res.data) setStudents(res.data);
        setLoading(false);
      });
      return;
    }

    // Subsequent changes: debounce 400ms
    setLoading(true);
    const timer = setTimeout(() => {
      searchStudents({
        term: term || undefined,
        status: statusFilter || undefined,
        limit: 50,
      }).then((res) => {
        if (res.success && res.data) setStudents(res.data);
        setLoading(false);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [term, statusFilter, user]);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`¿Desactivar al alumno "${name}"? Se marcará como inactivo.`))
      return;
    setDeleting(id);
    const res = await deleteStudent(id);
    if (res.success) {
      const refresh = await searchStudents({
        term: term || undefined,
        status: statusFilter || undefined,
        limit: 50,
      });
      if (refresh.success && refresh.data) setStudents(refresh.data);
    }
    setDeleting(null);
  }

  if (authLoading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Alumnos</h1>
        {isAdmin && (
          <Link
            href="/students/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Nuevo alumno
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por ID o nombre..."
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="suspended">Suspendidos</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-gray-400 py-8 text-center">Cargando...</p>
      ) : students.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">
          No se encontraron alumnos.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Fecha Nac.
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Género
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Grado
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Estatus
                </th>
                {isAdmin && (
                  <th className="text-right px-4 py-3 font-medium text-gray-600">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{s.id}</td>
                  <td className="px-4 py-3 text-gray-900 font-medium">
                    {s.first_name} {s.last_name_father}{" "}
                    {s.last_name_mother || ""}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.date_of_birth?.split("T")[0]}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.gender === "M"
                      ? "Masculino"
                      : s.gender === "F"
                      ? "Femenino"
                      : "Otro"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {s.grade_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        STATUS_COLORS[s.status] || ""
                      }`}
                    >
                      {STATUS_LABELS[s.status] || s.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link
                        href={`/students/${s.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() =>
                          handleDelete(
                            s.id,
                            `${s.first_name} ${s.last_name_father}`
                          )
                        }
                        disabled={deleting === s.id || s.status === "inactive"}
                        className="text-red-600 hover:text-red-800 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {deleting === s.id ? "..." : "Desactivar"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

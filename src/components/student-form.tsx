"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentInput, Student } from "@/lib/api";

const GRADES = [
  { id: 1, name: "Primero" },
  { id: 2, name: "Segundo" },
  { id: 3, name: "Tercero" },
  { id: 4, name: "Cuarto" },
  { id: 5, name: "Quinto" },
  { id: 6, name: "Sexto" },
  { id: 7, name: "Séptimo" },
  { id: 8, name: "Octavo" },
  { id: 9, name: "Noveno" },
];

interface Props {
  initial?: Student;
  onSubmit: (data: StudentInput) => Promise<{ success: boolean; error?: string }>;
  submitLabel: string;
}

export default function StudentForm({ initial, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<StudentInput>({
    first_name: initial?.first_name || "",
    last_name_father: initial?.last_name_father || "",
    last_name_mother: initial?.last_name_mother || "",
    date_of_birth: initial?.date_of_birth?.split("T")[0] || "",
    gender: initial?.gender || "M",
    grade_id: initial?.grade_id || 1,
    status: initial?.status || "active",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "grade_id" ? Number(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validations
    if (!form.first_name.trim()) {
      setError("El nombre es obligatorio");
      setLoading(false);
      return;
    }
    if (!form.last_name_father.trim()) {
      setError("El apellido paterno es obligatorio");
      setLoading(false);
      return;
    }
    if (!form.date_of_birth) {
      setError("La fecha de nacimiento es obligatoria");
      setLoading(false);
      return;
    }
    if (new Date(form.date_of_birth) > new Date()) {
      setError("La fecha de nacimiento no puede ser futura");
      setLoading(false);
      return;
    }

    try {
      const res = await onSubmit(form);
      if (res.success) {
        router.push("/students");
      } else {
        setError(res.error || "Error al guardar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre *
        </label>
        <input
          type="text"
          name="first_name"
          value={form.first_name}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Juan Carlos"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido Paterno *
          </label>
          <input
            type="text"
            name="last_name_father"
            value={form.last_name_father}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="García"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido Materno
          </label>
          <input
            type="text"
            name="last_name_mother"
            value={form.last_name_mother || ""}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="López"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Nacimiento *
          </label>
          <input
            type="date"
            name="date_of_birth"
            value={form.date_of_birth}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Género *
          </label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="Other">Otro</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grado *
          </label>
          <select
            name="grade_id"
            value={form.grade_id}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {GRADES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        {initial && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estatus
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push("/students")}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

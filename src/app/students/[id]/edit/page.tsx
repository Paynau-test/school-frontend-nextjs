"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getStudent, updateStudent, Student, StudentInput } from "@/lib/api";
import StudentForm from "@/components/student-form";

export default function EditStudentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (!authLoading && user && user.role !== "admin") router.push("/students");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const res = await getStudent(id);
      if (res.success && res.data) {
        setStudent(res.data);
      } else {
        setError("Alumno no encontrado");
      }
      setLoading(false);
    }
    load();
  }, [id, user]);

  if (authLoading || loading) {
    return <p className="text-gray-400 py-8 text-center">Cargando...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
        {error}
      </div>
    );
  }

  if (!student) return null;

  async function handleUpdate(data: StudentInput) {
    const res = await updateStudent(id, data);
    return { success: res.success, error: res.error };
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Editar Alumno #{id}
      </h1>
      <StudentForm
        initial={student}
        onSubmit={handleUpdate}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createStudent, StudentInput } from "@/lib/api";
import StudentForm from "@/components/student-form";

export default function NewStudentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user && user.role !== "admin") router.push("/students");
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleCreate(data: StudentInput) {
    const res = await createStudent(data);
    return { success: res.success, error: res.error };
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">
        Nuevo Alumno
      </h1>
      <StudentForm onSubmit={handleCreate} submitLabel="Crear alumno" />
    </div>
  );
}

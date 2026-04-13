/**
 * API client for school-api-node.
 * Handles JWT token management and typed responses.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string): void {
  localStorage.setItem("token", token);
}

export function removeToken(): void {
  localStorage.removeItem("token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  return json as ApiResponse<T>;
}

// ── Auth ──────────────────────────────────

export interface LoginResponse {
  token: string;
  user: { user_id: number; email: string; role: string };
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request<User>("/auth/me");
}

// ── Students ──────────────────────────────

export interface Student {
  id: number;
  first_name: string;
  last_name_father: string;
  last_name_mother: string | null;
  date_of_birth: string;
  gender: "M" | "F" | "Other";
  grade_id: number;
  grade_name: string;
  status: "active" | "inactive" | "suspended";
  created_at?: string;
  updated_at?: string;
}

export interface SearchParams {
  term?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function searchStudents(params: SearchParams = {}) {
  const query = new URLSearchParams();
  if (params.term) query.set("term", params.term);
  if (params.status) query.set("status", params.status);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return request<Student[]>(`/students${qs ? `?${qs}` : ""}`);
}

export async function getStudent(id: number) {
  return request<Student>(`/students/${id}`);
}

export interface StudentInput {
  first_name: string;
  last_name_father: string;
  last_name_mother?: string;
  date_of_birth: string;
  gender: string;
  grade_id: number;
  status?: string;
}

export async function createStudent(data: StudentInput) {
  return request<{ student_id: number }>("/students", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStudent(id: number, data: StudentInput) {
  return request<{ rows_affected: number }>(`/students/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteStudent(id: number) {
  return request<{ rows_affected: number }>(`/students/${id}`, {
    method: "DELETE",
  });
}

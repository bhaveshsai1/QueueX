export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("opd_backend_url");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }
  const rawApi = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_API_URL || "") : "";
  return rawApi.trim().replace(/\/+$/, "") || "http://localhost:8000";
}

export function setCustomApiBase(url: string) {
  if (typeof window !== "undefined") {
    if (!url || !url.trim()) {
      localStorage.removeItem("opd_backend_url");
    } else {
      localStorage.setItem("opd_backend_url", url.trim().replace(/\/+$/, ""));
    }
    window.dispatchEvent(new Event("opd-api-change"));
  }
}

export function getWsBase(): string {
  if (typeof window !== "undefined") {
    const customWs = localStorage.getItem("opd_ws_url");
    if (customWs && customWs.trim()) {
      return customWs.trim().replace(/\/+$/, "");
    }
  }
  const rawWs = typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_WS_URL || "") : "";
  if (rawWs.trim()) {
    return rawWs.trim().replace(/\/+$/, "");
  }
  const base = getApiBase();
  return base.startsWith("https://")
    ? base.replace("https://", "wss://") + "/ws/queue"
    : base.replace("http://", "ws://") + "/ws/queue";
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  doctor_id?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  room_number?: string | null;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type TriagePriority = "EMERGENCY" | "URGENT" | "SENIOR_CHILD" | "SCHEDULED" | "NORMAL";
export type SlotType = "WALK_IN" | "ONLINE_BOOKED";
export type TokenStatus = "WAITING" | "APPROACHING" | "IN_CONSULTATION" | "COMPLETED" | "MISSED" | "CANCELLED";
export type DoctorStatus = "AVAILABLE" | "IN_CONSULTATION" | "ON_DELAY" | "EMERGENCY_SURGERY" | "ON_BREAK";

export interface Department {
  id: string;
  name: string;
  code: string;
  room_range: string;
  description: string;
}

export interface Doctor {
  id: string;
  name: string;
  department_id: string;
  department_name: string;
  room_number: string;
  status: DoctorStatus;
  avg_consultation_minutes: number;
  delay_minutes: number;
  delay_reason?: string | null;
  current_token_id?: string | null;
  consultation_start_time?: string | null;
  total_patients_served_today: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  department_id: string;
  doctor_id?: string | null;
  priority: TriagePriority;
  slot_type: SlotType;
  appointment_id?: string | null;
  booked_time?: string | null;
  symptoms?: string | null;
  check_in_time: string;
}

export interface Token {
  id: string;
  token_number: string;
  patient: Patient;
  doctor_id: string;
  doctor_name: string;
  department_id: string;
  department_name: string;
  room_number: string;
  status: TokenStatus;
  queue_position: number;
  estimated_wait_minutes: number;
  estimated_start_time: string;
  created_at: string;
  called_at?: string | null;
  completed_at?: string | null;
  delay_offset_minutes: number;
  notifications_sent: string[];
}

export interface NotificationAlert {
  id: string;
  token_id: string;
  patient_name: string;
  patient_phone: string;
  type: string;
  title: string;
  message: string;
  channel: "SMS" | "WHATSAPP" | "IVR";
  timestamp: string;
}

export interface QueueStats {
  total_waiting: number;
  total_completed: number;
  emergency_count: number;
  active_delays_count: number;
  average_wait_minutes: number;
  total_doctors_active: number;
}

// API methods
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "";
    try {
      const data = await res.json();
      errorDetail = data.detail || data.message || JSON.stringify(data);
    } catch {
      errorDetail = await res.text().catch(() => "");
    }
    throw new Error(errorDetail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function checkBackendHealth(): Promise<{ status: string; service: string; firebase_connected?: boolean }> {
  const res = await fetch(apiUrl("/"), { cache: "no-store" });
  return handleResponse(res);
}

export async function getDepartments(): Promise<Department[]> {
  const res = await fetch(apiUrl("/api/departments"), { cache: "no-store" });
  return handleResponse<Department[]>(res);
}

export async function getDoctors(): Promise<Doctor[]> {
  const res = await fetch(apiUrl("/api/doctors"), { cache: "no-store" });
  return handleResponse<Doctor[]>(res);
}

export async function getDoctor(id: string): Promise<Doctor> {
  const res = await fetch(apiUrl(`/api/doctors/${id}`), { cache: "no-store" });
  return handleResponse<Doctor>(res);
}

export async function getTokens(departmentId?: string, doctorId?: string): Promise<Token[]> {
  const params = new URLSearchParams();
  if (departmentId) params.append("department_id", departmentId);
  if (doctorId) params.append("doctor_id", doctorId);
  const res = await fetch(apiUrl(`/api/tokens?${params.toString()}`), { cache: "no-store" });
  return handleResponse<Token[]>(res);
}

export async function getToken(tokenId: string): Promise<{ token: Token; doctor: Doctor | null }> {
  const res = await fetch(apiUrl(`/api/tokens/${tokenId}`), { cache: "no-store" });
  return handleResponse<{ token: Token; doctor: Doctor | null }>(res);
}

export async function checkInPatient(data: {
  user_id?: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  department_id: string;
  doctor_id?: string;
  priority: TriagePriority;
  slot_type: SlotType;
  appointment_id?: string;
  booked_time?: string;
  symptoms?: string;
}): Promise<{ token: Token; notifications: NotificationAlert[] }> {
  const res = await fetch(apiUrl("/api/tokens/checkin"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function callNextPatient(doctorId: string): Promise<{
  success: boolean;
  current_token: Token | null;
  notifications: NotificationAlert[];
}> {
  const res = await fetch(apiUrl(`/api/doctors/${doctorId}/call-next`), {
    method: "POST",
  });
  return handleResponse(res);
}

export async function reportDoctorDelay(
  doctorId: string,
  delayMinutes: number,
  reason: string
): Promise<{ success: boolean; notifications: NotificationAlert[] }> {
  const res = await fetch(apiUrl(`/api/doctors/${doctorId}/delay`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ doctor_id: doctorId, delay_minutes: delayMinutes, reason }),
  });
  return handleResponse(res);
}

export async function resumeDoctorQueue(doctorId: string): Promise<{ success: boolean; notifications: NotificationAlert[] }> {
  const res = await fetch(apiUrl(`/api/doctors/${doctorId}/resume`), {
    method: "POST",
  });
  return handleResponse(res);
}

export async function triggerEmergencyPreemption(data: {
  name: string;
  age: number;
  gender: string;
  phone: string;
  department_id: string;
  doctor_id?: string;
  symptoms?: string;
}): Promise<{ token: Token; notifications: NotificationAlert[] }> {
  const res = await fetch(apiUrl("/api/queue/emergency-preempt"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patient: {
        ...data,
        priority: "EMERGENCY",
        slot_type: "WALK_IN",
      },
      force_immediate_slot: true,
    }),
  });
  return handleResponse(res);
}

export async function markTokenMissed(tokenId: string): Promise<{ success: boolean; notification: NotificationAlert | null }> {
  const res = await fetch(apiUrl(`/api/tokens/${tokenId}/missed`), {
    method: "POST",
  });
  return handleResponse(res);
}

export async function recallToken(tokenId: string): Promise<{ success: boolean; token: Token }> {
  const res = await fetch(apiUrl(`/api/tokens/${tokenId}/recall`), {
    method: "POST",
  });
  return handleResponse(res);
}

export async function getNotifications(limit: number = 30): Promise<NotificationAlert[]> {
  const res = await fetch(apiUrl(`/api/notifications?limit=${limit}`), { cache: "no-store" });
  return handleResponse<NotificationAlert[]>(res);
}

export async function getStats(): Promise<QueueStats> {
  const res = await fetch(apiUrl("/api/stats"), { cache: "no-store" });
  return handleResponse<QueueStats>(res);
}

export async function seedSimulation(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(apiUrl("/api/simulation/seed"), {
    method: "POST",
  });
  return handleResponse(res);
}

export async function resetSimulation(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(apiUrl("/api/simulation/reset"), {
    method: "POST",
  });
  return handleResponse(res);
}

// Authentication API
export async function loginUser(
  identifier: string,
  password: string,
  role?: UserRole
): Promise<AuthResponse> {
  const targetUrl = apiUrl("/api/auth/login");
  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password, role }),
    });
    return await handleResponse<AuthResponse>(res);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError")) {
      throw new Error(`Unable to reach backend at ${targetUrl}. If using Render free tier, server may be waking up (~30s), or check your backend URL.`);
    }
    throw err;
  }
}

export async function registerUser(data: {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: UserRole;
  department_id?: string;
  room_number?: string;
}): Promise<AuthResponse> {
  const targetUrl = apiUrl("/api/auth/register");
  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await handleResponse<AuthResponse>(res);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes("Failed to fetch") || errorMsg.includes("NetworkError")) {
      throw new Error(`Unable to reach backend at ${targetUrl}. Please check backend connection.`);
    }
    throw err;
  }
}

export async function getCurrentUser(token: string): Promise<User> {
  const res = await fetch(apiUrl("/api/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return handleResponse<User>(res);
}

export async function getPatientTokens(userId?: string, phone?: string): Promise<Token[]> {
  const params = new URLSearchParams();
  if (userId) params.append("user_id", userId);
  if (phone) params.append("phone", phone);
  const res = await fetch(apiUrl(`/api/patient/tokens?${params.toString()}`), { cache: "no-store" });
  return handleResponse<Token[]>(res);
}

export interface FirebaseStatusInfo {
  is_connected: boolean;
  mode: string;
  project_id?: string | null;
  credential_source?: string | null;
  data_file?: string | null;
  departments_count: number;
  doctors_count: number;
  tokens_count: number;
  users_count: number;
}

export async function getFirebaseStatus(): Promise<FirebaseStatusInfo> {
  const res = await fetch(apiUrl("/api/firebase/status"), { cache: "no-store" });
  return handleResponse<FirebaseStatusInfo>(res);
}

export async function syncFirebase(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(apiUrl("/api/firebase/sync"), { method: "POST" });
  return handleResponse<{ success: boolean; message: string }>(res);
}

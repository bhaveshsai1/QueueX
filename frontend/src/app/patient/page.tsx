"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HeartPulse,
  Clock,
  Calendar,
  Stethoscope,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Bell,
  MapPin,
  CheckCircle2,
  FileText,
  AlertCircle,
  LogOut,
  Coffee,
  Pill,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getPatientTokens, Token } from "@/lib/api";

export default function PatientDashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "PATIENT")) {
      router.push("/auth/patient-login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadTokens();
      const interval = setInterval(loadTokens, 4000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadTokens() {
    if (!user) return;
    try {
      const data = await getPatientTokens(user.id, user.phone || undefined);
      setTokens(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTokens(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Opening Patient Portal...</p>
        </div>
      </div>
    );
  }

  const activeTokens = tokens.filter(
    (t) => t.status === "WAITING" || t.status === "APPROACHING" || t.status === "IN_CONSULTATION"
  );
  const completedTokens = tokens.filter((t) => t.status === "COMPLETED");

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Patient Welcome Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Verified Patient Account</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs text-blue-200">
            Mobile: {user.phone || "Not set"} • Email: {user.email || "Not set"}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/kiosk"
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New OPD Token</span>
          </Link>

          <button
            onClick={() => {
              logout();
              router.push("/auth/patient-login");
            }}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition text-xs flex items-center space-x-1"
            title="Sign out of patient portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active OPD Queue Live Card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <span>Today&apos;s Active Consultation Queue</span>
            {activeTokens.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            )}
          </h2>
          <span className="text-xs text-slate-500">Live Dynamic ETA</span>
        </div>

        {activeTokens.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">You Have No Active Queue Token</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Arrived at the hospital? Check in at the kiosk or click below to generate your virtual token right away.
              </p>
            </div>
            <Link
              href="/kiosk"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
            >
              <span>Check In at Kiosk Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeTokens.map((tok) => {
              const isCalled = tok.status === "IN_CONSULTATION";
              const isApproaching = tok.status === "APPROACHING" || tok.queue_position <= 3;

              return (
                <div
                  key={tok.id}
                  className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xl space-y-6 relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-4xl font-black text-blue-600 font-mono tracking-tight">
                        {tok.token_number}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{tok.department_name}</div>
                        <div className="text-xs text-slate-500">Consultant: {tok.doctor_name}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                        Room {tok.room_number}
                      </span>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          isCalled
                            ? "bg-emerald-600 text-white animate-bounce"
                            : isApproaching
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {isCalled
                          ? "🔔 PROCEED TO ROOM NOW"
                          : isApproaching
                          ? "📍 Top 3 in Line"
                          : `Queue #${tok.queue_position}`}
                      </span>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Estimated Wait Time</span>
                      <div className="text-2xl font-bold text-emerald-600 mt-0.5">
                        ~{tok.estimated_wait_minutes} mins
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium">Estimated Consultation</span>
                      <div className="text-base font-bold text-slate-800 mt-1">
                        {tok.estimated_start_time || "Calculating..."}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium">Patients Ahead</span>
                      <div className="text-base font-bold text-slate-800 mt-1">
                        {Math.max(0, tok.queue_position - 1)} patient(s)
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                      <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Proximity SMS/WhatsApp notifications will ping you when 3 patients remain.</span>
                    </div>

                    <Link
                      href={`/track/${tok.id}`}
                      className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
                    >
                      <span>Open Live Mobile Tracker</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hospital Services & Quick Guide */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Coffee className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900">Hospital Cafeteria</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Relax with fresh coffee and snacks on the Ground Floor while watching your queue on your phone.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Pill className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900">OPD Central Pharmacy</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Located next to Room 101. Collect prescribed medications immediately following your consultation.
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900">Digital Consultation Records</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Your consultation tokens and timestamps are securely archived here in your personal health log.
          </p>
        </div>
      </div>

      {/* Consultation History */}
      {completedTokens.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Past OPD Consultations</h3>
          <div className="divide-y divide-slate-100">
            {completedTokens.map((t) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">
                    Token {t.token_number} • {t.department_name}
                  </div>
                  <div className="text-slate-500">
                    Consulted by {t.doctor_name} (Room {t.room_number})
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                    Completed
                  </span>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "Today"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


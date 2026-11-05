"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Stethoscope,
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  AlertCircle,
  Building,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function DoctorLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoDoctors = [
    {
      name: "Dr. Sarah Jenkins",
      dept: "Cardiology",
      room: "102",
      email: "dr.sarah@hospital.org",
      pass: "doctor123",
      icon: "🩺",
    },
    {
      name: "Dr. Rajesh Sharma",
      dept: "Orthopedics",
      room: "204",
      email: "dr.rajesh@hospital.org",
      pass: "doctor123",
      icon: "🦴",
    },
    {
      name: "Dr. Ananya Roy",
      dept: "General Medicine",
      room: "108",
      email: "dr.ananya@hospital.org",
      pass: "doctor123",
      icon: "🌡️",
    },
    {
      name: "Dr. Michael Chen",
      dept: "Pediatrics",
      room: "302",
      email: "dr.michael@hospital.org",
      pass: "doctor123",
      icon: "👶",
    },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password, "DOCTOR");
      router.push("/doctor");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(email: string, pass: string) {
    setError("");
    setLoading(true);
    try {
      await login(email, pass, "DOCTOR");
      router.push("/doctor");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Building className="w-3.5 h-3.5" />
            <span>Hospital Staff & Physician Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Doctor OPD Login
          </h1>
          <p className="text-xs text-slate-500">
            Authorized hospital personnel only. Manage consultations, delays, and emergency triage.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Doctor Email / Staff ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. dr.sarah@hospital.org"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Doctor Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo 1-Click Logins for Hackathon Judges */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Click Doctor Demo Sign-In</span>
              </span>
              <span className="text-[10px] text-slate-400">For Testing</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoDoctors.map((doc) => (
                <button
                  key={doc.email}
                  type="button"
                  onClick={() => handleQuickLogin(doc.email, doc.pass)}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition group"
                >
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 flex items-center space-x-1">
                    <span>{doc.icon}</span>
                    <span className="truncate">{doc.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {doc.dept} (Rm {doc.room})
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Switch to Patient Portal */}
        <div className="text-center text-xs text-slate-500">
          Are you a patient?{" "}
          <Link href="/auth/patient-login" className="font-bold text-emerald-600 hover:underline">
            Go to Patient Portal Sign-in ➔
          </Link>
        </div>
      </div>
    </div>
  );
}


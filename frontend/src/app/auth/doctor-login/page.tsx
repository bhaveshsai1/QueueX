"use client";

import { useState, useEffect } from "react";
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
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getApiBase, setCustomApiBase, checkBackendHealth } from "@/lib/api";

export default function DoctorLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Backend connectivity state
  const [backendUrl, setBackendUrl] = useState("");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [showConfig, setShowConfig] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [isProdLocalhost, setIsProdLocalhost] = useState(false);

  useEffect(() => {
    const currentBase = getApiBase();
    setBackendUrl(currentBase);
    setCustomInput(currentBase);

    if (typeof window !== "undefined") {
      const isExternal = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
      if (isExternal && currentBase.includes("localhost")) {
        setIsProdLocalhost(true);
        setShowConfig(true);
      }
    }

    testConnection(currentBase);
  }, []);

  async function testConnection(url?: string) {
    setBackendStatus("checking");
    try {
      const res = await checkBackendHealth();
      if (res && res.status === "online") {
        setBackendStatus("online");
      } else {
        setBackendStatus("offline");
      }
    } catch {
      setBackendStatus("offline");
    }
  }

  function handleSaveCustomBackend() {
    if (!customInput.trim()) return;
    setCustomApiBase(customInput.trim());
    setBackendUrl(customInput.trim());
    setIsProdLocalhost(false);
    testConnection(customInput.trim());
  }

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
      window.location.href = "/doctor";
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
      window.location.href = "/doctor";
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

        {/* Backend API Connection Status Bar */}
        <div className="bg-slate-100 rounded-2xl p-3 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">API Backend:</span>
              {backendStatus === "online" ? (
                <span className="inline-flex items-center text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />
                  Online
                </span>
              ) : backendStatus === "checking" ? (
                <span className="inline-flex items-center text-amber-700 font-medium bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin mr-1" />
                  Connecting...
                </span>
              ) : (
                <span className="inline-flex items-center text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-full text-[10px]">
                  Offline / Sleeping
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-slate-500 hover:text-slate-800 text-[11px] underline flex items-center space-x-1"
            >
              <Settings className="w-3 h-3" />
              <span>{showConfig ? "Hide" : "Change URL"}</span>
            </button>
          </div>

          <div className="font-mono text-[11px] text-slate-600 truncate">
            {backendUrl || "http://localhost:8000"}
          </div>

          {/* Config expander */}
          {showConfig && (
            <div className="pt-2 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
              {isProdLocalhost && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px]">
                  ⚠️ <strong>Production Notice</strong>: Frontend is on Vercel but pointing to localhost:8000. Paste your Render backend URL below:
                </div>
              )}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="https://your-backend.onrender.com"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomBackend}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  Save & Test
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Login Error</div>
                <div className="text-[11px] leading-relaxed">{error}</div>
              </div>
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
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Console"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>One-Click Demo Logins:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoDoctors.map((doc) => (
                <button
                  key={doc.email}
                  type="button"
                  onClick={() => handleQuickLogin(doc.email, doc.pass)}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 text-left transition space-y-0.5 text-xs disabled:opacity-50"
                >
                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                    <span>{doc.icon}</span>
                    <span className="truncate">{doc.name.split(" ")[1]}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {doc.dept} (Rm {doc.room})
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition"
          >
            ← Return to OPD Portal Selector
          </Link>
        </div>
      </div>
    </div>
  );
}

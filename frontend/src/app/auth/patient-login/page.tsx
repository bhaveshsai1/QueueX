"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HeartPulse,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  User,
  Sparkles,
  AlertCircle,
  Building,
  Server,
  RefreshCw,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getApiBase, setCustomApiBase, checkBackendHealth } from "@/lib/api";

export default function PatientLoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [email, setEmail] = useState("");

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password, "PATIENT");
      window.location.href = "/patient";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        name,
        phone,
        email: email || undefined,
        password,
        role: "PATIENT",
      });
      window.location.href = "/patient";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemoPatient() {
    setError("");
    setLoading(true);
    try {
      await login("rahul@gmail.com", "patient123", "PATIENT");
      window.location.href = "/patient";
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
            <HeartPulse className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200">
            <User className="w-3.5 h-3.5" />
            <span>Patient Outpatient Portal</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === "login" ? "Patient Sign In" : "Register Patient Account"}
          </h1>
          <p className="text-xs text-slate-500">
            Track your OPD tokens, receive proximity alerts, and manage your hospital visits.
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

        {/* Auth Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`py-2 rounded-lg transition ${
                mode === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`py-2 rounded-lg transition ${
                mode === "register"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">Authentication Error</div>
                <div className="text-[11px] leading-relaxed">{error}</div>
              </div>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mobile Number or Email
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. +91 98765 43210 or rahul@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? "Signing In..." : "Sign In to Patient Portal"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Mobile Number (For WhatsApp / SMS alerts)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Create Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{loading ? "Creating Account..." : "Complete Registration"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>One-Click Demo Patient:</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemoPatient}
              disabled={loading}
              className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-left transition flex items-center justify-between text-xs disabled:opacity-50"
            >
              <div>
                <div className="font-bold text-slate-900">Rahul Sharma</div>
                <div className="text-[11px] text-slate-500 font-mono">rahul@gmail.com | patient123</div>
              </div>
              <span className="text-[11px] font-bold text-blue-600">Quick Sign In →</span>
            </button>
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

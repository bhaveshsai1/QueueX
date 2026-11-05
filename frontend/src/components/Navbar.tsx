"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Activity,
  Layers,
  Stethoscope,
  Tv,
  Settings,
  Bell,
  Sparkles,
  PhoneCall,
  MessageSquare,
  AlertTriangle,
  X,
  CheckCircle,
  User,
  HeartPulse,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { seedSimulation, getNotifications, NotificationAlert } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [authDropdown, setAuthDropdown] = useState(false);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNotifications() {
    try {
      const data = await getNotifications(10);
      setNotifications(data);
    } catch {
      // Backend may be starting
    }
  }

  async function handleQuickSeed() {
    setSeeding(true);
    try {
      await seedSimulation();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
      fetchNotifications();
      window.dispatchEvent(new CustomEvent("opd-refresh"));
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  }

  // Dynamic Navigation Links based on authentication role
  let navLinks = [
    { href: "/", label: "Overview", icon: Layers },
    { href: "/kiosk", label: "Patient Kiosk", icon: Activity },
    { href: "/display", label: "Waiting Room TV", icon: Tv },
  ];

  if (user?.role === "DOCTOR") {
    navLinks = [
      { href: "/", label: "Overview", icon: Layers },
      { href: "/doctor", label: "Doctor Console", icon: Stethoscope },
      { href: "/display", label: "Waiting Room TV", icon: Tv },
      { href: "/admin", label: "Admin & Simulator", icon: Settings },
    ];
  } else if (user?.role === "PATIENT") {
    navLinks = [
      { href: "/", label: "Overview", icon: Layers },
      { href: "/patient", label: "My Patient Portal", icon: HeartPulse },
      { href: "/kiosk", label: "Check In / Kiosk", icon: Activity },
      { href: "/display", label: "Waiting Room TV", icon: Tv },
    ];
  } else {
    navLinks = [
      { href: "/", label: "Overview", icon: Layers },
      { href: "/kiosk", label: "Patient Kiosk", icon: Activity },
      { href: "/display", label: "Waiting Room TV", icon: Tv },
      { href: "/admin", label: "Simulator", icon: Settings },
    ];
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Smart OPD</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Adaptive
                </span>
              </div>
              <p className="text-xs text-slate-700 hidden sm:block">Intelligent Virtual Queue & Triage</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions & Auth Controls */}
          <div className="flex items-center space-x-2">
            {/* Quick Demo Seed Button */}
            <button
              onClick={handleQuickSeed}
              disabled={seeding}
              title="Populates realistic patients and active consultation for live hackathon demo"
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition ${
                seedSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{seedSuccess ? "Demo Seeded!" : seeding ? "Seeding..." : "Seed Demo"}</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setShowDrawer(!showDrawer)}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
              )}
            </button>

            {/* Auth State Button */}
            {user ? (
              <div className="flex items-center space-x-2 pl-1 border-l border-slate-200">
                <Link
                  href={user.role === "DOCTOR" ? "/doctor" : "/patient"}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold transition"
                >
                  {user.role === "DOCTOR" ? (
                    <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span className="truncate max-w-[120px]">{user.name}</span>
                </Link>

                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setAuthDropdown(!authDropdown)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm"
                >
                  <span>Sign In</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {authDropdown && (
                  <div
                    onClick={() => setAuthDropdown(false)}
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <Link
                      href="/auth/doctor-login"
                      className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <Stethoscope className="w-4 h-4 text-emerald-600" />
                      <span>Doctor / Staff Portal</span>
                    </Link>

                    <Link
                      href="/auth/patient-login"
                      className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                    >
                      <HeartPulse className="w-4 h-4 text-blue-600" />
                      <span>Patient Health Portal</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto py-2 px-4 border-t border-slate-100 space-x-2 bg-slate-50/70">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs whitespace-nowrap font-medium ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 bg-white border border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Slide-over Notification / SMS Broadcast Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Live Broadcasts & Proximity Alerts</h3>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 text-emerald-800 text-xs border-b border-emerald-100 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Simulated WhatsApp, SMS, and IVR alerts pushed to patients in real-time.</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">
                  No notifications broadcasted yet. Check in a patient or trigger a doctor delay!
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-sm transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        {n.channel === "WHATSAPP" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                            WhatsApp
                          </span>
                        )}
                        {n.channel === "SMS" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                            SMS
                          </span>
                        )}
                        {n.channel === "IVR" && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 flex items-center space-x-1">
                            <PhoneCall className="w-2.5 h-2.5" />
                            <span>IVR Call</span>
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-900">{n.patient_name}</span>
                      </div>
                      <span className="text-[11px] text-slate-600">{n.timestamp}</span>
                    </div>
                    <div className="font-medium text-xs text-slate-900 mb-1">{n.title}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

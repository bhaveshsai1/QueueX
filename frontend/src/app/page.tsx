"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock,
  AlertTriangle,
  Radio,
  QrCode,
  Stethoscope,
  Tv,
  Sparkles,
  CheckCircle2,
  Users,
  ShieldAlert,
  Smartphone,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import { getStats, QueueStats, getDoctors, Doctor } from "@/lib/api";

export default function HomePage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 6000);
    window.addEventListener("opd-refresh", loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("opd-refresh", loadData);
    };
  }, []);

  async function loadData() {
    try {
      const [s, docs] = await Promise.all([getStats(), getDoctors()]);
      setStats(s);
      setDoctors(docs);
    } catch {
      // Backend may be starting
    } finally {
      setLoading(false);
    }
  }

  const portals = [
    {
      title: "Patient Health Portal",
      desc: "Personal dashboard for registered patients: live active token tracking, wait times, upcoming appointments, and visit history.",
      href: "/patient",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      badge: "Patient Portal",
    },
    {
      title: "Doctor OPD Console",
      desc: "Restricted physician portal: real-time consultation manager, 1-click delay broadcasting, emergency patient bump, and rolling ETA recalculation.",
      href: "/doctor",
      icon: Stethoscope,
      color: "from-emerald-600 to-teal-500",
      badge: "Doctor / Staff Portal",
    },
    {
      title: "Patient Self-Service Kiosk",
      desc: "Touch kiosk & QR check-in for walk-ins and pre-booked slots. Issues instant digital token with live tracking link.",
      href: "/kiosk",
      icon: QrCode,
      color: "from-cyan-600 to-blue-500",
      badge: "Lobby Kiosk",
    },
    {
      title: "Waiting Room TV Display",
      desc: "High-visibility digital board for hospital lobby screens with audio announcements, current tokens, and delay alerts.",
      href: "/display",
      icon: Tv,
      color: "from-violet-600 to-indigo-500",
      badge: "Public LED Screen",
    },
    {
      title: "Admin & Demo Simulator",
      desc: "Command center with throughput analytics and interactive buttons to simulate emergency surges and doctor surgery delays.",
      href: "/admin",
      icon: Radio,
      color: "from-amber-500 to-rose-500",
      badge: "Hackathon Controls",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Smart OPD Prototype • Hackathon Edition</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Replacing Painful Waiting Rooms With an{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              Adaptive Virtual Queue
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Static hospital lines fail when emergencies strike or doctors are called into surgery. Smart OPD dynamically recalculates token positions in real time, interleaves pre-booked appointments with walk-ins, and delivers proximity WhatsApp/SMS alerts when patients are 3 slots away.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/patient"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/30 transition transform hover:-translate-y-0.5"
            >
              <Users className="w-4 h-4" />
              <span>Patient Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/doctor"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5"
            >
              <Stethoscope className="w-4 h-4 text-emerald-200" />
              <span>Doctor Console</span>
            </Link>
            <Link
              href="/kiosk"
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm backdrop-blur border border-white/10 transition"
            >
              <QrCode className="w-4 h-4 text-cyan-300" />
              <span>Lobby Kiosk</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Live OPD Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Currently Waiting</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.total_waiting ?? 0}</h3>
            <p className="text-[11px] text-slate-700">In OPD Queue</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Avg. Wait Time</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.average_wait_minutes ?? 0} <span className="text-sm font-normal text-slate-700">min</span></h3>
            <p className="text-[11px] text-emerald-700 font-medium flex items-center">
              <TrendingDown className="w-3 h-3 mr-0.5" /> Dynamic estimate
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Triage Preemptions</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.emergency_count ?? 0}</h3>
            <p className="text-[11px] text-slate-700">Emergency jumps</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Active Delays</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats?.active_delays_count ?? 0}</h3>
            <p className="text-[11px] text-slate-700">Broadcasted to patients</p>
          </div>
        </div>
      </div>

      {/* 4 Interactive Portal Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hospital OPD Access Portals</h2>
            <p className="text-sm text-slate-700">Choose a terminal view to test live features</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {portals.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.href}
                href={p.href}
                className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${p.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition">
                      {p.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition flex items-center space-x-1">
                      <span>{p.title}</span>
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                    </h3>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-700 group-hover:text-emerald-700">
                  <span>Open interface</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Real-time Feature Breakdown */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold text-slate-900">How the Smart Queue Engine Operates</h2>
          <p className="text-sm text-slate-700 mt-1">
            Engineered specifically to solve static hospital bottlenecks through 4 adaptive pillars:
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
              🚨
            </div>
            <h4 className="font-bold text-sm text-slate-900">Emergency & Triage Preemption</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Acute trauma cases instantly jump to slot #1. All downstream waiting tokens are recalculated with zero manual re-entry.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-sm">
              ⏱️
            </div>
            <h4 className="font-bold text-sm text-slate-900">Dynamic Delay Broadcasting</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              When a doctor is called for surgery or emergencies, 1-click adds a delay buffer and automatically updates all patient ETAs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
              📍
            </div>
            <h4 className="font-bold text-sm text-slate-900">Smart Proximity Alerts</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Patients wait comfortably in the cafeteria or garden. WhatsApp/SMS alerts fire when 3 patients remain ahead, backed by IVR calls.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
              🔄
            </div>
            <h4 className="font-bold text-sm text-slate-900">Intelligent Slot Interleaving</h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Blends pre-booked appointments with walk-ins based on doctor throughput, preventing walk-in starvation and idle doctor time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

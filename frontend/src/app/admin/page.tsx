"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Sparkles,
  ShieldAlert,
  Clock,
  RotateCcw,
  Play,
  PhoneCall,
  Activity,
  Users,
  CheckCircle2,
  TrendingDown,
  AlertTriangle,
  Radio,
  FileText,
  MessageSquare,
  Database,
  Server,
  ExternalLink,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import {
  getStats,
  QueueStats,
  getDoctors,
  Doctor,
  getNotifications,
  NotificationAlert,
  seedSimulation,
  resetSimulation,
  triggerEmergencyPreemption,
  reportDoctorDelay,
  callNextPatient,
  getFirebaseStatus,
  syncFirebase,
  FirebaseStatusInfo,
} from "@/lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);
  const [fbStatus, setFbStatus] = useState<FirebaseStatusInfo | null>(null);
  const [showFbHelp, setShowFbHelp] = useState(false);
  const [fbSyncing, setFbSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState("");

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadAll() {
    try {
      const [s, docs, notifs, fb] = await Promise.all([
        getStats(),
        getDoctors(),
        getNotifications(20),
        getFirebaseStatus().catch(() => null),
      ]);
      setStats(s);
      setDoctors(docs);
      setNotifications(notifs);
      if (fb) setFbStatus(fb);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncFirestore() {
    setFbSyncing(true);
    try {
      const res = await syncFirebase();
      showAction(res.success ? "✅ Synced all doctors, departments & tokens to Firestore!" : `⚠️ ${res.message}`);
      await loadAll();
    } catch (e) {
      showAction("⚠️ Sync failed. Ensure Firebase is connected.");
    } finally {
      setFbSyncing(false);
    }
  }

  function showAction(msg: string) {
    setLastActionMsg(msg);
    setTimeout(() => setLastActionMsg(""), 4000);
  }

  async function handleSeed() {
    setSimLoading(true);
    try {
      await seedSimulation();
      showAction("✅ Realistic OPD queue seeded with walk-in & online interleaved patients!");
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  }

  async function handleReset() {
    if (!confirm("Are you sure you want to reset all OPD queues?")) return;
    setSimLoading(true);
    try {
      await resetSimulation();
      showAction("🧹 All queues and consultations have been reset.");
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  }

  async function handleInjectEmergency() {
    setSimLoading(true);
    try {
      const targetDoc = doctors[0];
      await triggerEmergencyPreemption({
        name: "Marcus Vance (Cardiac Arrest)",
        age: 54,
        gender: "Male",
        phone: "+91 91234 56789",
        department_id: targetDoc?.department_id || "dept-cardio",
        doctor_id: targetDoc?.id || "doc-1",
        symptoms: "🚨 Severe acute chest constriction, ST-elevation suspected",
      });
      showAction("🚨 Emergency patient Marcus Vance preempted to Slot #1! All patient ETAs shifted.");
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  }

  async function handleSurgeryDelay() {
    setSimLoading(true);
    try {
      const targetDoc = doctors[0];
      await reportDoctorDelay(
        targetDoc?.id || "doc-1",
        25,
        "Doctor summoned to emergency vascular surgery. OPD held."
      );
      showAction(`⏱️ +25 min delay broadcasted to all patients of ${targetDoc?.name || "Doctor"}!`);
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  }

  async function handleCallNextDoctor1() {
    setSimLoading(true);
    try {
      const targetDoc = doctors[0];
      await callNextPatient(targetDoc?.id || "doc-1");
      showAction(`🔔 Call Next Patient triggered for ${targetDoc?.name || "Doctor"}.`);
      await loadAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Admin Command Center
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              OPD Analytics & Hackathon Live Simulator
            </h1>
          </div>
        </div>

        {/* Global Reset */}
        <button
          onClick={handleReset}
          disabled={simLoading}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All Queues</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {lastActionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-md animate-in slide-in-from-top duration-200">
          {lastActionMsg}
        </div>
      )}

      {/* Hackathon Live Simulator Control Box */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        <div className="max-w-xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interactive Demo Controller</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight mt-2">
            Simulate Live OPD Events for Judges
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Click these buttons to test the adaptive queue algorithms in real time across the Kiosk, Patient Tracker, Doctor Console, and Waiting Room TV!
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={handleSeed}
            disabled={simLoading}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-left space-y-2 transition transform hover:-translate-y-0.5"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-white">1. Seed OPD Scenario</div>
            <p className="text-[11px] text-slate-300">
              Generates 7+ mixed patients, interleaving appointments, and active consultation.
            </p>
          </button>

          <button
            onClick={handleInjectEmergency}
            disabled={simLoading}
            className="p-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-left space-y-2 transition transform hover:-translate-y-0.5"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-white">2. Inject Emergency Triage</div>
            <p className="text-[11px] text-slate-300">
              Marcus Vance (Cardiac Arrest) jumps to Slot #1. Watch downstream ETAs shift!
            </p>
          </button>

          <button
            onClick={handleSurgeryDelay}
            disabled={simLoading}
            className="p-4 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-left space-y-2 transition transform hover:-translate-y-0.5"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-white">3. Doctor Surgery (+25m)</div>
            <p className="text-[11px] text-slate-300">
              Dr. Sarah called to surgery. Broadcasts delay SMS/WhatsApp alerts to all patients.
            </p>
          </button>

          <button
            onClick={handleCallNextDoctor1}
            disabled={simLoading}
            className="p-4 rounded-2xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-left space-y-2 transition transform hover:-translate-y-0.5"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold">
              <Play className="w-5 h-5" />
            </div>
            <div className="font-bold text-sm text-white">4. Call Next Patient</div>
            <p className="text-[11px] text-slate-300">
              Advances queue, plays audio announcement, and updates rolling consultation duration.
            </p>
          </button>
        </div>
      </div>

      {/* Firebase Database Persistence Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              fbStatus?.is_connected ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-sm">Database Engine</h3>
                {fbStatus?.is_connected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                    Google Cloud Firestore (Live)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5" />
                    Local JSON Sync Engine (Firestore Mirror)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {fbStatus?.is_connected
                  ? `Connected to Firebase project: ${fbStatus.project_id || "default"} | Syncing live across departments & tokens.`
                  : "Running in instant local persistent store. Add firebase-service-account.json to activate live Google Cloud Firestore."}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFbHelp(!showFbHelp)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition inline-flex items-center space-x-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showFbHelp ? "Hide Guide" : "Firebase Setup Guide"}</span>
            </button>
            {fbStatus?.is_connected && (
              <button
                onClick={handleSyncFirestore}
                disabled={fbSyncing}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition inline-flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fbSyncing ? "animate-spin" : ""}`} />
                <span>Sync to Cloud</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Setup Guide */}
        {showFbHelp && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700 animate-in fade-in duration-200">
            <div className="font-bold text-slate-900">How to connect your Firebase Firestore:</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
              <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline inline-flex items-center">Firebase Console <ExternalLink className="w-3 h-3 ml-0.5" /></a> and create or select a project.</li>
              <li>Go to <strong>Build &gt; Firestore Database</strong> &gt; click <strong>Create database</strong> (choose <em>Start in test mode</em>).</li>
              <li>Click <strong>Project Settings (Gear Icon) &gt; Service accounts</strong> tab &gt; click <strong>Generate new private key</strong>.</li>
              <li>Download the JSON file and drop it in the project root folder as <code>firebase-service-account.json</code>.</li>
              <li>Restart backend or run <code>test-firebase.bat</code>. That&apos;s it!</li>
            </ol>
          </div>
        )}
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Total Waiting</span>
          <div className="text-3xl font-extrabold text-slate-900">{stats?.total_waiting ?? 0}</div>
          <p className="text-[11px] text-slate-700">Currently in OPD virtual queue</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Patients Completed</span>
          <div className="text-3xl font-extrabold text-emerald-600">{stats?.total_completed ?? 0}</div>
          <p className="text-[11px] text-slate-700">Successfully consulted today</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Dynamic Avg Wait</span>
          <div className="text-3xl font-extrabold text-blue-600">
            {stats?.average_wait_minutes ?? 0} <span className="text-base font-medium text-slate-700">min</span>
          </div>
          <p className="text-[11px] text-slate-700">Across active departments</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Delays</span>
          <div className="text-3xl font-extrabold text-amber-600">{stats?.active_delays_count ?? 0}</div>
          <p className="text-[11px] text-slate-700">Broadcasted to patients</p>
        </div>
      </div>

      {/* Two Columns: Active Doctor Rooms & Live Notification Audit Log */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Doctor Rooms */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Active OPD Consultation Rooms</h3>
          <div className="divide-y divide-slate-100">
            {doctors.map((d) => (
              <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{d.name}</div>
                  <div className="text-slate-500">
                    Room {d.room_number} • {d.department_name}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.status === "IN_CONSULTATION"
                        ? "bg-emerald-100 text-emerald-800"
                        : d.delay_minutes > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.status} {d.delay_minutes > 0 ? `(+${d.delay_minutes}m)` : ""}
                  </span>
                  <div className="text-slate-400 text-[11px]">
                    Served today: {d.total_patients_served_today}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Notification Audit Log */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Live Notification Broadcast Stream
            </h3>
            <span className="text-xs text-slate-400">WhatsApp / SMS / IVR</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No alerts broadcasted yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">
                      {n.channel} ➔ {n.patient_name} ({n.patient_phone})
                    </span>
                    <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700">{n.title}</div>
                  <p className="text-[11px] text-slate-500">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Users,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle,
  XCircle,
  PhoneCall,
  Bell,
  Radio,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Flame,
  Calendar,
  User,
  Coffee,
  Lock,
  LogOut,
  Building,
} from "lucide-react";
import {
  getDoctors,
  Doctor,
  getTokens,
  Token,
  callNextPatient,
  reportDoctorDelay,
  resumeDoctorQueue,
  markTokenMissed,
  triggerEmergencyPreemption,
} from "@/lib/api";
import { playHospitalChime, speakAnnouncement } from "@/lib/sound";
import { useAuth } from "@/lib/auth-context";

export default function DoctorConsolePage() {
  const { user, isLoading: authLoading, logout } = useAuth();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [queueTokens, setQueueTokens] = useState<Token[]>([]);
  const [activeToken, setActiveToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Consultation elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Emergency Modal State
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergName, setEmergName] = useState("");
  const [emergAge, setEmergAge] = useState(48);
  const [emergPhone, setEmergPhone] = useState("+91 99887 76655");
  const [emergSymptoms, setEmergSymptoms] = useState("Acute Chest Pain & Dyspnea");

  // Custom delay state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [customDelayMins, setCustomDelayMins] = useState(15);
  const [customDelayReason, setCustomDelayReason] = useState("Attending emergency case in ICU");

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (user?.doctor_id) {
      setSelectedDoctorId(user.doctor_id);
    }
  }, [user]);

  useEffect(() => {
    if (!selectedDoctorId) return;
    loadQueue();
    const interval = setInterval(loadQueue, 3500);
    return () => clearInterval(interval);
  }, [selectedDoctorId]);

  // Consultation timer tick
  useEffect(() => {
    if (activeToken && currentDoctor?.status === "IN_CONSULTATION") {
      const timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setElapsedSeconds(0);
    }
  }, [activeToken, currentDoctor?.status]);

  async function loadDoctors() {
    try {
      const docs = await getDoctors();
      setDoctors(docs);
      if (docs.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docs[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadQueue() {
    try {
      const docs = await getDoctors();
      const doc = docs.find((d) => d.id === selectedDoctorId);
      setCurrentDoctor(doc || null);

      const allTokens = await getTokens(undefined, selectedDoctorId);

      // Active token in consultation
      const active = allTokens.find((t) => t.status === "IN_CONSULTATION") || null;
      setActiveToken(active);

      // Waiting or approaching tokens
      const waiting = allTokens
        .filter((t) => t.status === "WAITING" || t.status === "APPROACHING")
        .sort((a, b) => a.queue_position - b.queue_position);

      setQueueTokens(waiting);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCallNext() {
    if (!selectedDoctorId) return;
    setActionLoading(true);
    try {
      const res = await callNextPatient(selectedDoctorId);
      playHospitalChime();

      if (res.current_token) {
        speakAnnouncement(
          `Token ${res.current_token.token_number}, please proceed to Room ${currentDoctor?.room_number}`
        );
      }

      await loadQueue();
    } catch (e) {
      console.error(e);
      alert("Failed to call next patient.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelay(minutes: number, reason: string) {
    if (!selectedDoctorId) return;
    setActionLoading(true);
    try {
      await reportDoctorDelay(selectedDoctorId, minutes, reason);
      setShowDelayModal(false);
      await loadQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    if (!selectedDoctorId) return;
    setActionLoading(true);
    try {
      await resumeDoctorQueue(selectedDoctorId);
      await loadQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMissed(tokenId: string) {
    setActionLoading(true);
    try {
      await markTokenMissed(tokenId);
      await loadQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEmergencyPreemptionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emergName || !selectedDoctorId) return;
    setActionLoading(true);
    try {
      await triggerEmergencyPreemption({
        name: emergName,
        age: Number(emergAge),
        gender: "Other",
        phone: emergPhone,
        department_id: currentDoctor?.department_id || "dept-cardio",
        doctor_id: selectedDoctorId,
        symptoms: emergSymptoms,
      });
      setShowEmergencyModal(false);
      setEmergName("");
      await loadQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Auth Gate: Check if current user is logged in as a DOCTOR
  if (!authLoading && (!user || user.role !== "DOCTOR")) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <span>Restricted Access</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Doctor Portal Authentication Required
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            The consultation console, emergency preemption, and delay broadcast tools are strictly protected for licensed medical physicians and OPD staff.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
          <Link
            href="/auth/doctor-login"
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2"
          >
            <Stethoscope className="w-4 h-4 text-emerald-400" />
            <span>Sign In to Doctor Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
            Are you a patient?{" "}
            <Link href="/patient" className="font-bold text-emerald-600 hover:underline">
              Go to Patient Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar with Doctor Selector & OPD Room Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                OPD Consultation Dashboard
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
              Doctor Command Center
            </h1>
          </div>
        </div>

        {/* Doctor Switcher & Profile Dropdown */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-900 block">{user?.name}</span>
            <span className="text-[10px] text-slate-500">OPD Medical Staff</span>
          </div>

          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} — Room {d.room_number} ({d.department_name})
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              logout();
              window.location.href = "/auth/doctor-login";
            }}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Sign out of Doctor Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Active Patient on Left, Delay & Quick Actions on Right */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Consultation Card (Span 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Current Consultation In Room {currentDoctor?.room_number}
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Avg: {currentDoctor?.avg_consultation_minutes} mins / patient
              </span>
            </div>

            {activeToken ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Active Token
                    </span>
                    <div className="text-5xl font-black text-slate-900 tracking-tight mt-1">
                      {activeToken.token_number}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-sm font-bold text-slate-900">
                        {activeToken.patient.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        ({activeToken.patient.age}y, {activeToken.patient.gender})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Phone: <span className="font-mono">{activeToken.patient.phone}</span>
                    </p>
                    {activeToken.patient.symptoms && (
                      <p className="text-xs text-emerald-900 bg-white/80 px-2.5 py-1 rounded-lg mt-2 inline-block border border-emerald-200">
                        Complaints: {activeToken.patient.symptoms}
                      </p>
                    )}
                  </div>

                  {/* Consultation Elapsed Timer */}
                  <div className="text-center sm:text-right bg-white p-4 rounded-xl border border-emerald-200 shadow-sm min-w-[140px]">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Consultation Timer
                    </span>
                    <div className="text-3xl font-mono font-bold text-emerald-600 mt-0.5">
                      {formatTimer(elapsedSeconds)}
                    </div>
                    <span className="text-[10px] text-slate-500">Session live</span>
                  </div>
                </div>

                {/* Consultation Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleCallNext}
                    disabled={actionLoading}
                    className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete & Call Next Patient</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleMissed(activeToken.id)}
                    disabled={actionLoading}
                    title="If patient didn't arrive after being called, mark missed and trigger automated IVR call"
                    className="py-3.5 px-4 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition flex items-center space-x-1.5"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Mark No-Show / IVR</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Room is Currently Idle</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {queueTokens.length} patient(s) waiting in queue for {currentDoctor?.name}
                  </p>
                </div>
                <button
                  onClick={handleCallNext}
                  disabled={actionLoading || queueTokens.length === 0}
                  className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>Call First Patient</span>
                </button>
              </div>
            )}
          </div>

          {/* Live Queue Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Waiting Queue ({queueTokens.length} Patients)
                </h3>
                <p className="text-xs text-slate-500">
                  Dynamically sorted by Triage Preemption & Slot Interleaving
                </p>
              </div>

              {/* Emergency Bump Action */}
              <button
                onClick={() => setShowEmergencyModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>🚨 Preempt Emergency Case</span>
              </button>
            </div>

            {queueTokens.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No patients waiting in queue.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {queueTokens.map((t) => {
                  const isEmergency = t.patient.priority === "EMERGENCY";
                  const isUrgent = t.patient.priority === "URGENT";
                  const isSenior = t.patient.priority === "SENIOR_CHILD";
                  const isScheduled = t.patient.priority === "SCHEDULED";

                  return (
                    <div
                      key={t.id}
                      className={`py-3.5 px-3 rounded-xl flex items-center justify-between transition ${
                        isEmergency
                          ? "bg-rose-50 border border-rose-200"
                          : t.queue_position <= 3
                          ? "bg-blue-50/40"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            isEmergency
                              ? "bg-rose-600 text-white"
                              : t.queue_position <= 3
                              ? "bg-blue-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          #{t.queue_position}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {t.token_number}
                            </span>
                            <span className="text-xs font-medium text-slate-700">
                              {t.patient.name} ({t.patient.age}y)
                            </span>

                            {/* Badges */}
                            {isEmergency && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                                EMERGENCY JUMP
                              </span>
                            )}
                            {isUrgent && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                Urgent
                              </span>
                            )}
                            {isSenior && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                Senior/Child
                              </span>
                            )}
                            {isScheduled && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Online Booked
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {t.patient.symptoms || "Regular consultation"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-600">
                          ~{t.estimated_wait_minutes} mins
                        </div>
                        <div className="text-[11px] text-slate-400">
                          ETA {t.estimated_start_time || "Now"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Dynamic Delay Management */}
        <div className="space-y-6">
          {/* Doctor Delay Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Dynamic Delay Management</h3>
              </div>
              {currentDoctor && currentDoctor.delay_minutes > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  +{currentDoctor.delay_minutes}m Delayed
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Called for emergency surgery or doctor ward rounds? 1-click adds delay buffers and automatically broadcasts revised ETAs to all queued patient trackers.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDelay(15, "Doctor attending urgent ward round")}
                disabled={actionLoading}
                className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 font-bold text-xs text-slate-700 transition"
              >
                +15 Mins Delay
              </button>
              <button
                onClick={() => handleDelay(30, "Doctor called to emergency ICU case")}
                disabled={actionLoading}
                className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 font-bold text-xs text-slate-700 transition"
              >
                +30 Mins Delay
              </button>
            </div>

            <button
              onClick={() => handleDelay(45, "Emergency trauma surgery called. Queue on hold.")}
              disabled={actionLoading}
              className="w-full p-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 font-bold text-xs transition flex items-center justify-center space-x-2"
            >
              <Flame className="w-4 h-4 text-rose-600" />
              <span>🚨 Emergency Surgery (Hold 45m)</span>
            </button>

            {currentDoctor && currentDoctor.delay_minutes > 0 && (
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition"
              >
                Clear Delay & Resume Normal Queue
              </button>
            )}
          </div>

          {/* Doctor Performance Summary */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Today&apos;s OPD Performance</h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Patients Served Today</span>
                <span className="font-bold text-slate-900">
                  {currentDoctor?.total_patients_served_today ?? 0}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Avg Consultation Time</span>
                <span className="font-bold text-emerald-600">
                  {currentDoctor?.avg_consultation_minutes} mins (Adaptive)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-900">
                  {currentDoctor?.department_name}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Room</span>
                <span className="font-semibold text-slate-900">
                  Room {currentDoctor?.room_number}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Preemption Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-2 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-900">🚨 Emergency Triage Preemption</h3>
            </div>
            <p className="text-xs text-slate-500">
              Submitting an emergency case will place this patient immediately at Slot #1 and dynamically shift all waiting patients back.
            </p>

            <form onSubmit={handleEmergencyPreemptionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  required
                  value={emergName}
                  onChange={(e) => setEmergName(e.target.value)}
                  placeholder="e.g. John Doe (Trauma)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={emergAge}
                    onChange={(e) => setEmergAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={emergPhone}
                    onChange={(e) => setEmergPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Symptoms / Condition *</label>
                <input
                  type="text"
                  required
                  value={emergSymptoms}
                  onChange={(e) => setEmergSymptoms(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition"
                >
                  Preempt Queue Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


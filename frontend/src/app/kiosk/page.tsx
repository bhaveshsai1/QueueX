"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import {
  QrCode,
  User,
  Phone,
  HeartPulse,
  AlertCircle,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Printer,
  ExternalLink,
  ShieldAlert,
  Clock,
  MapPin,
  Stethoscope,
} from "lucide-react";
import {
  getDepartments,
  Department,
  checkInPatient,
  TriagePriority,
  SlotType,
  Token,
} from "@/lib/api";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function KioskPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"walkin" | "prebooked">("walkin");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [age, setAge] = useState<number>(32);
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<TriagePriority>("NORMAL");
  const [symptoms, setSymptoms] = useState("");

  // Host configuration for QR code scanning (phone on same Wi-Fi)
  const [customHost, setCustomHost] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCustomHost(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Pre-booked fast check-in
  const [appointmentId, setAppointmentId] = useState("APP-8842");

  // Generated Token State
  const [generatedToken, setGeneratedToken] = useState<Token | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      const depts = await getDepartments();
      setDepartments(depts);
      if (depts.length > 0) setDepartmentId(depts[0].id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleWalkinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !phone || !departmentId) return;

    setLoading(true);
    try {
      const res = await checkInPatient({
        user_id: user?.id,
        name,
        age: Number(age),
        gender,
        phone,
        department_id: departmentId,
        priority,
        slot_type: "WALK_IN",
        symptoms,
      });

      setGeneratedToken(res.token);

      // Generate QR Code for live smartphone tracking
      const baseUrl = customHost || window.location.origin;
      const trackerUrl = `${baseUrl}/track/${res.token.id}`;
      const qr = await QRCode.toDataURL(trackerUrl, { width: 220, margin: 1 });
      setQrDataUrl(qr);

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to check in patient. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrebookedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appointmentId) return;

    setLoading(true);
    try {
      // In real deployment, retrieves slot details; here we create interleaved token
      const res = await checkInPatient({
        user_id: user?.id,
        name: name || user?.name || "Verified Online Patient",
        age: Number(age) || 35,
        gender: "Female",
        phone: phone || user?.phone || "+91 98765 43210",
        department_id: departmentId || (departments[0]?.id ?? "dept-cardio"),
        priority: "SCHEDULED",
        slot_type: "ONLINE_BOOKED",
        appointment_id: appointmentId,
        booked_time: "10:30 AM",
        symptoms: "Pre-booked specialist consultation",
      });

      setGeneratedToken(res.token);

      const baseUrl = customHost || window.location.origin;
      const trackerUrl = `${baseUrl}/track/${res.token.id}`;
      const qr = await QRCode.toDataURL(trackerUrl, { width: 220, margin: 1 });
      setQrDataUrl(qr);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to verify appointment.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setGeneratedToken(null);
    setQrDataUrl("");
    setName("");
    setSymptoms("");
    setPriority("NORMAL");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Kiosk Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <QrCode className="w-3.5 h-3.5" />
          <span>Self-Service OPD Kiosk Terminal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome to Outpatient Check-in
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Scan the QR code to track your queue in real time on your phone. No need to sit in crowded waiting rooms!
        </p>
      </div>

      {/* If Token Generated -> Show Digital Token Card */}
      {generatedToken ? (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Token Generated Successfully!</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Your Digital OPD Token</h2>
            <p className="text-xs text-slate-500">Scan QR on your smartphone or click below to launch live tracker</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
            {/* Token Info */}
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Your Token Number</span>
                <div className="text-5xl font-extrabold text-emerald-600 tracking-tight mt-1">
                  {generatedToken.token_number}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200/80 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <span className="font-semibold text-slate-900">{generatedToken.patient.name} ({generatedToken.patient.age}y)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-900">{generatedToken.department_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Assigned Doctor:</span>
                  <span className="font-semibold text-slate-900">{generatedToken.doctor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consultation Room:</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Room {generatedToken.room_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Queue Position:</span>
                  <span className="font-bold text-slate-900">#{generatedToken.queue_position} in line</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Wait:</span>
                  <span className="font-bold text-emerald-600">~{generatedToken.estimated_wait_minutes} mins</span>
                </div>
              </div>
            </div>

            {/* QR Code and Mobile Link */}
            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 text-center">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Track Queue QR Code"
                  className="w-44 h-44 rounded-xl shadow-inner border border-slate-100"
                />
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900">Scan to Track on Smartphone</p>
                <p className="text-[11px] text-slate-500">Live dynamic ETA updates & native device alerts</p>
                <button
                  type="button"
                  onClick={async () => {
                    const newHost = customHost.includes("172.18.3.25") ? window.location.origin : "http://172.18.3.25:3000";
                    setCustomHost(newHost);
                    const trackerUrl = `${newHost}/track/${generatedToken.id}`;
                    const qr = await QRCode.toDataURL(trackerUrl, { width: 220, margin: 1 });
                    setQrDataUrl(qr);
                  }}
                  className="inline-block mt-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold hover:bg-emerald-100 transition"
                >
                  {customHost.includes("172.18.3.25") ? "Using Wi-Fi IP (Tap for Localhost)" : "Tap to Switch QR to Phone Wi-Fi IP"}
                </button>
              </div>

              <Link
                href={`/track/${generatedToken.id}`}
                className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                <span>Open Live Patient Tracker</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Token Slip</span>
            </button>

            <button
              onClick={handleReset}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
            >
              Check In Another Patient
            </button>
          </div>
        </div>
      ) : (
        /* Kiosk Tabs and Check-In Form */
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-6">
          {/* Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("walkin")}
              className={`py-3 rounded-xl text-sm font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === "walkin"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Standard Walk-in Check-in</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("prebooked")}
              className={`py-3 rounded-xl text-sm font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === "prebooked"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Pre-Booked Slot Interleaving</span>
            </button>
          </div>

          {/* Form Content */}
          {activeTab === "walkin" ? (
            <form onSubmit={handleWalkinSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Mobile Number (For WhatsApp/SMS Alerts) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    OPD Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white font-medium"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.room_range})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Triage Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Triage Priority Level (Adaptive Preemption)
                </label>
                <div className="grid sm:grid-cols-4 gap-3">
                  {[
                    {
                      id: "NORMAL",
                      title: "Standard Walk-in",
                      desc: "Regular checkup / routine symptoms",
                      color: "border-slate-200 hover:border-slate-400 peer-checked:border-slate-900 peer-checked:bg-slate-50",
                    },
                    {
                      id: "SENIOR_CHILD",
                      title: "Senior / Infant",
                      desc: "Age 65+ or infants needing priority",
                      color: "border-blue-200 hover:border-blue-400 peer-checked:border-blue-600 peer-checked:bg-blue-50",
                    },
                    {
                      id: "URGENT",
                      title: "Urgent (Pain / Fever)",
                      desc: "Acute distress, high temperature",
                      color: "border-amber-200 hover:border-amber-400 peer-checked:border-amber-600 peer-checked:bg-amber-50",
                    },
                    {
                      id: "EMERGENCY",
                      title: "🚨 Emergency Triage",
                      desc: "Instant preemption jump to next slot",
                      color: "border-rose-200 hover:border-rose-400 peer-checked:border-rose-600 peer-checked:bg-rose-50",
                    },
                  ].map((p) => (
                    <label key={p.id} className="cursor-pointer">
                      <input
                        type="radio"
                        name="triage"
                        value={p.id}
                        checked={priority === p.id}
                        onChange={() => setPriority(p.id as TriagePriority)}
                        className="peer sr-only"
                      />
                      <div className={`p-3 rounded-xl border-2 transition text-left h-full flex flex-col justify-between ${p.color}`}>
                        <div className="font-bold text-xs text-slate-900">{p.title}</div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-tight">{p.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Symptoms / Primary Complaint (Optional)
                </label>
                <input
                  type="text"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Chest heaviness, recurring migraine, knee joint swelling"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Generating Digital Token...</span>
                ) : (
                  <>
                    <QrCode className="w-5 h-5" />
                    <span>Check In & Issue Digital Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Pre-booked Slot Check-in Form */
            <form onSubmit={handlePrebookedSubmit} className="space-y-6">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Intelligent Slot Interleaving Engine</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Pre-booked online appointments are dynamically interleaved into the live walk-in queue right at their designated time window, preventing doctor idle gaps while respecting appointment priority!
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Online Appointment ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={appointmentId}
                    onChange={(e) => setAppointmentId(e.target.value)}
                    placeholder="e.g. APP-8842 or APP-9102"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Patient Name (or verify via Phone)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. David Vance"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-lg transition flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Interleaving Appointment Slot...</span>
                ) : (
                  <>
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <span>Confirm Slot & Activate Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}


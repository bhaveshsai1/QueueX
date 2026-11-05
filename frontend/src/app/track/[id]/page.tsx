"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Clock,
  MapPin,
  Stethoscope,
  Bell,
  Coffee,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Phone,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Smartphone,
  Check,
  RotateCcw,
  Pill,
} from "lucide-react";
import { getToken, Token, Doctor } from "@/lib/api";
import { playHospitalChime } from "@/lib/sound";
import {
  isNotificationSupported,
  isVibrationSupported,
  registerServiceWorker,
  requestNotificationPermission,
  triggerDeviceNotification,
  triggerDeviceVibration,
} from "@/lib/notifications";

export default function PatientTrackerPage() {
  const params = useParams();
  const tokenId = params?.id as string;

  const [token, setToken] = useState<Token | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Notification & Haptic state
  const [hasPermission, setHasPermission] = useState(false);
  const [testPingFired, setTestPingFired] = useState(false);
  const [hasNotifiedCalled, setHasNotifiedCalled] = useState(false);
  const [hasNotifiedApproaching, setHasNotifiedApproaching] = useState(false);
  const [lastNotifiedDelay, setLastNotifiedDelay] = useState<number>(0);

  useEffect(() => {
    registerServiceWorker();
    if (isNotificationSupported() && Notification.permission === "granted") {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    if (!tokenId) return;
    loadTokenData();
    const interval = setInterval(loadTokenData, 3500);
    window.addEventListener("opd-refresh", loadTokenData);
    return () => {
      clearInterval(interval);
      window.removeEventListener("opd-refresh", loadTokenData);
    };
  }, [tokenId]);

  async function loadTokenData() {
    try {
      const res = await getToken(tokenId);
      const currToken = res.token;
      const currDoctor = res.doctor;

      setToken(currToken);
      setDoctor(currDoctor);
      setLastUpdated(new Date().toLocaleTimeString());

      // 1. Reactive Native Phone Alert: When Token is CALLED
      if (currToken.status === "IN_CONSULTATION" && !hasNotifiedCalled) {
        setHasNotifiedCalled(true);
        playHospitalChime();
        triggerDeviceNotification({
          title: "🔔 YOUR TURN NOW!",
          body: `Token ${currToken.token_number}: ${currDoctor?.name || "Doctor"} is waiting for you in Room ${currToken.room_number}. Please proceed inside immediately!`,
          tag: "turn-called",
          vibrate: [400, 150, 400, 150, 800],
        });
      }

      // 2. Reactive Native Phone Alert: When Top 3 in line (PROXIMITY)
      if (
        (currToken.status === "APPROACHING" || (currToken.queue_position > 0 && currToken.queue_position <= 3)) &&
        !hasNotifiedApproaching &&
        currToken.status !== "IN_CONSULTATION"
      ) {
        setHasNotifiedApproaching(true);
        triggerDeviceNotification({
          title: "📍 You're Almost Up (3 Patients Ahead)!",
          body: `Token ${currToken.token_number}: You are #${currToken.queue_position} in line for ${currDoctor?.name || "Doctor"}. Please head towards Room ${currToken.room_number}.`,
          tag: "proximity-alert",
          vibrate: [250, 100, 250],
        });
      }

      // 3. Reactive Native Phone Alert: Doctor Delay
      if (currDoctor && currDoctor.delay_minutes > 0 && currDoctor.delay_minutes !== lastNotifiedDelay) {
        setLastNotifiedDelay(currDoctor.delay_minutes);
        triggerDeviceNotification({
          title: `⏱️ Doctor Delay Notice (+${currDoctor.delay_minutes}m)`,
          body: `${currDoctor.name} has a delay: ${currDoctor.delay_reason || "Attending emergency"}. Your new ETA is ${currToken.estimated_start_time}.`,
          tag: "doctor-delay",
          vibrate: [200, 100, 200],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableNativeAlerts() {
    const granted = await requestNotificationPermission();
    if (granted) {
      setHasPermission(true);
      // Trigger confirmation haptic pulse and test notification
      triggerDeviceVibration([150, 80, 150]);
      triggerDeviceNotification({
        title: "✅ Phone Alerts & Vibration Active!",
        body: `You will receive a vibration and sound notification when your token ${token?.token_number || ""} approaches!`,
        tag: "alerts-enabled",
      });
    }
  }

  function handleTestVibrationPing() {
    setTestPingFired(true);
    setTimeout(() => setTestPingFired(false), 2500);

    triggerDeviceVibration([200, 100, 200, 100, 400]);
    triggerDeviceNotification({
      title: "📳 Phone Vibration Test Successful!",
      body: "Your phone is connected to the Smart OPD Live Queue Engine.",
      tag: "test-vibration",
    });
  }

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Connecting to Live Queue Engine...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Token Not Found</h2>
        <p className="text-sm text-slate-600">Please verify your token number or scan the QR code again.</p>
      </div>
    );
  }

  const isCalled = token.status === "IN_CONSULTATION";
  const isApproaching = token.status === "APPROACHING" || (token.queue_position > 0 && token.queue_position <= 3);
  const isCompleted = token.status === "COMPLETED";
  const isMissed = token.status === "MISSED";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Live sync pill */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-emerald-700">Live Virtual Queue Connected</span>
        </div>
        <span>Synced: {lastUpdated}</span>
      </div>

      {/* PWA Native Device Notification & Haptic Vibration Banner (100% Free) */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white border border-emerald-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Native Phone Alerts & Haptics
            </span>
          </div>
          {hasPermission ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 flex items-center space-x-1">
              <Check className="w-3 h-3" />
              <span>Active on Phone</span>
            </span>
          ) : (
            <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
              Tap to Enable
            </span>
          )}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {hasPermission
            ? "Your phone will vibrate and chime in your pocket when your turn nears or if the doctor has an emergency delay."
            : "Tap below to allow native phone notifications and vibrations so you can relax in the hospital cafeteria or garden without watching the screen."}
        </p>

        <div className="flex items-center gap-2 pt-1">
          {!hasPermission ? (
            <button
              onClick={handleEnableNativeAlerts}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5"
            >
              <Bell className="w-4 h-4" />
              <span>Allow Phone Alerts & Vibration</span>
            </button>
          ) : (
            <button
              onClick={handleTestVibrationPing}
              className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 font-bold text-xs border border-white/10 transition flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{testPingFired ? "Vibrating Now! 📳" : "Test Phone Vibration"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Patient Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xl space-y-6 relative overflow-hidden">
        {/* Urgent / Emergency preemption banner if active */}
        {token.patient.priority === "EMERGENCY" && (
          <div className="bg-rose-500 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center justify-center space-x-1.5 shadow-md">
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency Triage Priority (Preempted to Front)</span>
          </div>
        )}

        {/* Doctor Delay Alert Banner */}
        {doctor && doctor.delay_minutes > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 animate-in fade-in">
            <div className="flex items-center space-x-1.5 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Doctor Schedule Delay: +{doctor.delay_minutes} mins</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              {doctor.delay_reason || "Doctor attended emergency case."} Your ETA has been dynamically adjusted.
            </p>
          </div>
        )}

        {/* Status Callouts */}
        {isCalled ? (
          <div className="p-5 rounded-2xl bg-emerald-600 text-white text-center space-y-2 animate-bounce shadow-lg shadow-emerald-600/30">
            <div className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full inline-block">
              🔔 YOUR TURN NOW!
            </div>
            <h3 className="text-3xl font-black">Proceed to Room {token.room_number}</h3>
            <p className="text-xs text-emerald-100">{token.doctor_name} is waiting for you now</p>
          </div>
        ) : isMissed ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2">
            <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Turn Skipped / Marked Missed</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Your token was called but you were not present in Room {token.room_number}. Please approach the OPD nursing desk or Room {token.room_number} immediately to be reinstated.
            </p>
          </div>
        ) : isCompleted ? (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Consultation Completed</span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Your consultation with {token.doctor_name} has concluded. Please collect any prescribed medicines at the OPD Central Pharmacy (Room 101).
            </p>
          </div>
        ) : isApproaching ? (
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-blue-800">Proximity Alert Active</div>
              <p className="text-xs text-blue-700">You are in the top 3! Please make your way to Waiting Area outside Room {token.room_number}.</p>
            </div>
          </div>
        ) : null}

        {/* Token Header */}
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Your Digital Token</span>
            <div className="text-4xl font-black text-slate-900 tracking-tight mt-0.5 font-mono">
              {token.token_number}
            </div>
            <p className="text-xs text-slate-700 mt-1">
              Patient: <span className="font-semibold text-slate-900">{token.patient.name}</span> ({token.patient.age}y)
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Room</span>
            <div className="text-2xl font-extrabold text-emerald-600">
              {token.room_number}
            </div>
            <p className="text-xs text-slate-700 mt-1">{token.department_name}</p>
          </div>
        </div>

        {/* Dynamic Estimated Wait Time Display */}
        {!isCompleted && !isCalled && !isMissed && (
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-600 font-medium">Estimated Wait Time</span>
                <div className="text-3xl font-extrabold text-emerald-600">
                  ~{token.estimated_wait_minutes} <span className="text-base font-bold text-slate-700">mins</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-600 font-medium">Estimated Slot</span>
                <div className="text-lg font-bold text-slate-800">
                  {token.estimated_start_time || "Calculating..."}
                </div>
              </div>
            </div>

            {/* Queue Position Progress Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  Queue Position: <span className="text-emerald-700 font-bold">#{token.queue_position}</span>
                </span>
                <span className="text-slate-600">
                  {Math.max(0, token.queue_position - 1)} patient(s) ahead
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(15, Math.min(100, 100 - (token.queue_position - 1) * 20))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Doctor Details */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-600 font-medium">Consulting Physician</div>
              <div className="text-sm font-bold text-slate-900">{token.doctor_name}</div>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
            {doctor?.status === "IN_CONSULTATION" ? "Active" : doctor?.status || "Ready"}
          </span>
        </div>
      </div>

      {/* Relax Nearby - Hospital Amenities Guide */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
            <Coffee className="w-4 h-4 text-amber-600" />
            <span>Wait Comfortably Nearby</span>
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Don&apos;t crowd the hallway. Enjoy these amenities; your phone will vibrate when your turn nears:
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center space-x-1">
              <span>☕ Hospital Cafe</span>
            </div>
            <p className="text-slate-600 text-[11px]">Ground Floor, 2 min walk</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center space-x-1">
              <span>🌿 Garden Courtyard</span>
            </div>
            <p className="text-slate-600 text-[11px]">Level 1 Open Air Area</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center space-x-1">
              <span>💊 OPD Pharmacy</span>
            </div>
            <p className="text-slate-600 text-[11px]">Room 101, Ground Floor</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center space-x-1">
              <span>🚻 Restrooms & Water</span>
            </div>
            <p className="text-slate-600 text-[11px]">Next to Room 105</p>
          </div>
        </div>
      </div>
    </div>
  );
}

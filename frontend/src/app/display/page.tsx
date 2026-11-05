"use client";

import { useEffect, useState } from "react";
import {
  Tv,
  Volume2,
  VolumeX,
  Clock,
  Activity,
  AlertTriangle,
  Stethoscope,
  Users,
  Bell,
  Sparkles,
} from "lucide-react";
import { getDoctors, getTokens, Doctor, Token } from "@/lib/api";
import { playHospitalChime, speakAnnouncement } from "@/lib/sound";

export default function WaitingRoomDisplayPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [lastCalledMap, setLastCalledMap] = useState<Record<string, string>>({});

  useEffect(() => {
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    loadData();
    const pollTimer = setInterval(loadData, 3000);
    return () => clearInterval(pollTimer);
  }, []);

  function updateClock() {
    const d = new Date();
    setCurrentTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }

  async function loadData() {
    try {
      const [docs, toks] = await Promise.all([getDoctors(), getTokens()]);
      setDoctors(docs);
      setTokens(toks);

      // Check if a doctor has called a new token
      docs.forEach((doc) => {
        if (doc.current_token_id && doc.current_token_id !== lastCalledMap[doc.id]) {
          setLastCalledMap((prev) => ({ ...prev, [doc.id]: doc.current_token_id! }));
          const currentTok = toks.find((t) => t.id === doc.current_token_id);
          if (currentTok && audioEnabled) {
            playHospitalChime();
            setTimeout(() => {
              speakAnnouncement(`Token ${currentTok.token_number}, please proceed to Room ${doc.room_number}`);
            }, 600);
          }
        }
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-400">
                City Care Multispeciality Hospital
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              OPD Live Token Board
            </h1>
          </div>
        </div>

        {/* Right side: Clock & Audio Toggle */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              audioEnabled
                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border-slate-700 bg-slate-900 text-slate-400"
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>Voice Chime: {audioEnabled ? "ON" : "MUTED"}</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 font-mono text-xl sm:text-2xl font-bold text-emerald-400">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Main OPD Consultation Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 my-6 flex-1">
        {doctors.map((doc) => {
          const activeTok = tokens.find((t) => t.id === doc.current_token_id);
          const waitingToks = tokens
            .filter((t) => t.doctor_id === doc.id && (t.status === "WAITING" || t.status === "APPROACHING"))
            .sort((a, b) => a.queue_position - b.queue_position);

          const hasDelay = doc.delay_minutes > 0;

          return (
            <div
              key={doc.id}
              className={`rounded-3xl p-6 border flex flex-col justify-between transition-all duration-300 ${
                activeTok
                  ? "bg-slate-900/90 border-slate-800 shadow-xl"
                  : "bg-slate-900/40 border-slate-800/60"
              }`}
            >
              <div className="space-y-4">
                {/* Doctor Room & Dept Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
                      {doc.department_name}
                    </span>
                    <h3 className="text-base font-bold text-white">{doc.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Room</span>
                    <span className="text-xl font-extrabold text-emerald-400">{doc.room_number}</span>
                  </div>
                </div>

                {/* Delay Notice Banner if Doctor is delayed */}
                {hasDelay && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="leading-tight">
                      Delay +{doc.delay_minutes}m: {doc.delay_reason || "Attending emergency"}
                    </span>
                  </div>
                )}

                {/* Now Serving Big Box */}
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    NOW SERVING
                  </span>
                  <div className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tight">
                    {activeTok ? activeTok.token_number : "READY"}
                  </div>
                  {activeTok && (
                    <p className="text-xs text-slate-300 font-medium truncate pt-1">
                      {activeTok.patient.name}
                    </p>
                  )}
                </div>

                {/* Next in Line */}
                <div className="space-y-2">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                    Next in Line:
                  </span>
                  {waitingToks.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No patients in queue</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {waitingToks.slice(0, 4).map((wt) => (
                        <div
                          key={wt.id}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center space-x-1.5 ${
                            wt.patient.priority === "EMERGENCY"
                              ? "bg-rose-950 border-rose-500/40 text-rose-300 animate-pulse"
                              : wt.queue_position <= 3
                              ? "bg-blue-950 border-blue-500/40 text-blue-300"
                              : "bg-slate-900 border-slate-800 text-slate-300"
                          }`}
                        >
                          <span>{wt.token_number}</span>
                        </div>
                      ))}
                      {waitingToks.length > 4 && (
                        <span className="text-xs text-slate-500 self-center">
                          +{waitingToks.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Avg: {doc.avg_consultation_minutes}m</span>
                <span className="font-semibold text-emerald-400">
                  {waitingToks.length} Waiting
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Scrolling News Ticker */}
      <div className="bg-slate-900 rounded-2xl px-5 py-3 border border-slate-800 flex items-center space-x-4 overflow-hidden">
        <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 shrink-0">
          <Bell className="w-4 h-4 animate-bounce" />
          <span>Notice:</span>
        </div>
        <div className="text-xs text-slate-300 truncate">
          Scan your digital token QR code to track your queue in real time on your phone. You can wait comfortably in the hospital cafe or courtyard. Automated WhatsApp/SMS alerts are dispatched when 3 patients remain ahead.
        </div>
      </div>
    </div>
  );
}


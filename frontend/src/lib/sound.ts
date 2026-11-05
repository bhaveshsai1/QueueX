// Synthesizes a clean, pleasant hospital chime using the Web Audio API without needing external mp3 files.
export function playHospitalChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    const notes = [587.33, 880.0]; // D5, A5 (classic hospital two-tone chime)
    const startTime = ctx.currentTime + 0.05;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime + index * 0.35);

      gain.gain.setValueAtTime(0, startTime + index * 0.35);
      gain.gain.linearRampToValueAtTime(0.3, startTime + index * 0.35 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + index * 0.35 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime + index * 0.35);
      osc.stop(startTime + index * 0.35 + 0.85);
    });

    // Also speak token if SpeechSynthesis is available
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch (e) {
    console.log("Audio chime error:", e);
  }
}

export function speakAnnouncement(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.log("Speech error:", e);
  }
}


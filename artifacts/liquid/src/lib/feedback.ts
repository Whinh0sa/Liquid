// ─── Liquid — Cross-Device Feedback & Micro-Haptics ─────────────────────────
//
// Provides subtle tactile Web Audio API synthesis (0 external asset load)
// and navigator.vibrate() hardware triggers for high-intent financial actions.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type FeedbackType = "subtle" | "confirm" | "success" | "warning";

/**
 * Synthesizes crisp, low-latency micro-audio blips.
 */
export function playFeedbackSound(type: FeedbackType = "subtle") {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case "subtle":
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
        break;

      case "confirm":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.05); // E5
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      case "success":
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
        break;

      case "warning":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
    }
  } catch {
    // Audio synthesis failure must never block UX execution
  }
}

/**
 * Triggers physical vibration on supported mobile devices.
 */
export function triggerHaptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Graceful fallback
  }
}

/**
 * Dual dispatch helper combining audio cue and haptic vibration.
 */
export function triggerActionFeedback(type: FeedbackType = "confirm") {
  playFeedbackSound(type);
  if (type === "success") triggerHaptic([15, 40, 20]);
  else if (type === "warning") triggerHaptic([30, 30]);
  else triggerHaptic(12);
}

"use client";

/**
 * Tiny WebAudio synth for footsteps, relic chime, Cold heartbeat and a low tone when you fall.
 * Off by default. The choice is remembered in localStorage. No audio files are loaded.
 */
let ctx: AudioContext | null = null;
let enabled = false;
const KEY = "whiteout:sound";

export function soundEnabled(): boolean {
  return enabled;
}

export function loadSoundPref(): boolean {
  try {
    enabled = localStorage.getItem(KEY) === "on";
  } catch {
    enabled = false;
  }
  return enabled;
}

export function setSound(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage can be unavailable */
  }
  if (on) void audio()?.resume();
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, slideTo?: number): void {
  const a = audio();
  if (!enabled || !a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, gain: number): void {
  const a = audio();
  if (!enabled || !a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 900;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  step: () => noise(0.09, 0.08),
  relic: () => {
    tone(880, 0.18, "square", 0.05);
    tone(1320, 0.28, "square", 0.05, 0.09);
  },
  cold: () => {
    tone(70, 0.14, "sine", 0.12);
    tone(70, 0.14, "sine", 0.1, 0.2);
  },
  fell: () => tone(220, 0.6, "triangle", 0.08, 0, 70),
  finish: () => {
    tone(523, 0.2, "square", 0.04);
    tone(659, 0.2, "square", 0.04, 0.12);
    tone(784, 0.34, "square", 0.04, 0.24);
  },
};

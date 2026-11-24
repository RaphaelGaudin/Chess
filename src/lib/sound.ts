import { store } from './storage';

// Synthesized sounds (no audio files needed).
let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function knock(freq: number, dur: number, gain = 0.5, when = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
}

function tone(freq: number, dur: number, when = 0, gain = 0.15) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  o.type = 'sine';
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur);
}

export type SoundKind = 'move' | 'capture' | 'check' | 'castle' | 'end' | 'success' | 'error' | 'start';

export function play(kind: SoundKind) {
  if (!store.settings().sound) return;
  try {
    switch (kind) {
      case 'move': knock(1800, 0.07, 0.9); break;
      case 'capture': knock(1200, 0.09, 1.2); knock(2400, 0.05, 0.6, 0.03); break;
      case 'castle': knock(1800, 0.06, 0.9); knock(1600, 0.06, 0.9, 0.09); break;
      case 'check': knock(1500, 0.08, 1); tone(880, 0.15, 0.02, 0.08); break;
      case 'end': tone(523, 0.2); tone(659, 0.2, 0.15); tone(784, 0.35, 0.3); break;
      case 'start': tone(659, 0.12); tone(988, 0.2, 0.1); break;
      case 'success': tone(784, 0.12); tone(1175, 0.25, 0.1); break;
      case 'error': tone(220, 0.25, 0, 0.12); break;
    }
  } catch {
    /* ignore */
  }
}

export function moveSound(m: { captured?: string; san: string }) {
  if (m.san.includes('#')) play('end');
  else if (m.san.includes('+')) play('check');
  else if (m.san.startsWith('O-O')) play('castle');
  else if (m.captured) play('capture');
  else play('move');
}

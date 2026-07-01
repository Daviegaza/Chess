// ── House of Kingfall — Web Audio SFX engine ─────────────────────────────────
// Synthesized on the fly — no external assets. Shared AudioContext, created
// lazily on first user gesture (avoids autoplay blocking).

type OscType = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

interface Tone {
  freq: number;
  duration: number;
  type?: OscType;
  gain?: number;
  attack?: number;
  release?: number;
  detune?: number;
  delay?: number;
  slideTo?: number;
}

function playTone(t: Tone) {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !master) return;

  const t0 = c.currentTime + (t.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = t.type ?? 'sine';
  osc.frequency.setValueAtTime(t.freq, t0);
  if (t.detune) osc.detune.setValueAtTime(t.detune, t0);
  if (t.slideTo) osc.frequency.exponentialRampToValueAtTime(t.slideTo, t0 + t.duration);

  const peak = t.gain ?? 0.4;
  const attack = t.attack ?? 0.005;
  const release = t.release ?? 0.06;

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t.duration + release);

  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + t.duration + release + 0.02);
}

function playNoise(duration: number, gain = 0.3, hp = 400, delay = 0) {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !master) return;

  const t0 = c.currentTime + delay;
  const bufSize = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);

  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

export const sfx = {
  setEnabled(v: boolean) { enabled = v; },
  setVolume(v: number) {
    if (master) master.gain.value = Math.max(0, Math.min(1, v));
  },
  isEnabled() { return enabled; },

  move() {
    playTone({ freq: 240, duration: 0.05, type: 'triangle', gain: 0.35, slideTo: 140 });
    playNoise(0.06, 0.12, 800);
  },

  capture() {
    playTone({ freq: 180, duration: 0.06, type: 'square', gain: 0.28, slideTo: 90 });
    playNoise(0.10, 0.20, 500);
    playTone({ freq: 380, duration: 0.05, type: 'triangle', gain: 0.20, delay: 0.02, slideTo: 200 });
  },

  check() {
    playTone({ freq: 880,  duration: 0.30, type: 'sine',     gain: 0.30, release: 0.35 });
    playTone({ freq: 1320, duration: 0.30, type: 'triangle', gain: 0.20, release: 0.35, delay: 0.01 });
    playTone({ freq: 1760, duration: 0.20, type: 'sine',     gain: 0.12, release: 0.25, delay: 0.03 });
  },

  select() {
    playTone({ freq: 660, duration: 0.03, type: 'sine', gain: 0.16, release: 0.04 });
  },

  click() {
    playTone({ freq: 520, duration: 0.03, type: 'triangle', gain: 0.20, release: 0.04, slideTo: 400 });
  },

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((f, i) => {
      playTone({ freq: f,     duration: 0.18, type: 'triangle', gain: 0.28, delay: i * 0.10, release: 0.20 });
      playTone({ freq: f * 2, duration: 0.18, type: 'sine',     gain: 0.10, delay: i * 0.10, release: 0.20 });
    });
    playTone({ freq: 1046.50, duration: 0.6, type: 'triangle', gain: 0.30, delay: 0.45, release: 0.6 });
  },

  defeat() {
    playTone({ freq: 220, duration: 0.28, type: 'sawtooth', gain: 0.22, delay: 0,    slideTo: 165, release: 0.20 });
    playTone({ freq: 175, duration: 0.28, type: 'sawtooth', gain: 0.22, delay: 0.20, slideTo: 130, release: 0.20 });
    playTone({ freq: 138, duration: 0.50, type: 'sawtooth', gain: 0.22, delay: 0.42, slideTo: 98,  release: 0.50 });
  },

  draw() {
    playTone({ freq: 440, duration: 0.20, type: 'sine', gain: 0.25, release: 0.30 });
    playTone({ freq: 523, duration: 0.20, type: 'sine', gain: 0.25, delay: 0.10, release: 0.30 });
  },

  gameStart() {
    playTone({ freq: 392, duration: 0.10, type: 'triangle', gain: 0.28, release: 0.10 });
    playTone({ freq: 523, duration: 0.10, type: 'triangle', gain: 0.28, delay: 0.08, release: 0.10 });
    playTone({ freq: 784, duration: 0.20, type: 'triangle', gain: 0.30, delay: 0.16, release: 0.20 });
  },

  moveOpponent() {
    playTone({ freq: 180, duration: 0.05, type: 'triangle', gain: 0.32, slideTo: 100 });
    playNoise(0.06, 0.10, 700);
  },

  castle() {
    playTone({ freq: 220, duration: 0.05, type: 'triangle', gain: 0.30, slideTo: 130 });
    playNoise(0.05, 0.14, 700);
    playTone({ freq: 200, duration: 0.05, type: 'triangle', gain: 0.30, delay: 0.09, slideTo: 120 });
    playNoise(0.05, 0.14, 700, 0.09);
  },

  promote() {
    playTone({ freq: 523,  duration: 0.10, type: 'sine',     gain: 0.24, release: 0.15 });
    playTone({ freq: 784,  duration: 0.10, type: 'triangle', gain: 0.22, release: 0.15, delay: 0.06 });
    playTone({ freq: 1046, duration: 0.16, type: 'sine',     gain: 0.20, release: 0.20, delay: 0.12 });
    playTone({ freq: 1568, duration: 0.20, type: 'triangle', gain: 0.14, release: 0.25, delay: 0.18 });
  },

  illegal() {
    playTone({ freq: 140, duration: 0.10, type: 'sawtooth', gain: 0.20, release: 0.06 });
    playNoise(0.08, 0.15, 300);
  },

  lowTime() {
    playTone({ freq: 1200, duration: 0.04, type: 'square', gain: 0.16, release: 0.03 });
  },

  pickup() {
    playTone({ freq: 720, duration: 0.02, type: 'sine', gain: 0.12, release: 0.03 });
  },
};

if (typeof window !== 'undefined') {
  const warm = () => {
    getCtx();
    window.removeEventListener('pointerdown', warm);
    window.removeEventListener('keydown', warm);
  };
  window.addEventListener('pointerdown', warm, { once: true });
  window.addEventListener('keydown', warm, { once: true });
}

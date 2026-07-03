// Kingfall Chess — enthusiast-grade Web Audio SFX engine.
// Layered synthesis: heavy wooden piece impacts, brass tension for check,
// full-hall cinematic fanfare for victory. No external assets.

type OscType = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let dry: GainNode | null = null;
let wet: GainNode | null = null;
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
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 22;
      comp.ratio.value = 3.2;
      comp.attack.value = 0.003;
      comp.release.value = 0.14;
      dry = ctx.createGain();
      dry.gain.value = 0.95;
      wet = ctx.createGain();
      wet.gain.value = 0.30;
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 2.4);
      const ir = ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / len;
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (0.7 + 0.3 * Math.sin(t * 12));
        }
      }
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      dry.connect(comp);
      wet.connect(conv).connect(comp);
      comp.connect(master).connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function route(node: AudioNode, wetAmt = 1) {
  if (!dry || !wet) return;
  node.connect(dry);
  if (wetAmt > 0) {
    if (wetAmt === 1) node.connect(wet);
    else {
      const c = getCtx();
      if (!c) return;
      const send = c.createGain();
      send.gain.value = wetAmt;
      node.connect(send).connect(wet);
    }
  }
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
  wet?: number;
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
  route(g, t.wet ?? 1);
  osc.start(t0);
  osc.stop(t0 + t.duration + release + 0.02);
}

function playNoise(duration: number, gain = 0.3, filterFreq = 400, delay = 0,
                   filterType: BiquadFilterType = 'highpass', q = 0.7, wetAmt = 1) {
  if (!enabled) return;
  const c = getCtx();
  if (!c || !master) return;

  const t0 = c.currentTime + delay;
  const bufSize = Math.max(1, Math.floor(c.sampleRate * duration));
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);

  const src = c.createBufferSource();
  src.buffer = buf;

  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  filter.Q.value = q;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  src.connect(filter).connect(g);
  route(g, wetAmt);
  src.start(t0);
  src.stop(t0 + duration + 0.05);
}

function kick(gain = 0.55, delay = 0) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.12);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  osc.connect(g);
  route(g, 0.35);
  osc.start(t0);
  osc.stop(t0 + 0.30);
  playNoise(0.008, gain * 0.35, 3200, delay, 'highpass', 1, 0.2);
}

function snare(gain = 0.35, delay = 0) {
  playNoise(0.14, gain, 5200, delay, 'lowpass', 0.7, 0.6);
  playTone({ freq: 210, duration: 0.09, type: 'triangle', gain: gain * 0.4, delay, slideTo: 130, wet: 0.3 });
}

function wood(freq = 620, gain = 0.4, delay = 0, wetAmt = 0.35) {
  playTone({ freq: freq * 0.55, duration: 0.11, type: 'sine', gain: gain * 0.55, delay, slideTo: freq * 0.35, wet: wetAmt });
  playTone({ freq: freq * 1.6, duration: 0.05, type: 'triangle', gain, delay, slideTo: freq * 0.7, release: 0.04, wet: wetAmt });
  playNoise(0.012, gain * 0.3, 4200, delay, 'highpass', 1, 0.15);
}

function brass(freqs: number[], duration = 0.65, gain = 0.14, delay = 0, wetAmt = 0.9) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 3;
  filter.frequency.setValueAtTime(500, t0);
  filter.frequency.exponentialRampToValueAtTime(4200, t0 + duration * 0.35);
  filter.frequency.exponentialRampToValueAtTime(1800, t0 + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.06);
  g.gain.linearRampToValueAtTime(gain * 0.85, t0 + duration * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  freqs.forEach(f => {
    [-9, 0, 9].forEach(det => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t0);
      o.detune.setValueAtTime(det, t0);
      o.connect(filter);
      o.start(t0);
      o.stop(t0 + duration + 0.05);
    });
  });
  filter.connect(g);
  route(g, wetAmt);
}

function choir(freqs: number[], duration = 1.4, gain = 0.09, delay = 0) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.35);
  g.gain.linearRampToValueAtTime(gain * 0.75, t0 + duration * 0.75);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  freqs.forEach(f => {
    [-7, -3, 3, 7].forEach(det => {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t0);
      o.detune.setValueAtTime(det, t0);
      o.connect(filter);
      o.start(t0);
      o.stop(t0 + duration + 0.05);
    });
  });
  filter.connect(g);
  route(g, 1.1);
}

function bell(freq: number, duration = 0.6, gain = 0.14, delay = 0) {
  const partials = [1, 2.01, 3.03, 4.15, 5.42];
  const weights = [1.0, 0.6, 0.38, 0.24, 0.15];
  partials.forEach((mul, i) => {
    playTone({ freq: freq * mul, duration: duration * (1 - i * 0.11), type: 'sine', gain: gain * weights[i], delay, release: 0.1 });
  });
}

function timpani(freq = 78, duration = 0.5, gain = 0.35, delay = 0) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  playTone({ freq, duration, type: 'sine', gain: gain * 0.8, delay, slideTo: freq * 0.9, wet: 0.6, release: 0.2 });
  const bufSize = Math.max(1, Math.floor(c.sampleRate * duration));
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 4;
  filter.frequency.setValueAtTime(240, t0);
  filter.frequency.exponentialRampToValueAtTime(90, t0 + duration);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain * 0.5, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(g);
  route(g, 0.7);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

export const sfx = {
  setEnabled(v: boolean) { enabled = v; },
  setVolume(v: number) {
    if (master) master.gain.value = Math.max(0, Math.min(1, v));
  },
  isEnabled() { return enabled; },

  move() {
    kick(0.28, 0);
    wood(560, 0.42, 0, 0.28);
    playNoise(0.05, 0.06, 2200, 0, 'bandpass', 4, 0.2);
  },

  moveOpponent() {
    kick(0.32, 0);
    wood(420, 0.44, 0, 0.32);
    playNoise(0.06, 0.07, 1800, 0, 'bandpass', 4, 0.25);
  },

  capture() {
    kick(0.55, 0);
    wood(430, 0.5, 0.005, 0.4);
    snare(0.30, 0.02);
    playNoise(0.22, 0.16, 850, 0.02, 'bandpass', 3, 0.5);
    playTone({ freq: 1600, duration: 0.16, type: 'sine', gain: 0.14, delay: 0.06, release: 0.10 });
    playTone({ freq: 950,  duration: 0.14, type: 'sine', gain: 0.12, delay: 0.02, release: 0.10 });
  },

  check() {
    timpani(78, 0.5, 0.4, 0);
    brass([220, 311.13, 440], 0.9, 0.17, 0.02, 0.9);
    playTone({ freq: 880,  duration: 0.35, type: 'sine',     gain: 0.28, delay: 0.05, release: 0.30 });
    playTone({ freq: 1320, duration: 0.35, type: 'triangle', gain: 0.20, delay: 0.06, release: 0.30 });
    playTone({ freq: 1760, duration: 0.25, type: 'sine',     gain: 0.14, delay: 0.08, release: 0.25 });
    playNoise(0.4, 0.05, 3200, 0.02, 'bandpass', 2, 0.7);
  },

  select() {
    playTone({ freq: 780, duration: 0.05, type: 'sine', gain: 0.18, release: 0.05 });
    playTone({ freq: 1170, duration: 0.04, type: 'sine', gain: 0.09, delay: 0.015, release: 0.04 });
  },

  click() {
    playTone({ freq: 520, duration: 0.03, type: 'triangle', gain: 0.22, release: 0.04, slideTo: 400 });
    playTone({ freq: 1600, duration: 0.02, type: 'sine', gain: 0.09, release: 0.03 });
  },

  victory() {
    kick(0.6, 0);
    snare(0.35, 0.18);
    kick(0.55, 0.36);
    snare(0.35, 0.54);
    brass([261.63, 329.63, 392, 523.25], 1.1, 0.19, 0);
    brass([523.25, 659.25, 783.99], 0.9, 0.13, 0.55);
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      playTone({ freq: f,     duration: 0.20, type: 'triangle', gain: 0.30, delay: 0.15 + i * 0.10, release: 0.22 });
      playTone({ freq: f * 2, duration: 0.20, type: 'sine',     gain: 0.11, delay: 0.15 + i * 0.10, release: 0.22 });
    });
    choir([261.63, 329.63, 392, 523.25], 2.0, 0.11, 0.15);
    bell(1568, 1.4, 0.14, 0.65);
    bell(2093, 1.2, 0.11, 0.85);
  },

  defeat() {
    timpani(65, 0.6, 0.45, 0);
    kick(0.4, 0);
    brass([146.83, 174.61, 220], 1.1, 0.17, 0);
    playTone({ freq: 220, duration: 0.32, type: 'sawtooth', gain: 0.22, delay: 0.2,  slideTo: 165, release: 0.22, wet: 0.8 });
    playTone({ freq: 175, duration: 0.34, type: 'sawtooth', gain: 0.22, delay: 0.44, slideTo: 130, release: 0.22, wet: 0.8 });
    playTone({ freq: 138, duration: 0.55, type: 'sawtooth', gain: 0.22, delay: 0.68, slideTo: 98,  release: 0.5,  wet: 0.8 });
    playNoise(0.35, 0.06, 260, 0.05, 'lowpass', 1, 0.6);
  },

  draw() {
    playTone({ freq: 440, duration: 0.25, type: 'sine', gain: 0.28, release: 0.3 });
    playTone({ freq: 523, duration: 0.25, type: 'sine', gain: 0.25, delay: 0.12, release: 0.3 });
    playTone({ freq: 659, duration: 0.35, type: 'sine', gain: 0.22, delay: 0.24, release: 0.4 });
    choir([220, 261.63, 329.63], 1.6, 0.07, 0);
  },

  gameStart() {
    brass([392, 523.25], 0.55, 0.14, 0);
    playTone({ freq: 392, duration: 0.10, type: 'triangle', gain: 0.28, release: 0.10 });
    playTone({ freq: 523, duration: 0.10, type: 'triangle', gain: 0.28, delay: 0.08, release: 0.10 });
    playTone({ freq: 784, duration: 0.24, type: 'triangle', gain: 0.32, delay: 0.16, release: 0.24 });
    bell(1568, 0.7, 0.09, 0.2);
  },

  castle() {
    kick(0.4, 0);
    wood(480, 0.42, 0, 0.35);
    brass([293.66, 392, 523.25], 0.5, 0.11, 0.02, 0.5);
    kick(0.4, 0.11);
    wood(430, 0.42, 0.11, 0.35);
    playNoise(0.05, 0.10, 2000, 0.05, 'bandpass', 3, 0.3);
  },

  promote() {
    kick(0.35, 0);
    const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    scale.forEach((f, i) => {
      playTone({ freq: f,     duration: 0.12, type: 'triangle', gain: 0.24, delay: i * 0.06, release: 0.14 });
      playTone({ freq: f * 2, duration: 0.10, type: 'sine',     gain: 0.09, delay: i * 0.06, release: 0.12 });
    });
    brass([261.63, 329.63, 392, 523.25], 0.9, 0.14, 0.06);
    choir([392, 523.25, 659.25], 1.6, 0.10, 0.08);
    bell(2093, 1.2, 0.13, 0.3);
  },

  illegal() {
    playTone({ freq: 140, duration: 0.10, type: 'sawtooth', gain: 0.24, release: 0.08, wet: 0.4 });
    playTone({ freq: 105, duration: 0.14, type: 'square',   gain: 0.14, delay: 0.02, release: 0.08, wet: 0.4 });
    playNoise(0.10, 0.14, 280, 0, 'lowpass', 1, 0.4);
  },

  lowTime() {
    playTone({ freq: 1400, duration: 0.03, type: 'square', gain: 0.18, release: 0.03 });
    playTone({ freq: 2200, duration: 0.02, type: 'sine',   gain: 0.10, release: 0.02, delay: 0.005 });
  },

  pickup() {
    playTone({ freq: 780, duration: 0.02, type: 'sine',     gain: 0.14, release: 0.03 });
    playTone({ freq: 520, duration: 0.03, type: 'triangle', gain: 0.10, release: 0.03, wet: 0.3 });
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

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'chess_sound_v2';

export type SoundName =
  | 'chipClick' | 'chipDrop' | 'chipClink' | 'hover' | 'select'
  | 'move' | 'capture' | 'kingMe' | 'nearWin'
  | 'win' | 'lose' | 'draw'
  | 'jackpot' | 'jackpotMini' | 'jackpotMinor' | 'jackpotMajor' | 'jackpotGrand'
  | 'coin' | 'coinShower' | 'error' | 'missionComplete' | 'skinUnlock' | 'levelUp'
  | 'fanfare';

function loadMuted(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

export interface UseSoundFXReturn {
  muted: boolean;
  toggleMute: () => void;
  play: (name: SoundName) => void;
  startAmbient: () => void;
  stopAmbient: () => void;
  ambientOn: boolean;
  toggleAmbient: () => void;
}

export function useSoundFX(): UseSoundFXReturn {
  const [muted, setMuted] = useState<boolean>(loadMuted);
  const [ambientOn, setAmbientOn] = useState<boolean>(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const ambientNodesRef = useRef<{ osc: OscillatorNode; gain: GainNode; lfo: OscillatorNode; lfoGain: GainNode }[] | null>(null);
  const ambientTimerRef = useRef<number | null>(null);
  const busRef = useRef<{ dry: GainNode; wet: GainNode; master: GainNode } | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {});
    }
    return ctxRef.current;
  }, []);

  const ensureBus = useCallback((ctx: AudioContext) => {
    if (busRef.current) return busRef.current;
    const master = ctx.createGain();
    master.gain.value = 1.35;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 22;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.003;
    comp.release.value = 0.14;
    const dry = ctx.createGain();
    dry.gain.value = 0.95;
    const wet = ctx.createGain();
    wet.gain.value = 0.36;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 2.8);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (0.65 + 0.35 * Math.sin(t * 11));
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    dry.connect(comp);
    wet.connect(conv).connect(comp);
    comp.connect(master).connect(ctx.destination);
    busRef.current = { dry, wet, master };
    return busRef.current;
  }, []);

  const connectBus = useCallback((ctx: AudioContext, node: AudioNode, wetAmt = 1) => {
    const bus = ensureBus(ctx);
    node.connect(bus.dry);
    if (wetAmt > 0) {
      if (wetAmt === 1) node.connect(bus.wet);
      else {
        const send = ctx.createGain();
        send.gain.value = wetAmt;
        node.connect(send).connect(bus.wet);
      }
    }
  }, [ensureBus]);

  const beep = useCallback((
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.15,
    startOffset = 0,
    slideTo?: number,
    wetAmt = 1
  ) => {
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    connectBus(ctx, g, wetAmt);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }, [connectBus]);

  const noise = useCallback((
    ctx: AudioContext,
    duration: number,
    filterFreq: number,
    gain = 0.10,
    startOffset = 0,
    filterType: BiquadFilterType = 'bandpass',
    q = 6,
    wetAmt = 1
  ) => {
    const t0 = ctx.currentTime + startOffset;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.Q.setValueAtTime(q, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g);
    connectBus(ctx, g, wetAmt);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }, [connectBus]);

  const kick = useCallback((ctx: AudioContext, gain = 0.55, startOffset = 0) => {
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.12);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    osc.connect(g);
    connectBus(ctx, g, 0.4);
    osc.start(t0);
    osc.stop(t0 + 0.30);
    noise(ctx, 0.008, 3200, gain * 0.4, startOffset, 'highpass', 1, 0.2);
  }, [connectBus, noise]);

  const snare = useCallback((ctx: AudioContext, gain = 0.35, startOffset = 0) => {
    noise(ctx, 0.14, 5200, gain, startOffset, 'lowpass', 0.7, 0.6);
    beep(ctx, 210, 0.09, 'triangle', gain * 0.4, startOffset, 130, 0.3);
  }, [beep, noise]);

  const wood = useCallback((
    ctx: AudioContext, freq = 620, gain = 0.35, startOffset = 0, wetAmt = 0.4
  ) => {
    const t0 = ctx.currentTime + startOffset;
    beep(ctx, freq * 0.55, 0.11, 'sine', gain * 0.55, startOffset, freq * 0.35, wetAmt);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.6, t0);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, t0 + 0.05);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    osc.connect(g);
    connectBus(ctx, g, wetAmt);
    osc.start(t0);
    osc.stop(t0 + 0.11);
    noise(ctx, 0.012, 4200, gain * 0.28, startOffset, 'highpass', 1, 0.15);
  }, [beep, noise, connectBus]);

  const brass = useCallback((
    ctx: AudioContext, freqs: number[], duration = 0.65, gain = 0.14, startOffset = 0, wetAmt = 0.9
  ) => {
    const t0 = ctx.currentTime + startOffset;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 3;
    filter.frequency.setValueAtTime(500, t0);
    filter.frequency.exponentialRampToValueAtTime(4200, t0 + duration * 0.35);
    filter.frequency.exponentialRampToValueAtTime(1800, t0 + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.06);
    g.gain.linearRampToValueAtTime(gain * 0.85, t0 + duration * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    freqs.forEach(f => {
      [-9, 0, 9].forEach(det => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t0);
        o.detune.setValueAtTime(det, t0);
        o.connect(filter);
        o.start(t0);
        o.stop(t0 + duration + 0.05);
      });
    });
    filter.connect(g);
    connectBus(ctx, g, wetAmt);
  }, [connectBus]);

  const choir = useCallback((
    ctx: AudioContext, freqs: number[], duration = 1.4, gain = 0.09, startOffset = 0
  ) => {
    const t0 = ctx.currentTime + startOffset;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.35);
    g.gain.linearRampToValueAtTime(gain * 0.75, t0 + duration * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    freqs.forEach(f => {
      [-7, -3, 3, 7].forEach(det => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, t0);
        o.detune.setValueAtTime(det, t0);
        o.connect(filter);
        o.start(t0);
        o.stop(t0 + duration + 0.05);
      });
    });
    filter.connect(g);
    connectBus(ctx, g, 1.2);
  }, [connectBus]);

  const bell = useCallback((
    ctx: AudioContext, freq: number, duration = 0.6, gain = 0.14, startOffset = 0
  ) => {
    const partials = [1, 2.01, 3.03, 4.15, 5.42];
    const weights = [1.0, 0.6, 0.38, 0.24, 0.15];
    partials.forEach((mul, i) => {
      beep(ctx, freq * mul, duration * (1 - i * 0.11), 'sine', gain * weights[i], startOffset);
    });
  }, [beep]);

  const chime = useCallback((
    ctx: AudioContext, freq: number, duration = 0.35, gain = 0.11, startOffset = 0
  ) => {
    beep(ctx, freq, duration, 'sine', gain, startOffset);
    beep(ctx, freq * 2.003, duration * 0.75, 'sine', gain * 0.5, startOffset);
    beep(ctx, freq * 3.01, duration * 0.4, 'sine', gain * 0.2, startOffset);
  }, [beep]);

  const sparkle = useCallback((
    ctx: AudioContext, count = 8, spread = 0.5, startOffset = 0, gain = 0.08
  ) => {
    for (let i = 0; i < count; i++) {
      const t = startOffset + Math.random() * spread;
      const f = 1400 + Math.random() * 2600;
      beep(ctx, f, 0.10 + Math.random() * 0.09, 'sine', gain, t);
    }
  }, [beep]);

  const swoosh = useCallback((
    ctx: AudioContext, duration = 0.32, gain = 0.10, startOffset = 0, up = true
  ) => {
    const t0 = ctx.currentTime + startOffset;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.4;
    filter.frequency.setValueAtTime(up ? 200 : 3200, t0);
    filter.frequency.exponentialRampToValueAtTime(up ? 3400 : 220, t0 + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + duration * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g);
    connectBus(ctx, g, 0.5);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }, [connectBus]);

  const play = useCallback((name: SoundName) => {
    if (muted) return;
    const ctx = ensureCtx();
    if (!ctx) return;

    switch (name) {
      case 'chipClick':
        beep(ctx, 3400, 0.016, 'square', 0.12);
        beep(ctx, 1500, 0.05, 'triangle', 0.13, 0.005);
        beep(ctx, 920, 0.06, 'sine', 0.09, 0.01);
        break;
      case 'chipDrop':
        kick(ctx, 0.32, 0);
        wood(ctx, 240, 0.28, 0.01, 0.3);
        chime(ctx, 1500, 0.22, 0.11, 0.04);
        noise(ctx, 0.08, 3400, 0.06, 0.01);
        break;
      case 'chipClink':
        chime(ctx, 1900, 0.28, 0.13);
        chime(ctx, 2500, 0.22, 0.09, 0.02);
        noise(ctx, 0.05, 4800, 0.045, 0);
        break;
      case 'hover':
        beep(ctx, 2400, 0.04, 'sine', 0.04, 0, undefined, 0.2);
        break;
      case 'select':
        chime(ctx, 820, 0.18, 0.10);
        chime(ctx, 1230, 0.14, 0.07, 0.04);
        break;
      case 'move':
        wood(ctx, 560, 0.38, 0, 0.3);
        kick(ctx, 0.22, 0);
        noise(ctx, 0.06, 2400, 0.05, 0, 'bandpass', 4, 0.2);
        break;
      case 'capture':
        kick(ctx, 0.55, 0);
        wood(ctx, 480, 0.42, 0.01, 0.5);
        snare(ctx, 0.28, 0.02);
        noise(ctx, 0.24, 900, 0.15, 0.02);
        chime(ctx, 1600, 0.18, 0.13, 0.08);
        chime(ctx, 950, 0.14, 0.10, 0);
        sparkle(ctx, 4, 0.25, 0.05, 0.05);
        break;
      case 'kingMe':
        kick(ctx, 0.5, 0);
        brass(ctx, [220, 330, 440, 554], 0.9, 0.16, 0.02);
        [740, 990, 1320, 1760].forEach((f, i) => chime(ctx, f, 0.24, 0.14, 0.15 + i * 0.08));
        bell(ctx, 1760, 1.1, 0.12, 0.5);
        sparkle(ctx, 10, 0.5, 0.35, 0.06);
        break;
      case 'nearWin':
        brass(ctx, [174, 220, 261, 349], 0.7, 0.10, 0);
        sparkle(ctx, 5, 0.5, 0.2, 0.05);
        break;
      case 'win':
      case 'fanfare':
        kick(ctx, 0.6, 0);
        snare(ctx, 0.35, 0.18);
        kick(ctx, 0.55, 0.36);
        snare(ctx, 0.35, 0.54);
        brass(ctx, [261.63, 329.63, 392, 523.25], 1.1, 0.18, 0);
        brass(ctx, [523.25, 659.25, 783.99], 0.9, 0.12, 0.55);
        [523, 659, 784, 1046, 1319].forEach((f, i) => chime(ctx, f, 0.30, 0.15, 0.15 + i * 0.10));
        choir(ctx, [261.63, 329.63, 392, 523.25], 2.0, 0.10, 0.15);
        bell(ctx, 1568, 1.4, 0.14, 0.65);
        sparkle(ctx, 14, 1.1, 0.2, 0.07);
        break;
      case 'lose':
        kick(ctx, 0.4, 0);
        brass(ctx, [146.83, 174.61, 220], 1.0, 0.15, 0);
        beep(ctx, 130, 0.7, 'sawtooth', 0.14, 0.15, 45, 0.8);
        beep(ctx, 98, 0.9, 'triangle', 0.12, 0.3, 40, 0.6);
        noise(ctx, 0.35, 260, 0.06, 0.05, 'lowpass', 1, 0.6);
        break;
      case 'draw':
        chime(ctx, 440, 0.4, 0.12);
        chime(ctx, 523, 0.4, 0.11, 0.15);
        chime(ctx, 659, 0.5, 0.10, 0.30);
        choir(ctx, [220, 261.63, 329.63], 1.6, 0.06, 0);
        break;
      case 'jackpotMini':
        kick(ctx, 0.35, 0);
        [700, 900, 1100, 1400].forEach((f, i) => chime(ctx, f, 0.18, 0.12, i * 0.06));
        bell(ctx, 1400, 0.7, 0.11, 0.22);
        sparkle(ctx, 7, 0.4, 0.1);
        break;
      case 'jackpotMinor':
        kick(ctx, 0.45, 0);
        snare(ctx, 0.28, 0.2);
        brass(ctx, [261.63, 329.63, 392], 0.7, 0.13, 0);
        [523, 659, 784, 987, 1174].forEach((f, i) => chime(ctx, f, 0.22, 0.13, i * 0.07));
        bell(ctx, 1568, 1.0, 0.12, 0.4);
        sparkle(ctx, 10, 0.5, 0.15);
        break;
      case 'jackpotMajor':
        kick(ctx, 0.6, 0);
        snare(ctx, 0.35, 0.2);
        kick(ctx, 0.55, 0.4);
        brass(ctx, [220, 277, 330, 415], 1.1, 0.17, 0);
        [392, 493, 587, 784, 987, 1174, 1568].forEach((f, i) => chime(ctx, f, 0.24, 0.13, 0.1 + i * 0.08));
        choir(ctx, [220, 277, 330, 415], 2.0, 0.09, 0.1);
        bell(ctx, 1976, 1.3, 0.14, 0.6);
        sparkle(ctx, 14, 0.7, 0.2);
        noise(ctx, 0.4, 5200, 0.07, 0.55, 'bandpass', 3, 0.6);
        break;
      case 'jackpotGrand':
      case 'jackpot':
        for (let i = 0; i < 4; i++) {
          kick(ctx, 0.65, i * 0.2);
          snare(ctx, 0.4, i * 0.2 + 0.1);
        }
        brass(ctx, [146.83, 220, 293.66, 392], 1.4, 0.18, 0);
        brass(ctx, [261.63, 392, 523.25, 659.25], 1.4, 0.16, 0.6);
        for (let i = 0; i < 16; i++) chime(ctx, 440 + i * 92, 0.20, 0.12, 0.2 + i * 0.06);
        [1046, 1319, 1568, 2093, 2637].forEach((f, i) => bell(ctx, f, 1.6, 0.14, 1.0 + i * 0.14));
        choir(ctx, [130.81, 196, 261.63, 329.63], 3.0, 0.11, 0.2);
        sparkle(ctx, 30, 1.8, 0.2, 0.08);
        noise(ctx, 0.9, 5800, 0.08, 0.1, 'bandpass', 3, 0.7);
        noise(ctx, 0.9, 5800, 0.07, 0.5, 'bandpass', 3, 0.7);
        break;
      case 'coin':
        chime(ctx, 1700, 0.24, 0.16);
        chime(ctx, 2500, 0.20, 0.11, 0.03);
        bell(ctx, 2100, 0.6, 0.10, 0.02);
        break;
      case 'coinShower':
        for (let i = 0; i < 22; i++) {
          const t = i * 0.04;
          chime(ctx, 1300 + Math.random() * 1600, 0.14, 0.09, t);
          if (i % 2 === 0) noise(ctx, 0.05, 3800 + Math.random() * 1400, 0.04, t);
        }
        bell(ctx, 1568, 1.0, 0.10, 0.1);
        sparkle(ctx, 14, 1.0, 0.05, 0.07);
        break;
      case 'error':
        beep(ctx, 220, 0.16, 'square', 0.11);
        beep(ctx, 165, 0.20, 'square', 0.09, 0.06);
        noise(ctx, 0.08, 320, 0.06, 0, 'lowpass', 1, 0.3);
        break;
      case 'missionComplete':
        kick(ctx, 0.35, 0);
        brass(ctx, [330, 415, 494], 0.6, 0.12, 0.05);
        [660, 880, 1108, 1479, 1760].forEach((f, i) => chime(ctx, f, 0.22, 0.13, 0.15 + i * 0.08));
        bell(ctx, 1760, 0.9, 0.11, 0.4);
        sparkle(ctx, 8, 0.4, 0.15);
        break;
      case 'skinUnlock':
        kick(ctx, 0.3, 0);
        swoosh(ctx, 0.28, 0.09, 0, true);
        [523, 784, 1046, 1568].forEach((f, i) => chime(ctx, f, 0.26, 0.12, 0.1 + i * 0.09));
        bell(ctx, 1568, 0.9, 0.11, 0.4);
        sparkle(ctx, 10, 0.5, 0.2);
        break;
      case 'levelUp':
        kick(ctx, 0.55, 0);
        snare(ctx, 0.3, 0.18);
        brass(ctx, [261.63, 329.63, 392, 523.25], 1.0, 0.16, 0);
        [523, 659, 784, 1046, 1319, 1568, 2093].forEach((f, i) => chime(ctx, f, 0.24, 0.14, 0.1 + i * 0.08));
        choir(ctx, [261.63, 329.63, 392], 1.8, 0.09, 0.1);
        bell(ctx, 2093, 1.4, 0.13, 0.55);
        sparkle(ctx, 16, 1.0, 0.3, 0.07);
        break;
    }
  }, [muted, ensureCtx, beep, noise, bell, chime, sparkle, kick, snare, wood, brass, choir, swoosh]);

  const startAmbient = useCallback(() => {
    if (muted) return;
    if (ambientNodesRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    ensureBus(ctx);
    const freqs = [110, 165, 220, 262, 329];
    const nodes = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03 - i * 0.004, ctx.currentTime + 4);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.07 + Math.random() * 0.12, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.012, ctx.currentTime);
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain);
      connectBus(ctx, gain, 1.3);
      osc.start();
      lfo.start();
      return { osc, gain, lfo, lfoGain };
    });
    ambientNodesRef.current = nodes;
    const scale = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    const tick = () => {
      if (!ambientNodesRef.current) return;
      if (muted) return;
      const c = ctxRef.current;
      if (!c) return;
      const notes = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notes; i++) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        bell(c, f, 2.0, 0.05, i * 0.4);
      }
      ambientTimerRef.current = window.setTimeout(tick, 6000 + Math.random() * 5000);
    };
    ambientTimerRef.current = window.setTimeout(tick, 3500);
    setAmbientOn(true);
  }, [muted, ensureCtx, ensureBus, connectBus, bell]);

  const stopAmbient = useCallback(() => {
    if (ambientTimerRef.current) {
      window.clearTimeout(ambientTimerRef.current);
      ambientTimerRef.current = null;
    }
    const ctx = ctxRef.current;
    const nodes = ambientNodesRef.current;
    if (!ctx || !nodes) { setAmbientOn(false); return; }
    const t = ctx.currentTime;
    nodes.forEach(({ osc, gain, lfo }) => {
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.2);
      osc.stop(t + 1.3);
      lfo.stop(t + 1.3);
    });
    ambientNodesRef.current = null;
    setAmbientOn(false);
  }, []);

  const toggleAmbient = useCallback(() => {
    if (ambientOn) stopAmbient();
    else startAmbient();
  }, [ambientOn, startAmbient, stopAmbient]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      if (next) stopAmbient();
      return next;
    });
  }, [stopAmbient]);

  useEffect(() => {
    return () => {
      if (ambientTimerRef.current) window.clearTimeout(ambientTimerRef.current);
      if (ambientNodesRef.current) {
        ambientNodesRef.current.forEach(({ osc, lfo }) => { try { osc.stop(); lfo.stop(); } catch { /* ignore */ } });
        ambientNodesRef.current = null;
      }
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Ambient does NOT auto-start — opt-in only via toggleAmbient.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      ensureCtx();
      window.removeEventListener('pointerdown', warm);
      window.removeEventListener('keydown', warm);
      window.removeEventListener('touchstart', warm);
    };
    window.addEventListener('pointerdown', warm, { once: true });
    window.addEventListener('keydown', warm, { once: true });
    window.addEventListener('touchstart', warm, { once: true });
    return () => {
      window.removeEventListener('pointerdown', warm);
      window.removeEventListener('keydown', warm);
      window.removeEventListener('touchstart', warm);
    };
  }, [ensureCtx]);

  return { muted, toggleMute, play, startAmbient, stopAmbient, ambientOn, toggleAmbient };
}

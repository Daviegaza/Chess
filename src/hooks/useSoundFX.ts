import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'chess_sound_v1';

export type SoundName =
  | 'chipClick' | 'chipDrop' | 'chipClink' | 'hover' | 'select'
  | 'move' | 'capture' | 'kingMe' | 'nearWin'
  | 'win' | 'lose' | 'draw'
  | 'jackpot' | 'jackpotMini' | 'jackpotMinor' | 'jackpotMajor' | 'jackpotGrand'
  | 'coin' | 'coinShower' | 'error' | 'missionComplete' | 'skinUnlock' | 'levelUp';

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
    master.gain.value = 1.15;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const dry = ctx.createGain();
    dry.gain.value = 0.9;
    const wet = ctx.createGain();
    wet.gain.value = 0.28;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.9);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4);
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

  const connectBus = useCallback((ctx: AudioContext, node: AudioNode) => {
    const bus = ensureBus(ctx);
    node.connect(bus.dry);
    node.connect(bus.wet);
  }, [ensureBus]);

  const beep = useCallback((
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gain = 0.15,
    startOffset = 0,
    slideTo?: number
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
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    connectBus(ctx, g);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }, [connectBus]);

  const noise = useCallback((
    ctx: AudioContext,
    duration: number,
    filterFreq: number,
    gain = 0.10,
    startOffset = 0
  ) => {
    const t0 = ctx.currentTime + startOffset;
    const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, t0);
    filter.Q.setValueAtTime(6, t0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter).connect(g);
    connectBus(ctx, g);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }, [connectBus]);

  const bell = useCallback((
    ctx: AudioContext, freq: number, duration = 0.6, gain = 0.14, startOffset = 0
  ) => {
    const partials = [1, 2.01, 3.03, 4.15];
    const weights = [1.0, 0.55, 0.35, 0.22];
    partials.forEach((mul, i) => {
      beep(ctx, freq * mul, duration * (1 - i * 0.12), 'sine', gain * weights[i], startOffset);
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
      const f = 1400 + Math.random() * 2400;
      beep(ctx, f, 0.10 + Math.random() * 0.08, 'sine', gain, t);
    }
  }, [beep]);

  const play = useCallback((name: SoundName) => {
    if (muted) return;
    const ctx = ensureCtx();
    if (!ctx) return;

    switch (name) {
      case 'chipClick':
        beep(ctx, 3200, 0.018, 'square', 0.09);
        beep(ctx, 1400, 0.05, 'triangle', 0.10, 0.005);
        beep(ctx, 900, 0.06, 'sine', 0.07, 0.01);
        break;
      case 'chipDrop':
        beep(ctx, 180, 0.12, 'sine', 0.16, 0, 90);
        beep(ctx, 90, 0.20, 'sine', 0.10, 0.02);
        chime(ctx, 1400, 0.22, 0.10, 0.03);
        noise(ctx, 0.07, 3400, 0.05, 0.01);
        break;
      case 'chipClink':
        chime(ctx, 1800, 0.28, 0.11);
        chime(ctx, 2400, 0.22, 0.08, 0.02);
        noise(ctx, 0.05, 4600, 0.035, 0);
        break;
      case 'hover':
        beep(ctx, 2400, 0.04, 'sine', 0.035);
        break;
      case 'select':
        chime(ctx, 780, 0.18, 0.09);
        chime(ctx, 1170, 0.14, 0.06, 0.04);
        break;
      case 'move':
        beep(ctx, 520, 0.10, 'triangle', 0.18);
        beep(ctx, 780, 0.06, 'triangle', 0.10, 0.01);
        beep(ctx, 320, 0.09, 'sine', 0.09, 0.005);
        noise(ctx, 0.05, 2200, 0.06, 0);
        break;
      case 'capture':
        beep(ctx, 260, 0.22, 'sawtooth', 0.24, 0, 90);
        noise(ctx, 0.18, 900, 0.14, 0);
        chime(ctx, 1500, 0.18, 0.12, 0.08);
        chime(ctx, 900, 0.14, 0.10, 0);
        break;
      case 'kingMe':
        [740, 990, 1320, 1760].forEach((f, i) => chime(ctx, f, 0.22, 0.13, i * 0.08));
        bell(ctx, 1760, 0.9, 0.10, 0.35);
        sparkle(ctx, 6, 0.4, 0.30, 0.05);
        break;
      case 'nearWin':
        beep(ctx, 400, 0.7, 'sawtooth', 0.06, 0, 900);
        beep(ctx, 402, 0.7, 'sawtooth', 0.05, 0, 902);
        sparkle(ctx, 4, 0.5, 0.2, 0.04);
        break;
      case 'win':
        [523, 659, 784, 1046, 1319].forEach((f, i) => chime(ctx, f, 0.28, 0.14, i * 0.09));
        bell(ctx, 1568, 1.2, 0.13, 0.45);
        sparkle(ctx, 10, 0.8, 0.15, 0.06);
        break;
      case 'lose':
        beep(ctx, 260, 0.45, 'sine', 0.18, 0, 60);
        beep(ctx, 200, 0.45, 'sawtooth', 0.10, 0, 55);
        beep(ctx, 130, 0.55, 'triangle', 0.14, 0.15, 45);
        noise(ctx, 0.25, 320, 0.05, 0);
        break;
      case 'draw':
        chime(ctx, 440, 0.35, 0.10);
        chime(ctx, 523, 0.35, 0.09, 0.15);
        chime(ctx, 659, 0.35, 0.08, 0.30);
        break;
      case 'jackpotMini':
        [700, 900, 1100, 1400].forEach((f, i) => chime(ctx, f, 0.18, 0.11, i * 0.06));
        bell(ctx, 1400, 0.6, 0.10, 0.2);
        sparkle(ctx, 6, 0.4, 0.1);
        break;
      case 'jackpotMinor':
        [523, 659, 784, 987, 1174].forEach((f, i) => chime(ctx, f, 0.20, 0.12, i * 0.07));
        bell(ctx, 1568, 0.9, 0.11, 0.35);
        sparkle(ctx, 8, 0.5, 0.15);
        break;
      case 'jackpotMajor':
        [392, 493, 587, 784, 987, 1174, 1568].forEach((f, i) => chime(ctx, f, 0.22, 0.12, i * 0.08));
        bell(ctx, 1976, 1.2, 0.12, 0.55);
        sparkle(ctx, 12, 0.7, 0.2);
        noise(ctx, 0.3, 5000, 0.06, 0.5);
        break;
      case 'jackpotGrand':
      case 'jackpot':
        for (let i = 0; i < 14; i++) chime(ctx, 440 + i * 88, 0.18, 0.11, i * 0.06);
        [1046, 1319, 1568, 2093, 2637].forEach((f, i) => bell(ctx, f, 1.4, 0.13, 0.9 + i * 0.14));
        sparkle(ctx, 24, 1.6, 0.2, 0.07);
        noise(ctx, 0.7, 6000, 0.07, 0);
        noise(ctx, 0.7, 6000, 0.06, 0.4);
        break;
      case 'coin':
        chime(ctx, 1600, 0.22, 0.14);
        chime(ctx, 2400, 0.20, 0.10, 0.03);
        bell(ctx, 2000, 0.5, 0.09, 0.02);
        break;
      case 'coinShower':
        for (let i = 0; i < 18; i++) {
          const t = i * 0.045;
          chime(ctx, 1300 + Math.random() * 1400, 0.14, 0.08, t);
          if (i % 2 === 0) noise(ctx, 0.05, 3600 + Math.random() * 1400, 0.035, t);
        }
        bell(ctx, 1568, 0.9, 0.09, 0.1);
        sparkle(ctx, 10, 0.9, 0.05, 0.06);
        break;
      case 'error':
        beep(ctx, 220, 0.18, 'square', 0.10);
        beep(ctx, 165, 0.20, 'square', 0.08, 0.06);
        break;
      case 'missionComplete':
        [660, 880, 1108, 1479, 1760].forEach((f, i) => chime(ctx, f, 0.20, 0.12, i * 0.08));
        bell(ctx, 1760, 0.7, 0.10, 0.3);
        sparkle(ctx, 6, 0.4, 0.15);
        break;
      case 'skinUnlock':
        [523, 784, 1046, 1568].forEach((f, i) => chime(ctx, f, 0.24, 0.11, i * 0.09));
        bell(ctx, 1568, 0.8, 0.10, 0.35);
        sparkle(ctx, 8, 0.5, 0.2);
        break;
      case 'levelUp':
        [523, 659, 784, 1046, 1319, 1568, 2093].forEach((f, i) => chime(ctx, f, 0.22, 0.13, i * 0.08));
        bell(ctx, 2093, 1.3, 0.12, 0.5);
        sparkle(ctx, 14, 0.9, 0.3, 0.06);
        noise(ctx, 0.4, 4500, 0.05, 0);
        break;
    }
  }, [muted, ensureCtx, beep, noise, bell, chime, sparkle]);

  const startAmbient = useCallback(() => {
    if (muted) return;
    if (ambientNodesRef.current) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    ensureBus(ctx);
    const freqs = [110, 165, 196, 262];
    const nodes = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03 - i * 0.005, ctx.currentTime + 3);
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.08 + Math.random() * 0.14, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.012, ctx.currentTime);
      lfo.connect(lfoGain).connect(gain.gain);
      osc.connect(gain);
      connectBus(ctx, gain);
      osc.start();
      lfo.start();
      return { osc, gain, lfo, lfoGain };
    });
    ambientNodesRef.current = nodes;
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
    const tick = () => {
      if (!ambientNodesRef.current) return;
      if (muted) return;
      const c = ctxRef.current;
      if (!c) return;
      const notes = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < notes; i++) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        bell(c, f, 1.6, 0.05, i * 0.35);
      }
      ambientTimerRef.current = window.setTimeout(tick, 5000 + Math.random() * 4000);
    };
    ambientTimerRef.current = window.setTimeout(tick, 3000);
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
      if (next) {
        stopAmbient();
      }
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let started = false;
    const kick = () => {
      if (started) return;
      started = true;
      if (!muted) startAmbient();
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchstart', kick);
    };
    window.addEventListener('pointerdown', kick, { once: false });
    window.addEventListener('keydown', kick, { once: false });
    window.addEventListener('touchstart', kick, { once: false });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchstart', kick);
    };
  }, [muted, startAmbient]);

  return { muted, toggleMute, play, startAmbient, stopAmbient, ambientOn, toggleAmbient };
}

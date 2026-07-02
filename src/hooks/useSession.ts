import { useEffect, useRef, useState } from 'react';

export interface UseSessionReturn {
  elapsedMs: number;
  elapsedLabel: string;
  nudged30: boolean;
  nudged60: boolean;
  dismissNudge: () => void;
  activeNudge: 30 | 60 | null;
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function useSession(): UseSessionReturn {
  const startRef = useRef<number>(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [nudged30, setNudged30] = useState(false);
  const [nudged60, setNudged60] = useState(false);
  const [activeNudge, setActiveNudge] = useState<30 | 60 | null>(null);

  useEffect(() => {
    const tick = () => {
      const e = Date.now() - startRef.current;
      setElapsedMs(e);
      const mins = e / 60000;
      if (mins >= 30 && !nudged30) {
        setNudged30(true);
        setActiveNudge(30);
      }
      if (mins >= 60 && !nudged60) {
        setNudged60(true);
        setActiveNudge(60);
      }
    };
    tick();
    const iv = setInterval(tick, 15_000);
    return () => clearInterval(iv);
  }, [nudged30, nudged60]);

  return {
    elapsedMs,
    elapsedLabel: formatMs(elapsedMs),
    nudged30, nudged60,
    dismissNudge: () => setActiveNudge(null),
    activeNudge,
  };
}

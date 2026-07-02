import { useCallback, useEffect, useState } from 'react';
import {
  DailyMission,
  MissionMetric,
  MissionsState,
  MISSION_TEMPLATES,
  RoundMetricDelta,
} from '../types/game.types';

const STORAGE_KEY = 'chess_missions_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

function currentDay(): number {
  return Math.floor(Date.now() / DAY_MS);
}

function rollMissionsForDay(day: number): DailyMission[] {
  const pool = [...MISSION_TEMPLATES];
  let s = day || 1;
  const rand = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 0xffffffff); };
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const chosen = pool.slice(0, 3);
  return chosen.map(t => ({ templateId: t.id, progress: 0, target: t.target, claimed: false }));
}

function loadOrRoll(): MissionsState {
  const today = currentDay();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MissionsState;
      if (parsed.seedDay === today && Array.isArray(parsed.missions)) return parsed;
    }
  } catch { /* ignore */ }
  const fresh: MissionsState = { seedDay: today, missions: rollMissionsForDay(today) };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch { /* ignore */ }
  return fresh;
}

function saveState(s: MissionsState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export interface UseMissionsReturn {
  state: MissionsState;
  applyDelta: (delta: RoundMetricDelta) => { justCompleted: DailyMission[] };
  claim: (templateId: string) => number;
  reroll: () => void;
}

export function useMissions(): UseMissionsReturn {
  const [state, setState] = useState<MissionsState>(loadOrRoll);

  useEffect(() => {
    const iv = setInterval(() => {
      const today = currentDay();
      setState(prev => {
        if (prev.seedDay === today) return prev;
        const next: MissionsState = { seedDay: today, missions: rollMissionsForDay(today) };
        saveState(next);
        return next;
      });
    }, 60_000);
    return () => clearInterval(iv);
  }, []);

  const applyDelta = useCallback((delta: RoundMetricDelta): { justCompleted: DailyMission[] } => {
    const justCompleted: DailyMission[] = [];
    setState(prev => {
      const nextMissions = prev.missions.map(m => {
        const tpl = MISSION_TEMPLATES.find(t => t.id === m.templateId);
        if (!tpl || m.claimed) return m;
        const metricValue = delta[tpl.metric as MissionMetric];
        const wasComplete = m.progress >= m.target;
        const nextProgress = tpl.metric === 'streakLen'
          ? Math.max(m.progress, metricValue)
          : Math.min(m.target, m.progress + metricValue);
        const nowComplete = nextProgress >= m.target;
        if (!wasComplete && nowComplete) {
          justCompleted.push({ ...m, progress: nextProgress });
        }
        return { ...m, progress: nextProgress };
      });
      const next: MissionsState = { ...prev, missions: nextMissions };
      saveState(next);
      return next;
    });
    return { justCompleted };
  }, []);

  const claim = useCallback((templateId: string): number => {
    let reward = 0;
    setState(prev => {
      const idx = prev.missions.findIndex(m => m.templateId === templateId);
      if (idx < 0) return prev;
      const m = prev.missions[idx];
      if (m.claimed || m.progress < m.target) return prev;
      const tpl = MISSION_TEMPLATES.find(t => t.id === templateId);
      if (!tpl) return prev;
      reward = tpl.reward;
      const nextMissions = [...prev.missions];
      nextMissions[idx] = { ...m, claimed: true };
      const next: MissionsState = { ...prev, missions: nextMissions };
      saveState(next);
      return next;
    });
    return reward;
  }, []);

  const reroll = useCallback(() => {
    const today = currentDay();
    const next: MissionsState = { seedDay: today, missions: rollMissionsForDay(today) };
    saveState(next);
    setState(next);
  }, []);

  return { state, applyDelta, claim, reroll };
}

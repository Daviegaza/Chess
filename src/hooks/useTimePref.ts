import { useCallback, useEffect, useState } from 'react';
import {
  matchPreset,
  TIME_PRESET_MAP,
  TimeControl,
  TimePresetId,
} from '../types/game.types';

const STORAGE_KEY = 'chess_timepref_v1';

interface TimePref {
  defaultPresetId: TimePresetId;
  defaultTc: TimeControl;
}

function loadPref(): TimePref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TimePref>;
      if (
        parsed.defaultTc &&
        typeof parsed.defaultTc.initial === 'number' &&
        typeof parsed.defaultTc.increment === 'number'
      ) {
        const id: TimePresetId = parsed.defaultPresetId && TIME_PRESET_MAP[parsed.defaultPresetId]
          ? parsed.defaultPresetId
          : matchPreset(parsed.defaultTc);
        return { defaultPresetId: id, defaultTc: parsed.defaultTc };
      }
    }
  } catch { /* ignore */ }
  const fallback = TIME_PRESET_MAP.rapid10_5;
  return { defaultPresetId: fallback.id, defaultTc: fallback.tc };
}

function savePref(p: TimePref): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

const MIN_INITIAL = 15;
const MAX_INITIAL = 5400;
const MIN_INC = 0;
const MAX_INC = 60;

function clampTc(tc: TimeControl): TimeControl {
  return {
    initial: Math.max(MIN_INITIAL, Math.min(MAX_INITIAL, Math.round(tc.initial))),
    increment: Math.max(MIN_INC, Math.min(MAX_INC, Math.round(tc.increment))),
  };
}

export interface UseTimePrefReturn {
  defaultPresetId: TimePresetId;
  defaultTc: TimeControl;
  selectedPresetId: TimePresetId;
  selectedTc: TimeControl;
  setSelectedPreset: (id: TimePresetId) => void;
  setCustomTc: (tc: TimeControl) => void;
  saveAsDefault: () => void;
  resetToDefault: () => void;
  isSelectionDefault: boolean;
  limits: { minInitial: number; maxInitial: number; minInc: number; maxInc: number };
}

export function useTimePref(): UseTimePrefReturn {
  const [pref, setPref] = useState<TimePref>(() => loadPref());
  const [selectedPresetId, setSelectedPresetId] = useState<TimePresetId>(pref.defaultPresetId);
  const [selectedTc, setSelectedTc] = useState<TimeControl>(pref.defaultTc);

  useEffect(() => { savePref(pref); }, [pref]);

  const setSelectedPreset = useCallback((id: TimePresetId) => {
    setSelectedPresetId(id);
    if (id !== 'custom') {
      setSelectedTc(TIME_PRESET_MAP[id].tc);
    }
  }, []);

  const setCustomTc = useCallback((tc: TimeControl) => {
    const c = clampTc(tc);
    setSelectedTc(c);
    setSelectedPresetId(matchPreset(c));
  }, []);

  const saveAsDefault = useCallback(() => {
    setPref({ defaultPresetId: selectedPresetId, defaultTc: selectedTc });
  }, [selectedPresetId, selectedTc]);

  const resetToDefault = useCallback(() => {
    setSelectedPresetId(pref.defaultPresetId);
    setSelectedTc(pref.defaultTc);
  }, [pref]);

  const isSelectionDefault =
    selectedPresetId === pref.defaultPresetId &&
    selectedTc.initial === pref.defaultTc.initial &&
    selectedTc.increment === pref.defaultTc.increment;

  return {
    defaultPresetId: pref.defaultPresetId,
    defaultTc: pref.defaultTc,
    selectedPresetId,
    selectedTc,
    setSelectedPreset,
    setCustomTc,
    saveAsDefault,
    resetToDefault,
    isSelectionDefault,
    limits: { minInitial: MIN_INITIAL, maxInitial: MAX_INITIAL, minInc: MIN_INC, maxInc: MAX_INC },
  };
}

import { useCallback, useState } from 'react';
import { GameResultType, INITIAL_POINTS, LevelConfig, PointsState } from '../types/game.types';

interface UsePointsReturn {
  points: PointsState;
  canAfford: (cost: number) => boolean;
  placeBet: (cost: number) => boolean;
  resolveBet: (result: GameResultType, config: LevelConfig) => number;
  resetPoints: () => void;
}

const STORAGE_KEY = 'chess_points_v1';

function loadPoints(): PointsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PointsState;
  } catch {
    // ignore
  }
  return { ...INITIAL_POINTS };
}

function savePoints(pts: PointsState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pts));
  } catch {
    // ignore
  }
}

export function usePoints(): UsePointsReturn {
  const [points, setPoints] = useState<PointsState>(() => loadPoints());

  const canAfford = useCallback(
    (cost: number) => points.balance > cost,
    [points.balance]
  );

  const placeBet = useCallback(
    (cost: number): boolean => {
      if (points.balance <= cost) return false;
      setPoints(prev => {
        const next: PointsState = {
          ...prev,
          balance: prev.balance - cost,
        };
        savePoints(next);
        return next;
      });
      return true;
    },
    [points.balance]
  );

  /**
   * Resolve the bet after a game ends.
   * - Win: get cost back + reward on top
   * - Draw: get cost back (no gain, no loss)
   * - Loss: cost already deducted at bet placement
   */
  const resolveBet = useCallback(
    (result: GameResultType, config: LevelConfig): number => {
      let delta = 0;

      if (result === 'player_win') {
        // Return stake + reward
        delta = config.cost + config.reward;
        setPoints(prev => {
          const next: PointsState = {
            ...prev,
            balance: prev.balance + delta,
            totalWins: prev.totalWins + 1,
            totalEarned: prev.totalEarned + config.reward,
          };
          savePoints(next);
          return next;
        });
      } else if (result === 'draw') {
        // Return stake only
        delta = config.cost;
        setPoints(prev => {
          const next: PointsState = {
            ...prev,
            balance: prev.balance + delta,
            totalDraws: prev.totalDraws + 1,
          };
          savePoints(next);
          return next;
        });
      } else {
        // Loss: stake was already deducted
        delta = -config.cost;
        setPoints(prev => {
          const next: PointsState = {
            ...prev,
            totalLosses: prev.totalLosses + 1,
            totalLost: prev.totalLost + config.cost,
          };
          savePoints(next);
          return next;
        });
      }

      return delta;
    },
    []
  );

  const resetPoints = useCallback(() => {
    const fresh = { ...INITIAL_POINTS };
    savePoints(fresh);
    setPoints(fresh);
  }, []);

  return { points, canAfford, placeBet, resolveBet, resetPoints };
}

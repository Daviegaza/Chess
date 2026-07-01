import { useCallback, useState } from 'react';
import { AI_ELO, GameResultType, INITIAL_POINTS, LevelConfig, PointsState } from '../types/game.types';

interface UsePointsReturn {
  points: PointsState;
  canAfford: (cost: number) => boolean;
  placeBet: (cost: number) => boolean;
  resolveBet: (result: GameResultType, config: LevelConfig) => number;
  resetPoints: () => void;
  addBalance: (amount: number) => void;
  spendBalance: (cost: number) => boolean;
}

const STORAGE_KEY = 'chess_points_v1';
const K_FACTOR = 32;

function loadPoints(): PointsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PointsState;
      if (parsed.elo == null) parsed.elo = INITIAL_POINTS.elo;
      if (parsed.bestElo == null) parsed.bestElo = parsed.elo;
      return parsed;
    }
  } catch {
    // ignore
  }
  return { ...INITIAL_POINTS };
}

function eloDelta(playerElo: number, opponentElo: number, score: number): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(K_FACTOR * (score - expected));
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
      const oppElo = AI_ELO[config.level];
      const score = result === 'player_win' ? 1 : result === 'draw' ? 0.5 : 0;

      if (result === 'player_win') {
        delta = config.cost + config.reward;
        setPoints(prev => {
          const currentElo = prev.elo ?? 1200;
          const newElo = Math.max(100, currentElo + eloDelta(currentElo, oppElo, score));
          const next: PointsState = {
            ...prev,
            balance: prev.balance + delta,
            totalWins: prev.totalWins + 1,
            totalEarned: prev.totalEarned + config.reward,
            elo: newElo,
            bestElo: Math.max(prev.bestElo ?? newElo, newElo),
          };
          savePoints(next);
          return next;
        });
      } else if (result === 'draw') {
        delta = config.cost;
        setPoints(prev => {
          const currentElo = prev.elo ?? 1200;
          const newElo = Math.max(100, currentElo + eloDelta(currentElo, oppElo, score));
          const next: PointsState = {
            ...prev,
            balance: prev.balance + delta,
            totalDraws: prev.totalDraws + 1,
            elo: newElo,
            bestElo: Math.max(prev.bestElo ?? newElo, newElo),
          };
          savePoints(next);
          return next;
        });
      } else {
        delta = -config.cost;
        setPoints(prev => {
          const currentElo = prev.elo ?? 1200;
          const newElo = Math.max(100, currentElo + eloDelta(currentElo, oppElo, score));
          const next: PointsState = {
            ...prev,
            totalLosses: prev.totalLosses + 1,
            totalLost: prev.totalLost + config.cost,
            elo: newElo,
            bestElo: prev.bestElo ?? currentElo,
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

  const addBalance = useCallback((amount: number) => {
    setPoints(prev => {
      const next = { ...prev, balance: prev.balance + amount };
      savePoints(next);
      return next;
    });
  }, []);

  const spendBalance = useCallback((cost: number): boolean => {
    let ok = false;
    setPoints(prev => {
      if (prev.balance < cost) return prev;
      ok = true;
      const next = { ...prev, balance: prev.balance - cost };
      savePoints(next);
      return next;
    });
    return ok;
  }, []);

  return { points, canAfford, placeBet, resolveBet, resetPoints, addBalance, spendBalance };
}

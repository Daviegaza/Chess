import { useCallback, useMemo, useState } from 'react';
import {
  Achievement,
  ACHIEVEMENTS,
  AI_ELO,
  ChipSkinId,
  CHIP_SKINS,
  dailyBonusAmount,
  DAILY_BONUS_MS,
  GameResult,
  GameResultType,
  INITIAL_POINTS,
  initialJackpotPots,
  JACKPOT_TIERS,
  JACKPOT_TIER_ORDER,
  JackpotTierId,
  LevelConfig,
  PointsState,
  RoundMetricDelta,
  SIDE_BETS,
  SideBetId,
  SideBetOutcome,
  SideBetState,
  streakMultiplier,
  vipTierFor,
} from '../types/game.types';

const STORAGE_KEY = 'chess_points_v2';
const K_FACTOR = 32;

function load(): PointsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PointsState>;
      const merged: PointsState = { ...INITIAL_POINTS, ...parsed };
      if (!merged.jackpotTiers || typeof merged.jackpotTiers !== 'object') {
        merged.jackpotTiers = initialJackpotPots();
      } else {
        const fresh = initialJackpotPots();
        merged.jackpotTiers = { ...fresh, ...merged.jackpotTiers };
      }
      if (!Array.isArray(merged.unlockedSkins) || merged.unlockedSkins.length === 0) {
        merged.unlockedSkins = ['classic', 'ivory'];
      }
      if (!merged.activeSkin) merged.activeSkin = 'classic';
      if (merged.elo == null) merged.elo = INITIAL_POINTS.elo;
      if (merged.bestElo == null) merged.bestElo = merged.elo;
      merged.jackpot =
        merged.jackpotTiers.mini + merged.jackpotTiers.minor +
        merged.jackpotTiers.major + merged.jackpotTiers.grand;
      return merged;
    }
  } catch { /* ignore */ }
  return { ...INITIAL_POINTS };
}

function save(pts: PointsState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pts)); } catch { /* ignore */ }
}

function eloDelta(playerElo: number, opponentElo: number, score: number): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(K_FACTOR * (score - expected));
}

export interface DailyBonusStatus {
  ready: boolean;
  msUntilReady: number;
  amount: number;
}

export interface UsePointsReturn {
  points: PointsState;
  dailyBonus: DailyBonusStatus;
  // Casino API
  canAffordRound: (cfg: LevelConfig, activeSideBets: SideBetId[]) => boolean;
  placeRound: (cfg: LevelConfig, activeSideBets: SideBetId[]) => boolean;
  resolveRound: (
    result: GameResultType,
    cfg: LevelConfig,
    sideBets: SideBetState,
    onMetrics?: (delta: RoundMetricDelta, missionBonus: (chips: number) => void) => void
  ) => GameResult;
  claimDailyBonus: () => number;
  totalSideBetCost: (activeSideBets: SideBetId[]) => number;
  equipSkin: (id: ChipSkinId) => void;
  unlockSkin: (id: ChipSkinId) => boolean;
  acknowledgeAge: () => void;
  addChips: (n: number) => void;
  // Legacy simple API — kept for backwards compat
  canAfford: (cost: number) => boolean;
  placeBet: (cost: number) => boolean;
  resolveBet: (result: GameResultType, config: LevelConfig) => number;
  resetPoints: () => void;
  addBalance: (amount: number) => void;
  spendBalance: (cost: number) => boolean;
}

function rollTieredJackpot(
  cfg: LevelConfig,
  vipTier: number,
  tiers: Record<JackpotTierId, number>
): { hit: JackpotTierId | null; amount: number } {
  const tierBoost = 1 + cfg.jackpotContribution / 30;
  const whaleBoost = vipTier >= 5 ? 1.5 : 1;
  const order: JackpotTierId[] = ['grand', 'major', 'minor', 'mini'];
  for (const id of order) {
    const def = JACKPOT_TIERS[id];
    const chance = def.baseHitChance * tierBoost * whaleBoost;
    if (Math.random() < chance) {
      return { hit: id, amount: tiers[id] };
    }
  }
  return { hit: null, amount: 0 };
}

export function usePoints(): UsePointsReturn {
  const [points, setPoints] = useState<PointsState>(load);

  const totalSideBetCost = useCallback((ids: SideBetId[]): number => {
    return ids.reduce((sum, id) => sum + SIDE_BETS[id].cost, 0);
  }, []);

  const canAffordRound = useCallback(
    (cfg: LevelConfig, ids: SideBetId[]) => {
      const total = cfg.cost + totalSideBetCost(ids);
      return points.balance >= total;
    },
    [points.balance, totalSideBetCost]
  );

  const placeRound = useCallback(
    (cfg: LevelConfig, ids: SideBetId[]): boolean => {
      const total = cfg.cost + totalSideBetCost(ids);
      if (points.balance < total) return false;
      setPoints(prev => {
        const nextTiers = { ...prev.jackpotTiers };
        let pooled = 0;
        for (const tid of JACKPOT_TIER_ORDER) {
          const share = Math.max(1, Math.round(cfg.jackpotContribution * JACKPOT_TIERS[tid].contributionShare));
          nextTiers[tid] += share;
          pooled += share;
        }
        const next: PointsState = {
          ...prev,
          balance: prev.balance - total,
          jackpotTiers: nextTiers,
          jackpot: prev.jackpot + pooled,
        };
        save(next);
        return next;
      });
      return true;
    },
    [points.balance, totalSideBetCost]
  );

  const resolveRound = useCallback(
    (
      result: GameResultType,
      cfg: LevelConfig,
      sb: SideBetState,
      onMetrics?: (delta: RoundMetricDelta, missionBonus: (chips: number) => void) => void
    ): GameResult => {
      let out: GameResult = {
        type: result,
        reason: '',
        pointsChange: 0,
        basePayout: 0,
        streakBonus: 0,
        sideBetOutcomes: [],
        jackpotHit: false,
        jackpotAmount: 0,
        jackpotTierHit: null,
        newAchievements: [],
        vipXpGained: 0,
        missionReports: [],
      };

      let pendingMissionBonus = 0;

      setPoints(prev => {
        const next: PointsState = {
          ...prev,
          unlockedAchievements: [...prev.unlockedAchievements],
          jackpotTiers: { ...prev.jackpotTiers },
          unlockedSkins: [...prev.unlockedSkins],
        };
        const tier = vipTierFor(prev.vipXp).tier;

        let basePayout = 0;
        let streakBonus = 0;
        let winStreak = prev.winStreak;

        // Elo update
        const oppElo = AI_ELO[cfg.level];
        const score = result === 'player_win' ? 1 : result === 'draw' ? 0.5 : 0;
        const currentElo = prev.elo ?? 1200;
        const newElo = Math.max(100, currentElo + eloDelta(currentElo, oppElo, score));
        next.elo = newElo;
        next.bestElo = Math.max(prev.bestElo ?? newElo, newElo);

        if (result === 'player_win') {
          const mult = streakMultiplier(prev.winStreak + 1);
          basePayout = cfg.cost + cfg.reward;
          streakBonus = Math.floor(cfg.reward * (mult - 1));
          winStreak = prev.winStreak + 1;
          next.balance += basePayout + streakBonus;
          next.totalWins += 1;
          next.totalEarned += cfg.reward + streakBonus;
        } else if (result === 'draw') {
          basePayout = cfg.cost;
          next.balance += basePayout;
          next.totalDraws += 1;
          winStreak = 0;
        } else {
          next.totalLosses += 1;
          next.totalLost += cfg.cost;
          winStreak = 0;
        }
        next.winStreak = winStreak;
        next.bestStreak = Math.max(prev.bestStreak, winStreak);

        const sideBetOutcomes: SideBetOutcome[] = [];
        const activeIds = (Object.keys(sb.active) as SideBetId[]).filter(id => sb.active[id]);
        activeIds.forEach(id => {
          const bet = SIDE_BETS[id];
          let won = false;
          switch (id) {
            case 'firstCapture':   won = sb.firstCapturePlayer === 'white'; break;
            case 'crownPromotion': won = sb.playerPromotions >= 1; break;
            case 'pinsAndForks':   won = result === 'player_win' && sb.piecesCapturedByPlayer >= 5; break;
            case 'flawless':       won = result === 'player_win' && sb.piecesLostByPlayer === 0; break;
          }
          const payout = won ? Math.floor(bet.cost * (1 + bet.payoutMultiplier)) : 0;
          if (won) next.balance += payout;
          sideBetOutcomes.push({ id, won, payout, stake: bet.cost });
        });
        const sideBetsWonCount = sideBetOutcomes.filter(o => o.won).length;

        let jackpotHit: JackpotTierId | null = null;
        let jackpotAmount = 0;
        if (result === 'player_win') {
          const roll = rollTieredJackpot(cfg, tier, prev.jackpotTiers);
          if (roll.hit) {
            jackpotHit = roll.hit;
            jackpotAmount = roll.amount;
            next.balance += jackpotAmount;
            next.jackpotTiers[roll.hit] = JACKPOT_TIERS[roll.hit].seed;
          }
        }
        next.jackpot =
          next.jackpotTiers.mini + next.jackpotTiers.minor +
          next.jackpotTiers.major + next.jackpotTiers.grand;

        const vipXpGained = cfg.cost;
        next.vipXp = prev.vipXp + vipXpGained;

        const newTier = vipTierFor(next.vipXp).tier;
        for (const skinId of Object.keys(CHIP_SKINS) as ChipSkinId[]) {
          const def = CHIP_SKINS[skinId];
          if (newTier >= def.vipRequired && !next.unlockedSkins.includes(skinId)) {
            next.unlockedSkins.push(skinId);
          }
        }

        if (result === 'player_win') {
          const totalRoundGain = cfg.reward + streakBonus + jackpotAmount +
            sideBetOutcomes.reduce((s, o) => s + Math.max(0, o.payout - o.stake), 0);
          next.biggestWin = Math.max(prev.biggestWin, totalRoundGain);
        }

        const already = new Set(prev.unlockedAchievements);
        const newAchievements: Achievement[] = [];
        const unlock = (id: string) => {
          if (already.has(id)) return;
          const ach = ACHIEVEMENTS.find(a => a.id === id);
          if (!ach) return;
          already.add(id);
          next.unlockedAchievements.push(id);
          next.balance += ach.reward;
          newAchievements.push(ach);
        };
        if (result === 'player_win') {
          if (prev.totalWins === 0) unlock('first_win');
          if (winStreak >= 3) unlock('streak_3');
          if (winStreak >= 5) unlock('streak_5');
          if (sb.piecesCapturedByPlayer >= 5) unlock('crush_5');
          if (sb.piecesLostByPlayer === 0) unlock('flawless');
          if (['hard', 'expert', 'highroller'].includes(cfg.level)) unlock('rook_table');
          if (cfg.level === 'highroller') unlock('throne_win');
        }
        if (jackpotHit) unlock('jackpot');

        const stakeThisRound = cfg.cost + activeIds.reduce((s, k) => s + SIDE_BETS[k].cost, 0);
        const grossGain = next.balance - prev.balance;
        const netChipsThisRound = grossGain - stakeThisRound;

        // Determine checkmate count from result (simple: 1 if player won by checkmate — approximation)
        const checkmatesDelta = result === 'player_win' ? 1 : 0;

        if (onMetrics) {
          const delta: RoundMetricDelta = {
            roundsPlayed: 1,
            roundsWon: result === 'player_win' ? 1 : 0,
            piecesCaptured: sb.piecesCapturedByPlayer,
            promotions: sb.playerPromotions,
            checkmates: checkmatesDelta,
            sideBetsWon: sideBetsWonCount,
            streakLen: winStreak,
            chipsWon: Math.max(0, netChipsThisRound),
          };
          const bonus = (chips: number) => { pendingMissionBonus += chips; };
          onMetrics(delta, bonus);
        }

        if (pendingMissionBonus > 0) {
          next.balance += pendingMissionBonus;
        }

        save(next);

        out = {
          type: result,
          reason: '',
          pointsChange: (next.balance - prev.balance) - stakeThisRound,
          basePayout,
          streakBonus,
          sideBetOutcomes,
          jackpotHit: !!jackpotHit,
          jackpotAmount,
          jackpotTierHit: jackpotHit,
          newAchievements,
          vipXpGained,
          missionReports: [],
        };
        return next;
      });
      return out;
    },
    []
  );

  const dailyBonus = useMemo<DailyBonusStatus>(() => {
    const now = Date.now();
    const elapsed = now - points.lastDailyBonusAt;
    const ready = elapsed >= DAILY_BONUS_MS;
    const tier = vipTierFor(points.vipXp).tier;
    return {
      ready,
      msUntilReady: ready ? 0 : DAILY_BONUS_MS - elapsed,
      amount: dailyBonusAmount(tier),
    };
  }, [points.lastDailyBonusAt, points.vipXp]);

  const claimDailyBonus = useCallback((): number => {
    let granted = 0;
    setPoints(prev => {
      const now = Date.now();
      const elapsed = now - prev.lastDailyBonusAt;
      if (elapsed < DAILY_BONUS_MS) return prev;
      const tier = vipTierFor(prev.vipXp).tier;
      granted = dailyBonusAmount(tier);
      const next: PointsState = { ...prev, balance: prev.balance + granted, lastDailyBonusAt: now };
      save(next);
      return next;
    });
    return granted;
  }, []);

  const resetPoints = useCallback(() => {
    const fresh: PointsState = {
      ...INITIAL_POINTS,
      jackpotTiers: initialJackpotPots(),
      unlockedSkins: ['classic', 'ivory'],
    };
    save(fresh);
    setPoints(fresh);
  }, []);

  const equipSkin = useCallback((id: ChipSkinId) => {
    setPoints(prev => {
      if (!prev.unlockedSkins.includes(id)) return prev;
      const next: PointsState = { ...prev, activeSkin: id };
      save(next);
      return next;
    });
  }, []);

  const unlockSkin = useCallback((id: ChipSkinId): boolean => {
    let ok = false;
    setPoints(prev => {
      if (prev.unlockedSkins.includes(id)) { ok = true; return prev; }
      const def = CHIP_SKINS[id];
      const tier = vipTierFor(prev.vipXp).tier;
      if (tier < def.vipRequired) return prev;
      ok = true;
      const next: PointsState = { ...prev, unlockedSkins: [...prev.unlockedSkins, id] };
      save(next);
      return next;
    });
    return ok;
  }, []);

  const acknowledgeAge = useCallback(() => {
    setPoints(prev => {
      const next: PointsState = { ...prev, ageAcknowledged: true };
      save(next);
      return next;
    });
  }, []);

  const addChips = useCallback((n: number) => {
    if (n <= 0) return;
    setPoints(prev => {
      const next: PointsState = { ...prev, balance: prev.balance + n };
      save(next);
      return next;
    });
  }, []);

  // ── Legacy simple API ────────────────────────────────────────────────────
  const canAfford = useCallback(
    (cost: number) => points.balance > cost,
    [points.balance]
  );

  const placeBet = useCallback(
    (cost: number): boolean => {
      if (points.balance <= cost) return false;
      setPoints(prev => {
        const next: PointsState = { ...prev, balance: prev.balance - cost };
        save(next);
        return next;
      });
      return true;
    },
    [points.balance]
  );

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
          save(next);
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
          save(next);
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
          save(next);
          return next;
        });
      }
      return delta;
    },
    []
  );

  const addBalance = useCallback((amount: number) => {
    setPoints(prev => {
      const next = { ...prev, balance: prev.balance + amount };
      save(next);
      return next;
    });
  }, []);

  const spendBalance = useCallback((cost: number): boolean => {
    let ok = false;
    setPoints(prev => {
      if (prev.balance < cost) return prev;
      ok = true;
      const next = { ...prev, balance: prev.balance - cost };
      save(next);
      return next;
    });
    return ok;
  }, []);

  return {
    points,
    dailyBonus,
    canAffordRound,
    placeRound,
    resolveRound,
    claimDailyBonus,
    resetPoints,
    totalSideBetCost,
    equipSkin,
    unlockSkin,
    acknowledgeAge,
    addChips,
    canAfford,
    placeBet,
    resolveBet,
    addBalance,
    spendBalance,
  };
}

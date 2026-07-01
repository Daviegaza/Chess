// ─── Difficulty & Levels ──────────────────────────────────────────────────────

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface TimeControl {
  initial: number;    // seconds per side
  increment: number;  // seconds added per move
}

export interface LevelConfig {
  level: DifficultyLevel;
  label: string;
  cost: number;
  reward: number;
  description: string;
  aiDepth: number;
  color: string;
  gradient: string;
  timeControl: TimeControl;
  tagline: string;   // "2+1", "10+0", "15+10", "Custom"
  icon: 'blitz' | 'rapid' | 'classic' | 'custom';
}

export const LEVEL_CONFIGS: Record<DifficultyLevel, LevelConfig> = {
  easy: {
    level: 'easy',
    label: 'BLITZ',
    tagline: '2+1',
    icon: 'blitz',
    cost: 2,
    reward: 2,
    description: 'Fast-paced skirmish. Two minutes, one second increment.',
    aiDepth: 0,
    color: '#e4b944',
    gradient: 'linear-gradient(160deg, #3a2c14 0%, #1a1208 100%)',
    timeControl: { initial: 120, increment: 1 },
  },
  medium: {
    level: 'medium',
    label: 'RAPID',
    tagline: '10+0',
    icon: 'rapid',
    cost: 4,
    reward: 4,
    description: 'Ten minutes each. The AI plans two moves ahead.',
    aiDepth: 2,
    color: '#e4b944',
    gradient: 'linear-gradient(160deg, #3a2c14 0%, #1a1208 100%)',
    timeControl: { initial: 600, increment: 0 },
  },
  hard: {
    level: 'hard',
    label: 'CLASSIC',
    tagline: '15+10',
    icon: 'classic',
    cost: 6,
    reward: 6,
    description: 'Classical time control. Depth-3 minimax with alpha-beta.',
    aiDepth: 3,
    color: '#e4b944',
    gradient: 'linear-gradient(160deg, #3a2c14 0%, #1a1208 100%)',
    timeControl: { initial: 900, increment: 10 },
  },
  expert: {
    level: 'expert',
    label: 'CUSTOM',
    tagline: 'Custom',
    icon: 'custom',
    cost: 8,
    reward: 8,
    description: 'Full depth-4 search with positional tables. Few survive.',
    aiDepth: 4,
    color: '#e4b944',
    gradient: 'linear-gradient(160deg, #3a2c14 0%, #1a1208 100%)',
    timeControl: { initial: 1800, increment: 15 },
  },
};

// ─── App Screen ───────────────────────────────────────────────────────────────

export type GameScreen = 'lobby' | 'playing' | 'result';

// ─── Game Result ──────────────────────────────────────────────────────────────

export type GameResultType = 'player_win' | 'computer_win' | 'draw';

export interface GameResult {
  type: GameResultType;
  reason: string;
  pointsChange: number;
}

// ─── Points State ─────────────────────────────────────────────────────────────

export interface PointsState {
  balance: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalEarned: number;
  totalLost: number;
  elo?: number;
  bestElo?: number;
}

export const INITIAL_POINTS: PointsState = {
  balance: 20,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  totalEarned: 0,
  totalLost: 0,
  elo: 1200,
  bestElo: 1200,
};

export const AI_ELO: Record<DifficultyLevel, number> = {
  easy:   900,
  medium: 1200,
  hard:   1600,
  expert: 2000,
};

// ── Player level progression ────────────────────────────────────────────────
// XP = totalEarned + 3 × wins + 1 × draws. Level curve: threshold(n) = 25 · n^1.6
// Rank titles bind to level bands.
export interface PlayerLevel {
  level: number;
  rank: string;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;   // 0..1
}

const RANK_TITLES = [
  { min:  1, name: 'Pawn'      },
  { min:  5, name: 'Squire'    },
  { min: 10, name: 'Knight'    },
  { min: 20, name: 'Baron'     },
  { min: 35, name: 'Duke'      },
  { min: 50, name: 'Prince'    },
  { min: 75, name: 'Sovereign' },
];

function threshold(level: number): number {
  return Math.round(25 * Math.pow(level, 1.6));
}

export function getPlayerLevel(p: PointsState): PlayerLevel {
  const xp = p.totalEarned + p.totalWins * 3 + p.totalDraws;
  let level = 1;
  while (xp >= threshold(level + 1)) level++;
  const base = level === 1 ? 0 : threshold(level);
  const next = threshold(level + 1);
  const xpIntoLevel = xp - base;
  const xpForNextLevel = next - base;
  const rank = RANK_TITLES.reduce((r, t) => level >= t.min ? t.name : r, 'Pawn');
  return {
    level,
    rank,
    xp,
    xpIntoLevel,
    xpForNextLevel,
    progress: xpForNextLevel > 0 ? Math.min(1, xpIntoLevel / xpForNextLevel) : 1,
  };
}

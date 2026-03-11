// ─── Difficulty & Levels ──────────────────────────────────────────────────────

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface LevelConfig {
  level: DifficultyLevel;
  label: string;
  cost: number;
  reward: number;
  description: string;
  aiDepth: number;
  color: string;
  gradient: string;
}

export const LEVEL_CONFIGS: Record<DifficultyLevel, LevelConfig> = {
  easy: {
    level: 'easy',
    label: 'EASY',
    cost: 2,
    reward: 2,
    description: 'The AI plays randomly. A warm-up for beginners.',
    aiDepth: 0,
    color: '#4ade80',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
  },
  medium: {
    level: 'medium',
    label: 'MEDIUM',
    cost: 4,
    reward: 4,
    description: 'The AI plans 2 moves ahead. A real challenge begins.',
    aiDepth: 2,
    color: '#facc15',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 100%)',
  },
  hard: {
    level: 'hard',
    label: 'HARD',
    cost: 6,
    reward: 6,
    description: 'Depth-3 minimax with alpha-beta pruning. Think carefully.',
    aiDepth: 3,
    color: '#fb923c',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
  },
  expert: {
    level: 'expert',
    label: 'EXPERT',
    cost: 8,
    reward: 8,
    description: 'Full depth-4 search with positional tables. Few survive.',
    aiDepth: 4,
    color: '#f87171',
    gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)',
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
}

export const INITIAL_POINTS: PointsState = {
  balance: 20,
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  totalEarned: 0,
  totalLost: 0,
};

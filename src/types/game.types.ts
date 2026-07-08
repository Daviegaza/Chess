// ─── Difficulty & Levels ──────────────────────────────────────────────────────

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert' | 'highroller';

export interface TimeControl {
  initial: number;    // seconds per side
  increment: number;  // seconds added per move
}

// ─── Time Control Presets ─────────────────────────────────────────────────────

export type TimePresetId =
  | 'bullet1_0' | 'bullet2_1'
  | 'blitz3_0' | 'blitz3_2' | 'blitz5_0' | 'blitz5_3'
  | 'rapid10_0' | 'rapid10_5' | 'rapid15_10'
  | 'classic25_10' | 'classic30_20'
  | 'marathon60_30'
  | 'custom';

export interface TimePreset {
  id: TimePresetId;
  label: string;
  group: 'Bullet' | 'Blitz' | 'Rapid' | 'Classic' | 'Marathon' | 'Custom';
  tc: TimeControl;
  color: string;
}

export const TIME_PRESETS: TimePreset[] = [
  { id: 'bullet1_0',   label: '1 + 0',    group: 'Bullet',   tc: { initial: 60,   increment: 0  }, color: '#ef4444' },
  { id: 'bullet2_1',   label: '2 + 1',    group: 'Bullet',   tc: { initial: 120,  increment: 1  }, color: '#fb7185' },
  { id: 'blitz3_0',    label: '3 + 0',    group: 'Blitz',    tc: { initial: 180,  increment: 0  }, color: '#f97316' },
  { id: 'blitz3_2',    label: '3 + 2',    group: 'Blitz',    tc: { initial: 180,  increment: 2  }, color: '#fbbf24' },
  { id: 'blitz5_0',    label: '5 + 0',    group: 'Blitz',    tc: { initial: 300,  increment: 0  }, color: '#fbbf24' },
  { id: 'blitz5_3',    label: '5 + 3',    group: 'Blitz',    tc: { initial: 300,  increment: 3  }, color: '#facc15' },
  { id: 'rapid10_0',   label: '10 + 0',   group: 'Rapid',    tc: { initial: 600,  increment: 0  }, color: '#10b981' },
  { id: 'rapid10_5',   label: '10 + 5',   group: 'Rapid',    tc: { initial: 600,  increment: 5  }, color: '#10b981' },
  { id: 'rapid15_10',  label: '15 + 10',  group: 'Rapid',    tc: { initial: 900,  increment: 10 }, color: '#22d3ee' },
  { id: 'classic25_10',label: '25 + 10',  group: 'Classic',  tc: { initial: 1500, increment: 10 }, color: '#8b5cf6' },
  { id: 'classic30_20',label: '30 + 20',  group: 'Classic',  tc: { initial: 1800, increment: 20 }, color: '#a78bfa' },
  { id: 'marathon60_30', label: '60 + 30', group: 'Marathon', tc: { initial: 3600, increment: 30 }, color: '#f472b6' },
  { id: 'custom',      label: 'CUSTOM',   group: 'Custom',   tc: { initial: 600,  increment: 5  }, color: '#e2e8f0' },
];

export const TIME_PRESET_MAP: Record<TimePresetId, TimePreset> =
  TIME_PRESETS.reduce((acc, p) => { acc[p.id] = p; return acc; }, {} as Record<TimePresetId, TimePreset>);

export function formatTimeControl(tc: TimeControl): string {
  const m = tc.initial >= 60
    ? `${Math.round((tc.initial / 60) * 10) / 10}m`
    : `${tc.initial}s`;
  return `${m} + ${tc.increment}s`;
}

export function matchPreset(tc: TimeControl): TimePresetId {
  for (const p of TIME_PRESETS) {
    if (p.id === 'custom') continue;
    if (p.tc.initial === tc.initial && p.tc.increment === tc.increment) return p.id;
  }
  return 'custom';
}

export interface LevelConfig {
  level: DifficultyLevel;
  label: string;
  cost: number;
  reward: number;
  jackpotContribution: number;
  description: string;
  aiDepth: number;
  color: string;
  glow: string;
  gradient: string;
  timeControl: TimeControl;
  tagline: string;
  icon: 'blitz' | 'rapid' | 'classic' | 'custom';
  vipRequired: number;
}

export const LEVEL_CONFIGS: Record<DifficultyLevel, LevelConfig> = {
  easy: {
    level: 'easy',
    label: 'PAWN LOUNGE',
    tagline: '2+1 Blitz',
    icon: 'blitz',
    cost: 5,
    reward: 5,
    jackpotContribution: 1,
    description: 'Warm-up table. AI plays random legal moves — learn the ropes.',
    aiDepth: 0,
    color: '#94a3b8',
    glow: 'rgba(148,163,184,0.55)',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    timeControl: { initial: 120, increment: 1 },
    vipRequired: 0,
  },
  medium: {
    level: 'medium',
    label: "KNIGHT'S GAMBIT",
    tagline: '10+0 Rapid',
    icon: 'rapid',
    cost: 15,
    reward: 20,
    jackpotContribution: 2,
    description: 'Depth-2 minimax. The AI starts thinking ahead — sharpen your reads.',
    aiDepth: 2,
    color: '#e2e8f0',
    glow: 'rgba(226,232,240,0.55)',
    gradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
    timeControl: { initial: 600, increment: 0 },
    vipRequired: 0,
  },
  hard: {
    level: 'hard',
    label: 'ROOK COURT',
    tagline: '15+10 Classic',
    icon: 'classic',
    cost: 40,
    reward: 60,
    jackpotContribution: 5,
    description: 'Depth-3 alpha-beta search. Serious action — expect a real battle.',
    aiDepth: 3,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.6)',
    gradient: 'linear-gradient(135deg, #422006 0%, #78350f 100%)',
    timeControl: { initial: 900, increment: 10 },
    vipRequired: 1,
  },
  expert: {
    level: 'expert',
    label: "QUEEN'S GALLERY",
    tagline: '25+10 Master',
    icon: 'custom',
    cost: 100,
    reward: 180,
    jackpotContribution: 12,
    description: 'Depth-4 with positional tables. Only masters survive.',
    aiDepth: 4,
    color: '#8b5cf6',
    glow: 'rgba(139,92,246,0.65)',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #5b21b6 100%)',
    timeControl: { initial: 1500, increment: 10 },
    vipRequired: 2,
  },
  highroller: {
    level: 'highroller',
    label: "KING'S THRONE",
    tagline: 'High Roller',
    icon: 'custom',
    cost: 250,
    reward: 550,
    jackpotContribution: 30,
    description: 'Depth-5 endgame precision. Only the crowned survive the throne.',
    aiDepth: 5,
    color: '#fb7185',
    glow: 'rgba(251,113,133,0.65)',
    gradient: 'linear-gradient(135deg, #4c0519 0%, #9f1239 100%)',
    timeControl: { initial: 1800, increment: 15 },
    vipRequired: 4,
  },
};

// ─── App Screen ───────────────────────────────────────────────────────────────

export type GameScreen = 'lobby' | 'playing' | 'result';

// ─── Side Bets ────────────────────────────────────────────────────────────────

export type SideBetId = 'firstCapture' | 'crownPromotion' | 'pinsAndForks' | 'flawless';

export interface SideBetConfig {
  id: SideBetId;
  label: string;
  hint: string;
  cost: number;
  payoutMultiplier: number;
  color: string;
}

export const SIDE_BETS: Record<SideBetId, SideBetConfig> = {
  firstCapture: {
    id: 'firstCapture',
    label: 'First Capture',
    hint: 'You make the first capture of the round.',
    cost: 5,
    payoutMultiplier: 1.5,
    color: '#ef4444',
  },
  crownPromotion: {
    id: 'crownPromotion',
    label: 'Crown Promotion',
    hint: 'You promote at least one pawn this round.',
    cost: 10,
    payoutMultiplier: 2,
    color: '#fbbf24',
  },
  pinsAndForks: {
    id: 'pinsAndForks',
    label: 'Pins & Forks',
    hint: 'Win the round while capturing 5+ enemy pieces.',
    cost: 15,
    payoutMultiplier: 3,
    color: '#8b5cf6',
  },
  flawless: {
    id: 'flawless',
    label: 'Flawless',
    hint: 'Win without losing a single piece.',
    cost: 25,
    payoutMultiplier: 8,
    color: '#10b981',
  },
};

export interface SideBetState {
  active: Record<SideBetId, boolean>;
  firstCapturePlayer: 'white' | 'black' | null;
  playerPromotions: number;
  piecesCapturedByPlayer: number;
  piecesLostByPlayer: number;
}

export function makeInitialSideBetState(): SideBetState {
  return {
    active: { firstCapture: false, crownPromotion: false, pinsAndForks: false, flawless: false },
    firstCapturePlayer: null,
    playerPromotions: 0,
    piecesCapturedByPlayer: 0,
    piecesLostByPlayer: 0,
  };
}

// ─── Game Result ──────────────────────────────────────────────────────────────

export type GameResultType = 'player_win' | 'computer_win' | 'draw';

export interface SideBetOutcome {
  id: SideBetId;
  won: boolean;
  payout: number;
  stake: number;
}

export interface RoundMetricDelta {
  roundsPlayed: number;
  roundsWon: number;
  piecesCaptured: number;
  promotions: number;
  checkmates: number;
  sideBetsWon: number;
  streakLen: number;
  chipsWon: number;
}

export interface MissionProgressReport {
  templateId: string;
  before: number;
  after: number;
  target: number;
  justCompleted: boolean;
}

export interface GameResult {
  type: GameResultType;
  reason: string;
  pointsChange: number;
  basePayout: number;
  streakBonus: number;
  sideBetOutcomes: SideBetOutcome[];
  jackpotHit: boolean;
  jackpotAmount: number;
  jackpotTierHit: JackpotTierId | null;
  newAchievements: Achievement[];
  vipXpGained: number;
  missionReports: MissionProgressReport[];
}

// ─── Multi-tier Jackpot ───────────────────────────────────────────────────────

export type JackpotTierId = 'mini' | 'minor' | 'major' | 'grand';

export interface JackpotTierDef {
  id: JackpotTierId;
  label: string;
  color: string;
  seed: number;
  baseHitChance: number;
  contributionShare: number;
}

export const JACKPOT_TIERS: Record<JackpotTierId, JackpotTierDef> = {
  mini:  { id: 'mini',  label: 'MINI',  color: '#e2e8f0', seed: 100,   baseHitChance: 1 / 40,   contributionShare: 0.20 },
  minor: { id: 'minor', label: 'MINOR', color: '#10b981', seed: 300,   baseHitChance: 1 / 160,  contributionShare: 0.30 },
  major: { id: 'major', label: 'MAJOR', color: '#fbbf24', seed: 800,   baseHitChance: 1 / 700,  contributionShare: 0.30 },
  grand: { id: 'grand', label: 'GRAND', color: '#8b5cf6', seed: 2500,  baseHitChance: 1 / 3500, contributionShare: 0.20 },
};

export const JACKPOT_TIER_ORDER: JackpotTierId[] = ['mini', 'minor', 'major', 'grand'];

export function initialJackpotPots(): Record<JackpotTierId, number> {
  return {
    mini:  JACKPOT_TIERS.mini.seed,
    minor: JACKPOT_TIERS.minor.seed,
    major: JACKPOT_TIERS.major.seed,
    grand: JACKPOT_TIERS.grand.seed,
  };
}

// ─── Daily Missions ───────────────────────────────────────────────────────────

export type MissionMetric =
  | 'roundsPlayed' | 'roundsWon' | 'piecesCaptured'
  | 'promotions' | 'checkmates' | 'sideBetsWon' | 'streakLen' | 'chipsWon';

export interface MissionTemplate {
  id: string;
  label: string;
  hint: string;
  metric: MissionMetric;
  target: number;
  reward: number;
  icon: string;
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'play_3',      label: 'Warm the Board', hint: 'Play 3 rounds today.',           metric: 'roundsPlayed',   target: 3,   reward: 40,  icon: '♟' },
  { id: 'win_2',       label: 'Winner Winner',  hint: 'Win 2 rounds today.',            metric: 'roundsWon',      target: 2,   reward: 100, icon: '♛' },
  { id: 'cap_10',      label: 'Sharp Blade',    hint: 'Capture 10 pieces today.',       metric: 'piecesCaptured', target: 10,  reward: 75,  icon: '⚔' },
  { id: 'promote_2',   label: 'Crownsmith',     hint: 'Promote 2 pawns today.',         metric: 'promotions',     target: 2,   reward: 90,  icon: '♕' },
  { id: 'mate_1',      label: 'Regicide',       hint: 'Deliver 1 checkmate today.',     metric: 'checkmates',     target: 1,   reward: 120, icon: '♚' },
  { id: 'sidebet_1',   label: 'Table Whisper',  hint: 'Hit 1 side bet today.',          metric: 'sideBetsWon',    target: 1,   reward: 60,  icon: '★' },
  { id: 'streak_2',    label: 'Momentum',       hint: 'Reach a 2-game streak.',         metric: 'streakLen',      target: 2,   reward: 120, icon: '✦' },
  { id: 'chips_200',   label: 'Payday',         hint: 'Earn 200 net chips today.',      metric: 'chipsWon',       target: 200, reward: 150, icon: '◈' },
  { id: 'win_rook',    label: 'Big Leagues',    hint: 'Win 1 at Rook Court or higher.', metric: 'roundsWon',      target: 1,   reward: 200, icon: '◆' },
];

export interface DailyMission {
  templateId: string;
  progress: number;
  target: number;
  claimed: boolean;
}

export interface MissionsState {
  seedDay: number;
  missions: DailyMission[];
}

// ─── Chip / Board Skins ───────────────────────────────────────────────────────

export type ChipSkinId = 'classic' | 'ivory' | 'sapphire' | 'emerald' | 'imperial';

export interface ChipSkinDef {
  id: ChipSkinId;
  label: string;
  playerColor: string;
  houseColor: string;
  boardDark: string;
  boardLight: string;
  vipRequired: number;
}

export const CHIP_SKINS: Record<ChipSkinId, ChipSkinDef> = {
  classic:  { id: 'classic',  label: 'Kingfall',    playerColor: '#fbbf24', houseColor: '#e2e8f0', boardDark: '#365f48', boardLight: '#efe2b8', vipRequired: 0 },
  ivory:    { id: 'ivory',    label: 'Ivory Court', playerColor: '#f5e9d0', houseColor: '#5b21b6', boardDark: '#3f2a1a', boardLight: '#f4e8c8', vipRequired: 0 },
  sapphire: { id: 'sapphire', label: 'Sapphire',    playerColor: '#38bdf8', houseColor: '#e2e8f0', boardDark: '#0e3a5a', boardLight: '#dce8f4', vipRequired: 1 },
  emerald:  { id: 'emerald',  label: 'Emerald',     playerColor: '#10b981', houseColor: '#e2e8f0', boardDark: '#0e4a2a', boardLight: '#e0f0d4', vipRequired: 2 },
  imperial: { id: 'imperial', label: 'Imperial',    playerColor: '#8b5cf6', houseColor: '#fbbf24', boardDark: '#2e1065', boardLight: '#eadff0', vipRequired: 3 },
};

export const CHIP_SKIN_ORDER: ChipSkinId[] = ['classic', 'ivory', 'sapphire', 'emerald', 'imperial'];

// ─── Points / Wallet ──────────────────────────────────────────────────────────

export interface PointsState {
  balance: number;
  jackpot: number;
  jackpotTiers: Record<JackpotTierId, number>;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalEarned: number;
  totalLost: number;
  winStreak: number;
  bestStreak: number;
  biggestWin: number;
  vipXp: number;
  lastDailyBonusAt: number;
  unlockedAchievements: string[];
  activeSkin: ChipSkinId;
  unlockedSkins: ChipSkinId[];
  ageAcknowledged: boolean;
  elo?: number;
  bestElo?: number;
}

export const INITIAL_JACKPOT = JACKPOT_TIERS.mini.seed + JACKPOT_TIERS.minor.seed +
  JACKPOT_TIERS.major.seed + JACKPOT_TIERS.grand.seed;

export const INITIAL_POINTS: PointsState = {
  balance: 100,
  jackpot: INITIAL_JACKPOT,
  jackpotTiers: initialJackpotPots(),
  totalWins: 0,
  totalLosses: 0,
  totalDraws: 0,
  totalEarned: 0,
  totalLost: 0,
  winStreak: 0,
  bestStreak: 0,
  biggestWin: 0,
  vipXp: 0,
  lastDailyBonusAt: 0,
  unlockedAchievements: [],
  activeSkin: 'classic',
  unlockedSkins: ['classic', 'ivory'],
  ageAcknowledged: false,
  elo: 1200,
  bestElo: 1200,
};

export const AI_ELO: Record<DifficultyLevel, number> = {
  easy:       900,
  medium:    1200,
  hard:      1600,
  expert:    2000,
  highroller: 2400,
};

// ─── Streak → Multiplier ──────────────────────────────────────────────────────
export function streakMultiplier(streak: number): number {
  if (streak >= 8) return 3.0;
  if (streak >= 5) return 2.0;
  if (streak >= 3) return 1.5;
  if (streak >= 2) return 1.25;
  return 1;
}

// ─── VIP tiers ────────────────────────────────────────────────────────────────

export interface VipTier {
  tier: number;
  label: string;
  xpRequired: number;
  color: string;
  perk: string;
}

export const VIP_TIERS: VipTier[] = [
  { tier: 0, label: 'Guest',    xpRequired: 0,     color: '#94a3b8', perk: "Access to Pawn Lounge & Knight's Gambit." },
  { tier: 1, label: 'Regular',  xpRequired: 150,   color: '#cbd5e1', perk: 'Unlock Rook Court tables.' },
  { tier: 2, label: 'Silver',   xpRequired: 500,   color: '#e2e8f0', perk: "Unlock Queen's Gallery. +5% daily bonus." },
  { tier: 3, label: 'Gold',     xpRequired: 1500,  color: '#fbbf24', perk: '+10% daily bonus. Imperial skin available.' },
  { tier: 4, label: 'Diamond',  xpRequired: 4000,  color: '#38bdf8', perk: "Unlock King's Throne high-roller table." },
  { tier: 5, label: 'Sovereign',xpRequired: 10000, color: '#8b5cf6', perk: '+20% daily bonus. Jackpot odds boost.' },
];

export function vipTierFor(xp: number): VipTier {
  let cur = VIP_TIERS[0];
  for (const t of VIP_TIERS) {
    if (xp >= t.xpRequired) cur = t;
  }
  return cur;
}

export function nextVipTier(xp: number): VipTier | null {
  for (const t of VIP_TIERS) {
    if (xp < t.xpRequired) return t;
  }
  return null;
}

// ─── Daily Bonus ──────────────────────────────────────────────────────────────

export const DAILY_BONUS_MS = 20 * 60 * 60 * 1000; // 20h cooldown
export const DAILY_BONUS_BASE = 50;

export function dailyBonusAmount(vipTier: number): number {
  const boost = vipTier >= 5 ? 1.2 : vipTier >= 3 ? 1.1 : vipTier >= 2 ? 1.05 : 1;
  return Math.floor(DAILY_BONUS_BASE * boost);
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  label: string;
  hint: string;
  reward: number;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win',    label: 'First Blood',     hint: 'Win your first round.',                    reward: 25,  icon: '◎' },
  { id: 'streak_3',     label: 'Hot Hand',        hint: 'Win 3 rounds in a row.',                   reward: 50,  icon: '✦' },
  { id: 'streak_5',     label: 'On Fire',         hint: 'Win 5 rounds in a row.',                   reward: 150, icon: '✵' },
  { id: 'crush_5',      label: 'Executioner',     hint: 'Capture 5+ pieces in one round.',          reward: 75,  icon: '⚔' },
  { id: 'flawless',     label: 'Untouchable',     hint: 'Win without losing a piece.',              reward: 200, icon: '◈' },
  { id: 'jackpot',      label: 'Jackpot!',        hint: 'Hit the progressive jackpot.',             reward: 0,   icon: '★' },
  { id: 'rook_table',   label: 'Big Leagues',     hint: 'Win at Rook Court or higher.',             reward: 100, icon: '♛' },
  { id: 'throne_win',   label: 'Crowned Regent',  hint: "Win at the King's Throne high-roller.",    reward: 500, icon: '♔' },
];

// ─── Jackpot ──────────────────────────────────────────────────────────────────

export function jackpotHitChance(cfg: LevelConfig, vipTier: number): number {
  const base = 1 / 500;
  const tierBoost = 1 + cfg.jackpotContribution / 30;
  const whaleBoost = vipTier >= 5 ? 1.5 : 1;
  return base * tierBoost * whaleBoost;
}

// ── Player level progression ────────────────────────────────────────────────
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

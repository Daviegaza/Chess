import React, { useState, useEffect } from 'react';
import type { PointsState } from '../types/game.types';
import ChessPiece from './ChessPiece';
import { sfx } from '../utils/soundEngine';

export type LobbyPage =
  | 'lobby' | 'chess' | 'social' | 'shop'
  | 'rewards' | 'vip' | 'tournaments' | 'leaderboard';

interface ShellCore {
  onBack: () => void;
  maxWidth: number | string;
}
interface PageShellProps extends ShellCore {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

const PageShell: React.FC<PageShellProps> = ({ title, subtitle, onBack, maxWidth, children }) => (
  <div style={{ width: '100%', maxWidth, display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', marginBottom: 4 }}>
      <button className="kf-icon-btn" onClick={() => { sfx.click(); onBack(); }} aria-label="Back">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div style={{ textAlign: 'center' }}>
        <div className="kf-serif kf-gold-text" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '0.22em' }}>
          {title.toUpperCase()}
        </div>
        {subtitle && <div className="kf-eyebrow" style={{ marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ width: 40 }} />
    </div>
    {children}
  </div>
);

interface Callbacks {
  onQuickPlay: (level: 'easy' | 'medium' | 'hard' | 'expert') => void;
  addBalance: (amount: number) => void;
}

// ── Chess Modes ──────────────────────────────────────────────────────────────
const ChessModesPage: React.FC<ShellCore & Callbacks> = ({ onBack, maxWidth, onQuickPlay }) => {
  const modes = [
    { level: 'easy'   as const, name: 'Blitz',   tc: '2 + 1',   piece: 'pawn'   as const, desc: 'Fast-paced skirmish',    diff: 'EASY',   tint: '#4ade80', ai: 900,  cost: 2, reward: 2 },
    { level: 'medium' as const, name: 'Rapid',   tc: '10 + 0',  piece: 'knight' as const, desc: 'Mid-tempo contest',      diff: 'MEDIUM', tint: '#e4b944', ai: 1200, cost: 4, reward: 4 },
    { level: 'hard'   as const, name: 'Classic', tc: '15 + 10', piece: 'rook'   as const, desc: 'Classical challenge',    diff: 'HARD',   tint: '#f0a030', ai: 1600, cost: 6, reward: 6 },
    { level: 'expert' as const, name: 'Master',  tc: '30 + 15', piece: 'queen'  as const, desc: 'For the truly skilled',  diff: 'EXPERT', tint: '#d94848', ai: 2000, cost: 8, reward: 8 },
  ];
  return (
    <PageShell title="Chess Modes" subtitle="Choose your difficulty" onBack={onBack} maxWidth={maxWidth}>
      {modes.map(m => (
        <div
          key={m.level}
          className="kf-panel kf-panel--interactive"
          onClick={() => { sfx.click(); onQuickPlay(m.level); }}
          style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}
        >
          <div style={{ filter: 'drop-shadow(0 4px 8px rgba(228,185,68,0.35))' }}>
            <ChessPiece piece={{ type: m.piece, color: 'white' }} size={48} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="kf-serif" style={{ color: '#e4b944', fontSize: 15, fontWeight: 700, letterSpacing: '0.18em' }}>
                {m.name.toUpperCase()}
              </div>
              <span style={{
                background: m.tint + '25', color: m.tint,
                fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4,
                letterSpacing: '0.15em', fontFamily: "'Cinzel', serif",
              }}>{m.diff}</span>
            </div>
            <div className="kf-eyebrow" style={{ marginTop: 4 }}>
              {m.tc} · AI {m.ai} · {m.desc}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
              <span className="kf-eyebrow" style={{ color: '#d94848' }}>WAGER {m.cost}</span>
              <span className="kf-eyebrow" style={{ color: '#4ade80' }}>WIN +{m.reward}</span>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="#e4b944" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      ))}
    </PageShell>
  );
};

// ── Daily Rewards ────────────────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
interface StreakState { lastClaim: number | null; streak: number; }
const REWARDS_KEY = 'chess_daily_streak_v1';

function loadStreak(): StreakState {
  try {
    const raw = localStorage.getItem(REWARDS_KEY);
    if (raw) return JSON.parse(raw) as StreakState;
  } catch { /* ignore */ }
  return { lastClaim: null, streak: 0 };
}
function saveStreak(s: StreakState) {
  try { localStorage.setItem(REWARDS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

const RewardsPage: React.FC<ShellCore & Callbacks> = ({ onBack, maxWidth, addBalance }) => {
  const [s, setS] = useState<StreakState>(loadStreak);
  const now = Date.now();
  const canClaim = !s.lastClaim || (now - s.lastClaim) >= DAY_MS;
  const rewardForDay = (d: number) => [5, 10, 15, 25, 40, 60, 100][Math.min(6, Math.max(0, d))];

  const claim = () => {
    if (!canClaim) return;
    const isFresh = !s.lastClaim || (now - s.lastClaim) > 2 * DAY_MS;
    const nextStreak = isFresh ? 1 : Math.min(7, s.streak + 1);
    const reward = rewardForDay(nextStreak - 1);
    const next = { lastClaim: now, streak: nextStreak };
    saveStreak(next);
    setS(next);
    addBalance(reward);
    sfx.victory();
  };

  return (
    <PageShell title="Daily Rewards" subtitle="Return every day for bonus pts" onBack={onBack} maxWidth={maxWidth}>
      <div className="kf-panel" style={{ padding: '18px 18px 20px' }}>
        <div className="kf-eyebrow" style={{ marginBottom: 8 }}>Login Streak · {s.streak} / 7</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {[0,1,2,3,4,5,6].map(i => {
            const done = i < s.streak;
            const isToday = i === s.streak && canClaim;
            return (
              <div key={i} style={{
                border: `1px solid ${done ? 'rgba(74,222,128,0.6)' : isToday ? 'var(--kf-gold-light)' : 'var(--kf-border)'}`,
                borderRadius: 8, padding: '10px 4px', textAlign: 'center',
                background: done ? 'rgba(74,222,128,0.08)' : isToday ? 'rgba(228,185,68,0.12)' : 'transparent',
              }}>
                <div className="kf-eyebrow" style={{ fontSize: 8 }}>DAY {i+1}</div>
                <div className="kf-serif" style={{
                  color: done ? '#4ade80' : isToday ? '#e4b944' : 'var(--kf-muted)',
                  fontSize: 13, fontWeight: 900, marginTop: 4,
                }}>
                  +{rewardForDay(i)}
                </div>
              </div>
            );
          })}
        </div>
        <button
          disabled={!canClaim}
          onClick={claim}
          className="kf-btn kf-btn--gold kf-btn--full"
          style={{ marginTop: 18 }}
        >
          {canClaim ? `CLAIM +${rewardForDay(s.streak)} PTS` : 'CLAIMED · COME BACK TOMORROW'}
        </button>
      </div>
    </PageShell>
  );
};

// ── VIP Club ─────────────────────────────────────────────────────────────────
const VIPPage: React.FC<ShellCore & { points: PointsState }> = ({ onBack, maxWidth, points }) => {
  const tiers = [
    { name: 'Squire',    min:  100, color: '#7a5f2c', perk: '5% bonus on wins' },
    { name: 'Knight',    min:  800, color: '#b39558', perk: '10% bonus + 1 free daily challenge' },
    { name: 'Baron',     min: 1200, color: '#e4b944', perk: '15% bonus + custom piece skin' },
    { name: 'Duke',      min: 1600, color: '#f4d67a', perk: '20% bonus + priority match-making' },
    { name: 'Sovereign', min: 2000, color: '#ffe28e', perk: 'Unlimited rewards, custom board' },
  ];
  const elo = points.elo ?? 1200;
  const currentIdx = tiers.reduce((idx, t, i) => elo >= t.min ? i : idx, 0);
  return (
    <PageShell title="VIP Club" onBack={onBack} maxWidth={maxWidth}>
      {tiers.map((t, i) => {
        const isCurrent = i === currentIdx;
        const locked = elo < t.min;
        return (
          <div key={t.name} className="kf-panel" style={{
            padding: 14,
            border: `1px solid ${isCurrent ? 'var(--kf-gold-light)' : 'var(--kf-border)'}`,
            opacity: locked ? 0.55 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${t.color}, #14100a)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: '#14100a',
              }}>♛</div>
              <div style={{ flex: 1 }}>
                <div className="kf-serif" style={{ color: t.color, fontSize: 15, fontWeight: 700, letterSpacing: '0.16em' }}>
                  {t.name.toUpperCase()}
                </div>
                <div className="kf-eyebrow" style={{ marginTop: 2 }}>{t.perk}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="kf-eyebrow">Rating ≥</div>
                <div className="kf-serif" style={{ color: '#e8d59a', fontSize: 15, fontWeight: 700 }}>{t.min}</div>
                {isCurrent && <div className="kf-eyebrow" style={{ color: '#4ade80', marginTop: 2 }}>YOU</div>}
              </div>
            </div>
          </div>
        );
      })}
    </PageShell>
  );
};

// ── Tournaments ──────────────────────────────────────────────────────────────
const TournamentsPage: React.FC<ShellCore & Callbacks> = ({ onBack, maxWidth, onQuickPlay }) => {
  const ts = [
    { name: 'Sunset Blitz Arena', startsIn: '2h 18m', buyIn: 5,  prize: 240,  level: 'easy'   as const },
    { name: 'Golden Rapid Cup',   startsIn: '5h 40m', buyIn: 10, prize: 600,  level: 'medium' as const },
    { name: 'Kingfall Classic',   startsIn: '1d 4h',  buyIn: 20, prize: 1800, level: 'hard'   as const },
    { name: 'Master Grand Prix',  startsIn: '3d 2h',  buyIn: 50, prize: 8000, level: 'expert' as const },
  ];
  return (
    <PageShell title="Tournaments" onBack={onBack} maxWidth={maxWidth}>
      {ts.map(t => (
        <div key={t.name} className="kf-panel kf-panel--interactive"
             onClick={() => { sfx.click(); onQuickPlay(t.level); }}
             style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div className="kf-serif" style={{ color: '#e8d59a', fontSize: 15, fontWeight: 700 }}>{t.name}</div>
              <div className="kf-eyebrow" style={{ marginTop: 4 }}>Starts in {t.startsIn} · Buy-in {t.buyIn} pts</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="kf-eyebrow">Prize Pool</div>
              <div className="kf-serif" style={{ color: '#e4b944', fontSize: 18, fontWeight: 900 }}>
                {t.prize.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </PageShell>
  );
};

// ── Leaderboard ──────────────────────────────────────────────────────────────
const LeaderboardPage: React.FC<ShellCore & { points: PointsState }> = ({ onBack, maxWidth, points }) => {
  const top = [
    { name: 'MagnusReturns', elo: 2891, flag: '🇳🇴', isYou: false },
    { name: 'AlphaZeroFan',  elo: 2734, flag: '🇺🇸', isYou: false },
    { name: 'NimzoLives',    elo: 2612, flag: '🇩🇪', isYou: false },
    { name: 'QueenSacrifice',elo: 2508, flag: '🇷🇺', isYou: false },
    { name: 'BongcloudMain', elo: 2401, flag: '🇮🇳', isYou: false },
    { name: 'GrandMasterX',  elo: 2314, flag: '🇺🇸', isYou: false },
    { name: 'KingfallOG',    elo: 2210, flag: '🇬🇧', isYou: false },
    { name: 'BlitzKrieg',    elo: 2088, flag: '🇫🇷', isYou: false },
    { name: 'You',           elo: points.elo ?? 1200, flag: '🇬🇧', isYou: true },
  ].sort((a, b) => b.elo - a.elo);

  return (
    <PageShell title="Leaderboard" onBack={onBack} maxWidth={maxWidth}>
      <div className="kf-panel" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid var(--kf-hairline)',
          display: 'grid', gridTemplateColumns: '30px 1fr 60px', gap: 8,
        }}>
          <span className="kf-eyebrow">#</span>
          <span className="kf-eyebrow">Player</span>
          <span className="kf-eyebrow" style={{ textAlign: 'right' }}>Rating</span>
        </div>
        {top.map((p, i) => (
          <div key={p.name} style={{
            padding: '10px 14px',
            display: 'grid', gridTemplateColumns: '30px 1fr 60px', gap: 8, alignItems: 'center',
            background: p.isYou ? 'rgba(228,185,68,0.10)' : 'transparent',
            borderBottom: '1px solid var(--kf-hairline)',
          }}>
            <span className="kf-serif" style={{
              color: i < 3 ? '#e4b944' : 'var(--kf-muted)',
              fontSize: 14, fontWeight: 900,
            }}>{i+1}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{p.flag}</span>
              <span className="kf-serif" style={{
                color: p.isYou ? '#e4b944' : 'var(--kf-cream)',
                fontSize: 13, fontWeight: 700,
              }}>{p.name}</span>
            </div>
            <span className="kf-serif" style={{
              color: 'var(--kf-gold-light)', fontSize: 14, fontWeight: 700, textAlign: 'right',
            }}>{p.elo}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

// ── Social ───────────────────────────────────────────────────────────────────
const SocialPage: React.FC<ShellCore> = ({ onBack, maxWidth }) => {
  const friends = [
    { name: 'Alexei',  status: 'Online · in Rapid',        elo: 1650, online: true  },
    { name: 'Sofia',   status: 'In Blitz vs GrandMasterX', elo: 1720, online: true  },
    { name: 'Marcus',  status: 'Idle',                     elo: 1480, online: true  },
    { name: 'Rani',    status: 'Offline · 2h ago',         elo: 1910, online: false },
    { name: 'Yusuf',   status: 'Offline · 1d ago',         elo: 1580, online: false },
  ];
  return (
    <PageShell title="Social" subtitle="Your Kingfall circle" onBack={onBack} maxWidth={maxWidth}>
      <div className="kf-panel" style={{ padding: 14 }}>
        <div className="kf-eyebrow" style={{ marginBottom: 10 }}>
          Friends · {friends.filter(f => f.online).length} online
        </div>
        {friends.map(f => (
          <div key={f.name} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: '1px solid var(--kf-hairline)',
          }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(160deg, #2a1e0f 0%, #14100a 100%)',
                border: '1px solid var(--kf-border-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#e4b944', fontSize: 14, fontWeight: 700,
              }}>{f.name[0]}</div>
              <span style={{
                position: 'absolute', bottom: -1, right: -1,
                width: 10, height: 10, borderRadius: '50%',
                background: f.online ? '#4ade80' : '#4a4a4a',
                border: '2px solid #14100a',
              }} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="kf-serif" style={{ color: 'var(--kf-cream)', fontSize: 14, fontWeight: 700 }}>{f.name}</div>
              <div className="kf-eyebrow" style={{ marginTop: 2, color: f.online ? '#e4b944' : 'var(--kf-muted)' }}>
                {f.status}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="kf-eyebrow">Elo</div>
              <div className="kf-serif" style={{ color: 'var(--kf-gold-light)', fontSize: 13, fontWeight: 700 }}>
                {f.elo}
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

// ── Shop ─────────────────────────────────────────────────────────────────────
const SHOP_KEY = 'chess_shop_v1';
interface ShopState { unlocked: string[]; active: string; }

const ShopPage: React.FC<ShellCore & { points: PointsState; onSpend: (cost: number) => boolean }> = ({
  onBack, maxWidth, points, onSpend,
}) => {
  const [shop, setShop] = useState<ShopState>(() => {
    try {
      const raw = localStorage.getItem(SHOP_KEY);
      if (raw) return JSON.parse(raw) as ShopState;
    } catch { /* ignore */ }
    return { unlocked: ['classic'], active: 'classic' };
  });

  const items = [
    { id: 'classic', name: 'Kingfall Classic', cost: 0,   piece: 'king'   as const, color: 'white' as const, desc: 'Golden default set' },
    { id: 'onyx',    name: 'Onyx & Ivory',     cost: 50,  piece: 'queen'  as const, color: 'black' as const, desc: 'Deep-carved shadow set' },
    { id: 'jade',    name: 'Jade Dynasty',     cost: 120, piece: 'knight' as const, color: 'white' as const, desc: 'Emerald & pearl' },
    { id: 'crimson', name: 'Crimson Guard',    cost: 200, piece: 'rook'   as const, color: 'white' as const, desc: 'Blood-forged battle set' },
    { id: 'stellar', name: 'Stellar Court',    cost: 500, piece: 'bishop' as const, color: 'white' as const, desc: 'Celestial platinum' },
  ];

  const save = (s: ShopState) => {
    setShop(s);
    try { localStorage.setItem(SHOP_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  };

  const buy = (id: string, cost: number) => {
    if (shop.unlocked.includes(id)) { save({ ...shop, active: id }); sfx.click(); return; }
    if (cost > 0 && !onSpend(cost)) { sfx.illegal(); return; }
    save({ unlocked: [...shop.unlocked, id], active: id });
    sfx.victory();
  };

  return (
    <PageShell title="Shop" onBack={onBack} maxWidth={maxWidth}>
      <div className="kf-panel" style={{ padding: '14px 16px', marginBottom: 6 }}>
        <div className="kf-eyebrow">Your Balance</div>
        <div className="kf-serif" style={{ color: '#e4b944', fontSize: 24, fontWeight: 900 }}>
          {points.balance.toLocaleString()} pts
        </div>
      </div>
      {items.map(it => {
        const owned = shop.unlocked.includes(it.id);
        const active = shop.active === it.id;
        return (
          <div key={it.id} className="kf-panel" style={{
            padding: 14, display: 'flex', alignItems: 'center', gap: 12,
            border: `1px solid ${active ? 'var(--kf-gold-light)' : 'var(--kf-border)'}`,
          }}>
            <div style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>
              <ChessPiece piece={{ type: it.piece, color: it.color }} size={44} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="kf-serif" style={{ color: '#e8d59a', fontSize: 14, fontWeight: 700 }}>{it.name}</div>
              <div className="kf-eyebrow" style={{ marginTop: 3 }}>{it.desc}</div>
            </div>
            <button
              onClick={() => buy(it.id, it.cost)}
              className={owned ? 'kf-btn' : 'kf-btn kf-btn--gold'}
              style={{ padding: '8px 14px', fontSize: 10 }}
              disabled={active}
            >
              {active ? 'EQUIPPED' : owned ? 'EQUIP' : `${it.cost} PTS`}
            </button>
          </div>
        );
      })}
    </PageShell>
  );
};

// ── Router ───────────────────────────────────────────────────────────────────
interface LobbyRouterProps {
  page: LobbyPage;
  points: PointsState;
  onBack: () => void;
  onQuickPlay: (level: 'easy' | 'medium' | 'hard' | 'expert') => void;
  addBalance: (amount: number) => void;
  spendBalance: (cost: number) => boolean;
  maxWidth: number | string;
}

export const LobbyPageRouter: React.FC<LobbyRouterProps> = ({
  page, points, onBack, onQuickPlay, addBalance, spendBalance, maxWidth,
}) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  switch (page) {
    case 'chess':       return <ChessModesPage onBack={onBack} maxWidth={maxWidth} onQuickPlay={onQuickPlay} addBalance={addBalance} />;
    case 'social':      return <SocialPage onBack={onBack} maxWidth={maxWidth} />;
    case 'shop':        return <ShopPage onBack={onBack} maxWidth={maxWidth} points={points} onSpend={spendBalance} />;
    case 'rewards':     return <RewardsPage onBack={onBack} maxWidth={maxWidth} onQuickPlay={onQuickPlay} addBalance={addBalance} />;
    case 'vip':         return <VIPPage onBack={onBack} maxWidth={maxWidth} points={points} />;
    case 'tournaments': return <TournamentsPage onBack={onBack} maxWidth={maxWidth} onQuickPlay={onQuickPlay} addBalance={addBalance} />;
    case 'leaderboard': return <LeaderboardPage onBack={onBack} maxWidth={maxWidth} points={points} />;
    default:            return null;
  }
};

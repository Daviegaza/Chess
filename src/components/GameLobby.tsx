import React, { useMemo, useState } from 'react';
import { LEVEL_CONFIGS, getPlayerLevel } from '../types/game.types';
import type { DifficultyLevel, LevelConfig, PointsState } from '../types/game.types';
import { useWindowSize } from '../hooks/useWindowSize';
import ChessPiece from './ChessPiece';
import { sfx } from '../utils/soundEngine';
import { LobbyPageRouter, type LobbyPage } from './LobbyPages';

interface GameLobbyProps {
  points: PointsState;
  onStartGame: (level: DifficultyLevel) => void;
  onResetPoints: () => void;
  addBalance: (amount: number) => void;
  spendBalance: (cost: number) => boolean;
}

// ── Win rate donut ───────────────────────────────────────────────────────────
const WinRateRing: React.FC<{ rate: number; size?: number }> = ({ rate, size = 84 }) => {
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, rate));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(212,168,52,0.15)" strokeWidth={5} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#4ade80" strokeWidth={5} fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="kf-serif" style={{ color: '#4ade80', fontSize: 18, fontWeight: 900 }}>
          {Math.round(rate * 100)}%
        </div>
      </div>
    </div>
  );
};

// ── Quick play icon ──────────────────────────────────────────────────────────
const QuickIcon: React.FC<{ type: LevelConfig['icon']; size?: number }> = ({ type, size = 32 }) => {
  const stroke = '#e4b944';
  if (type === 'blitz') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" fill="rgba(228,185,68,0.15)"/>
      </svg>
    );
  }
  if (type === 'rapid') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="13" r="8" stroke={stroke} strokeWidth="1.6"/>
        <path d="M12 8v5l3 2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M9 2h6" stroke={stroke} strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    );
  }
  if (type === 'classic') {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ChessPiece piece={{ type: 'pawn', color: 'white' }} size={size + 6} />
      </div>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="7" r="1.6" fill={stroke}/><path d="M3 7h2M9 7h12" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="13" r="1.6" fill={stroke}/><path d="M3 13h12M19 13h2" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="11" cy="19" r="1.6" fill={stroke}/><path d="M3 19h6M13 19h8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
};

// ── Tile icon (rewards / vip / trophies / stats) ─────────────────────────────
const TileIcon: React.FC<{ kind: 'gift' | 'crown' | 'trophy' | 'chart' }> = ({ kind }) => {
  const s = '#e4b944';
  if (kind === 'gift') return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M3 9h18v11H3z" stroke={s} strokeWidth="1.5"/>
      <path d="M12 9v11M3 13h18" stroke={s} strokeWidth="1.5"/>
      <path d="M12 9c-2 0-4-1-4-3s2-2 4-1 4-1 4 1-2 3-4 3z" stroke={s} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
  if (kind === 'crown') return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M3 8l3 6 6-8 6 8 3-6-1 12H4L3 8z" stroke={s} strokeWidth="1.5" strokeLinejoin="round" fill="rgba(228,185,68,0.12)"/>
      <circle cx="12" cy="4" r="1.4" fill={s}/>
    </svg>
  );
  if (kind === 'trophy') return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8v6a4 4 0 01-8 0V3z" stroke={s} strokeWidth="1.5" fill="rgba(228,185,68,0.12)"/>
      <path d="M6 5H3v2a3 3 0 003 3M18 5h3v2a3 3 0 01-3 3M9 16h6M10 20h4M12 13v3" stroke={s} strokeWidth="1.5"/>
    </svg>
  );
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M4 20h16M6 20V10M11 20V5M16 20V13M21 20V8" stroke={s} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
};

// ── Bottom nav tab ───────────────────────────────────────────────────────────
const NavTab: React.FC<{ label: string; icon: React.ReactNode; active?: boolean; onClick?: () => void }> = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      background: 'transparent', border: 'none', padding: '10px 4px', cursor: 'pointer',
      color: active ? '#e4b944' : '#7a5f2c',
    }}
  >
    <div style={{ filter: active ? 'drop-shadow(0 0 8px rgba(228,185,68,0.6))' : 'none' }}>{icon}</div>
    <span className="kf-serif" style={{ fontSize: 10, letterSpacing: '0.16em', fontWeight: 700 }}>{label}</span>
  </button>
);

const GameLobby: React.FC<GameLobbyProps> = ({ points, onStartGame, onResetPoints, addBalance, spendBalance }) => {
  const { isMobile, isTablet } = useWindowSize();
  const [page, setPage] = useState<LobbyPage>('lobby');
  const levels = Object.values(LEVEL_CONFIGS);

  const winRate = useMemo(() => {
    const total = points.totalWins + points.totalLosses + points.totalDraws;
    return total === 0 ? 0 : points.totalWins / total;
  }, [points.totalWins, points.totalLosses, points.totalDraws]);

  const playerLvl = useMemo(() => getPlayerLevel(points), [points]);

  const contentMaxW = isMobile ? '100%' : 560;
  const goToPage = (p: LobbyPage) => { sfx.click(); setPage(p); };
  const goHome = () => { sfx.click(); setPage('lobby'); };
  const startAndReturn = (level: DifficultyLevel) => { setPage('lobby'); onStartGame(level); };

  // Sub-pages replace the lobby body while keeping the bottom nav mounted
  if (page !== 'lobby') {
    return (
      <div className="kf-screen kf-fade-in" style={{
        padding: isMobile ? '16px 14px 88px' : '28px 20px 100px',
        background:
          'radial-gradient(ellipse at 22% 10%, rgba(244,214,122,0.18) 0%, transparent 45%),' +
          'radial-gradient(ellipse at 82% 92%, rgba(212,168,52,0.12) 0%, transparent 55%),' +
          'linear-gradient(180deg, #322414 0%, #1f180f 60%, #14100a 100%)',
      }}>
        <LobbyPageRouter
          page={page}
          points={points}
          onBack={goHome}
          onQuickPlay={startAndReturn}
          addBalance={addBalance}
          spendBalance={spendBalance}
          maxWidth={contentMaxW}
        />
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(180deg, rgba(30,22,14,0.98) 0%, #16100a 100%)',
          borderTop: '1px solid rgba(212,168,52,0.35)',
          display: 'flex', padding: '4px 6px 10px', zIndex: 50,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
        }}>
          <NavTab label="LOBBY" onClick={goHome} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12l9-9 9 9M5 10v10h14V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
          <NavTab label="CHESS" active={page === 'chess'} onClick={() => goToPage('chess')} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M10 21c0-4 4-5 4-9 0-2-1-3-2-3s-1 1-1 2 0 2-2 2c-1 0-2-1-2-2s2-4 4-4 5 2 5 5c0 5-4 6-4 9" stroke="currentColor" strokeWidth="1.5"/></svg>} />
          <NavTab label="SOCIAL" active={page === 'social'} onClick={() => goToPage('social')} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 20c0-3 2-5 5-5s5 2 5 5M13 20c0-3 2-5 5-5s3 2 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
          <NavTab label="SHOP" active={page === 'shop'} onClick={() => goToPage('shop')} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 8h14l-1 12H6L5 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5"/></svg>} />
        </nav>
      </div>
    );
  }

  return (
    <div className="kf-screen kf-fade-in" style={{
      padding: isMobile ? '16px 14px 88px' : '28px 20px 100px',
      background:
        'radial-gradient(ellipse at 22% 10%, rgba(244,214,122,0.18) 0%, transparent 45%),' +
        'radial-gradient(ellipse at 82% 92%, rgba(212,168,52,0.12) 0%, transparent 55%),' +
        'linear-gradient(180deg, #322414 0%, #1f180f 60%, #14100a 100%)',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: contentMaxW,
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center', marginBottom: 20,
      }}>
        {/* Avatar + VIP */}
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(160deg, #2a1e0f 0%, #14100a 100%)',
            border: '2px solid #e4b944',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,235,180,0.15)',
            overflow: 'hidden',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="#e4b944" strokeWidth="1.5"/>
              <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#e4b944" strokeWidth="1.5"/>
            </svg>
          </div>
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 12, height: 12, borderRadius: '50%',
            background: '#4ade80', border: '2px solid #1a1208',
          }} />
          <div style={{
            position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, #f4d67a 0%, #d4a834 100%)',
            color: '#14100a', fontSize: 9, fontWeight: 900, padding: '2px 10px', borderRadius: 8,
            letterSpacing: '0.15em', whiteSpace: 'nowrap',
            fontFamily: "'Cinzel', serif",
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
          }}>
            LVL {playerLvl.level}
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 2 }}>♛</div>
          <div className="kf-serif kf-gold-text" style={{
            fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: '0.28em',
          }}>HOUSE OF</div>
          <div className="kf-serif kf-gold-text" style={{
            fontSize: isMobile ? 20 : 24, fontWeight: 900, letterSpacing: '0.2em', lineHeight: 1.05,
          }}>KINGFALL</div>
          <div className="kf-serif" style={{
            fontSize: 8, letterSpacing: '0.4em', color: '#b39558', marginTop: 2,
          }}>CHESS & CASINO</div>
        </div>

        {/* Balance pill */}
        <div className="kf-pill" role="group">
          <span className="kf-pill__coin" aria-hidden />
          <span className="kf-pill__value">{points.balance.toLocaleString()}</span>
          <button className="kf-pill__plus" onClick={() => { sfx.click(); onResetPoints(); }} aria-label="Restore points">+</button>
        </div>
      </div>

      {/* ── PLAY CHESS hero ────────────────────────────────────────────── */}
      <div className="kf-panel" style={{ width: '100%', maxWidth: contentMaxW, marginBottom: 14, padding: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'stretch',
          background:
            'radial-gradient(ellipse at 78% 50%, rgba(255,226,142,0.55) 0%, rgba(212,168,52,0.12) 45%, transparent 78%),' +
            'linear-gradient(180deg, #3a2c18 0%, #241a10 100%)',
          minHeight: 160,
        }}>
          <div style={{ flex: 1, padding: '22px 22px 20px' }}>
            <div className="kf-serif kf-gold-text" style={{
              fontSize: isMobile ? 22 : 26, fontWeight: 900, letterSpacing: '0.14em', lineHeight: 1.1, marginBottom: 6,
            }}>PLAY CHESS</div>
            <div className="kf-body" style={{
              color: '#b39558', fontSize: 13, marginBottom: 14, fontStyle: 'italic', lineHeight: 1.4,
            }}>
              Test your skills.<br/>Conquer every move.
            </div>
            <button
              className="kf-btn kf-btn--gold"
              onClick={() => { sfx.click(); onStartGame('hard'); }}
              style={{ padding: '10px 20px', fontSize: 11 }}
            >
              PLAY NOW
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8m0 0L7 3m3 3L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div style={{
            flex: '0 0 42%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.7)) drop-shadow(0 0 26px rgba(244,214,122,0.35))',
          }}>
            <ChessPiece piece={{ type: 'king', color: 'white' }} size={isMobile ? 130 : 150} />
          </div>
        </div>
      </div>

      {/* ── 4-tile row ─────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: contentMaxW,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18,
      }}>
        {[
          { label: 'DAILY REWARDS', icon: <TileIcon kind="gift"/>,   target: 'rewards'     as LobbyPage, badge: 1 },
          { label: 'VIP CLUB',      icon: <TileIcon kind="crown"/>,  target: 'vip'         as LobbyPage },
          { label: 'TOURNAMENTS',   icon: <TileIcon kind="trophy"/>, target: 'tournaments' as LobbyPage },
          { label: 'LEADERBOARD',   icon: <TileIcon kind="chart"/>,  target: 'leaderboard' as LobbyPage },
        ].map(t => (
          <button
            key={t.label}
            onClick={() => goToPage(t.target)}
            className="kf-panel kf-panel--interactive"
            style={{
              padding: '14px 6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: 'linear-gradient(160deg, #241a10 0%, #16100a 100%)',
              cursor: 'pointer', border: '1px solid rgba(212,168,52,0.25)', position: 'relative',
            }}
          >
            {t.badge && (
              <span style={{
                position: 'absolute', top: 6, right: 8,
                background: '#d94848', color: '#fff', fontSize: 9, fontWeight: 900,
                width: 16, height: 16, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.badge}</span>
            )}
            {t.icon}
            <span className="kf-serif" style={{
              color: '#e8d59a', fontSize: 8, letterSpacing: '0.14em', fontWeight: 700, textAlign: 'center', lineHeight: 1.2,
            }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── PLAYER LEVEL ────────────────────────────────────────────────── */}
      <div className="kf-panel" style={{ width: '100%', maxWidth: contentMaxW, padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 12,
            background: 'linear-gradient(160deg, #f4d67a 0%, #d4a834 55%, #8a6018 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            color: '#14100a',
            boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,240,200,0.6)',
          }}>
            <span className="kf-serif" style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.15em', lineHeight: 1 }}>LVL</span>
            <span className="kf-serif" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1 }}>{playerLvl.level}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <div className="kf-serif kf-gold-text" style={{
                fontSize: 16, fontWeight: 900, letterSpacing: '0.16em',
              }}>{playerLvl.rank.toUpperCase()}</div>
              <div className="kf-eyebrow" style={{ color: 'var(--kf-gold-light)' }}>
                {playerLvl.xpIntoLevel} / {playerLvl.xpForNextLevel} XP
              </div>
            </div>
            <div style={{
              marginTop: 8, height: 8, borderRadius: 4,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid var(--kf-border)',
              overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                width: `${Math.round(playerLvl.progress * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #d4a834 0%, #ffe28e 50%, #d4a834 100%)',
                backgroundSize: '200% 100%',
                animation: 'kf-shimmer 3s ease-in-out infinite',
                boxShadow: '0 0 10px rgba(228,185,68,0.6)',
              }} />
            </div>
            <div className="kf-eyebrow" style={{ marginTop: 6, fontSize: 9 }}>
              {playerLvl.xpForNextLevel - playerLvl.xpIntoLevel} XP to Level {playerLvl.level + 1}
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK PLAY ─────────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: contentMaxW, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div className="kf-eyebrow">Quick Play</div>
          <button
            onClick={() => goToPage('chess')}
            className="kf-eyebrow"
            style={{ color: '#e4b944', background: 'none', border: 'none', cursor: 'pointer' }}
          >VIEW ALL</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {levels.map(cfg => {
            const canPlay = points.balance > cfg.cost;
            const diffTag = ({ easy: 'EASY', medium: 'MEDIUM', hard: 'HARD', expert: 'EXPERT' } as const)[cfg.level];
            const diffTint = ({
              easy:   '#4ade80',
              medium: '#e4b944',
              hard:   '#f0a030',
              expert: '#d94848',
            } as const)[cfg.level];
            const aiElo = ({ easy: 900, medium: 1200, hard: 1600, expert: 2000 } as const)[cfg.level];
            return (
              <div
                key={cfg.level}
                className="kf-panel"
                style={{
                  padding: '14px 8px 8px', textAlign: 'center', opacity: canPlay ? 1 : 0.5,
                  background: 'linear-gradient(160deg, #241a10 0%, #16100a 100%)',
                  border: '1px solid rgba(212,168,52,0.25)',
                  position: 'relative',
                }}
              >
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  background: diffTint + '25', color: diffTint,
                  fontSize: 8, fontWeight: 900, padding: '2px 5px', borderRadius: 3,
                  letterSpacing: '0.12em', fontFamily: "'Cinzel', serif",
                }}>{diffTag}</span>
                <div className="kf-serif" style={{
                  color: '#e4b944', fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8,
                }}>{cfg.label}</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, minHeight: 40, alignItems: 'center' }}>
                  <QuickIcon type={cfg.icon} size={32} />
                </div>
                <div className="kf-serif" style={{
                  color: '#e8d59a', fontSize: 12, fontWeight: 700, marginBottom: 2, letterSpacing: '0.04em',
                }}>{cfg.tagline}</div>
                <div className="kf-eyebrow" style={{ fontSize: 8, marginBottom: 8 }}>AI · {aiElo}</div>
                <button
                  disabled={!canPlay}
                  onClick={() => { sfx.click(); canPlay && onStartGame(cfg.level); }}
                  className="kf-serif"
                  style={{
                    width: '100%', border: 'none',
                    borderTop: '1px solid rgba(212,168,52,0.25)',
                    background: 'transparent',
                    color: canPlay ? '#e4b944' : '#5a4826',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
                    padding: '8px 0 6px', cursor: canPlay ? 'pointer' : 'not-allowed',
                    marginTop: 4,
                  }}
                >
                  PLAY
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── YOUR STATS ─────────────────────────────────────────────────── */}
      <div className="kf-panel" style={{ width: '100%', maxWidth: contentMaxW, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="kf-eyebrow">Your Stats</div>
          <button
            onClick={() => goToPage('leaderboard')}
            className="kf-eyebrow"
            style={{ color: '#e4b944', background: 'none', border: 'none', cursor: 'pointer' }}
          >VIEW STATS</button>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'center',
        }}>
          {[
            { label: 'WINS',   val: points.totalWins,   color: '#4ade80' },
            { label: 'LOSSES', val: points.totalLosses, color: '#d94848' },
            { label: 'DRAWS',  val: points.totalDraws,  color: '#e4b944' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div className="kf-eyebrow" style={{ marginBottom: 4 }}>{s.label}</div>
              <div className="kf-serif" style={{
                color: s.color, fontSize: 24, fontWeight: 900, lineHeight: 1,
              }}>{s.val}</div>
            </div>
          ))}
          <WinRateRing rate={winRate} size={68} />
        </div>
      </div>

      {/* ── Rating strip ────────────────────────────────────────────────── */}
      <div className="kf-panel" style={{
        width: '100%', maxWidth: contentMaxW, padding: '12px 18px', marginBottom: 18,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      }}>
        <div>
          <div className="kf-eyebrow">Rating</div>
          <div className="kf-serif" style={{ color: '#e4b944', fontSize: 22, fontWeight: 900 }}>
            {points.elo ?? 1200}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="kf-eyebrow">Peak</div>
          <div className="kf-serif" style={{ color: '#e8d59a', fontSize: 18, fontWeight: 700 }}>
            {points.bestElo ?? 1200}
          </div>
        </div>
      </div>

      {/* ── Bottom Nav ─────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(180deg, rgba(30,22,14,0.98) 0%, #16100a 100%)',
        borderTop: '1px solid rgba(212,168,52,0.35)',
        display: 'flex', padding: '4px 6px 10px',
        zIndex: 50,
        boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
      }}>
        <NavTab active label="LOBBY" icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12l9-9 9 9M5 10v10h14V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>} />
        <NavTab label="CHESS"  onClick={() => goToPage('chess')}  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M8 21h8M10 21c0-4 4-5 4-9 0-2-1-3-2-3s-1 1-1 2 0 2-2 2c-1 0-2-1-2-2s2-4 4-4 5 2 5 5c0 5-4 6-4 9" stroke="currentColor" strokeWidth="1.5"/></svg>} />
        <NavTab label="SOCIAL" onClick={() => goToPage('social')} icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><circle cx="16" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M3 20c0-3 2-5 5-5s5 2 5 5M13 20c0-3 2-5 5-5s3 2 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} />
        <NavTab label="SHOP"   onClick={() => goToPage('shop')}   icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M5 8h14l-1 12H6L5 8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M9 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5"/></svg>} />
      </nav>
    </div>
  );
};

export default GameLobby;

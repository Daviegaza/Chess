import React, { useState } from 'react';
import {
  ACHIEVEMENTS, DifficultyLevel, JACKPOT_TIERS, JACKPOT_TIER_ORDER,
  LEVEL_CONFIGS, LevelConfig, MissionsState, MISSION_TEMPLATES,
  PointsState, SIDE_BETS, SideBetId, TimeControl, VipTier, formatTimeControl, nextVipTier,
} from '../types/game.types';
import { DailyBonusStatus } from '../hooks/usePoints';
import { UseTimePrefReturn } from '../hooks/useTimePref';
import TimeControlPicker from './TimeControlPicker';

const GOLD = '#fbbf24';
const SILVER_INK = '#94a3b8';
const EMERALD = '#10b981';
const PURPLE = '#8b5cf6';
const PLATINUM = '#e2e8f0';
const CRIMSON = '#ef4444';
const PANEL_BG = 'linear-gradient(180deg, rgba(28,32,52,0.94) 0%, rgba(19,22,41,0.96) 100%)';
const PANEL_BORDER = '1px solid rgba(139,92,246,0.32)';
const HEADING = "'Cinzel', serif";
const DISPLAY = "'Playfair Display', serif";
const BODY = "'Crimson Pro', serif";

const cap = (size = 9, ls = '0.22em', color = SILVER_INK) => ({
  fontFamily: HEADING, fontSize: size, letterSpacing: ls, color,
  textTransform: 'uppercase' as const,
});

const Panel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{
    background: PANEL_BG, border: PANEL_BORDER, borderRadius: 14,
    boxShadow: '0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)',
    ...style,
  }}>{children}</div>
);

const SectionHeader: React.FC<{ title: string; right?: React.ReactNode; accent?: string }> = ({ title, right, accent = GOLD }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 4px 12px' }}>
    <span style={{ color: accent, fontSize: 12 }}>◆</span>
    <div style={{ ...cap(11, '0.28em', PLATINUM), fontWeight: 700 }}>{title}</div>
    {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
  </div>
);

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

const QuickPlayHero: React.FC<{ cfg: LevelConfig; onPlay: () => void }> = ({ cfg, onPlay }) => (
  <Panel style={{
    padding: 22,
    background:
      'radial-gradient(ellipse at 85% 50%, rgba(139,92,246,0.18) 0%, transparent 55%),' +
      'linear-gradient(180deg, rgba(19,22,41,0.94), rgba(6,10,25,0.98))',
    border: '1px solid rgba(139,92,246,0.34)',
    minHeight: 220, position: 'relative', overflow: 'hidden',
  }}>
    <div style={cap(10, '0.28em', PURPLE)}>QUICK PLAY</div>
    <div style={{
      fontFamily: DISPLAY, fontWeight: 900, fontSize: 30, letterSpacing: '0.04em',
      color: PLATINUM, marginTop: 6, lineHeight: 1,
    }}>{cfg.label}</div>
    <div style={{ marginTop: 8, color: 'rgba(226,232,240,0.88)', fontFamily: BODY, fontSize: 13 }}>
      Buy-in: {cfg.cost} · Pays: +{cfg.reward} · ⏱ {formatTimeControl(cfg.timeControl)}
    </div>
    <button onClick={onPlay} className="kf-tap" style={{
      marginTop: 20, padding: '14px 32px',
      background: 'linear-gradient(180deg, #fde68a 0%, #d4a437 55%, #7a5a10 100%)',
      border: '1px solid rgba(255,220,120,0.55)',
      borderRadius: 10, color: '#20140a',
      fontFamily: HEADING, fontSize: 13, letterSpacing: '0.28em', fontWeight: 900,
      cursor: 'pointer', minHeight: 48,
      boxShadow: '0 10px 24px rgba(251,191,36,0.4), inset 0 1px 0 rgba(255,255,255,0.4)',
    }}>PLAY NOW</button>
    <div className="kf-float" style={{
      position: 'absolute', right: 30, top: 40,
      width: 130, height: 130, borderRadius: '50%',
      background: 'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.35), rgba(46,16,101,0.9) 55%, rgba(10,14,31,0.95))',
      boxShadow: '0 20px 45px rgba(139,92,246,0.35), inset 0 4px 12px rgba(255,255,255,0.15)',
      border: '1px solid rgba(139,92,246,0.45)',
      pointerEvents: 'none',
    }} />
  </Panel>
);

const ProgressiveJackpots: React.FC<{ tiers: Record<string, number> }> = ({ tiers }) => (
  <Panel style={{
    padding: 18,
    background:
      'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.22) 0%, transparent 55%),' +
      'linear-gradient(180deg, rgba(30,14,60,0.9), rgba(15,10,30,0.95))',
    border: '1px solid rgba(139,92,246,0.4)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <div style={cap(10, '0.28em', PURPLE)}>◆ PROGRESSIVE JACKPOTS</div>
      <div style={cap(9, '0.14em')}>4 tiers</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {JACKPOT_TIER_ORDER.map(id => {
        const t = JACKPOT_TIERS[id];
        return (
          <div key={id} style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'linear-gradient(180deg, rgba(46,16,101,0.55), rgba(20,10,40,0.75))',
            border: '1px solid rgba(139,92,246,0.28)',
          }}>
            <div style={cap(9, '0.22em', 'rgba(226,232,240,0.82)')}>{t.label}</div>
            <div style={{
              fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: t.color,
              marginTop: 2,
            }}>{tiers[id]?.toLocaleString() ?? '—'}</div>
          </div>
        );
      })}
    </div>
  </Panel>
);

const VipAccessBar: React.FC<{ tier: VipTier; xp: number }> = ({ tier, xp }) => {
  const nxt = nextVipTier(xp);
  const from = tier.xpRequired;
  const to = nxt ? nxt.xpRequired : Math.max(xp, from + 1);
  const pct = Math.min(100, Math.max(0, ((xp - from) / (to - from)) * 100));
  return (
    <Panel style={{ padding: '10px 16px' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          padding: '4px 10px', borderRadius: 6,
          background: `linear-gradient(90deg, ${tier.color}22, ${tier.color}05)`,
          border: `1px solid ${tier.color}44`,
          fontFamily: HEADING, fontSize: 9, letterSpacing: '0.22em', color: tier.color, fontWeight: 700,
        }}>VIP - {tier.label.toUpperCase()}</div>
        <div style={{ flex: 1, fontFamily: BODY, fontStyle: 'italic', color: 'rgba(226,232,240,0.88)', fontSize: 12, minWidth: 200 }}>
          {tier.perk}
        </div>
        <div style={cap(9, '0.14em')}>{xp.toLocaleString()} / {to.toLocaleString()} XP</div>
      </div>
      <div style={{
        marginTop: 8, height: 5, borderRadius: 999,
        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${PURPLE}, ${tier.color})`,
          boxShadow: `0 0 8px ${tier.color}88`,
        }} />
      </div>
    </Panel>
  );
};

const DailyBonusBar: React.FC<{ status: DailyBonusStatus; onClaim: () => void; onSfx: (n: 'coin' | 'error') => void }> =
  ({ status, onClaim, onSfx }) => {
    const ready = status.ready;
    return (
      <Panel style={{ padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={cap(10, '0.28em', PLATINUM)}>DAILY BONUS</div>
          <div style={{
            fontFamily: DISPLAY, fontSize: 18, fontWeight: 800,
            color: ready ? EMERALD : PLATINUM, marginTop: 4,
          }}>{ready ? 'Ready to claim' : `Next drop in ${fmt(status.msUntilReady)}`}</div>
        </div>
        <button onClick={() => { if (ready) { onSfx('coin'); onClaim(); } else onSfx('error'); }} className="kf-tap" style={{
          padding: '10px 18px', borderRadius: 10,
          background: ready
            ? 'linear-gradient(180deg, #fde68a 0%, #d4a437 55%, #7a5a10 100%)'
            : 'linear-gradient(180deg, rgba(46,16,101,0.85), rgba(20,10,40,0.9))',
          border: ready ? '1px solid rgba(255,220,120,0.55)' : `1px solid ${SILVER_INK}66`,
          color: ready ? '#20140a' : SILVER_INK,
          fontFamily: HEADING, fontSize: 11, letterSpacing: '0.22em', fontWeight: 900,
          cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center',
          minHeight: 40,
        }}>
          <span>{ready ? '🎁' : '⏳'}</span>
          {ready ? 'CLAIM' : 'CLAIM SOON'}
        </button>
      </Panel>
    );
  };

const DailyMissions: React.FC<{
  missions: MissionsState;
  onClaim: (id: string) => void;
  onSfx: (n: 'chipClick' | 'coin' | 'error') => void;
  isMobile: boolean;
}> = ({ missions, onClaim, onSfx, isMobile }) => {
  const list = missions.missions.slice(0, 3);
  const claimedCount = missions.missions.filter(m => m.claimed).length;
  return (
    <Panel style={{ padding: 18 }}>
      <SectionHeader
        title="DAILY MISSIONS"
        right={<div style={cap(9, '0.14em')}>{claimedCount} / {missions.missions.length} CLAIMED · RESETS 00:00 UTC</div>}
        accent={PURPLE}
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
        {list.map(m => {
          const tpl = MISSION_TEMPLATES.find(t => t.id === m.templateId);
          if (!tpl) return null;
          const pct = Math.min(100, (m.progress / m.target) * 100);
          const done = m.progress >= m.target;
          return (
            <div key={m.templateId} style={{
              padding: 14, borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(46,16,101,0.55), rgba(20,10,40,0.7))',
              border: `1px solid ${done ? EMERALD : 'rgba(139,92,246,0.28)'}55`,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: done
                    ? 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.6), rgba(6,60,40,0.9))'
                    : 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.55), rgba(46,16,101,0.9))',
                  border: `1px solid ${done ? EMERALD : PURPLE}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, color: done ? EMERALD : PURPLE,
                }}>{done ? '✓' : tpl.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...cap(10, '0.15em', PLATINUM), fontWeight: 700 }}>{tpl.label.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(226,232,240,0.88)', fontFamily: BODY }}>{tpl.hint}</div>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 14, color: GOLD, fontWeight: 800 }}>+{tpl.reward}</div>
              </div>
              <div style={{
                marginTop: 10, height: 5, borderRadius: 999,
                background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: done
                    ? `linear-gradient(90deg, ${EMERALD}, #047857)`
                    : 'linear-gradient(90deg, #fde68a, #d4a437)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <div style={cap(9, '0.14em')}>{m.progress} / {m.target}</div>
                {m.claimed
                  ? <div style={cap(9, '0.14em', EMERALD)}>✓ CLAIMED</div>
                  : done
                    ? <button onClick={() => { onSfx('coin'); onClaim(m.templateId); }} className="kf-tap" style={{
                        padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(16,185,129,0.16)', border: `1px solid ${EMERALD}66`,
                        color: EMERALD, fontFamily: HEADING, fontSize: 9, letterSpacing: '0.22em', fontWeight: 800,
                        cursor: 'pointer',
                      }}>CLAIM</button>
                    : null
                }
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const RoomCards: React.FC<{
  onSelect: (level: DifficultyLevel) => void;
  tierNum: number;
  onSfx: (n: 'chipClick' | 'error' | 'hover') => void;
  isMobile: boolean;
  activeTc: TimeControl;
}> = ({ onSelect, tierNum, onSfx, isMobile, activeTc }) => {
  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert', 'highroller'];
  return (
    <div>
      <SectionHeader
        title="CHOOSE YOUR ROOM"
        right={<div style={cap(9, '0.18em', PURPLE)}>⏱ {formatTimeControl(activeTc)}</div>}
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(5, minmax(220px, 1fr))' : 'repeat(5, 1fr)',
        gap: 12,
        minWidth: isMobile ? 1100 : 'auto',
      }}>
        {levels.map(level => {
          const cfg = LEVEL_CONFIGS[level];
          const locked = tierNum < cfg.vipRequired;
          return (
            <button
              key={level}
              onClick={() => { if (locked) onSfx('error'); else { onSfx('chipClick'); onSelect(level); } }}
              className="kf-tap"
              style={{
                textAlign: 'left', padding: 16, borderRadius: 14,
                background: cfg.gradient,
                border: `1px solid ${cfg.color}55`,
                color: PLATINUM, cursor: 'pointer', minHeight: 220,
                boxShadow: `0 8px 22px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                opacity: locked ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  fontFamily: DISPLAY, fontWeight: 900, fontSize: 20,
                  letterSpacing: '0.05em', color: cfg.color,
                }}>{cfg.label}</div>
                <div style={{ color: cfg.color, fontSize: 12 }}>◆</div>
              </div>
              <div style={{ fontFamily: BODY, fontStyle: 'italic', color: 'rgba(226,232,240,0.9)', fontSize: 12, marginTop: 4 }}>
                {cfg.tagline}
              </div>
              <div style={{
                marginTop: 10, fontSize: 12, color: 'rgba(226,232,240,0.95)',
                fontFamily: BODY, lineHeight: 1.35,
              }}>{cfg.description}</div>
              <div style={{
                marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
              }}>
                <div style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={cap(8, '0.2em')}>BUY-IN</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 800, color: cfg.color, marginTop: 2 }}>{cfg.cost}</div>
                </div>
                <div style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={cap(8, '0.2em')}>PAYS</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 800, color: EMERALD, marginTop: 2 }}>+{cfg.reward}</div>
                </div>
              </div>
              <div style={{ ...cap(9, '0.14em'), marginTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>
                {locked ? `🔒 VIP ${cfg.vipRequired} REQUIRED` : `⏱ ${formatTimeControl(activeTc)}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SideBetsRow: React.FC<{
  picks: SideBetId[]; onToggle: (id: SideBetId) => void; onSfx: (n: 'chipClick') => void; isMobile: boolean;
}> = ({ picks, onToggle, onSfx, isMobile }) => (
  <Panel style={{ padding: 18 }}>
    <SectionHeader title="SIDE BETS" right={<div style={cap(9, '0.14em')}>Tap to toggle</div>} />
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
      {(Object.keys(SIDE_BETS) as SideBetId[]).map(id => {
        const b = SIDE_BETS[id];
        const active = picks.includes(id);
        return (
          <button key={id} onClick={() => { onSfx('chipClick'); onToggle(id); }} className="kf-tap" style={{
            padding: 12, borderRadius: 10, textAlign: 'left', cursor: 'pointer',
            background: active
              ? `linear-gradient(180deg, ${b.color}22, ${b.color}0a)`
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${active ? b.color : 'rgba(255,255,255,0.06)'}`,
            color: PLATINUM, minHeight: 88,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...cap(10, '0.22em', b.color), fontWeight: 700 }}>{b.label.toUpperCase()}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 12, color: EMERALD, fontWeight: 800 }}>+{b.payoutMultiplier}x</div>
            </div>
            <div style={{ fontFamily: BODY, fontSize: 11, color: 'rgba(226,232,240,0.88)', marginTop: 4, lineHeight: 1.35 }}>
              {b.hint}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div style={cap(9, '0.14em')}>STAKE {b.cost}</div>
              <div style={{
                width: 14, height: 14, borderRadius: 3,
                background: active ? b.color : 'transparent',
                border: `1px solid ${b.color}88`,
              }} />
            </div>
          </button>
        );
      })}
    </div>
  </Panel>
);

const AchievementsRow: React.FC<{ unlocked: string[]; isMobile: boolean; onOpen?: () => void }> = ({ unlocked, isMobile, onOpen }) => (
  <Panel style={{ padding: 18 }}>
    <SectionHeader
      title="ACHIEVEMENTS"
      right={
        <button
          onClick={onOpen}
          className="kf-tap"
          style={{
            background: 'transparent', border: `1px solid ${GOLD}44`,
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
            color: GOLD, fontFamily: HEADING, fontSize: 9, letterSpacing: '0.18em', fontWeight: 700,
          }}
        >{unlocked.length} / {ACHIEVEMENTS.length} · VIEW ALL</button>
      }
    />
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 10 }}>
      {ACHIEVEMENTS.slice(0, isMobile ? 6 : 5).map(a => {
        const got = unlocked.includes(a.id);
        return (
          <div key={a.id} style={{
            padding: 10, borderRadius: 10, textAlign: 'center',
            background: got
              ? 'linear-gradient(180deg, rgba(251,191,36,0.2), rgba(80,60,20,0.4))'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${got ? GOLD : 'rgba(255,255,255,0.06)'}55`,
            opacity: got ? 1 : 0.5,
          }}>
            <div style={{ fontSize: 22, color: got ? GOLD : SILVER_INK }}>{a.icon}</div>
            <div style={{ ...cap(8, '0.15em', got ? PLATINUM : SILVER_INK), fontWeight: 700, marginTop: 4 }}>{a.label.toUpperCase()}</div>
            <div style={{
              fontFamily: DISPLAY, fontSize: 12, fontWeight: 800,
              color: got ? EMERALD : SILVER_INK, marginTop: 3,
            }}>{got ? 'CLAIMED' : a.reward}</div>
          </div>
        );
      })}
    </div>
  </Panel>
);

interface Props {
  points: PointsState;
  tier: VipTier;
  dailyBonus: DailyBonusStatus;
  missions: MissionsState;
  onClaimDaily: () => void;
  onClaimMission: (id: string) => void;
  onStartGame: (level: DifficultyLevel, betIds: SideBetId[], tcOverride?: TimeControl) => void;
  onSfx: (n: 'chipClick' | 'coin' | 'error' | 'hover' | 'missionComplete') => void;
  isMobile: boolean;
  onBrowseTables?: () => void;
  onOpenAchievements?: () => void;
  timePref: UseTimePrefReturn;
}

const LobbyBody: React.FC<Props> = ({
  points, tier, dailyBonus, missions,
  onClaimDaily, onClaimMission, onStartGame, onSfx, isMobile,
  onBrowseTables, onOpenAchievements, timePref,
}) => {
  const [picks, setPicks] = useState<SideBetId[]>([]);
  const togglePick = (id: SideBetId) =>
    setPicks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const quickLevel: DifficultyLevel = tier.tier >= 1 ? 'medium' : 'easy';
  const baseQuickCfg = LEVEL_CONFIGS[quickLevel];
  const quickCfg: LevelConfig = { ...baseQuickCfg, timeControl: timePref.selectedTc };

  const start = (level: DifficultyLevel) => onStartGame(level, picks, timePref.selectedTc);

  return (
    <div style={{ padding: isMobile ? '10px 4px 20px' : '4px 4px 12px', color: PLATINUM, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 14,
      }}>
        <QuickPlayHero cfg={quickCfg} onPlay={() => { onSfx('chipClick'); start(quickLevel); }} />
        <ProgressiveJackpots tiers={points.jackpotTiers} />
      </div>

      <VipAccessBar tier={tier} xp={points.vipXp} />
      <DailyBonusBar status={dailyBonus} onClaim={onClaimDaily} onSfx={onSfx} />

      <TimeControlPicker timePref={timePref} onSfx={onSfx} compact={isMobile} />

      <DailyMissions missions={missions} onClaim={onClaimMission} onSfx={onSfx} isMobile={isMobile} />

      <div className={isMobile ? 'kf-scroll-x' : ''} style={{
        overflowX: isMobile ? 'auto' : 'visible',
        WebkitOverflowScrolling: 'touch',
      }}>
        <RoomCards
          onSelect={start}
          tierNum={tier.tier}
          onSfx={onSfx}
          isMobile={isMobile}
          activeTc={timePref.selectedTc}
        />
      </div>

      <button
        onClick={() => { onSfx('chipClick'); onBrowseTables?.(); }}
        className="kf-tap"
        style={{
          padding: '14px', borderRadius: 12,
          background: 'linear-gradient(180deg, rgba(28,32,52,0.9), rgba(15,18,36,0.95))',
          border: `1px solid ${GOLD}44`,
          color: GOLD, cursor: 'pointer',
          fontFamily: HEADING, fontSize: 11, letterSpacing: '0.28em', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          minHeight: 44,
        }}
      >⛃ BROWSE ALL TABLES</button>

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 14,
      }}>
        <SideBetsRow picks={picks} onToggle={togglePick} onSfx={onSfx} isMobile={isMobile} />
        <AchievementsRow unlocked={points.unlockedAchievements} isMobile={isMobile} onOpen={onOpenAchievements} />
      </div>
    </div>
  );
};

export default LobbyBody;

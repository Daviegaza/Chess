import React, { useState } from 'react';
import {
  ACHIEVEMENTS, CHIP_SKINS, CHIP_SKIN_ORDER, ChipSkinId,
  DifficultyLevel, LEVEL_CONFIGS,
  MISSION_TEMPLATES, MissionsState,
  PointsState, VIP_TIERS, VipTier,
  nextVipTier,
} from '../types/game.types';
import { DailyBonusStatus } from '../hooks/usePoints';

const GOLD = '#fbbf24';
const SILVER_INK = '#94a3b8';
const EMERALD = '#10b981';
const CRIMSON = '#ef4444';
const ROSE = '#fb7185';
const PURPLE = '#8b5cf6';
const PLATINUM = '#e2e8f0';
const HEADING = "'Cinzel', serif";
const DISPLAY = "'Playfair Display', serif";
const BODY = "'Crimson Pro', serif";

const cap = (size = 9, ls = '0.22em', color = SILVER_INK) => ({
  fontFamily: HEADING, fontSize: size, letterSpacing: ls, color,
  textTransform: 'uppercase' as const,
});

export type ModalKey =
  | 'missions' | 'vip' | 'leaderboard' | 'store'
  | 'promotions' | 'cashier' | 'tables' | 'achievements'
  | null;

interface ShellProps {
  title: string;
  subtitle?: string;
  accent?: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Backdrop: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({ onClose, children }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(10,14,25,0.6)', backdropFilter: 'blur(12px) saturate(1.1)', WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'kfSlideUp 0.28s ease both',
    }}
  >
    {children}
  </div>
);

export const ModalShell: React.FC<ShellProps> = ({ title, subtitle, accent = PURPLE, onClose, children }) => (
  <Backdrop onClose={onClose}>
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: 'min(720px, 100%)',
        maxHeight: 'calc(100dvh - 40px)',
        display: 'flex', flexDirection: 'column',
        background:
          'radial-gradient(ellipse at 8% 0%, rgba(139,92,246,0.18) 0%, transparent 55%),' +
          'linear-gradient(180deg, rgba(28,32,52,0.98), rgba(15,18,36,0.98))',
        border: `1px solid ${accent}55`,
        borderRadius: 18,
        boxShadow: `0 24px 80px rgba(0,0,0,0.8), 0 0 40px ${accent}22`,
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        borderBottom: `1px solid ${accent}33`,
        background: `linear-gradient(180deg, ${accent}18, transparent)`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...cap(9, '0.28em', accent), fontWeight: 700 }}>◆ KINGFALL CHESS</div>
          <div style={{
            fontFamily: DISPLAY, fontSize: 22, fontWeight: 900,
            color: PLATINUM, marginTop: 2, letterSpacing: '0.04em',
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontFamily: BODY, fontStyle: 'italic', fontSize: 12, color: 'rgba(226,232,240,0.88)', marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="kf-tap"
          aria-label="Close"
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(139,92,246,0.10)',
            border: `1px solid ${accent}44`,
            color: accent, fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
      </div>
      <div style={{ padding: 20, overflowY: 'auto' }}>{children}</div>
    </div>
  </Backdrop>
);

// ── MISSIONS ────────────────────────────────────────────────────────────────
interface MissionsModalProps {
  missions: MissionsState;
  onClaim: (id: string) => void;
  onReroll: () => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({ missions, onClaim, onReroll, onClose }) => {
  const claimed = missions.missions.filter(m => m.claimed).length;
  return (
    <ModalShell
      title="DAILY MISSIONS"
      subtitle="Complete objectives, claim chip rewards. Resets 00:00 UTC."
      accent={PURPLE}
      onClose={onClose}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ ...cap(10, '0.22em', PLATINUM), flex: 1 }}>
          PROGRESS · {claimed} / {missions.missions.length} CLAIMED
        </div>
        <button onClick={onReroll} className="kf-tap" style={{
          padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
          background: 'rgba(139,92,246,0.16)', border: `1px solid ${PURPLE}55`,
          color: PURPLE, fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 700,
        }}>↻ REROLL</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
        {missions.missions.map(m => {
          const tpl = MISSION_TEMPLATES.find(t => t.id === m.templateId);
          if (!tpl) return null;
          const pct = Math.min(100, (m.progress / m.target) * 100);
          const done = m.progress >= m.target;
          return (
            <div key={m.templateId} style={{
              padding: 14, borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(46,16,101,0.45), rgba(20,10,40,0.65))',
              border: `1px solid ${done ? EMERALD : PURPLE}44`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: done
                    ? 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.6), rgba(6,60,40,0.9))'
                    : 'radial-gradient(circle at 30% 30%, rgba(139,92,246,0.55), rgba(46,16,101,0.9))',
                  border: `1px solid ${done ? EMERALD : PURPLE}66`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: done ? EMERALD : PURPLE,
                }}>{done ? '✓' : tpl.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...cap(11, '0.15em', PLATINUM), fontWeight: 700 }}>{tpl.label.toUpperCase()}</div>
                  <div style={{ fontFamily: BODY, fontSize: 12, color: 'rgba(226,232,240,0.9)' }}>{tpl.hint}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: DISPLAY, fontSize: 18, color: GOLD, fontWeight: 800 }}>+{tpl.reward}</div>
                  <div style={cap(8, '0.18em')}>{m.progress}/{m.target}</div>
                </div>
              </div>
              <div style={{
                marginTop: 10, height: 6, borderRadius: 999,
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                {m.claimed ? (
                  <div style={cap(10, '0.22em', EMERALD)}>✓ CLAIMED</div>
                ) : done ? (
                  <button onClick={() => onClaim(m.templateId)} className="kf-tap" style={{
                    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                    background: `linear-gradient(180deg, ${EMERALD}dd, #059669)`,
                    border: `1px solid ${EMERALD}`,
                    color: '#062010',
                    fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 900,
                  }}>CLAIM +{tpl.reward}</button>
                ) : (
                  <div style={cap(9, '0.15em')}>IN PROGRESS</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};

// ── VIP ─────────────────────────────────────────────────────────────────────
interface VipModalProps {
  tier: VipTier;
  points: PointsState;
  onClose: () => void;
}

export const VipModal: React.FC<VipModalProps> = ({ tier, points, onClose }) => {
  const nxt = nextVipTier(points.vipXp);
  const to = nxt ? nxt.xpRequired : tier.xpRequired;
  const from = tier.xpRequired;
  const pct = nxt ? Math.min(100, ((points.vipXp - from) / (to - from)) * 100) : 100;

  return (
    <ModalShell
      title="VIP CLUB"
      subtitle="Play more, climb tiers, unlock rooms and perks."
      accent={tier.color}
      onClose={onClose}
    >
      <div style={{
        padding: 16, borderRadius: 14, marginBottom: 16,
        background: `linear-gradient(135deg, ${tier.color}22, rgba(19,22,41,0.6))`,
        border: `1px solid ${tier.color}55`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${tier.color}66, ${tier.color}22)`,
            border: `1px solid ${tier.color}88`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: tier.color, fontSize: 28,
          }}>♛</div>
          <div style={{ flex: 1 }}>
            <div style={cap(9, '0.28em', PURPLE)}>CURRENT TIER</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 900, color: tier.color, marginTop: 2 }}>
              VIP {tier.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: BODY, fontSize: 12, color: 'rgba(226,232,240,0.92)', marginTop: 4, fontStyle: 'italic' }}>
              {tier.perk}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 14, height: 8, borderRadius: 999,
          background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${PURPLE}, ${tier.color})`,
            boxShadow: `0 0 12px ${tier.color}88`,
          }} />
        </div>
        <div style={{ ...cap(10, '0.2em'), marginTop: 8 }}>
          {points.vipXp.toLocaleString()} XP {nxt ? `· ${(to - points.vipXp).toLocaleString()} to ${nxt.label}` : '· max tier'}
        </div>
      </div>

      <div style={{ ...cap(10, '0.28em', PLATINUM), marginBottom: 10, fontWeight: 700 }}>◆ ALL TIERS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        {VIP_TIERS.map(t => {
          const isCurrent = t.tier === tier.tier;
          const reached = points.vipXp >= t.xpRequired;
          return (
            <div key={t.tier} style={{
              padding: 12, borderRadius: 10,
              background: isCurrent
                ? `linear-gradient(90deg, ${t.color}22, rgba(19,22,41,0.5))`
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isCurrent ? t.color : reached ? t.color + '44' : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', gap: 12, alignItems: 'center',
              opacity: reached ? 1 : 0.65,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: `linear-gradient(135deg, ${t.color}66, ${t.color}22)`,
                border: `1px solid ${t.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.color, fontSize: 16,
              }}>{reached ? '✓' : '♛'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ ...cap(11, '0.2em', t.color), fontWeight: 800 }}>
                  {t.label.toUpperCase()} · TIER {t.tier}
                </div>
                <div style={{ fontFamily: BODY, fontSize: 11, color: 'rgba(226,232,240,0.9)', marginTop: 2 }}>
                  {t.perk}
                </div>
              </div>
              <div style={cap(9, '0.15em')}>{t.xpRequired.toLocaleString()} XP</div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};

// ── LEADERBOARD ─────────────────────────────────────────────────────────────
interface LeaderboardModalProps {
  points: PointsState;
  onClose: () => void;
}

const LEADERBOARD_SEED: { name: string; chips: number; streak: number; flag: string }[] = [
  { name: 'GrandMasterX',    chips: 148_320, streak: 12, flag: '♛' },
  { name: 'QueenSacrifice',  chips: 112_450, streak: 8,  flag: '♛' },
  { name: 'IronPawn',        chips:  98_120, streak: 6,  flag: '◆' },
  { name: 'ShadowKnight',    chips:  76_500, streak: 5,  flag: '◆' },
  { name: 'RubyBishop_VIP',  chips:  62_800, streak: 4,  flag: '★' },
  { name: 'DiamondRook',     chips:  48_200, streak: 3,  flag: '★' },
  { name: 'VioletCastle',    chips:  33_150, streak: 2,  flag: '✦' },
  { name: 'GhostGambit',     chips:  24_400, streak: 2,  flag: '✦' },
  { name: 'MidnightBaron',   chips:  16_800, streak: 1,  flag: '◈' },
  { name: 'SapphireStorm',   chips:  10_900, streak: 1,  flag: '◈' },
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ points, onClose }) => {
  const [tab, setTab] = useState<'chips' | 'streak'>('chips');
  const you = { name: 'You', chips: points.balance, streak: points.winStreak, flag: '♟' };
  const withYou = [...LEADERBOARD_SEED, you].sort((a, b) => tab === 'chips' ? b.chips - a.chips : b.streak - a.streak);
  const yourRank = withYou.findIndex(r => r.name === 'You') + 1;

  return (
    <ModalShell
      title="LEADERBOARD"
      subtitle="Top players by chips & win streak. Weekly reset."
      accent={GOLD}
      onClose={onClose}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['chips', 'streak'] as const).map(k => (
          <button key={k} onClick={() => setTab(k)} className="kf-tap" style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
            background: tab === k
              ? 'linear-gradient(180deg, rgba(251,191,36,0.24), rgba(80,60,20,0.4))'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${tab === k ? GOLD : 'rgba(255,255,255,0.08)'}`,
            color: tab === k ? GOLD : PLATINUM,
            fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 700,
          }}>
            {k === 'chips' ? '⛃ CHIPS' : '🔥 STREAK'}
          </button>
        ))}
      </div>
      <div style={{
        padding: 12, borderRadius: 10, marginBottom: 12,
        background: `linear-gradient(90deg, ${GOLD}22, rgba(19,22,41,0.5))`,
        border: `1px solid ${GOLD}55`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...cap(9, '0.22em', GOLD), fontWeight: 700 }}>YOUR RANK</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 900, color: GOLD }}>#{yourRank}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        {withYou.slice(0, 11).map((row, i) => {
          const isYou = row.name === 'You';
          return (
            <div key={row.name + i} style={{
              padding: '10px 12px', borderRadius: 10,
              background: isYou
                ? `linear-gradient(90deg, ${EMERALD}22, rgba(19,22,41,0.6))`
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${isYou ? EMERALD : 'rgba(255,255,255,0.06)'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 30, textAlign: 'center',
                fontFamily: DISPLAY, fontSize: 16, fontWeight: 800,
                color: i === 0 ? GOLD : i === 1 ? PLATINUM : i === 2 ? '#c48a3c' : PLATINUM,
              }}>{i + 1}</div>
              <div style={{ fontSize: 18, color: isYou ? EMERALD : GOLD, width: 22, textAlign: 'center' }}>{row.flag}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 14, fontWeight: 700, color: isYou ? EMERALD : PLATINUM }}>
                  {isYou ? 'YOU' : row.name}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 15, fontWeight: 800, color: GOLD }}>
                  {tab === 'chips' ? row.chips.toLocaleString() : `${row.streak}×`}
                </div>
                <div style={cap(8, '0.18em')}>{tab === 'chips' ? 'CHIPS' : 'STREAK'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};

// ── STORE ───────────────────────────────────────────────────────────────────
interface StoreModalProps {
  points: PointsState;
  tier: VipTier;
  onEquip: (id: ChipSkinId) => void;
  onClose: () => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({ points, tier, onEquip, onClose }) => (
  <ModalShell
    title="CHESS STORE"
    subtitle="Cosmetic skins for pieces and felt. Unlocks scale with VIP tier."
    accent={PURPLE}
    onClose={onClose}
  >
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {CHIP_SKIN_ORDER.map(id => {
        const skin = CHIP_SKINS[id];
        const unlocked = points.unlockedSkins.includes(id);
        const equipped = points.activeSkin === id;
        const canUnlock = tier.tier >= skin.vipRequired;
        return (
          <div key={id} style={{
            padding: 14, borderRadius: 12,
            background: `linear-gradient(180deg, ${skin.boardDark}88, rgba(10,10,20,0.9))`,
            border: `1px solid ${equipped ? EMERALD : skin.playerColor + '55'}`,
            boxShadow: equipped ? `0 0 20px ${EMERALD}44` : 'none',
            opacity: unlocked ? 1 : 0.6,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${skin.playerColor}, ${skin.playerColor}77 55%, ${skin.playerColor}33)`,
                border: `2px solid ${skin.playerColor}`,
              }} />
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: `radial-gradient(circle at 30% 30%, ${skin.houseColor}, ${skin.houseColor}77 55%, ${skin.houseColor}33)`,
                border: `2px solid ${skin.houseColor}`,
              }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ ...cap(11, '0.22em', PLATINUM), fontWeight: 700 }}>{skin.label.toUpperCase()}</div>
              <div style={{ ...cap(9, '0.15em'), marginTop: 3 }}>
                {unlocked ? (equipped ? '✓ EQUIPPED' : 'OWNED') : `LOCKED · VIP ${skin.vipRequired}`}
              </div>
            </div>
            <button
              onClick={() => { if (unlocked && !equipped) onEquip(id); }}
              disabled={!unlocked || equipped}
              className="kf-tap"
              style={{
                width: '100%', marginTop: 10, padding: '10px',
                borderRadius: 8, cursor: unlocked && !equipped ? 'pointer' : 'default',
                background: equipped
                  ? 'rgba(16,185,129,0.16)'
                  : unlocked
                    ? `linear-gradient(180deg, ${skin.playerColor}, ${skin.playerColor}88)`
                    : 'rgba(255,255,255,0.04)',
                border: `1px solid ${equipped ? EMERALD : unlocked ? skin.playerColor : 'rgba(255,255,255,0.1)'}`,
                color: equipped ? EMERALD : unlocked ? '#0a0a0a' : SILVER_INK,
                fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 800,
              }}
            >
              {equipped ? '✓ EQUIPPED' : unlocked ? 'EQUIP' : canUnlock ? 'PLAY TO UNLOCK' : `NEED VIP ${skin.vipRequired}`}
            </button>
          </div>
        );
      })}
    </div>
  </ModalShell>
);

// ── PROMOTIONS ──────────────────────────────────────────────────────────────
interface PromotionsModalProps {
  dailyBonus: DailyBonusStatus;
  onClaimDaily: () => void;
  onClose: () => void;
}

export const PromotionsModal: React.FC<PromotionsModalProps> = ({ dailyBonus, onClaimDaily, onClose }) => {
  const promos = [
    {
      key: 'weekend',
      accent: PURPLE, icon: '◉',
      title: 'WEEKEND BOOST',
      body: '+25% chips on every win this weekend. Ends Sunday 23:59 UTC.',
      cta: 'ACTIVE',
      pill: '⏱ 2d 17h 38m',
      action: undefined as (() => void) | undefined,
    },
    {
      key: 'daily',
      accent: EMERALD, icon: '🎁',
      title: 'DAILY BONUS',
      body: dailyBonus.ready ? 'Your daily chip drop is ready. Claim now.' : 'Next drop unlocks soon. Come back later.',
      cta: dailyBonus.ready ? 'CLAIM NOW' : 'READY LATER',
      pill: `+${dailyBonus.amount} CHIPS`,
      action: dailyBonus.ready ? onClaimDaily : undefined,
    },
    {
      key: 'jackpot',
      accent: ROSE, icon: '★',
      title: 'JACKPOT SURGE',
      body: 'Grand jackpot compounds every round. Higher tables raise your odds.',
      cta: 'PROGRESSIVE',
      pill: 'LIVE',
      action: undefined,
    },
    {
      key: 'refer',
      accent: GOLD, icon: '♛',
      title: 'REFER A FRIEND',
      body: 'Share Kingfall Chess — both get 500 chips when your friend hits VIP Regular.',
      cta: 'SHARE LINK',
      pill: '+500 EACH',
      action: () => {
        try {
          if (navigator.share) navigator.share({ title: 'Kingfall Chess', text: 'Play royal chess at Kingfall', url: window.location.href });
          else if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
        } catch { /* ignore */ }
      },
    },
  ];

  return (
    <ModalShell
      title="PROMOTIONS"
      subtitle="Active offers and bonuses. Stack them for max chip flow."
      accent={PURPLE}
      onClose={onClose}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {promos.map(p => (
          <div key={p.key} style={{
            padding: 16, borderRadius: 14,
            background: `linear-gradient(135deg, ${p.accent}18, rgba(15,18,36,0.85))`,
            border: `1px solid ${p.accent}55`,
            display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <div style={{
              width: 54, height: 54, borderRadius: 12,
              background: `radial-gradient(circle at 30% 30%, ${p.accent}dd, ${p.accent}44 60%)`,
              border: `1px solid ${p.accent}88`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, color: '#0a0a0a', flexShrink: 0,
            }}>{p.icon}</div>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ ...cap(11, '0.24em', p.accent), fontWeight: 800 }}>{p.title}</div>
                <div style={{
                  ...cap(8, '0.18em', p.accent), padding: '2px 8px',
                  border: `1px solid ${p.accent}66`, borderRadius: 999,
                  background: `${p.accent}18`,
                }}>{p.pill}</div>
              </div>
              <div style={{ fontFamily: BODY, fontSize: 12, color: 'rgba(226,232,240,0.92)', marginTop: 4 }}>
                {p.body}
              </div>
            </div>
            <button
              onClick={p.action}
              disabled={!p.action}
              className="kf-tap"
              style={{
                padding: '10px 14px', borderRadius: 8,
                background: p.action
                  ? `linear-gradient(180deg, ${p.accent}, ${p.accent}88)`
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${p.accent}88`,
                color: p.action ? '#0a0a0a' : p.accent,
                fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 800,
                cursor: p.action ? 'pointer' : 'default', flexShrink: 0,
              }}
            >{p.cta}</button>
          </div>
        ))}
      </div>
    </ModalShell>
  );
};

// ── CASHIER ─────────────────────────────────────────────────────────────────
interface CashierModalProps {
  points: PointsState;
  onAddChips: (n: number) => void;
  onReset: () => void;
  onClose: () => void;
  onSfx: (n: 'coin' | 'chipClick' | 'error') => void;
}

const CHIP_PACKS: { id: string; label: string; amount: number; accent: string; tag?: string }[] = [
  { id: 'starter', label: 'STARTER',  amount:    500, accent: SILVER_INK },
  { id: 'stack',   label: 'STACK',    amount:  2_000, accent: PLATINUM },
  { id: 'pile',    label: 'PILE',     amount:  5_000, accent: GOLD,    tag: 'POPULAR' },
  { id: 'vault',   label: 'VAULT',    amount: 15_000, accent: CRIMSON, tag: '+15%' },
  { id: 'crown',   label: 'CROWN',    amount: 50_000, accent: PURPLE,  tag: 'BEST VALUE' },
];

export const CashierModal: React.FC<CashierModalProps> = ({ points, onAddChips, onReset, onClose, onSfx }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <ModalShell
      title="CASHIER"
      subtitle="Play-chip top-ups (this is a free-to-play demo — no real money)."
      accent={GOLD}
      onClose={onClose}
    >
      <div style={{
        padding: 16, borderRadius: 14, marginBottom: 16,
        background: `linear-gradient(135deg, ${GOLD}18, rgba(15,18,36,0.85))`,
        border: `1px solid ${GOLD}55`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #fde68a, #a37507)',
          border: `2px solid ${GOLD}`,
        }} className="kf-coin" />
        <div style={{ flex: 1 }}>
          <div style={cap(9, '0.28em', GOLD)}>CURRENT BALANCE</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, color: PLATINUM }}>
            {points.balance.toLocaleString()} <span style={{ fontSize: 14, color: SILVER_INK }}>CHIPS</span>
          </div>
        </div>
      </div>

      <div style={{ ...cap(10, '0.28em', PLATINUM), fontWeight: 700, marginBottom: 10 }}>◆ CHIP PACKS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
        {CHIP_PACKS.map(p => (
          <button
            key={p.id}
            onClick={() => { onSfx('coin'); onAddChips(p.amount); }}
            className="kf-tap"
            style={{
              padding: 14, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
              background: `linear-gradient(180deg, ${p.accent}22, rgba(15,18,36,0.9))`,
              border: `1px solid ${p.accent}66`,
              color: PLATINUM, position: 'relative', minHeight: 110,
            }}
          >
            {p.tag && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                ...cap(8, '0.18em', '#0a0a0a'), fontWeight: 900,
                background: p.accent, padding: '2px 6px', borderRadius: 4,
              }}>{p.tag}</div>
            )}
            <div style={{ fontSize: 26 }}>⛃</div>
            <div style={{ ...cap(10, '0.22em', p.accent), fontWeight: 800, marginTop: 6 }}>{p.label}</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 900, color: PLATINUM, marginTop: 2 }}>
              +{p.amount.toLocaleString()}
            </div>
            <div style={cap(8, '0.15em')}>TAP TO CLAIM · FREE</div>
          </button>
        ))}
      </div>

      <div style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(239,68,68,0.06)',
        border: `1px solid ${CRIMSON}44`,
      }}>
        <div style={{ ...cap(10, '0.22em', CRIMSON), fontWeight: 700 }}>⚠ DANGER ZONE</div>
        <div style={{ fontFamily: BODY, fontSize: 12, color: 'rgba(226,232,240,0.88)', marginTop: 4 }}>
          Reset all progress — chips, VIP XP, achievements, skins. Cannot be undone.
        </div>
        {!confirmReset ? (
          <button
            onClick={() => setConfirmReset(true)}
            className="kf-tap"
            style={{
              marginTop: 10, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
              background: 'transparent', border: `1px solid ${CRIMSON}88`,
              color: CRIMSON, fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 700,
            }}
          >RESET PROGRESS</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={() => { onReset(); setConfirmReset(false); onClose(); }}
              className="kf-tap"
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                background: CRIMSON, border: `1px solid ${CRIMSON}`, color: '#0a0a0a',
                fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 900,
              }}
            >CONFIRM RESET</button>
            <button
              onClick={() => setConfirmReset(false)}
              className="kf-tap"
              style={{
                padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                background: 'transparent', border: `1px solid ${SILVER_INK}`,
                color: PLATINUM, fontFamily: HEADING, fontSize: 10, letterSpacing: '0.22em', fontWeight: 700,
              }}
            >CANCEL</button>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

// ── TABLES ──────────────────────────────────────────────────────────────────
interface TablesModalProps {
  points: PointsState;
  tier: VipTier;
  onPlay: (level: DifficultyLevel) => void;
  onSfx: (n: 'chipClick' | 'error') => void;
  onClose: () => void;
}

export const TablesModal: React.FC<TablesModalProps> = ({ points, tier, onPlay, onSfx, onClose }) => {
  const levels: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert', 'highroller'];
  return (
    <ModalShell
      title="ALL TABLES"
      subtitle="Every room, every stake — pick your fight."
      accent={EMERALD}
      onClose={onClose}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {levels.map(level => {
          const cfg = LEVEL_CONFIGS[level];
          const locked = tier.tier < cfg.vipRequired;
          const affordable = points.balance >= cfg.cost;
          return (
            <div key={level} style={{
              padding: 16, borderRadius: 14,
              background: cfg.gradient,
              border: `1px solid ${cfg.color}66`,
              boxShadow: `0 8px 22px ${cfg.glow}`,
              display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
              opacity: locked ? 0.7 : 1,
            }}>
              <div style={{ flex: '1 1 200px', minWidth: 180 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 900, color: cfg.color, letterSpacing: '0.05em' }}>
                  {cfg.label}
                </div>
                <div style={{ fontFamily: BODY, fontSize: 12, color: 'rgba(226,232,240,0.92)', marginTop: 4, fontStyle: 'italic' }}>
                  {cfg.tagline} · {cfg.description}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={cap(8, '0.2em')}>BUY-IN</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 16, color: cfg.color, fontWeight: 800 }}>{cfg.cost}</div>
                </div>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={cap(8, '0.2em')}>PAYS</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 16, color: EMERALD, fontWeight: 800 }}>+{cfg.reward}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (locked || !affordable) { onSfx('error'); return; }
                  onSfx('chipClick');
                  onPlay(level);
                  onClose();
                }}
                className="kf-tap"
                style={{
                  padding: '12px 18px', borderRadius: 10, cursor: locked || !affordable ? 'not-allowed' : 'pointer',
                  background: locked || !affordable
                    ? 'rgba(255,255,255,0.05)'
                    : `linear-gradient(180deg, ${cfg.color}, ${cfg.color}88)`,
                  border: `1px solid ${cfg.color}`,
                  color: locked || !affordable ? SILVER_INK : '#0a0a0a',
                  fontFamily: HEADING, fontSize: 11, letterSpacing: '0.24em', fontWeight: 900,
                  minHeight: 44, flexShrink: 0,
                }}
              >
                {locked ? `🔒 VIP ${cfg.vipRequired}` : !affordable ? 'LOW CHIPS' : 'PLAY'}
              </button>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};

// ── ACHIEVEMENTS ────────────────────────────────────────────────────────────
interface AchievementsModalProps {
  points: PointsState;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ points, onClose }) => (
  <ModalShell
    title="ACHIEVEMENTS"
    subtitle={`${points.unlockedAchievements.length} of ${ACHIEVEMENTS.length} unlocked`}
    accent={GOLD}
    onClose={onClose}
  >
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
      {ACHIEVEMENTS.map(a => {
        const got = points.unlockedAchievements.includes(a.id);
        return (
          <div key={a.id} style={{
            padding: 14, borderRadius: 12, textAlign: 'center',
            background: got
              ? 'linear-gradient(180deg, rgba(251,191,36,0.22), rgba(80,60,20,0.4))'
              : 'rgba(255,255,255,0.02)',
            border: `1px solid ${got ? GOLD : 'rgba(255,255,255,0.06)'}66`,
            opacity: got ? 1 : 0.7,
            minHeight: 140,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <div style={{ fontSize: 30, color: got ? GOLD : SILVER_INK }}>{a.icon}</div>
            <div style={{ ...cap(10, '0.15em', got ? PLATINUM : SILVER_INK), fontWeight: 700 }}>{a.label.toUpperCase()}</div>
            <div style={{ fontFamily: BODY, fontSize: 11, color: 'rgba(226,232,240,0.88)', lineHeight: 1.35, flex: 1 }}>
              {a.hint}
            </div>
            <div style={{ ...cap(9, '0.18em', got ? EMERALD : SILVER_INK), fontWeight: 800 }}>
              {got ? '✓ CLAIMED' : `REWARD +${a.reward}`}
            </div>
          </div>
        );
      })}
    </div>
  </ModalShell>
);

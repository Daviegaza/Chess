import React from 'react';
import {
  formatTimeControl,
  TIME_PRESETS,
  TimeControl,
  TimePreset,
  TimePresetId,
} from '../types/game.types';
import { UseTimePrefReturn } from '../hooks/useTimePref';

const GOLD = '#fbbf24';
const PURPLE = '#8b5cf6';
const PLATINUM = '#e2e8f0';
const EMERALD = '#10b981';
const SILVER_INK = '#94a3b8';
const HEADING = "'Cinzel', serif";
const DISPLAY = "'Playfair Display', serif";
const BODY = "'Crimson Pro', serif";

const cap = (size = 9, ls = '0.22em', color = SILVER_INK): React.CSSProperties => ({
  fontFamily: HEADING, fontSize: size, letterSpacing: ls, color,
  textTransform: 'uppercase',
});

const groupOrder: TimePreset['group'][] = ['Bullet', 'Blitz', 'Rapid', 'Classic', 'Marathon', 'Custom'];

const PresetChip: React.FC<{
  preset: TimePreset;
  active: boolean;
  isDefault: boolean;
  onClick: () => void;
}> = ({ preset, active, isDefault, onClick }) => (
  <button
    onClick={onClick}
    className="kf-tap"
    style={{
      position: 'relative',
      minWidth: 78,
      padding: '10px 14px',
      borderRadius: 10,
      cursor: 'pointer',
      background: active
        ? `linear-gradient(180deg, ${preset.color}33, ${preset.color}0a)`
        : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? preset.color : 'rgba(255,255,255,0.08)'}`,
      color: active ? preset.color : PLATINUM,
      fontFamily: DISPLAY,
      fontSize: 15,
      fontWeight: 800,
      letterSpacing: '0.04em',
      transition: 'all 0.18s ease',
      boxShadow: active ? `0 6px 18px ${preset.color}44` : 'none',
    }}
  >
    {preset.label}
    {isDefault && (
      <span
        aria-label="default"
        style={{
          position: 'absolute', top: -6, right: -6,
          background: GOLD, color: '#20140a',
          fontSize: 8, fontWeight: 900, letterSpacing: '0.1em',
          padding: '2px 6px', borderRadius: 999,
          fontFamily: HEADING,
          boxShadow: '0 2px 8px rgba(251,191,36,0.55)',
        }}
      >★</span>
    )}
  </button>
);

const Slider: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
  accent: string;
}> = ({ label, min, max, step, value, onChange, format, accent }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div style={cap(9, '0.22em', PLATINUM)}>{label}</div>
      <div style={{
        fontFamily: DISPLAY, fontSize: 16, fontWeight: 800, color: accent, fontFeatureSettings: '"tnum"',
      }}>{format(value)}</div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%', marginTop: 8, accentColor: accent,
        height: 4, cursor: 'pointer',
      }}
    />
  </div>
);

function fmtInitial(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = sec / 60;
  if (m >= 10) return `${Math.round(m)}m`;
  return `${(Math.round(m * 2) / 2)}m`;
}

interface Props {
  timePref: UseTimePrefReturn;
  onSfx?: (n: 'chipClick' | 'coin' | 'error') => void;
  compact?: boolean;
}

const TimeControlPicker: React.FC<Props> = ({ timePref, onSfx, compact = false }) => {
  const {
    defaultPresetId, defaultTc,
    selectedPresetId, selectedTc,
    setSelectedPreset, setCustomTc,
    saveAsDefault, resetToDefault,
    isSelectionDefault,
    limits,
  } = timePref;

  const showCustomEditor = selectedPresetId === 'custom';

  const grouped: Record<string, TimePreset[]> = {};
  TIME_PRESETS.forEach(p => {
    (grouped[p.group] ||= []).push(p);
  });

  return (
    <div style={{
      padding: compact ? 14 : 18,
      borderRadius: 14,
      background:
        'radial-gradient(ellipse at 100% 0%, rgba(139,92,246,0.14) 0%, transparent 55%),' +
        'linear-gradient(180deg, rgba(28,32,52,0.94) 0%, rgba(19,22,41,0.96) 100%)',
      border: '1px solid rgba(139,92,246,0.32)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)',
      color: PLATINUM,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ color: PURPLE, fontSize: 12 }}>⏱</span>
        <div style={{ ...cap(11, '0.28em', PLATINUM), fontWeight: 700 }}>TIME CONTROL</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={cap(9, '0.16em', SILVER_INK)}>
            DEFAULT · {formatTimeControl(defaultTc)}
          </div>
          {!isSelectionDefault && (
            <button
              onClick={() => { onSfx?.('chipClick'); resetToDefault(); }}
              className="kf-tap"
              style={{
                padding: '4px 10px', borderRadius: 6,
                background: 'transparent', border: `1px solid ${SILVER_INK}55`,
                color: SILVER_INK, cursor: 'pointer',
                fontFamily: HEADING, fontSize: 9, letterSpacing: '0.2em', fontWeight: 700,
              }}
            >RESET</button>
          )}
        </div>
      </div>

      {groupOrder.map(g => {
        const list = grouped[g];
        if (!list || list.length === 0) return null;
        return (
          <div key={g} style={{ marginBottom: 10 }}>
            <div style={{ ...cap(8, '0.24em', SILVER_INK), marginBottom: 6 }}>{g}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {list.map(p => (
                <PresetChip
                  key={p.id}
                  preset={p}
                  active={selectedPresetId === p.id}
                  isDefault={defaultPresetId === p.id}
                  onClick={() => { onSfx?.('chipClick'); setSelectedPreset(p.id); }}
                />
              ))}
            </div>
          </div>
        );
      })}

      {showCustomEditor && (
        <div style={{
          marginTop: 12, padding: 14, borderRadius: 12,
          background: 'linear-gradient(180deg, rgba(46,16,101,0.35), rgba(20,10,40,0.55))',
          border: '1px solid rgba(139,92,246,0.28)',
          display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 16,
        }}>
          <Slider
            label="Initial per side"
            min={limits.minInitial}
            max={limits.maxInitial}
            step={15}
            value={selectedTc.initial}
            onChange={(n) => { onSfx?.('chipClick'); setCustomTc({ ...selectedTc, initial: n }); }}
            format={fmtInitial}
            accent={GOLD}
          />
          <Slider
            label="Increment per move"
            min={limits.minInc}
            max={limits.maxInc}
            step={1}
            value={selectedTc.increment}
            onChange={(n) => { onSfx?.('chipClick'); setCustomTc({ ...selectedTc, increment: n }); }}
            format={(n) => `${n}s`}
            accent={PURPLE}
          />
        </div>
      )}

      <div style={{
        marginTop: 14,
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12,
      }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={cap(9, '0.16em', SILVER_INK)}>SELECTED</div>
          <div style={{
            fontFamily: DISPLAY, fontSize: 20, fontWeight: 900, color: PLATINUM,
            fontFeatureSettings: '"tnum"',
          }}>
            {formatTimeControl(selectedTc)}
          </div>
          <div style={{ fontFamily: BODY, fontSize: 11, color: 'rgba(226,232,240,0.7)', marginTop: 2 }}>
            Applies to the next game you start.
          </div>
        </div>
        <button
          disabled={isSelectionDefault}
          onClick={() => { onSfx?.('coin'); saveAsDefault(); }}
          className="kf-tap"
          style={{
            padding: '12px 18px', borderRadius: 10,
            cursor: isSelectionDefault ? 'not-allowed' : 'pointer',
            background: isSelectionDefault
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(180deg, #fde68a 0%, #d4a437 55%, #7a5a10 100%)',
            border: isSelectionDefault ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,220,120,0.55)',
            color: isSelectionDefault ? SILVER_INK : '#20140a',
            fontFamily: HEADING, fontSize: 10, letterSpacing: '0.24em', fontWeight: 900,
            boxShadow: isSelectionDefault ? 'none' : '0 8px 22px rgba(251,191,36,0.35)',
            minHeight: 44,
          }}
        >{isSelectionDefault ? '★ CURRENT DEFAULT' : 'SET AS DEFAULT'}</button>
      </div>
    </div>
  );
};

export default TimeControlPicker;

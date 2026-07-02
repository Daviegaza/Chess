import React, { useEffect, useRef, useState } from 'react';
import { useSoundFX } from '../hooks/useSoundFX';

interface AgeGateProps {
  onAcknowledge: () => void;
}

const AgeGate: React.FC<AgeGateProps> = ({ onAcknowledge }) => {
  const [checked, setChecked] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { play } = useSoundFX();

  useEffect(() => {
    if (checked && btnRef.current) btnRef.current.focus();
  }, [checked]);

  const handleAccept = () => {
    play('coin');
    onAcknowledge();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'radial-gradient(ellipse at center, rgba(28,32,52,0.98) 0%, rgba(5,8,20,0.99) 100%)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, color: '#e2e8f0',
    }}>
      <div style={{
        maxWidth: 460, width: '100%',
        background: 'linear-gradient(135deg, rgba(46,16,101,0.6) 0%, rgba(19,22,41,0.85) 100%)',
        border: '1px solid rgba(139,92,246,0.5)',
        borderRadius: 20, padding: '32px 28px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 60px rgba(139,92,246,0.28)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 12, letterSpacing: '0.4em', color: '#94a3b8', fontFamily: "'Cinzel', serif",
        }}>WELCOME TO</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 44, fontWeight: 900, letterSpacing: '0.08em',
          background: 'linear-gradient(180deg, #fde68a 0%, #fbbf24 55%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: '4px 0 20px',
        }}>KINGFALL CHESS</div>

        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#cbd5e1', marginBottom: 20, fontFamily: "'Crimson Pro', serif" }}>
          Skill-based chess with virtual chips. <b style={{ color: '#fbbf24' }}>No real money. No cash value. No deposits.</b>{' '}
          Chips are earned by winning against the AI and reset if you run out.
        </p>

        <div style={{
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 20,
          fontSize: 11, color: '#fca5a5', fontStyle: 'italic',
        }}>
          You must be 18+ to enter. If gambling ever feels compulsive, contact{' '}
          <a href="https://www.ncpgambling.org/help-treatment/help-by-state/" target="_blank" rel="noopener noreferrer"
             style={{ color: '#fca5a5' }}>NCPG</a>.
        </div>

        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${checked ? '#8b5cf6' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10, cursor: 'pointer', marginBottom: 16,
          transition: 'all 0.2s ease',
        }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#8b5cf6', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12, color: '#e2e8f0', textAlign: 'left', lineHeight: 1.4 }}>
            I'm 18+ and understand these are virtual chips with no cash value.
          </span>
        </label>

        <button
          ref={btnRef}
          onClick={handleAccept}
          disabled={!checked}
          className="kf-tap"
          style={{
            width: '100%',
            background: checked
              ? 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)'
              : 'rgba(46,16,101,0.5)',
            border: `1px solid ${checked ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 12, color: checked ? '#f8fafc' : '#5a4a7a',
            fontSize: 14, letterSpacing: '0.2em', fontFamily: "'Cinzel', serif", fontWeight: 800,
            padding: '14px', cursor: checked ? 'pointer' : 'not-allowed',
            boxShadow: checked ? '0 6px 20px rgba(139,92,246,0.5)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >ENTER THE THRONE ROOM</button>
      </div>
    </div>
  );
};

export default AgeGate;

import React, { useEffect, useRef } from 'react';
import { useSoundFX } from '../hooks/useSoundFX';

interface AgeGateProps {
  onAcknowledge: () => void;
}

const AgeGate: React.FC<AgeGateProps> = ({ onAcknowledge }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { play } = useSoundFX();

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  const handleEnter = () => {
    play('fanfare');
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
        maxWidth: 520, width: '100%',
        background: 'linear-gradient(135deg, rgba(46,16,101,0.6) 0%, rgba(19,22,41,0.85) 100%)',
        border: '1px solid rgba(139,92,246,0.5)',
        borderRadius: 20, padding: '40px 32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.75), 0 0 80px rgba(139,92,246,0.32)',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 12, letterSpacing: '0.5em', color: '#94a3b8', fontFamily: "'Cinzel', serif",
        }}>WELCOME TO</div>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 56, fontWeight: 900, letterSpacing: '0.08em',
          background: 'linear-gradient(180deg, #fde68a 0%, #fbbf24 55%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: '8px 0 8px',
        }}>KINGFALL CHESS</div>
        <div style={{
          fontSize: 13, letterSpacing: '0.3em', color: '#a78bfa', fontFamily: "'Cinzel', serif",
          marginBottom: 28,
        }}>THE THRONE ROOM</div>

        <button
          ref={btnRef}
          onClick={handleEnter}
          className="kf-tap"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)',
            border: '1px solid rgba(139,92,246,0.7)',
            borderRadius: 12, color: '#f8fafc',
            fontSize: 16, letterSpacing: '0.25em', fontFamily: "'Cinzel', serif", fontWeight: 800,
            padding: '16px', cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(139,92,246,0.55)',
            transition: 'all 0.2s ease',
          }}
        >ENTER THE THRONE ROOM</button>
      </div>
    </div>
  );
};

export default AgeGate;

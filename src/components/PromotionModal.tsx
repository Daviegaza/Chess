import React from 'react';
import { PieceColor, PieceType } from '../types/chess.types';
import ChessPiece from './ChessPiece';
import { useWindowSize } from '../hooks/useWindowSize';
import { sfx } from '../utils/soundEngine';

interface PromotionModalProps {
  color: PieceColor;
  onChoose: (piece: PieceType) => void;
}

const PROMOTION_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

const PromotionModal: React.FC<PromotionModalProps> = ({ color, onChoose }) => {
  const { isMobile } = useWindowSize();
  const btnSize = isMobile ? 64 : 72;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,14,31,0.68)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 600, backdropFilter: 'blur(10px) saturate(1.1)',
      WebkitBackdropFilter: 'blur(10px) saturate(1.1)',
      padding: 16, overflowY: 'auto',
      animation: 'kf-fade-in 0.2s ease forwards',
    }}>
      <div style={{
        padding: isMobile ? '24px 18px' : '32px 40px',
        textAlign: 'center',
        width: '100%',
        maxWidth: 420,
        background:
          'radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.20) 0%, transparent 60%),' +
          'linear-gradient(180deg, rgba(28,32,52,0.98), rgba(14,18,36,0.98))',
        border: '1px solid rgba(251,191,36,0.5)',
        borderRadius: 20,
        boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 60px rgba(139,92,246,0.35)',
      }}>
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.32em',
          color: '#c4b5fd', fontWeight: 700, marginBottom: 4,
          textTransform: 'uppercase',
        }}>◆ PROMOTION</div>
        <h3 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900,
          letterSpacing: '0.14em', margin: '4px 0 20px', color: '#fbbf24',
        }}>
          CHOOSE YOUR PIECE
        </h3>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: isMobile ? 8 : 12,
        }}>
          {PROMOTION_PIECES.map(pieceType => (
            <button
              key={pieceType}
              className="kf-tap"
              onClick={() => onChoose(pieceType)}
              style={{
                aspectRatio: '1 / 1',
                border: '1px solid rgba(139,92,246,0.5)',
                borderRadius: 12,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, padding: 6, cursor: 'pointer',
                background: 'linear-gradient(160deg, rgba(28,32,52,0.9) 0%, rgba(14,18,36,0.95) 100%)',
                color: '#e2e8f0',
                transition: 'transform 0.14s ease, background 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease',
              }}
              onMouseEnter={e => {
                sfx.pickup();
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(160deg, rgba(139,92,246,0.28) 0%, rgba(76,29,149,0.35) 100%)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#fbbf24';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(251,191,36,0.3)';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(160deg, rgba(28,32,52,0.9) 0%, rgba(14,18,36,0.95) 100%)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(139,92,246,0.5)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <ChessPiece piece={{ type: pieceType, color }} size={btnSize - 24} />
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.2em',
                color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase',
              }}>
                {pieceType}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromotionModal;

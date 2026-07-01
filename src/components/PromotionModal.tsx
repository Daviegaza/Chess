import React from 'react';
import { PieceColor, PieceType } from '../types/chess.types';
import ChessPiece from './ChessPiece';
import { useWindowSize } from '../hooks/useWindowSize';

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
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(8px)',
      padding: 16,
      animation: 'kf-fade-in 0.2s ease forwards',
    }}>
      <div className="kf-panel" style={{
        padding: isMobile ? '24px 20px' : '32px 40px',
        textAlign: 'center',
        width: '100%',
        maxWidth: 380,
      }}>
        <div className="kf-eyebrow" style={{ marginBottom: 4 }}>Promotion</div>
        <h3 className="kf-serif kf-gold-text" style={{
          fontSize: 20, fontWeight: 900, letterSpacing: '0.18em',
          margin: '0 0 20px',
        }}>
          CHOOSE YOUR PIECE
        </h3>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PROMOTION_PIECES.map(pieceType => (
            <button
              key={pieceType}
              onClick={() => onChoose(pieceType)}
              className="kf-panel kf-panel--interactive"
              style={{
                width: btnSize, height: btnSize,
                border: '1px solid var(--kf-border-strong)',
                borderRadius: 10,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 2,
                background: 'linear-gradient(160deg, #1a1208 0%, #0d0a05 100%)',
              }}
            >
              <ChessPiece piece={{ type: pieceType, color }} size={btnSize - 20} />
              <span className="kf-eyebrow" style={{ fontSize: 8 }}>
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

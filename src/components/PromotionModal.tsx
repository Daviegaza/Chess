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
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(6px)',
      padding: 16,
    }}>
      <div style={{
        background: 'linear-gradient(160deg, #1a1208 0%, #0d0a05 100%)',
        border: '1px solid #8a6020',
        borderRadius: 12,
        padding: isMobile ? '24px 20px' : '32px 40px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(200,150,0,0.1)',
        width: '100%',
        maxWidth: 340,
        boxSizing: 'border-box',
      }}>
        <p style={{
          color: '#d4a820', 
          fontSize: 16, fontWeight: 700, letterSpacing: '0.12em',
          marginBottom: 20, textTransform: 'uppercase',
        }}>
          Choose Promotion
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PROMOTION_PIECES.map(pieceType => (
            <button
              key={pieceType}
              onClick={() => onChoose(pieceType)}
              style={{
                width: btnSize, height: btnSize,
                background: 'rgba(200,150,0,0.1)',
                border: '1px solid #8a6020',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, transition: 'all 0.15s ease',
              }}
            >
              <ChessPiece piece={{ type: pieceType, color }} size={btnSize - 16} />
              <span style={{ color: '#9a7a40', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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

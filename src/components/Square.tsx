import React from 'react';
import type { Piece, Position } from '../types/chess.types';
import ChessPiece from './ChessPiece';

interface SquareProps {
  row: number;
  col: number;
  piece: Piece | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  onClick: (pos: Position) => void;
  squareSize: number;
}

// House-of-Kingfall board palette: parchment cream + deep emerald.
const LIGHT = '#ebe0b6';
const DARK  = '#2f5a44';
const LIGHT_TEXT = '#2f5a44';
const DARK_TEXT  = '#ebe0b6';

const Square: React.FC<SquareProps> = ({
  row,
  col,
  piece,
  isSelected,
  isLegalMove,
  isLastMove,
  isCheck,
  onClick,
  squareSize,
}) => {
  const isLight = (row + col) % 2 === 0;
  const bg = isLight ? LIGHT : DARK;

  let overlay: string | null = null;
  if (isSelected) {
    overlay = 'rgba(212, 168, 52, 0.45)';
  } else if (isLastMove) {
    overlay = 'rgba(212, 168, 52, 0.22)';
  } else if (isCheck && piece?.type === 'king') {
    overlay = 'rgba(217, 72, 72, 0.55)';
  }

  const handleClick = () => onClick({ row, col });

  const interactive = !!(piece || isLegalMove);
  return (
    <div
      onClick={handleClick}
      className={[
        'kf-square-3d',
        interactive ? 'kf-square-hover' : '',
        isCheck && piece?.type === 'king' ? 'kf-check-flash' : '',
        isLastMove ? 'kf-last-move' : '',
        isLegalMove && !piece ? 'kf-valid-move' : '',
        isLegalMove && piece ? 'kf-valid-capture' : '',
      ].filter(Boolean).join(' ')}
      style={{
        width: squareSize,
        height: squareSize,
        background: bg,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        boxSizing: 'border-box',
        transition: 'background 0.15s ease',
      }}
    >
      {overlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: overlay,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {isLegalMove && (
        <div
          className="kf-dot-pulse"
          style={{
            position: 'absolute',
            width: piece ? '82%' : '30%',
            height: piece ? '82%' : '30%',
            borderRadius: '50%',
            background: piece ? 'transparent' : 'rgba(212, 168, 52, 0.55)',
            border: piece ? '3px solid rgba(212, 168, 52, 0.75)' : 'none',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 2,
            boxShadow: piece ? '0 0 12px rgba(212, 168, 52, 0.5)' : 'none',
          }}
        />
      )}

      {piece && (
        <div
          key={`${piece.color}-${piece.type}-${isLastMove ? 'moved' : 'still'}`}
          className={[
            'kf-piece-3d',
            isLastMove ? 'kf-piece-arrive kf-piece-moving' : '',
            isSelected ? 'kf-piece-selected' : '',
            isCheck && piece.type === 'king' ? 'kf-in-check' : '',
          ].filter(Boolean).join(' ')}
          style={{
            position: 'relative',
            zIndex: 3,
          }}
        >
          <ChessPiece piece={piece} size={squareSize} />
        </div>
      )}

      {col === 0 && (
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 4,
            fontSize: Math.max(9, Math.round(squareSize * 0.14)),
            fontWeight: 700,
            fontFamily: "'Cinzel', Georgia, serif",
            color: isLight ? LIGHT_TEXT : DARK_TEXT,
            opacity: 0.55,
            lineHeight: 1,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          {8 - row}
        </span>
      )}

      {row === 7 && (
        <span
          style={{
            position: 'absolute',
            bottom: 3,
            right: 5,
            fontSize: Math.max(9, Math.round(squareSize * 0.14)),
            fontWeight: 700,
            fontFamily: "'Cinzel', Georgia, serif",
            color: isLight ? LIGHT_TEXT : DARK_TEXT,
            opacity: 0.55,
            lineHeight: 1,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          {String.fromCharCode(97 + col).toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default Square;

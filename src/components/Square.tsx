import React from 'react';
import { Piece, Position } from '../types/chess.types';
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

  let bg = isLight ? '#c8a97a' : '#7a4f2e';

  if (isSelected) {
    bg = '#d4a820';
  } else if (isLastMove) {
    bg = isLight ? '#cdd26a' : '#aaa23a';
  } else if (isCheck && piece?.type === 'king') {
    bg = '#c0392b';
  }

  const handleClick = () => onClick({ row, col });

  return (
    <div
      onClick={handleClick}
      style={{
        width: squareSize,
        height: squareSize,
        background: bg,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: piece || isLegalMove ? 'pointer' : 'default',
        transition: 'background 0.15s ease',
        boxSizing: 'border-box',
      }}
    >
      {/* Legal move indicator */}
      {isLegalMove && (
        <div
          style={{
            position: 'absolute',
            width: piece ? '100%' : '33%',
            height: piece ? '100%' : '33%',
            borderRadius: piece ? 0 : '50%',
            background: piece
              ? 'rgba(0,0,0,0)'
              : 'rgba(10, 10, 10, 0.35)',
            border: piece
              ? '4px solid rgba(10,10,10,0.4)'
              : 'none',
            boxSizing: 'border-box',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}

      {/* Piece */}
      {piece && (
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.1s ease',
          }}
        >
          <ChessPiece piece={piece} size={squareSize} />
        </div>
      )}

      {/* Coordinate labels */}
      {col === 0 && (
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: 3,
            fontSize: 11,
            fontWeight: 700,
            color: isLight ? '#7a4f2e' : '#c8a97a',
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
            bottom: 2,
            right: 3,
            fontSize: 11,
            fontWeight: 700,
            color: isLight ? '#7a4f2e' : '#c8a97a',
            lineHeight: 1,
            pointerEvents: 'none',
            zIndex: 4,
          }}
        >
          {String.fromCharCode(97 + col)}
        </span>
      )}
    </div>
  );
};

export default Square;

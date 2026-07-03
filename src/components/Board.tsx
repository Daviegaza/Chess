import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GameState, Move, Position } from '../types/chess.types';
import Square from './Square';

interface BoardProps {
  gameState: GameState;
  onSquareClick: (pos: Position) => void;
  isAITurn: boolean;
  squareSize?: number;
}

const Board: React.FC<BoardProps> = ({
  gameState,
  onSquareClick,
  isAITurn,
  squareSize = 72,
}) => {
  const { board, selectedSquare, legalMovesForSelected, isCheck, currentTurn, moveHistory } =
    gameState;

  const legalMoveSet = useMemo(() => {
    const set = new Set<string>();
    legalMovesForSelected.forEach(m => set.add(`${m.to.row},${m.to.col}`));
    return set;
  }, [legalMovesForSelected]);

  const lastMove: Move | null =
    moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].move : null;

  const boardSize = squareSize * 8;

  const [shake, setShake] = useState(false);
  const prevMoveCountRef = useRef(moveHistory.length);
  useEffect(() => {
    if (moveHistory.length > prevMoveCountRef.current) {
      const lastEntry = moveHistory[moveHistory.length - 1];
      const shouldShake = !!(lastEntry && (lastEntry.capturedPiece || isCheck));
      if (shouldShake) {
        setShake(true);
        const t = window.setTimeout(() => setShake(false), 460);
        return () => window.clearTimeout(t);
      }
    }
    prevMoveCountRef.current = moveHistory.length;
  }, [moveHistory, isCheck]);

  return (
    <div className={`kf-board-frame kf-board-3d kf-board-glow ${shake ? 'kf-shake' : ''}`} style={{ opacity: isAITurn ? 0.94 : 1, transition: 'opacity 0.5s cubic-bezier(0.2,1.1,0.4,1), transform 0.5s cubic-bezier(0.2,1.1,0.4,1)' }}>
    <div
      className="kf-board-frame__inner"
      style={{
        width: boardSize,
        height: boardSize,
        display: 'grid',
        gridTemplateColumns: `repeat(8, ${squareSize}px)`,
        gridTemplateRows: `repeat(8, ${squareSize}px)`,
        cursor: isAITurn ? 'not-allowed' : 'default',
      }}
    >
      {board.map((rowArr, row) =>
        rowArr.map((piece, col) => {
          const key = `${row}-${col}`;
          const isSelected = !!(
            selectedSquare &&
            selectedSquare.row === row &&
            selectedSquare.col === col
          );
          const isLegal = legalMoveSet.has(`${row},${col}`);
          const isLastMove = !!(
            lastMove &&
            ((lastMove.from.row === row && lastMove.from.col === col) ||
              (lastMove.to.row === row && lastMove.to.col === col))
          );
          const isKingInCheck =
            isCheck &&
            currentTurn === piece?.color &&
            piece?.type === 'king';

          return (
            <Square
              key={key}
              row={row}
              col={col}
              piece={piece}
              isSelected={isSelected}
              isLegalMove={isLegal}
              isLastMove={isLastMove}
              isCheck={isKingInCheck}
              onClick={isAITurn ? () => {} : onSquareClick}
              squareSize={squareSize}
            />
          );
        })
      )}
    </div>
    </div>
  );
};

export default Board;

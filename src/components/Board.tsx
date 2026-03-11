import React, { useMemo } from 'react';
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

  return (
    <div
      style={{
        width: boardSize,
        height: boardSize,
        display: 'grid',
        gridTemplateColumns: `repeat(8, ${squareSize}px)`,
        gridTemplateRows: `repeat(8, ${squareSize}px)`,
        border: '3px solid #8a6020',
        borderRadius: 4,
        boxShadow:
          '0 0 0 1px #5a3a10, 0 20px 60px rgba(0,0,0,0.8), 0 4px 15px rgba(200,150,0,0.15)',
        overflow: 'hidden',
        cursor: isAITurn ? 'not-allowed' : 'default',
        opacity: isAITurn ? 0.92 : 1,
        transition: 'opacity 0.3s ease',
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
  );
};

export default Board;

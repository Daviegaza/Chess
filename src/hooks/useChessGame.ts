import { useCallback, useRef, useState } from 'react';
import {
  Board,
  CastlingRights,
  GameState,
  HistoryEntry,
  Move,
  Piece,
  PieceColor,
  PieceType,
  Position,
  PromotionPending,
} from '../types/chess.types';
import {
  applyMove,
  createInitialBoard,
  getAllLegalMoves,
  getEnPassantTarget,
  getLegalMovesFrom,
  isInCheck,
  moveToNotation,
  updateCastlingRights,
  INITIAL_CASTLING_RIGHTS,
} from '../utils/chessEngine';

// ─── Initial State ────────────────────────────────────────────────────────────

function makeInitialState(): GameState {
  return {
    board: createInitialBoard(),
    currentTurn: 'white',
    selectedSquare: null,
    legalMovesForSelected: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedByWhite: [],
    capturedByBlack: [],
    enPassantTarget: null,
    castlingRights: { ...INITIAL_CASTLING_RIGHTS },
    moveHistory: [],
    promotionPending: null,
    halfMoveClock: 0,
    fullMoveNumber: 1,
  };
}

// ─── Hook Return Interface ────────────────────────────────────────────────────

export interface UseChessGameReturn {
  gameState: GameState;
  selectSquare: (pos: Position) => void;
  applyExternalMove: (move: Move) => void;
  resolvePromotion: (pieceType: PieceType) => void;
  resetGame: () => void;
  undoLastMove: (plies?: number) => boolean;
  isGameOver: boolean;
  canUndo: boolean;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getCapturedFromMove(board: Board, move: Move): Piece | null {
  if (move.isEnPassant) {
    const pawn = board[move.from.row][move.to.col];
    return pawn ?? null;
  }
  return board[move.to.row][move.to.col];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChessGame(): UseChessGameReturn {
  const [gameState, setGameState] = useState<GameState>(makeInitialState);
  const historyStack = useRef<GameState[]>([]);

  const isGameOver = gameState.isCheckmate || gameState.isStalemate;
  const canUndo = historyStack.current.length > 0 && !isGameOver;

  // ── Commit a validated Move to the state ──────────────────────────────────
  const commitMove = useCallback((state: GameState, move: Move): GameState => {
    historyStack.current.push(state);
    if (historyStack.current.length > 200) historyStack.current.shift();
    const captured = getCapturedFromMove(state.board, move);
    const notation = moveToNotation(move, state.board);
    const nextBoard = applyMove(state.board, move);
    const nextCastling = updateCastlingRights(state.castlingRights, move, state.board);
    const nextEnPassant = getEnPassantTarget(state.board, move);
    const nextTurn: PieceColor = state.currentTurn === 'white' ? 'black' : 'white';

    // Build captured lists
    const capturedByWhite = [...state.capturedByWhite];
    const capturedByBlack = [...state.capturedByBlack];
    if (captured) {
      if (captured.color === 'black') capturedByWhite.push(captured);
      else capturedByBlack.push(captured);
    }

    // History
    const entry: HistoryEntry = { move, capturedPiece: captured, notation };
    const moveHistory = [...state.moveHistory, entry];

    // Check / checkmate / stalemate for NEXT turn player
    const opponentMoves = getAllLegalMoves(nextBoard, nextTurn, nextEnPassant, nextCastling);
    const nextIsCheck = isInCheck(nextBoard, nextTurn);
    const nextIsCheckmate = opponentMoves.length === 0 && nextIsCheck;
    const nextIsStalemate = opponentMoves.length === 0 && !nextIsCheck;

    const movingPiece = state.board[move.from.row][move.from.col];
    const halfMoveClock =
      captured || movingPiece?.type === 'pawn'
        ? 0
        : state.halfMoveClock + 1;
    const fullMoveNumber =
      nextTurn === 'white' ? state.fullMoveNumber + 1 : state.fullMoveNumber;

    return {
      ...state,
      board: nextBoard,
      currentTurn: nextTurn,
      selectedSquare: null,
      legalMovesForSelected: [],
      isCheck: nextIsCheck,
      isCheckmate: nextIsCheckmate,
      isStalemate: nextIsStalemate,
      capturedByWhite,
      capturedByBlack,
      enPassantTarget: nextEnPassant,
      castlingRights: nextCastling,
      moveHistory,
      promotionPending: null,
      halfMoveClock,
      fullMoveNumber,
    };
  }, []);

  // ── User clicks a square ──────────────────────────────────────────────────
  const selectSquare = useCallback(
    (pos: Position) => {
      setGameState(prev => {
        if (prev.isCheckmate || prev.isStalemate || prev.promotionPending) return prev;
        // Only allow white (player) to move
        if (prev.currentTurn !== 'white') return prev;

        const clickedPiece = prev.board[pos.row][pos.col];

        // If a square is already selected
        if (prev.selectedSquare) {
          // Check if clicked is a legal move destination
          const matchingMoves = prev.legalMovesForSelected.filter(
            m => m.to.row === pos.row && m.to.col === pos.col
          );

          if (matchingMoves.length > 0) {
            // Check if this is a pawn promotion (multiple moves with promotions)
            const isPromotion = matchingMoves.some(m => m.promotion);
            if (isPromotion) {
              // Show promotion modal
              const pending: PromotionPending = {
                from: prev.selectedSquare,
                to: pos,
                color: 'white',
              };
              return { ...prev, promotionPending: pending, selectedSquare: null, legalMovesForSelected: [] };
            }

            // Regular move — take the first match
            return commitMove(prev, matchingMoves[0]);
          }

          // Clicked another own piece – reselect
          if (clickedPiece && clickedPiece.color === 'white') {
            const legal = getLegalMovesFrom(
              prev.board, pos, prev.enPassantTarget, prev.castlingRights
            );
            return { ...prev, selectedSquare: pos, legalMovesForSelected: legal };
          }

          // Deselect
          return { ...prev, selectedSquare: null, legalMovesForSelected: [] };
        }

        // Nothing selected yet
        if (clickedPiece && clickedPiece.color === 'white') {
          const legal = getLegalMovesFrom(
            prev.board, pos, prev.enPassantTarget, prev.castlingRights
          );
          return { ...prev, selectedSquare: pos, legalMovesForSelected: legal };
        }

        return prev;
      });
    },
    [commitMove]
  );

  // ── Apply AI or external move (black) ─────────────────────────────────────
  const applyExternalMove = useCallback(
    (move: Move) => {
      setGameState(prev => {
        if (prev.isCheckmate || prev.isStalemate) return prev;
        return commitMove(prev, move);
      });
    },
    [commitMove]
  );

  // ── Resolve pawn promotion ────────────────────────────────────────────────
  const resolvePromotion = useCallback(
    (pieceType: PieceType) => {
      setGameState(prev => {
        if (!prev.promotionPending) return prev;
        const { from, to } = prev.promotionPending;
        const move: Move = { from, to, promotion: pieceType };
        return commitMove(prev, move);
      });
    },
    [commitMove]
  );

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    historyStack.current = [];
    setGameState(makeInitialState());
  }, []);

  // ── Undo last N plies (default 2 — reverts both AI + player) ──────────────
  const undoLastMove = useCallback((plies = 2): boolean => {
    if (historyStack.current.length === 0) return false;
    const target = Math.min(plies, historyStack.current.length);
    let restored: GameState | undefined;
    for (let i = 0; i < target; i++) restored = historyStack.current.pop();
    if (!restored) return false;
    setGameState(restored);
    return true;
  }, []);

  return {
    gameState,
    selectSquare,
    applyExternalMove,
    resolvePromotion,
    resetGame,
    undoLastMove,
    isGameOver,
    canUndo,
  };
}

import { Board, CastlingRights, Move, PieceColor, Position } from '../types/chess.types';
import {
  getAllLegalMoves,
  applyMove,
  isInCheck,
  getEnPassantTarget,
  updateCastlingRights,
  opponent,
} from './chessEngine';

// ─── Piece Values ─────────────────────────────────────────────────────────────

const MATERIAL: Record<string, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// ─── Piece-Square Tables (from black's perspective; flip for white) ───────────

const PST: Record<string, number[][]> = {
  pawn: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5,  5, 10, 25, 25, 10,  5,  5],
    [0,  0,  0, 20, 20,  0,  0,  0],
    [5, -5,-10,  0,  0,-10, -5,  5],
    [5, 10, 10,-20,-20, 10, 10,  5],
    [0,  0,  0,  0,  0,  0,  0,  0],
  ],
  knight: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  bishop: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  rook: [
    [0,  0,  0,  0,  0,  0,  0,  0],
    [5, 10, 10, 10, 10, 10, 10,  5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [-5,  0,  0,  0,  0,  0,  0, -5],
    [0,  0,  0,  5,  5,  0,  0,  0],
  ],
  queen: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [-5,   0,  5,  5,  5,  5,  0, -5],
    [0,    0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  king: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [20,  20,  0,  0,  0,  0, 20, 20],
    [20,  30, 10,  0,  0, 10, 30, 20],
  ],
};

function getPSTValue(piece: { type: string; color: PieceColor }, row: number, col: number): number {
  const table = PST[piece.type];
  if (!table) return 0;
  // For white, flip the row (white pieces come from bottom)
  const r = piece.color === 'white' ? 7 - row : row;
  return table[r][col];
}

// ─── Board Evaluation ─────────────────────────────────────────────────────────

function evaluateBoard(
  board: Board,
  color: PieceColor,
  enPassant: Position | null,
  castling: CastlingRights
): number {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = board[row][col];
      if (!sq) continue;
      const material = MATERIAL[sq.type] ?? 0;
      const positional = getPSTValue(sq, row, col);
      const val = material + positional;
      score += sq.color === 'black' ? val : -val;
    }
  }

  return color === 'black' ? score : -score;
}

// ─── Minimax with Alpha-Beta Pruning ──────────────────────────────────────────

interface SearchState {
  enPassant: Position | null;
  castling: CastlingRights;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  currentColor: PieceColor,
  state: SearchState,
  maxColor: PieceColor
): number {
  const legalMoves = getAllLegalMoves(board, currentColor, state.enPassant, state.castling);

  if (depth === 0 || legalMoves.length === 0) {
    if (legalMoves.length === 0) {
      if (isInCheck(board, currentColor)) {
        // Checkmate – the current player loses
        return isMaximizing ? -100000 + depth : 100000 - depth;
      }
      return 0; // Stalemate
    }
    return evaluateBoard(board, maxColor, state.enPassant, state.castling);
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of legalMoves) {
      const nextBoard = applyMove(board, move);
      const nextState: SearchState = {
        enPassant: getEnPassantTarget(board, move),
        castling: updateCastlingRights(state.castling, move, board),
      };
      const score = minimax(nextBoard, depth - 1, alpha, beta, false, opponent(currentColor), nextState, maxColor);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of legalMoves) {
      const nextBoard = applyMove(board, move);
      const nextState: SearchState = {
        enPassant: getEnPassantTarget(board, move),
        castling: updateCastlingRights(state.castling, move, board),
      };
      const score = minimax(nextBoard, depth - 1, alpha, beta, true, opponent(currentColor), nextState, maxColor);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

// ─── AI Move Selection ────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type AILevel = 'easy' | 'medium' | 'hard' | 'expert';

const DEPTH_MAP: Record<AILevel, number> = {
  easy: 0,
  medium: 2,
  hard: 3,
  expert: 4,
};

export function getAIMove(
  board: Board,
  color: PieceColor,
  level: AILevel,
  enPassant: Position | null,
  castling: CastlingRights
): Move | null {
  const legalMoves = getAllLegalMoves(board, color, enPassant, castling);
  if (legalMoves.length === 0) return null;

  // Easy: random move
  if (level === 'easy') {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const depth = DEPTH_MAP[level];
  const state: SearchState = { enPassant, castling };

  // Shuffle to add variety when scores are equal
  const shuffled = shuffleArray(legalMoves);

  let bestMove: Move = shuffled[0];
  let bestScore = -Infinity;

  for (const move of shuffled) {
    const nextBoard = applyMove(board, move);
    const nextState: SearchState = {
      enPassant: getEnPassantTarget(board, move),
      castling: updateCastlingRights(castling, move, board),
    };
    const score = minimax(
      nextBoard,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      opponent(color),
      nextState,
      color
    );
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

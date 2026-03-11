import {
  Board,
  CastlingRights,
  Move,
  Piece,
  PieceColor,
  PieceType,
  Position,
  Square,
} from '../types/chess.types';

// ─── Initial Board Setup ──────────────────────────────────────────────────────

const BACK_RANK: PieceType[] = [
  'rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook',
];

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () =>
    Array(8).fill(null)
  );

  BACK_RANK.forEach((type, col) => {
    board[0][col] = { type, color: 'black' };
    board[7][col] = { type, color: 'white' };
  });

  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: 'pawn', color: 'black' };
    board[6][col] = { type: 'pawn', color: 'white' };
  }

  return board;
}

export const INITIAL_CASTLING_RIGHTS: CastlingRights = {
  whiteKingSide: true,
  whiteQueenSide: true,
  blackKingSide: true,
  blackQueenSide: true,
};

// ─── Board Utilities ─────────────────────────────────────────────────────────

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(sq => (sq ? { ...sq } : null)));
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

export function posEq(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function opponent(color: PieceColor): PieceColor {
  return color === 'white' ? 'black' : 'white';
}

// ─── Pseudo-Legal Move Generation ────────────────────────────────────────────

function pawnMoves(
  board: Board,
  pos: Position,
  enPassantTarget: Position | null
): Move[] {
  const moves: Move[] = [];
  const piece = board[pos.row][pos.col] as Piece;
  const dir = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;
  const promoRow = piece.color === 'white' ? 0 : 7;
  const { row, col } = pos;

  const addPush = (toRow: number, toCol: number) => {
    if (toRow === promoRow) {
      (['queen', 'rook', 'bishop', 'knight'] as PieceType[]).forEach(p =>
        moves.push({ from: pos, to: { row: toRow, col: toCol }, promotion: p })
      );
    } else {
      moves.push({ from: pos, to: { row: toRow, col: toCol } });
    }
  };

  // Single push
  const oneStep = row + dir;
  if (inBounds(oneStep, col) && !board[oneStep][col]) {
    addPush(oneStep, col);
    // Double push from start
    const twoStep = row + dir * 2;
    if (row === startRow && inBounds(twoStep, col) && !board[twoStep][col]) {
      moves.push({ from: pos, to: { row: twoStep, col } });
    }
  }

  // Diagonal captures
  [-1, 1].forEach(dc => {
    const capRow = row + dir;
    const capCol = col + dc;
    if (!inBounds(capRow, capCol)) return;
    const target = board[capRow][capCol];
    if (target && target.color !== piece.color) {
      addPush(capRow, capCol);
    }
    // En passant
    if (enPassantTarget && capRow === enPassantTarget.row && capCol === enPassantTarget.col) {
      moves.push({ from: pos, to: { row: capRow, col: capCol }, isEnPassant: true });
    }
  });

  return moves;
}

function slidingMoves(
  board: Board,
  pos: Position,
  directions: [number, number][]
): Move[] {
  const moves: Move[] = [];
  const piece = board[pos.row][pos.col] as Piece;

  directions.forEach(([dr, dc]) => {
    let r = pos.row + dr;
    let c = pos.col + dc;
    while (inBounds(r, c)) {
      const target = board[r][c];
      if (!target) {
        moves.push({ from: pos, to: { row: r, col: c } });
      } else {
        if (target.color !== piece.color) {
          moves.push({ from: pos, to: { row: r, col: c } });
        }
        break;
      }
      r += dr;
      c += dc;
    }
  });

  return moves;
}

function knightMoves(board: Board, pos: Position): Move[] {
  const piece = board[pos.row][pos.col] as Piece;
  const offsets: [number, number][] = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  return offsets
    .filter(([dr, dc]) => inBounds(pos.row + dr, pos.col + dc))
    .filter(([dr, dc]) => {
      const t = board[pos.row + dr][pos.col + dc];
      return !t || t.color !== piece.color;
    })
    .map(([dr, dc]) => ({
      from: pos,
      to: { row: pos.row + dr, col: pos.col + dc },
    }));
}

function kingMoves(
  board: Board,
  pos: Position,
  castlingRights: CastlingRights
): Move[] {
  const piece = board[pos.row][pos.col] as Piece;
  const moves: Move[] = [];
  const offsets: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  offsets.forEach(([dr, dc]) => {
    const r = pos.row + dr;
    const c = pos.col + dc;
    if (!inBounds(r, c)) return;
    const target = board[r][c];
    if (!target || target.color !== piece.color) {
      moves.push({ from: pos, to: { row: r, col: c } });
    }
  });

  // Castling (legality of passing-through-check is handled later)
  if (piece.color === 'white' && pos.row === 7 && pos.col === 4) {
    if (castlingRights.whiteKingSide && !board[7][5] && !board[7][6] && board[7][7]?.type === 'rook' && board[7][7]?.color === 'white') {
      moves.push({ from: pos, to: { row: 7, col: 6 }, isCastle: true });
    }
    if (castlingRights.whiteQueenSide && !board[7][3] && !board[7][2] && !board[7][1] && board[7][0]?.type === 'rook' && board[7][0]?.color === 'white') {
      moves.push({ from: pos, to: { row: 7, col: 2 }, isCastle: true });
    }
  }
  if (piece.color === 'black' && pos.row === 0 && pos.col === 4) {
    if (castlingRights.blackKingSide && !board[0][5] && !board[0][6] && board[0][7]?.type === 'rook' && board[0][7]?.color === 'black') {
      moves.push({ from: pos, to: { row: 0, col: 6 }, isCastle: true });
    }
    if (castlingRights.blackQueenSide && !board[0][3] && !board[0][2] && !board[0][1] && board[0][0]?.type === 'rook' && board[0][0]?.color === 'black') {
      moves.push({ from: pos, to: { row: 0, col: 2 }, isCastle: true });
    }
  }

  return moves;
}

export function getPseudoLegalMoves(
  board: Board,
  pos: Position,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  switch (piece.type) {
    case 'pawn':
      return pawnMoves(board, pos, enPassantTarget);
    case 'knight':
      return knightMoves(board, pos);
    case 'bishop':
      return slidingMoves(board, pos, [[-1,-1],[-1,1],[1,-1],[1,1]]);
    case 'rook':
      return slidingMoves(board, pos, [[-1,0],[1,0],[0,-1],[0,1]]);
    case 'queen':
      return slidingMoves(board, pos, [
        [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1],
      ]);
    case 'king':
      return kingMoves(board, pos, castlingRights);
    default:
      return [];
  }
}

// ─── Apply Move ───────────────────────────────────────────────────────────────

export function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  const piece = next[move.from.row][move.from.col]!;

  // Move piece (with optional promotion)
  next[move.to.row][move.to.col] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;
  next[move.from.row][move.from.col] = null;

  // En passant – remove captured pawn
  if (move.isEnPassant) {
    next[move.from.row][move.to.col] = null;
  }

  // Castling – move the rook
  if (move.isCastle) {
    if (move.to.col === 6) {
      // King-side
      next[move.to.row][5] = next[move.to.row][7];
      next[move.to.row][7] = null;
    } else {
      // Queen-side
      next[move.to.row][3] = next[move.to.row][0];
      next[move.to.row][0] = null;
    }
  }

  return next;
}

// ─── Check Detection ──────────────────────────────────────────────────────────

export function findKing(board: Board, color: PieceColor): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = board[row][col];
      if (sq && sq.type === 'king' && sq.color === color) return { row, col };
    }
  }
  return null;
}

export function isSquareAttackedBy(
  board: Board,
  pos: Position,
  attackerColor: PieceColor
): boolean {
  // Use pseudo-moves with empty castling/en-passant to check attacks
  const noCastling: CastlingRights = {
    whiteKingSide: false, whiteQueenSide: false,
    blackKingSide: false, blackQueenSide: false,
  };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq || sq.color !== attackerColor) continue;
      const pseudos = getPseudoLegalMoves(board, { row: r, col: c }, null, noCastling);
      if (pseudos.some(m => m.to.row === pos.row && m.to.col === pos.col)) return true;
    }
  }
  return false;
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return true; // King captured = in "check"
  return isSquareAttackedBy(board, kingPos, opponent(color));
}

// ─── Legal Move Filtering ─────────────────────────────────────────────────────

export function getLegalMovesFrom(
  board: Board,
  pos: Position,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): Move[] {
  const piece = board[pos.row][pos.col];
  if (!piece) return [];

  const pseudo = getPseudoLegalMoves(board, pos, enPassantTarget, castlingRights);

  return pseudo.filter(move => {
    // Castling: king must not be in check, must not pass through check
    if (move.isCastle) {
      if (isInCheck(board, piece.color)) return false;
      const throughCol = move.to.col === 6 ? 5 : 3;
      const tmp = cloneBoard(board);
      tmp[pos.row][throughCol] = piece;
      tmp[pos.row][pos.col] = null;
      if (isSquareAttackedBy(tmp, { row: pos.row, col: throughCol }, opponent(piece.color))) {
        return false;
      }
    }
    // After move, own king must not be in check
    const nextBoard = applyMove(board, move);
    return !isInCheck(nextBoard, piece.color);
  });
}

export function getAllLegalMoves(
  board: Board,
  color: PieceColor,
  enPassantTarget: Position | null,
  castlingRights: CastlingRights
): Move[] {
  const moves: Move[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const sq = board[row][col];
      if (sq && sq.color === color) {
        moves.push(
          ...getLegalMovesFrom(board, { row, col }, enPassantTarget, castlingRights)
        );
      }
    }
  }
  return moves;
}

// ─── Game State Helpers ───────────────────────────────────────────────────────

export function getEnPassantTarget(board: Board, move: Move): Position | null {
  const piece = board[move.from.row][move.from.col];
  if (!piece || piece.type !== 'pawn') return null;
  if (Math.abs(move.to.row - move.from.row) === 2) {
    return { row: (move.from.row + move.to.row) / 2, col: move.from.col };
  }
  return null;
}

export function updateCastlingRights(
  rights: CastlingRights,
  move: Move,
  board: Board
): CastlingRights {
  const next = { ...rights };
  const piece = board[move.from.row][move.from.col];
  if (!piece) return next;

  if (piece.type === 'king') {
    if (piece.color === 'white') {
      next.whiteKingSide = false;
      next.whiteQueenSide = false;
    } else {
      next.blackKingSide = false;
      next.blackQueenSide = false;
    }
  }

  if (piece.type === 'rook') {
    if (move.from.row === 7 && move.from.col === 7) next.whiteKingSide = false;
    if (move.from.row === 7 && move.from.col === 0) next.whiteQueenSide = false;
    if (move.from.row === 0 && move.from.col === 7) next.blackKingSide = false;
    if (move.from.row === 0 && move.from.col === 0) next.blackQueenSide = false;
  }

  // If a rook square is captured
  const cap = board[move.to.row][move.to.col];
  if (cap && cap.type === 'rook') {
    if (move.to.row === 7 && move.to.col === 7) next.whiteKingSide = false;
    if (move.to.row === 7 && move.to.col === 0) next.whiteQueenSide = false;
    if (move.to.row === 0 && move.to.col === 7) next.blackKingSide = false;
    if (move.to.row === 0 && move.to.col === 0) next.blackQueenSide = false;
  }

  return next;
}

// ─── Move Notation ────────────────────────────────────────────────────────────

const FILE_LABELS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANK_LABELS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export function toAlgebraic(pos: Position): string {
  return `${FILE_LABELS[pos.col]}${RANK_LABELS[pos.row]}`;
}

export function moveToNotation(move: Move, board: Board): string {
  const piece = board[move.from.row][move.from.col];
  if (!piece) return '';

  const capture = board[move.to.row][move.to.col] || move.isEnPassant;
  const fromStr = toAlgebraic(move.from);
  const toStr = toAlgebraic(move.to);

  if (piece.type === 'king' && move.isCastle) {
    return move.to.col === 6 ? 'O-O' : 'O-O-O';
  }

  if (piece.type === 'pawn') {
    const base = capture
      ? `${FILE_LABELS[move.from.col]}x${toStr}`
      : toStr;
    return move.promotion ? `${base}=${move.promotion[0].toUpperCase()}` : base;
  }

  const pieceChar = piece.type[0].toUpperCase();
  return `${pieceChar}${capture ? 'x' : ''}${toStr}`;
}

// ─── Material Count ───────────────────────────────────────────────────────────

export const PIECE_VALUES: Record<string, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
};

export function getMaterialCount(board: Board, color: PieceColor): number {
  let total = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.color === color) total += PIECE_VALUES[sq.type] ?? 0;
    }
  }
  return total;
}

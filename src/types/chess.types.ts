// ─── Piece Definitions ───────────────────────────────────────────────────────

export type PieceColor = 'white' | 'black';

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

// ─── Board & Position ─────────────────────────────────────────────────────────

export interface Position {
  row: number;
  col: number;
}

export type Square = Piece | null;

export type Board = Square[][];

// ─── Move Definitions ─────────────────────────────────────────────────────────

export interface Move {
  from: Position;
  to: Position;
  promotion?: PieceType;
  isCastle?: boolean;
  isEnPassant?: boolean;
}

// ─── Castling Rights ──────────────────────────────────────────────────────────

export interface CastlingRights {
  whiteKingSide: boolean;
  whiteQueenSide: boolean;
  blackKingSide: boolean;
  blackQueenSide: boolean;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  board: Board;
  currentTurn: PieceColor;
  selectedSquare: Position | null;
  legalMovesForSelected: Move[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  enPassantTarget: Position | null;
  castlingRights: CastlingRights;
  moveHistory: HistoryEntry[];
  promotionPending: PromotionPending | null;
  halfMoveClock: number;
  fullMoveNumber: number;
}

export interface HistoryEntry {
  move: Move;
  capturedPiece: Piece | null;
  notation: string;
}

export interface PromotionPending {
  from: Position;
  to: Position;
  color: PieceColor;
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export interface EvaluatedMove {
  move: Move;
  score: number;
}

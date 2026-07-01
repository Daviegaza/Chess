import React from 'react';
import type { GameState, Piece } from '../types/chess.types';
import type { LevelConfig } from '../types/game.types';
import ChessPiece from './ChessPiece';
import { PIECE_VALUES } from '../utils/chessEngine';
import { sfx } from '../utils/soundEngine';

interface GameStatusProps {
  gameState: GameState;
  config: LevelConfig;
  isAIThinking: boolean;
  onResign: () => void;
  isMobile?: boolean;
  boardWidth?: number;
}

function materialScore(pieces: Piece[]): number {
  return pieces.reduce((sum, p) => sum + (PIECE_VALUES[p.type] ?? 0), 0);
}

function CapturedRow({ pieces, label }: { pieces: Piece[]; label: string }) {
  if (pieces.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minHeight: 26 }}>
      <span className="kf-eyebrow" style={{ minWidth: 60, flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {pieces.map((p, i) => (
          <ChessPiece key={i} piece={p} size={22} />
        ))}
      </div>
    </div>
  );
}

const GameStatus: React.FC<GameStatusProps> = ({
  gameState,
  config,
  isAIThinking,
  onResign,
  boardWidth = 576,
}) => {
  const {
    currentTurn, isCheck, isCheckmate, isStalemate,
    capturedByWhite, capturedByBlack, moveHistory,
  } = gameState;

  const playerMaterial = materialScore(capturedByWhite);
  const aiMaterial = materialScore(capturedByBlack);
  const advantage = playerMaterial - aiMaterial;

  const primary = isCheckmate
    ? (currentTurn === 'white' ? 'AI WINS BY CHECKMATE' : 'YOU WIN!')
    : isStalemate ? 'STALEMATE — DRAW'
    : isCheck ? (currentTurn === 'white' ? 'YOU ARE IN CHECK' : 'AI IS IN CHECK')
    : isAIThinking ? 'AI IS THINKING…'
    : currentTurn === 'white' ? 'YOUR MOVE' : "AI'S MOVE";

  const sub = isCheckmate ? 'Match concluded'
    : isStalemate ? 'Neither side can move'
    : isCheck ? 'Escape the check to continue'
    : isAIThinking ? `Depth ${config.aiDepth} · calculating…`
    : currentTurn === 'white' ? 'Make your move' : 'Waiting on opponent';

  const primaryColor =
    isCheckmate ? (currentTurn === 'white' ? 'var(--kf-danger)' : 'var(--kf-success)') :
    isStalemate ? 'var(--kf-warn)' :
    isCheck ? 'var(--kf-warn)' :
    'var(--kf-gold-light)';

  const movePairs: { white?: string; black?: string; num: number }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moveHistory[i]?.notation,
      black: moveHistory[i + 1]?.notation,
    });
  }

  const maxW = boardWidth + 40;

  return (
    <div style={{ width: '100%', maxWidth: maxW, display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className="kf-panel" style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="kf-serif" style={{
              color: primaryColor, fontSize: 16, fontWeight: 700, letterSpacing: '0.22em', lineHeight: 1.1,
            }}>
              {primary}
            </div>
            <div className="kf-body" style={{
              color: 'var(--kf-muted)', fontSize: 12, marginTop: 4, fontStyle: 'italic',
            }}>
              {sub}
            </div>
            {advantage !== 0 && (
              <div className="kf-eyebrow" style={{
                marginTop: 8, color: advantage > 0 ? 'var(--kf-success)' : 'var(--kf-danger)',
              }}>
                {advantage > 0 ? `+${advantage}` : advantage} MATERIAL
              </div>
            )}
          </div>

          <div
            className={isAIThinking || (currentTurn === 'white' && !isCheckmate && !isStalemate) ? 'kf-pulse-gold' : ''}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background:
                'radial-gradient(circle at 35% 30%, rgba(244,214,122,0.9) 0%, rgba(212,168,52,0.5) 50%, rgba(20,16,10,0.1) 100%)',
              border: '1px solid var(--kf-border-strong)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.4)',
            }}
          >
            <span className="kf-serif" style={{
              color: '#14100a', fontWeight: 900, fontSize: 20,
              textShadow: '0 1px 0 rgba(255,235,180,0.6)',
            }}>
              {currentTurn === 'white' ? '♔' : '♚'}
            </span>
          </div>
        </div>
      </div>

      {(capturedByWhite.length > 0 || capturedByBlack.length > 0) && (
        <div className="kf-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CapturedRow pieces={capturedByWhite} label="You took" />
          <CapturedRow pieces={capturedByBlack} label="AI took" />
        </div>
      )}

      <div className="kf-panel" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--kf-hairline)',
        }}>
          <div className="kf-eyebrow">Move History</div>
          <div className="kf-eyebrow" style={{ color: 'var(--kf-gold-dark)' }}>
            {moveHistory.length} {moveHistory.length === 1 ? 'move' : 'moves'}
          </div>
        </div>
        <div className="kf-scroll" style={{ maxHeight: 180, overflowY: 'auto', padding: '6px 10px' }}>
          {movePairs.length === 0 && (
            <p style={{
              color: 'var(--kf-dim)', fontSize: 13, textAlign: 'center', padding: '14px 0',
              fontStyle: 'italic', margin: 0,
            }}>
              No moves yet
            </p>
          )}
          {movePairs.map(pair => (
            <div key={pair.num} style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 1fr',
              gap: 4,
              padding: '3px 6px',
              fontSize: 13,
              fontFamily: "'Cinzel', Georgia, serif",
            }}>
              <span style={{ color: 'var(--kf-dim)' }}>{pair.num}.</span>
              <span style={{ color: 'var(--kf-gold-light)' }}>{pair.white ?? ''}</span>
              <span style={{ color: 'var(--kf-cream)', opacity: 0.7 }}>{pair.black ?? ''}</span>
            </div>
          ))}
        </div>
      </div>

      {!isCheckmate && !isStalemate && (
        <button
          className="kf-btn kf-btn--danger kf-btn--full"
          onClick={() => { sfx.click(); onResign(); }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 21V3M4 4h12l-2 4 2 4H4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Resign
        </button>
      )}
    </div>
  );
};

export default GameStatus;

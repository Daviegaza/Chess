import React from 'react';
import { GameState, Piece } from '../types/chess.types';
import { LevelConfig } from '../types/game.types';
import ChessPiece from './ChessPiece';
import { PIECE_VALUES } from '../utils/chessEngine';

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minHeight: 28 }}>
      <span style={{ color: '#6a5030', fontSize: 10, minWidth: 52, flexShrink: 0 }}>
        {label}
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {pieces.map((p, i) => (
          <ChessPiece key={i} piece={p} size={26} />
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
  isMobile = false,
  boardWidth = 576,
}) => {
  const {
    currentTurn, isCheck, isCheckmate, isStalemate,
    capturedByWhite, capturedByBlack, moveHistory,
  } = gameState;

  const playerMaterial = materialScore(capturedByWhite);
  const aiMaterial = materialScore(capturedByBlack);
  const advantage = playerMaterial - aiMaterial;

  const statusText = (() => {
    if (isCheckmate) return currentTurn === 'white' ? '★ AI Wins by Checkmate' : '★ You Win!';
    if (isStalemate) return '— Stalemate — Draw';
    if (isCheck) return currentTurn === 'white' ? '⚠ You are in Check!' : '⚠ AI is in Check!';
    if (isAIThinking) return '⟳ AI is thinking…';
    return currentTurn === 'white' ? 'Your move' : "AI's move";
  })();

  const statusColor = (() => {
    if (isCheckmate) return currentTurn === 'white' ? '#f87171' : '#4ade80';
    if (isStalemate) return '#facc15';
    if (isCheck) return '#fb923c';
    if (isAIThinking) return '#7dd3fc';
    return '#d4a820';
  })();

  const movePairs: { white?: string; black?: string; num: number }[] = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: moveHistory[i]?.notation,
      black: moveHistory[i + 1]?.notation,
    });
  }

  // ── Mobile layout: horizontal strip below the board ─────────────────────
  if (isMobile) {
    return (
      <div style={{
        width: boardWidth || '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>

        {/* Status + Level row */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Status */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{ color: statusColor, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
              {statusText}
            </div>
            {advantage !== 0 && (
              <div style={{ color: advantage > 0 ? '#4ade80' : '#f87171', fontSize: 10, marginTop: 4, }}>
                {advantage > 0 ? `+${advantage}` : advantage} material
              </div>
            )}
          </div>

          {/* Level badge */}
          <div style={{
            background: config.gradient,
            border: `1px solid ${config.color}40`,
            borderRadius: 8,
            padding: '10px 14px',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            <div style={{ color: config.color, fontSize: 10, letterSpacing: '0.15em', fontWeight: 700 }}>
              {config.label}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
              {config.cost}↓ / +{config.reward}↑
            </div>
          </div>
        </div>

        {/* Captured pieces */}
        {(capturedByWhite.length > 0 || capturedByBlack.length > 0) && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}>
            <CapturedRow pieces={capturedByWhite} label="You took" />
            <CapturedRow pieces={capturedByBlack} label="AI took" />
          </div>
        )}

        {/* Move history (compact horizontal scroll) */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            color: '#6a5030',
            fontSize: 9,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            Move History
          </div>
          <div style={{
            overflowX: 'auto',
            padding: '6px 8px',
            display: 'flex',
            gap: 4,
            flexWrap: 'nowrap',
          }}>
            {movePairs.length === 0 ? (
              <p style={{ color: '#4a3820', fontSize: 11, fontStyle: 'italic', padding: '4px 4px' }}>
                No moves yet
              </p>
            ) : (
              movePairs.map(pair => (
                <div key={pair.num} style={{
                  display: 'flex',
                  gap: 3,
                  fontSize: 11,
                  flexShrink: 0,
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#5a4030' }}>{pair.num}.</span>
                  <span style={{ color: '#d4a820' }}>{pair.white ?? ''}</span>
                  {pair.black && <span style={{ color: '#9a8060' }}>{pair.black}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resign */}
        {!isCheckmate && !isStalemate && (
          <button
            onClick={onResign}
            style={{
              background: 'transparent',
              border: '1px solid rgba(200,50,50,0.4)',
              borderRadius: 8,
              color: 'rgba(200,80,80,0.8)',
              fontSize: 11,
              letterSpacing: '0.1em',
              padding: '10px',
              cursor: 'pointer',
              width: '100%',
              textTransform: 'uppercase',
            }}
          >
            Resign Game
          </button>
        )}
      </div>
    );
  }

  // ── Desktop layout: vertical sidebar ─────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 230, minWidth: 200 }}>

      {/* Level Badge */}
      <div style={{
        background: config.gradient,
        border: `1px solid ${config.color}40`,
        borderRadius: 8,
        padding: '10px 14px',
        textAlign: 'center',
      }}>
        <div style={{ color: config.color, fontSize: 11, letterSpacing: '0.2em', fontWeight: 700 }}>
          {config.label}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2,  }}>
          Bet: {config.cost} pts · Win: +{config.reward} pts
        </div>
      </div>

      {/* Status */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: '12px 14px',
        textAlign: 'center',
      }}>
        <div style={{ color: statusColor, fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
          {statusText}
        </div>
        {advantage !== 0 && (
          <div style={{ color: advantage > 0 ? '#4ade80' : '#f87171', fontSize: 11, marginTop: 6,  }}>
            {advantage > 0 ? `+${advantage}` : advantage} material
          </div>
        )}
      </div>

      {/* Captured Pieces */}
      {(capturedByWhite.length > 0 || capturedByBlack.length > 0) && (
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <CapturedRow pieces={capturedByWhite} label="You took" />
          <CapturedRow pieces={capturedByBlack} label="AI took" />
        </div>
      )}

      {/* Move History */}
      <div style={{
        flex: 1,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 280,
      }}>
        <div style={{
          padding: '7px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          color: '#6a5030',
          fontSize: 9,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          Move History
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
          {movePairs.length === 0 && (
            <p style={{ color: '#4a3820', fontSize: 12, textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              No moves yet
            </p>
          )}
          {movePairs.map(pair => (
            <div key={pair.num} style={{
              display: 'grid',
              gridTemplateColumns: '26px 1fr 1fr',
              gap: 2,
              padding: '2px 12px',
              fontSize: 12,
            }}>
              <span style={{ color: '#5a4030' }}>{pair.num}.</span>
              <span style={{ color: '#d4a820' }}>{pair.white ?? ''}</span>
              <span style={{ color: '#9a8060' }}>{pair.black ?? ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resign Button */}
      {!isCheckmate && !isStalemate && (
        <button
          onClick={onResign}
          style={{
            background: 'transparent',
            border: '1px solid rgba(200,50,50,0.4)',
            borderRadius: 6,
            color: 'rgba(200,80,80,0.8)',
            fontSize: 11,
            letterSpacing: '0.1em',
            padding: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textTransform: 'uppercase',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(200,50,50,0.15)';
            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(200,80,80,0.8)';
          }}
        >
          Resign Game
        </button>
      )}
    </div>
  );
};

export default GameStatus;

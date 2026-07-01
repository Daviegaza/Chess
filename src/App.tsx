import './App.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LEVEL_CONFIGS,
} from './types/game.types';
import type {
  DifficultyLevel,
  GameResult,
  GameScreen,
  LevelConfig,
} from './types/game.types';
import { useChessGame } from './hooks/useChessGame';
import { useAI } from './hooks/useAI';
import { usePoints } from './hooks/usePoints';
import { useWindowSize } from './hooks/useWindowSize';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import GameLobby from './components/GameLobby';
import GameResultScreen from './components/GameResultScreen';
import PromotionModal from './components/PromotionModal';
import ChessPiece from './components/ChessPiece';
import { sfx } from './utils/soundEngine';

function formatClock(sec: number): string {
  if (sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('lobby');
  const [activeConfig, setActiveConfig] = useState<LevelConfig>(LEVEL_CONFIGS.easy);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const resultHandled = useRef(false);
  const { width, isMobile, isTablet } = useWindowSize();

  const { points, canAfford, placeBet, resolveBet, resetPoints, addBalance, spendBalance } = usePoints();
  const {
    gameState,
    selectSquare,
    applyExternalMove,
    resolvePromotion,
    resetGame,
    undoLastMove,
    isGameOver,
    canUndo,
  } = useChessGame();
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintSquares, setHintSquares] = useState<{ from: string; to: string } | null>(null);

  const squareSize = (() => {
    if (isMobile) return Math.floor((Math.min(width, 480) - 24) / 8);
    if (isTablet) return Math.floor((Math.min(width * 0.92, 560) - 24) / 8);
    return Math.min(64, Math.floor((width - 380) / 8));
  })();

  const handleStartGame = useCallback(
    (level: DifficultyLevel) => {
      const cfg = LEVEL_CONFIGS[level];
      if (!canAfford(cfg.cost)) return;
      const ok = placeBet(cfg.cost);
      if (!ok) return;
      setActiveConfig(cfg);
      setWhiteTime(cfg.timeControl.initial);
      setBlackTime(cfg.timeControl.initial);
      setHintsLeft(3);
      setHintSquares(null);
      resultHandled.current = false;
      setGameResult(null);
      resetGame();
      sfx.gameStart();
      setScreen('playing');
    },
    [canAfford, placeBet, resetGame]
  );

  const handleAIMove = useCallback(
    (move: Parameters<typeof applyExternalMove>[0]) => {
      setIsAIThinking(false);
      applyExternalMove(move);
    },
    [applyExternalMove]
  );

  useAI({
    gameState,
    aiColor: 'black',
    difficulty: activeConfig.level,
    enabled: screen === 'playing' && !isGameOver && !gameState.promotionPending,
    onMoveMade: handleAIMove,
  });

  useEffect(() => {
    if (gameState.currentTurn === 'black' && !isGameOver) setIsAIThinking(true);
    else setIsAIThinking(false);
  }, [gameState.currentTurn, isGameOver]);

  // Move / capture / check SFX
  const lastMoveIdxRef = useRef(0);
  useEffect(() => {
    if (screen !== 'playing') return;
    const history = gameState.moveHistory;
    if (history.length <= lastMoveIdxRef.current) {
      lastMoveIdxRef.current = history.length;
      return;
    }
    const latest = history[history.length - 1];
    lastMoveIdxRef.current = history.length;

    if (gameState.isCheckmate) {
      /* game-over effect below handles win/lose SFX */
    } else if (latest.move.promotion) {
      sfx.promote();
    } else if (latest.move.isCastle) {
      sfx.castle();
    } else if (gameState.isCheck) {
      sfx.check();
    } else if (latest.capturedPiece) {
      sfx.capture();
    } else {
      // Alternate move sound by whose move it was (self vs opponent)
      const wasWhiteMove = history.length % 2 === 1;
      if (wasWhiteMove) sfx.move();
      else sfx.moveOpponent();
    }
  }, [gameState.moveHistory, gameState.isCheck, gameState.isCheckmate, screen]);

  // Reset move counter on new game / screen change
  useEffect(() => { lastMoveIdxRef.current = 0; }, [screen]);

  // Chess clock — ticks side to move, applies increment on completed moves
  useEffect(() => {
    if (screen !== 'playing' || isGameOver || gameState.promotionPending) return;
    const id = setInterval(() => {
      if (gameState.currentTurn === 'white') {
        setWhiteTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [screen, isGameOver, gameState.currentTurn, gameState.promotionPending]);

  // Apply time increment to the side that just moved
  const prevHistLen = useRef(0);
  useEffect(() => {
    const len = gameState.moveHistory.length;
    if (len > prevHistLen.current && screen === 'playing') {
      const inc = activeConfig.timeControl.increment;
      const whiteJustMoved = len % 2 === 1;
      if (inc > 0) {
        if (whiteJustMoved) setWhiteTime(t => t + inc);
        else setBlackTime(t => t + inc);
      }
    }
    prevHistLen.current = len;
  }, [gameState.moveHistory.length, activeConfig.timeControl.increment, screen]);

  // Time-out → lose
  useEffect(() => {
    if (screen !== 'playing' || isGameOver || resultHandled.current) return;
    if (whiteTime === 0) {
      resultHandled.current = true;
      const delta = resolveBet('computer_win', activeConfig);
      setGameResult({ type: 'computer_win', reason: 'Time forfeit — your clock ran out.', pointsChange: delta });
      sfx.defeat();
      setTimeout(() => setScreen('result'), 1200);
    } else if (blackTime === 0) {
      resultHandled.current = true;
      const delta = resolveBet('player_win', activeConfig);
      setGameResult({ type: 'player_win', reason: "The AI's flag fell — victory on time!", pointsChange: delta });
      sfx.victory();
      setTimeout(() => setScreen('result'), 1200);
    }
  }, [whiteTime, blackTime, screen, isGameOver, activeConfig, resolveBet]);

  useEffect(() => {
    if (!isGameOver || screen !== 'playing' || resultHandled.current) return;
    resultHandled.current = true;

    let type: GameResult['type'];
    let reason: string;

    if (gameState.isCheckmate) {
      if (gameState.currentTurn === 'white') {
        type = 'computer_win';
        reason = 'Checkmate — the AI delivered the killing blow.';
      } else {
        type = 'player_win';
        reason = 'Checkmate — you outwitted the machine!';
      }
    } else {
      type = 'draw';
      reason = 'Stalemate — neither side could move.';
    }

    const delta = resolveBet(type, activeConfig);
    setGameResult({ type, reason, pointsChange: delta });

    if (type === 'player_win') sfx.victory();
    else if (type === 'computer_win') sfx.defeat();
    else sfx.draw();

    setTimeout(() => setScreen('result'), 1800);
  }, [isGameOver, gameState.isCheckmate, gameState.currentTurn, gameState.isStalemate, screen, resolveBet, activeConfig]);

  const handleResign = useCallback(() => {
    if (resultHandled.current) return;
    resultHandled.current = true;
    const delta = resolveBet('computer_win', activeConfig);
    setGameResult({
      type: 'computer_win',
      reason: 'You resigned — the throne belongs to the AI.',
      pointsChange: delta,
    });
    sfx.defeat();
    setScreen('result');
  }, [resolveBet, activeConfig]);

  const handleUndo = useCallback(() => {
    if (!canUndo || gameState.currentTurn !== 'white') { sfx.illegal(); return; }
    const ok = undoLastMove(2);
    if (ok) sfx.click();
    else sfx.illegal();
  }, [canUndo, gameState.currentTurn, undoLastMove]);

  const handleHint = useCallback(async () => {
    if (hintsLeft <= 0 || gameState.currentTurn !== 'white' || isGameOver) {
      sfx.illegal();
      return;
    }
    // Cheap hint: reuse AI engine at low depth for player color
    const { getAIMove } = await import('./utils/aiEngine');
    const move = getAIMove(
      gameState.board,
      'white',
      'medium',
      gameState.enPassantTarget,
      gameState.castlingRights,
    );
    if (!move) { sfx.illegal(); return; }
    const files = 'abcdefgh';
    const from = `${files[move.from.col]}${8 - move.from.row}`;
    const to   = `${files[move.to.col]}${8 - move.to.row}`;
    setHintSquares({ from, to });
    setHintsLeft(n => n - 1);
    sfx.promote();
    setTimeout(() => setHintSquares(null), 3500);
  }, [hintsLeft, gameState.board, gameState.currentTurn, gameState.enPassantTarget, gameState.castlingRights, isGameOver]);

  const handlePlayAgain = useCallback(() => {
    const cfg = activeConfig;
    if (!canAfford(cfg.cost)) { setScreen('lobby'); return; }
    const ok = placeBet(cfg.cost);
    if (!ok) { setScreen('lobby'); return; }
    resultHandled.current = false;
    setGameResult(null);
    resetGame();
    setWhiteTime(cfg.timeControl.initial);
    setBlackTime(cfg.timeControl.initial);
    sfx.gameStart();
    setScreen('playing');
  }, [activeConfig, canAfford, placeBet, resetGame]);

  if (screen === 'lobby') {
    return (
      <GameLobby
        points={points}
        onStartGame={handleStartGame}
        onResetPoints={resetPoints}
        addBalance={addBalance}
        spendBalance={spendBalance}
      />
    );
  }

  if (screen === 'result' && gameResult) {
    return (
      <GameResultScreen
        result={gameResult}
        config={activeConfig}
        points={points}
        onPlayAgain={handlePlayAgain}
        onBackToLobby={() => setScreen('lobby')}
      />
    );
  }

  const boardPx = squareSize * 8;
  const contentMaxW = isMobile ? '100%' : boardPx + 40;

  return (
    <div
      className="kf-screen kf-fade-in"
      style={{ padding: isMobile ? '14px 12px 24px' : '24px 20px 40px', gap: isMobile ? 12 : 14 }}
    >

      <div style={{
        width: '100%', maxWidth: contentMaxW,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          className="kf-icon-btn"
          aria-label="Back to lobby"
          onClick={() => {
            sfx.click();
            if (!resultHandled.current) {
              resultHandled.current = true;
              resolveBet('computer_win', activeConfig);
            }
            setScreen('lobby');
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="kf-panel" style={{
          padding: '8px 20px', borderRadius: 999,
        }}>
          <div className="kf-serif kf-gold-text" style={{
            fontSize: isMobile ? 13 : 14, fontWeight: 700, letterSpacing: '0.28em',
          }}>
            {activeConfig.label} · {activeConfig.tagline}
          </div>
        </div>

        <button className="kf-icon-btn" aria-label="More" onClick={() => sfx.click()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="1.6" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
            <circle cx="19" cy="12" r="1.6" fill="currentColor"/>
          </svg>
        </button>
      </div>

      {/* AI Card */}
      <div className="kf-player-card kf-fade-in" style={{ width: '100%', maxWidth: contentMaxW }}>
        <div className={`kf-avatar ${isAIThinking ? 'kf-pulse-gold' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="8" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="9" cy="14" r="1.4" fill="currentColor"/>
            <circle cx="15" cy="14" r="1.4" fill="currentColor"/>
            <path d="M12 4v4M10 4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="kf-avatar__dot kf-avatar__dot--online" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="kf-serif" style={{ color: 'var(--kf-cream)', fontSize: 15, fontWeight: 700 }}>
              GrandMasterX
            </div>
            <span style={{
              background: 'rgba(217,72,72,0.2)', color: '#ec5f5f',
              fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 4,
              letterSpacing: '0.1em',
            }}>GM</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 14 }}>🇺🇸</span>
            <div className="kf-serif" style={{ color: 'var(--kf-muted)', fontSize: 12, fontWeight: 700 }}>
              {Math.round((points.elo ?? 1200) - 30 + Math.random() * 60)}
            </div>
            <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
              {gameState.capturedByBlack.slice(0, 6).map((p, i) => (
                <div key={i} style={{ opacity: 0.7 }}>
                  <ChessPiece piece={p} size={16} />
                </div>
              ))}
              {gameState.capturedByBlack.length === 0 && (
                <span className="kf-eyebrow" style={{ fontSize: 9, opacity: 0.5 }}>♟ ♟ ♟ ♟ ♟</span>
              )}
            </div>
          </div>
        </div>
        <div style={{
          padding: '8px 14px',
          border: `1px solid ${gameState.currentTurn === 'black' && !isGameOver ? 'var(--kf-gold-light)' : 'var(--kf-border)'}`,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.35)',
          minWidth: 76, textAlign: 'center',
          boxShadow: gameState.currentTurn === 'black' && !isGameOver ? '0 0 12px rgba(244,214,122,0.35)' : 'none',
        }}>
          <div className="kf-serif" style={{
            color: blackTime < 30 ? 'var(--kf-danger)' : 'var(--kf-cream)',
            fontSize: 18, fontWeight: 900, letterSpacing: '0.06em', fontFeatureSettings: '"tnum"',
          }}>
            {formatClock(blackTime)}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <Board
          gameState={gameState}
          onSquareClick={(pos) => { sfx.select(); selectSquare(pos); }}
          isAITurn={gameState.currentTurn === 'black' || isAIThinking}
          squareSize={squareSize}
        />
        {hintSquares && (
          <div style={{
            position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
            pointerEvents: 'none',
          }}>
            {(['from', 'to'] as const).map(k => {
              const sq = hintSquares[k];
              const col = sq.charCodeAt(0) - 97;
              const row = 8 - parseInt(sq[1], 10);
              return (
                <div
                  key={k}
                  className="kf-pulse-gold"
                  style={{
                    position: 'absolute',
                    left: col * squareSize,
                    top: row * squareSize,
                    width: squareSize,
                    height: squareSize,
                    borderRadius: 4,
                    boxShadow: `inset 0 0 0 4px ${k === 'from' ? '#4ade80' : '#e4b944'}`,
                    background: k === 'from' ? 'rgba(74,222,128,0.15)' : 'rgba(228,185,68,0.20)',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Player Card */}
      <div className="kf-player-card kf-fade-in" style={{ width: '100%', maxWidth: contentMaxW }}>
        <div className={`kf-avatar ${gameState.currentTurn === 'white' && !isGameOver ? 'kf-pulse-gold' : ''}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <span className="kf-avatar__dot kf-avatar__dot--online" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="kf-serif" style={{ color: 'var(--kf-cream)', fontSize: 15, fontWeight: 700 }}>
            You
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 14 }}>🇬🇧</span>
            <div className="kf-serif" style={{ color: 'var(--kf-muted)', fontSize: 12, fontWeight: 700 }}>
              {points.elo ?? 1200}
            </div>
            <div style={{ display: 'flex', gap: 2, marginLeft: 6 }}>
              {gameState.capturedByWhite.slice(0, 6).map((p, i) => (
                <div key={i} style={{ opacity: 0.7 }}>
                  <ChessPiece piece={p} size={16} />
                </div>
              ))}
              {gameState.capturedByWhite.length === 0 && (
                <span className="kf-eyebrow" style={{ fontSize: 9, opacity: 0.5 }}>♟ ♟ ♟ ♟ ♟</span>
              )}
            </div>
          </div>
        </div>
        <div style={{
          padding: '8px 14px',
          border: `1px solid ${gameState.currentTurn === 'white' && !isGameOver ? 'var(--kf-gold-light)' : 'var(--kf-border)'}`,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.35)',
          minWidth: 76, textAlign: 'center',
          boxShadow: gameState.currentTurn === 'white' && !isGameOver ? '0 0 12px rgba(244,214,122,0.35)' : 'none',
        }}>
          <div className="kf-serif" style={{
            color: whiteTime < 30 ? 'var(--kf-danger)' : 'var(--kf-cream)',
            fontSize: 18, fontWeight: 900, letterSpacing: '0.06em', fontFeatureSettings: '"tnum"',
          }}>
            {formatClock(whiteTime)}
          </div>
        </div>
      </div>

      {/* Bottom action bar — Undo / Analysis / Hint / Resign */}
      <div className="kf-panel" style={{
        width: '100%', maxWidth: contentMaxW, padding: '10px 8px',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4,
      }}>
        {[
          { key: 'undo',     label: 'UNDO',     icon: 'M9 4L4 9l5 5M4 9h10a5 5 0 010 10h-4', disabled: !canUndo || gameState.currentTurn !== 'white', onClick: handleUndo },
          { key: 'analysis', label: 'ANALYSIS', icon: 'M10 4a6 6 0 100 12 6 6 0 000-12zM15 15l5 5', disabled: true },
          { key: 'hint',     label: 'HINT',     icon: 'M9 16h6M10 20h4M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z', disabled: hintsLeft <= 0 || gameState.currentTurn !== 'white', badge: hintsLeft > 0 ? hintsLeft : undefined, onClick: handleHint },
          { key: 'resign',   label: 'RESIGN',   icon: 'M4 21V3M4 4h12l-2 4 2 4H4', danger: true, onClick: handleResign },
        ].map(a => (
          <button
            key={a.key}
            disabled={a.disabled}
            onClick={() => {
              if (a.disabled) { sfx.illegal(); return; }
              if (a.onClick) a.onClick();
              else sfx.click();
            }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 6px', border: 'none', borderRadius: 8,
              background: 'transparent',
              color: a.danger ? 'var(--kf-danger)' : a.disabled ? 'var(--kf-dim)' : 'var(--kf-gold)',
              cursor: a.disabled ? 'not-allowed' : 'pointer',
              opacity: a.disabled ? 0.55 : 1,
              position: 'relative',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!a.disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,168,52,0.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {a.badge && (
              <span style={{
                position: 'absolute', top: 4, right: 14,
                background: '#e4b944', color: '#14100a', fontSize: 9, fontWeight: 900,
                width: 15, height: 15, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{a.badge}</span>
            )}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d={a.icon} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="kf-serif" style={{ fontSize: 10, letterSpacing: '0.18em', fontWeight: 700 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Move history (compact — replaces old GameStatus) */}
      <GameStatus
        gameState={gameState}
        config={activeConfig}
        isAIThinking={isAIThinking}
        onResign={handleResign}
        isMobile={isMobile || isTablet}
        boardWidth={boardPx}
      />

      {gameState.promotionPending && (
        <PromotionModal
          color={gameState.promotionPending.color}
          onChoose={(p) => { sfx.select(); resolvePromotion(p); }}
        />
      )}
    </div>
  );
};

export default App;

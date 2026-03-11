import './App.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  DifficultyLevel,
  GameResult,
  GameScreen,
  LEVEL_CONFIGS,
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

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('lobby');
  const [activeConfig, setActiveConfig] = useState<LevelConfig>(LEVEL_CONFIGS.easy);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const resultHandled = useRef(false);
  const { width, isMobile, isTablet } = useWindowSize();

  const { points, canAfford, placeBet, resolveBet, resetPoints } = usePoints();
  const {
    gameState,
    selectSquare,
    applyExternalMove,
    resolvePromotion,
    resetGame,
    isGameOver,
  } = useChessGame();

  // ── Compute square size responsively ─────────────────────────────────────
  const squareSize = (() => {
    if (isMobile) return Math.floor((Math.min(width, 480) - 16) / 8);
    if (isTablet) return Math.floor((Math.min(width * 0.92, 560) - 16) / 8);
    return Math.min(72, Math.floor((width - 340) / 8));
  })();

  // ── Start Game ─────────────────────────────────────────────────────────────
  const handleStartGame = useCallback(
    (level: DifficultyLevel) => {
      const cfg = LEVEL_CONFIGS[level];
      if (!canAfford(cfg.cost)) return;
      const ok = placeBet(cfg.cost);
      if (!ok) return;
      setActiveConfig(cfg);
      resultHandled.current = false;
      setGameResult(null);
      resetGame();
      setScreen('playing');
    },
    [canAfford, placeBet, resetGame]
  );

  // ── AI Hook ────────────────────────────────────────────────────────────────
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

  // Track AI thinking state
  useEffect(() => {
    if (gameState.currentTurn === 'black' && !isGameOver) {
      setIsAIThinking(true);
    } else {
      setIsAIThinking(false);
    }
  }, [gameState.currentTurn, isGameOver]);

  // ── Detect Game Over ───────────────────────────────────────────────────────
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
    setTimeout(() => setScreen('result'), 1800);
  }, [isGameOver, gameState.isCheckmate, gameState.currentTurn, gameState.isStalemate, screen, resolveBet, activeConfig]);

  // ── Resign ─────────────────────────────────────────────────────────────────
  const handleResign = useCallback(() => {
    if (resultHandled.current) return;
    resultHandled.current = true;
    const delta = resolveBet('computer_win', activeConfig);
    setGameResult({
      type: 'computer_win',
      reason: 'You resigned — the throne belongs to the AI.',
      pointsChange: delta,
    });
    setScreen('result');
  }, [resolveBet, activeConfig]);

  // ── Play Again ─────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    const cfg = activeConfig;
    if (!canAfford(cfg.cost)) { setScreen('lobby'); return; }
    const ok = placeBet(cfg.cost);
    if (!ok) { setScreen('lobby'); return; }
    resultHandled.current = false;
    setGameResult(null);
    resetGame();
    setScreen('playing');
  }, [activeConfig, canAfford, placeBet, resetGame]);

  // ── Screens ────────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return <GameLobby points={points} onStartGame={handleStartGame} onResetPoints={resetPoints} />;
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

  // ── Playing Screen ─────────────────────────────────────────────────────────
  const boardPx = squareSize * 8;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 30%, #1a0e00 0%, #0a0a0f 55%, #050508 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: isMobile ? '10px 8px 20px' : '20px 16px 32px',
      gap: isMobile ? 10 : 16,
      boxSizing: 'border-box',
      overflowX: 'hidden',
    }}>

      {/* ── Top Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: isMobile ? '100%' : boardPx + 260,
      }}>
        <h2 style={{
      
          fontSize: isMobile ? 18 : 22,
          fontWeight: 900,
          margin: 0,
          letterSpacing: '0.2em',
          background: 'linear-gradient(180deg, #f0c040 0%, #d4a820 60%, #a07010 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          CHESS
        </h2>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          padding: isMobile ? '5px 10px' : '6px 16px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}>
          <span style={{ color: '#5a4030', fontSize: 9, letterSpacing: '0.1em' }}>
            BALANCE
          </span>
          <span style={{
            color: points.balance <= 8 ? '#f87171' : '#d4a820',
            fontSize: isMobile ? 14 : 18,
            fontWeight: 700,
          }}>
            {points.balance} pts
          </span>
        </div>
      </div>

      {/* ── Main Layout: board + status ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile || isTablet ? 'column' : 'row',
        alignItems: isMobile || isTablet ? 'center' : 'flex-start',
        gap: isMobile ? 10 : 20,
        width: '100%',
        maxWidth: isMobile ? '100%' : boardPx + 280,
      }}>

        {/* ── Board Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

          {/* AI row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
          }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: isAIThinking ? '#7dd3fc' : '#3a3a4a',
              boxShadow: isAIThinking ? '0 0 8px #7dd3fc' : 'none',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }} />
            <span style={{ color: '#6a5a40', fontSize: 10, letterSpacing: '0.08em' }}>
              {isAIThinking ? 'AI is thinking…' : `AI · ${activeConfig.label}`}
            </span>
          </div>

          <Board
            gameState={gameState}
            onSquareClick={selectSquare}
            isAITurn={gameState.currentTurn === 'black' || isAIThinking}
            squareSize={squareSize}
          />

          {/* Player row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 6,
          }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: gameState.currentTurn === 'white' ? '#d4a820' : '#3a3a4a',
              boxShadow: gameState.currentTurn === 'white' ? '0 0 8px #d4a820' : 'none',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }} />
            <span style={{ color: '#8a7050', fontSize: 10, letterSpacing: '0.08em' }}>
              You · White
            </span>
          </div>
        </div>

        {/* ── Status Panel ── */}
        <GameStatus
          gameState={gameState}
          config={activeConfig}
          isAIThinking={isAIThinking}
          onResign={handleResign}
          isMobile={isMobile || isTablet}
          boardWidth={boardPx}
        />
      </div>

      {/* Promotion Modal */}
      {gameState.promotionPending && (
        <PromotionModal
          color={gameState.promotionPending.color}
          onChoose={resolvePromotion}
        />
      )}
    </div>
  );
};

export default App;

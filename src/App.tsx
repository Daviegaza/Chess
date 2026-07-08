import './App.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DifficultyLevel,
  GameResult,
  GameScreen,
  JACKPOT_TIERS,
  LEVEL_CONFIGS,
  LevelConfig,
  makeInitialSideBetState,
  RoundMetricDelta,
  SideBetId,
  SideBetState,
  TimeControl,
  vipTierFor,
} from './types/game.types';
import { useChessGame } from './hooks/useChessGame';
import { useAI } from './hooks/useAI';
import { usePoints } from './hooks/usePoints';
import { useMissions } from './hooks/useMissions';
import { useSession } from './hooks/useSession';
import { useWindowSize } from './hooks/useWindowSize';
import { useSoundFX } from './hooks/useSoundFX';
import { useTimePref } from './hooks/useTimePref';
import Board from './components/Board';
import GameStatus from './components/GameStatus';
import GameResultScreen from './components/GameResultScreen';
import PromotionModal from './components/PromotionModal';
import ChessPiece from './components/ChessPiece';
import LobbyBody from './components/LobbyBody';
import CasinoChrome from './components/CasinoChrome';
import ParticleBurst from './components/ParticleBurst';
import AgeGate from './components/AgeGate';
import {
  ModalKey, MissionsModal, VipModal, LeaderboardModal, StoreModal,
  PromotionsModal, CashierModal, TablesModal, AchievementsModal,
} from './components/LobbyModals';
import { sfx } from './utils/soundEngine';

function formatClock(sec: number, showTenths = false): string {
  if (sec < 0) sec = 0;
  if (showTenths) {
    const clamped = Math.max(0, Math.floor(sec * 10) / 10);
    const m = Math.floor(clamped / 60);
    const s = clamped - m * 60;
    return `${m}:${s.toFixed(1).padStart(4, '0')}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('lobby');
  const [activeConfig, setActiveConfig] = useState<LevelConfig>(LEVEL_CONFIGS.easy);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [pendingQuitAction, setPendingQuitAction] = useState<'lobby' | 'fold' | null>(null);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [sideBetState, setSideBetState] = useState<SideBetState>(makeInitialSideBetState);
  const [whiteTime, setWhiteTime] = useState<number>(0);
  const [blackTime, setBlackTime] = useState<number>(0);
  const [burstSeq, setBurstSeq] = useState<{ n: number; x: number; y: number; color: string; count: number }>({
    n: -1, x: 0, y: 0, color: '#fbbf24', count: 30,
  });
  const [toasts, setToasts] = useState<{ id: number; icon: string; label: string; color: string }[]>([]);
  const toastCounter = useRef(0);
  const showToast = useCallback((icon: string, label: string, color = '#fbbf24') => {
    toastCounter.current += 1;
    const id = toastCounter.current;
    setToasts(cur => [...cur.slice(-2), { id, icon, label, color }]);
    setTimeout(() => setToasts(cur => cur.filter(t => t.id !== id)), 2600);
  }, []);
  const resultHandled = useRef(false);

  const { width, isMobile, isTablet } = useWindowSize();
  const {
    points, dailyBonus,
    canAffordRound, placeRound, resolveRound,
    claimDailyBonus, resetPoints,
    equipSkin, acknowledgeAge, addChips,
  } = usePoints();
  const {
    gameState, selectSquare, applyExternalMove, resolvePromotion,
    resetGame, undoLastMove, isGameOver, canUndo,
  } = useChessGame();
  const { muted, toggleMute, play, ambientOn, toggleAmbient } = useSoundFX();
  const missions = useMissions();
  const session = useSession();
  const timePref = useTimePref();

  const [hintsLeft, setHintsLeft] = useState(3);
  const [hintSquares, setHintSquares] = useState<{ from: string; to: string } | null>(null);

  const tier = vipTierFor(points.vipXp);

  // Auto sound on VIP tier increase
  const notifiedTierRef = useRef<number>(tier.tier);
  useEffect(() => {
    if (tier.tier > notifiedTierRef.current) {
      notifiedTierRef.current = tier.tier;
      play('levelUp');
    }
  }, [tier.tier, play]);

  // ── Particle burst helper ──────────────────────────────────────────────────
  const burstCounterRef = useRef(0);
  const fireBurst = useCallback((color: string, count = 30, x?: number, y?: number) => {
    burstCounterRef.current += 1;
    setBurstSeq({
      n: burstCounterRef.current,
      x: x ?? window.innerWidth / 2,
      y: y ?? window.innerHeight / 2,
      color,
      count,
    });
  }, []);

  // ── Move-event tracking for side bets ──────────────────────────────────────
  const prevMoveLenRef = useRef(0);
  useEffect(() => {
    if (screen !== 'playing') return;
    const history = gameState.moveHistory;
    for (let i = prevMoveLenRef.current; i < history.length; i++) {
      const entry = history[i];
      const move = entry.move;
      // whose move? white moves at odd indices+1 (index 0 = white)
      const wasWhiteMove = i % 2 === 0;
      const color: 'white' | 'black' = wasWhiteMove ? 'white' : 'black';
      const captured = !!entry.capturedPiece;
      const promoted = !!move.promotion;

      setSideBetState(prev => {
        const next: SideBetState = { ...prev, active: { ...prev.active } };
        if (captured && next.firstCapturePlayer === null) {
          next.firstCapturePlayer = color;
        }
        if (captured) {
          if (color === 'white') next.piecesCapturedByPlayer += 1;
          else next.piecesLostByPlayer += 1;
        }
        if (promoted && color === 'white') next.playerPromotions += 1;
        return next;
      });

      if (promoted && color === 'white') {
        fireBurst('#fbbf24', 40);
      } else if (captured) {
        fireBurst(color === 'white' ? '#fbbf24' : '#94a3b8', 14);
      }
    }
    prevMoveLenRef.current = history.length;
  }, [gameState.moveHistory, screen, fireBurst]);

  // ── Move SFX ───────────────────────────────────────────────────────────────
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
      /* handled by outcome */
    } else if (latest.move.promotion) {
      sfx.promote();
    } else if (latest.move.isCastle) {
      sfx.castle();
    } else if (gameState.isCheck) {
      sfx.check();
    } else if (latest.capturedPiece) {
      sfx.capture();
    } else {
      const wasWhiteMove = history.length % 2 === 1;
      if (wasWhiteMove) sfx.move();
      else sfx.moveOpponent();
    }
  }, [gameState.moveHistory, gameState.isCheck, gameState.isCheckmate, screen]);

  useEffect(() => { lastMoveIdxRef.current = 0; prevMoveLenRef.current = 0; }, [screen]);

  // ── Chess clock (rAF; float seconds) ───────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing' || isGameOver || gameState.promotionPending) return;
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (gameState.currentTurn === 'white') {
        setWhiteTime(t => Math.max(0, t - dt));
      } else {
        setBlackTime(t => Math.max(0, t - dt));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, isGameOver, gameState.currentTurn, gameState.promotionPending]);

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

  // ── Square sizing ──────────────────────────────────────────────────────────
  const squareSize = (() => {
    if (isMobile) return Math.floor((Math.min(width, 480) - 24) / 8);
    if (isTablet) return Math.floor((Math.min(width * 0.92, 560) - 24) / 8);
    return Math.min(64, Math.floor((width - 380) / 8));
  })();
  const boardPx = squareSize * 8;
  const contentMaxW = isMobile ? '100%' : boardPx + 40;

  // ── Start / rematch ────────────────────────────────────────────────────────
  const beginRound = useCallback((baseCfg: LevelConfig, betIds: SideBetId[], tcOverride?: TimeControl): boolean => {
    const cfg: LevelConfig = tcOverride ? { ...baseCfg, timeControl: tcOverride } : baseCfg;
    if (!canAffordRound(cfg, betIds)) { play('error'); return false; }
    if (!placeRound(cfg, betIds)) { play('error'); return false; }
    play('chipDrop');
    setActiveConfig(cfg);
    resultHandled.current = false;
    setGameResult(null);
    setWhiteTime(cfg.timeControl.initial);
    setBlackTime(cfg.timeControl.initial);
    setHintsLeft(3);
    setHintSquares(null);

    const fresh = makeInitialSideBetState();
    betIds.forEach(id => { fresh.active[id] = true; });
    setSideBetState(fresh);
    prevMoveLenRef.current = 0;

    resetGame();
    sfx.gameStart();
    setScreen('playing');
    return true;
  }, [canAffordRound, placeRound, play, resetGame]);

  const handleStartGame = useCallback((level: DifficultyLevel, betIds: SideBetId[], tcOverride?: TimeControl) => {
    beginRound(LEVEL_CONFIGS[level], betIds, tcOverride ?? timePref.selectedTc);
  }, [beginRound, timePref.selectedTc]);

  // ── AI ─────────────────────────────────────────────────────────────────────
  const handleAIMove = useCallback((move: Parameters<typeof applyExternalMove>[0]) => {
    setIsAIThinking(false);
    applyExternalMove(move);
  }, [applyExternalMove]);

  useAI({
    gameState,
    aiColor: 'black',
    difficulty: activeConfig.level,
    enabled: screen === 'playing' && !isGameOver && !gameState.promotionPending,
    onMoveMade: handleAIMove,
  });

  useEffect(() => {
    if (screen !== 'playing') { setIsAIThinking(false); return; }
    if (gameState.currentTurn === 'black' && !isGameOver && !gameState.promotionPending) setIsAIThinking(true);
    else setIsAIThinking(false);
  }, [gameState.currentTurn, isGameOver, gameState.promotionPending, screen]);

  // ── Mission bonus router ───────────────────────────────────────────────────
  const onMetricsCallback = useCallback(
    (delta: RoundMetricDelta, missionBonus: (chips: number) => void) => {
      const { justCompleted } = missions.applyDelta(delta);
      if (justCompleted.length > 0) {
        justCompleted.forEach(m => {
          const reward = missions.claim(m.templateId);
          if (reward > 0) missionBonus(reward);
        });
        play('missionComplete');
      }
    },
    [missions, play]
  );

  // ── Time-out ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'playing' || isGameOver || resultHandled.current) return;
    if (whiteTime <= 0) {
      resultHandled.current = true;
      const outcome = resolveRound('computer_win', activeConfig, sideBetState, onMetricsCallback);
      outcome.reason = 'Time forfeit — your clock ran out.';
      setGameResult(outcome);
      sfx.defeat();
      play('lose');
      setTimeout(() => setScreen('result'), 1200);
    } else if (blackTime <= 0) {
      resultHandled.current = true;
      const outcome = resolveRound('player_win', activeConfig, sideBetState, onMetricsCallback);
      outcome.reason = "The AI's flag fell — victory on time!";
      setGameResult(outcome);
      sfx.victory();
      play('win');
      fireBurst('#fbbf24', 55);
      setTimeout(() => setScreen('result'), 1200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteTime, blackTime, screen, isGameOver]);

  // ── Detect game over ──────────────────────────────────────────────────────
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

    const outcome = resolveRound(type, activeConfig, sideBetState, onMetricsCallback);
    outcome.reason = reason;
    setGameResult(outcome);

    if (outcome.jackpotHit && outcome.jackpotTierHit) {
      const tid = outcome.jackpotTierHit;
      const map = { mini: 'jackpotMini', minor: 'jackpotMinor', major: 'jackpotMajor', grand: 'jackpotGrand' } as const;
      play(map[tid]);
      fireBurst(JACKPOT_TIERS[tid].color, 80);
      showToast('★', `${JACKPOT_TIERS[tid].label} JACKPOT +${outcome.jackpotAmount}`, JACKPOT_TIERS[tid].color);
    } else if (type === 'player_win') {
      play('win');
      sfx.victory();
      fireBurst('#fbbf24', 55);
    } else if (type === 'draw') {
      play('draw');
      sfx.draw();
    } else {
      play('lose');
      sfx.defeat();
    }
    if (outcome.newAchievements.length > 0) {
      const a = outcome.newAchievements[0];
      setTimeout(() => showToast(a.icon, `${a.label.toUpperCase()} +${a.reward}`, '#fbbf24'), 400);
    }

    setTimeout(() => setScreen('result'), 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, gameState.isCheckmate, gameState.currentTurn, gameState.isStalemate, screen]);

  // ── Resign (with confirm) ──────────────────────────────────────────────────
  const doResign = useCallback(() => {
    if (resultHandled.current) return;
    resultHandled.current = true;
    const outcome = resolveRound('computer_win', activeConfig, sideBetState, onMetricsCallback);
    outcome.reason = 'You resigned — the throne belongs to the AI.';
    setGameResult(outcome);
    play('lose');
    sfx.defeat();
    setScreen('result');
  }, [resolveRound, activeConfig, sideBetState, onMetricsCallback, play]);

  const handleResign = useCallback(() => {
    if (screen === 'playing' && !isGameOver) {
      play('chipClick');
      setPendingQuitAction('fold');
    } else {
      doResign();
    }
  }, [screen, isGameOver, play, doResign]);

  // ── Undo / Hint ────────────────────────────────────────────────────────────
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

  // ── Rematch ────────────────────────────────────────────────────────────────
  const activeBetIds = useMemo<SideBetId[]>(
    () => (Object.keys(sideBetState.active) as SideBetId[]).filter(k => sideBetState.active[k]),
    [sideBetState.active]
  );

  const handlePlayAgain = useCallback(() => {
    const ok = beginRound(activeConfig, activeBetIds, activeConfig.timeControl);
    if (!ok) setScreen('lobby');
  }, [beginRound, activeConfig, activeBetIds]);

  // ── SFX bridges ────────────────────────────────────────────────────────────
  const lobbySfx = useCallback(
    (n: 'chipClick' | 'coin' | 'error' | 'missionComplete' | 'skinUnlock' | 'hover') => play(n),
    [play]
  );

  const handleClaimDaily = useCallback(() => {
    const gained = claimDailyBonus();
    if (gained > 0) {
      play('coinShower');
      fireBurst('#fbbf24', 40);
      showToast('🎁', `DAILY BONUS +${gained}`, '#fbbf24');
    }
  }, [claimDailyBonus, play, fireBurst, showToast]);

  const handleClaimMission = useCallback((templateId: string) => {
    const reward = missions.claim(templateId);
    if (reward > 0) {
      addChips(reward);
      play('missionComplete');
      fireBurst('#8b5cf6', 35);
      showToast('✦', `MISSION +${reward}`, '#8b5cf6');
    }
  }, [missions, addChips, play, fireBurst, showToast]);

  // ── Quick play ─────────────────────────────────────────────────────────────
  const handleQuickPlay = useCallback(() => {
    const quickLevel: DifficultyLevel = tier.tier >= 1 ? 'medium' : 'easy';
    beginRound(LEVEL_CONFIGS[quickLevel], [], timePref.selectedTc);
  }, [beginRound, tier.tier, timePref.selectedTc]);

  // ── Age gate ───────────────────────────────────────────────────────────────
  if (!points.ageAcknowledged) {
    return <AgeGate onAcknowledge={acknowledgeAge} />;
  }

  const missionsPendingCount = missions.state.missions.filter(
    m => !m.claimed && m.progress < m.target
  ).length;

  const chromeProps = {
    points, muted, isMobile,
    onToggleMute: toggleMute,
    onCashier: () => { play('coin'); setActiveModal('cashier'); },
    tier, dailyBonus,
    missionsCount: missionsPendingCount,
    onClaimDaily: handleClaimDaily,
    onNav: (k: 'play' | 'missions' | 'vip' | 'leaderboard' | 'store' | 'promotions') => {
      if (k === 'play') {
        setActiveModal(null);
        if (screen === 'playing' && !isGameOver) {
          setPendingQuitAction('lobby');
        } else {
          setScreen('lobby');
        }
        return;
      }
      setActiveModal(k);
    },
    onQuickPlay: handleQuickPlay,
    onOpenPromotions: () => setActiveModal('promotions'),
    onSfx: (n: 'chipClick' | 'coin' | 'error' | 'hover') => play(n),
    activeNav: 'play' as 'play',
  };

  const tabQuitConfirmOverlay = pendingQuitAction ? (
    <div
      onClick={() => setPendingQuitAction(null)}
      style={{
        position: 'fixed', inset: 0, zIndex: 450,
        background: 'rgba(10,14,25,0.62)',
        backdropFilter: 'blur(12px) saturate(1.1)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(420px, 100%)', padding: 24, borderRadius: 18,
          background:
            'radial-gradient(ellipse at 0% 0%, rgba(239,68,68,0.20) 0%, transparent 60%),' +
            'linear-gradient(180deg, rgba(28,32,52,0.98), rgba(15,18,36,0.98))',
          border: '1px solid rgba(239,68,68,0.55)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 40px rgba(239,68,68,0.22)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 36, color: '#ef4444', marginBottom: 6 }}>⚑</div>
        <div style={{
          fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: '0.28em',
          color: '#ef4444', fontWeight: 900,
        }}>{pendingQuitAction === 'fold' ? 'FOLD HAND?' : 'QUIT ROUND?'}</div>
        <div style={{
          fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#e2e8f0',
          marginTop: 10, lineHeight: 1.5,
        }}>
          {pendingQuitAction === 'fold'
            ? 'Folding forfeits the round to the AI. Your buy-in is gone.'
            : "You'll forfeit this hand and lose your buy-in. The throne room will be waiting when you return."}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 20 }}>
          <button
            onClick={() => { play('chipClick'); setPendingQuitAction(null); }}
            className="kf-tap"
            style={{
              padding: 14, borderRadius: 12, cursor: 'pointer',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(139,92,246,0.5)',
              color: '#c4b5fd',
              fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.24em', fontWeight: 800,
              minHeight: 52,
            }}
          >NO · KEEP PLAYING</button>
          <button
            onClick={() => {
              const action = pendingQuitAction;
              setPendingQuitAction(null);
              if (action === 'fold') doResign();
              else setScreen('lobby');
            }}
            className="kf-tap"
            style={{
              padding: 14, borderRadius: 12, cursor: 'pointer',
              background: 'linear-gradient(180deg, #ef4444, #7f1d1d)',
              border: '1px solid #ef4444',
              color: '#fff',
              fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.24em', fontWeight: 900,
              minHeight: 52, boxShadow: '0 8px 22px rgba(239,68,68,0.4)',
            }}
          >{pendingQuitAction === 'fold' ? 'YES · FOLD' : 'YES · QUIT'}</button>
        </div>
      </div>
    </div>
  ) : null;

  const modalOverlay = (
    <>
      {activeModal === 'missions' && (
        <MissionsModal
          missions={missions.state}
          onClaim={handleClaimMission}
          onReroll={() => { play('chipClick'); missions.reroll(); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'vip' && (
        <VipModal tier={tier} points={points} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'leaderboard' && (
        <LeaderboardModal points={points} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'store' && (
        <StoreModal
          points={points} tier={tier}
          onEquip={(id) => { play('skinUnlock'); equipSkin(id); showToast('◆', `EQUIPPED ${id.toUpperCase()}`, '#8b5cf6'); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'promotions' && (
        <PromotionsModal
          dailyBonus={dailyBonus}
          onClaimDaily={() => { handleClaimDaily(); setActiveModal(null); }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'cashier' && (
        <CashierModal
          points={points}
          onAddChips={(n) => {
            addChips(n);
            fireBurst('#fbbf24', 40);
            showToast('⛃', `+${n.toLocaleString()} CHIPS`, '#fbbf24');
          }}
          onReset={() => { resetPoints(); showToast('↻', 'PROGRESS RESET', '#ef4444'); }}
          onClose={() => setActiveModal(null)}
          onSfx={(n) => play(n)}
        />
      )}
      {activeModal === 'tables' && (
        <TablesModal
          points={points} tier={tier}
          onPlay={(level) => { setActiveModal(null); handleStartGame(level, [], timePref.selectedTc); }}
          onSfx={(n) => play(n)}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'achievements' && (
        <AchievementsModal points={points} onClose={() => setActiveModal(null)} />
      )}
    </>
  );

  const toastStack = toasts.length > 0 ? (
    <div className="kf-toast-stack">
      {toasts.map(t => (
        <div key={t.id} className="kf-toast" style={{ borderColor: `${t.color}88` }}>
          <span style={{ color: t.color, fontSize: 18 }}>{t.icon}</span>
          <span style={{ color: '#e2e8f0' }}>{t.label}</span>
        </div>
      ))}
    </div>
  ) : null;

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <>
        <CasinoChrome {...chromeProps}>
          <LobbyBody
            points={points}
            tier={tier}
            dailyBonus={dailyBonus}
            missions={missions.state}
            onClaimDaily={handleClaimDaily}
            onClaimMission={handleClaimMission}
            onStartGame={handleStartGame}
            onSfx={lobbySfx}
            isMobile={isMobile}
            onBrowseTables={() => setActiveModal('tables')}
            onOpenAchievements={() => setActiveModal('achievements')}
            timePref={timePref}
          />
        </CasinoChrome>
        {modalOverlay}
        {tabQuitConfirmOverlay}
        <ParticleBurst trigger={burstSeq.n} x={burstSeq.x} y={burstSeq.y} color={burstSeq.color} count={burstSeq.count} />
        {toastStack}
        {session.activeNudge && (
          <CoolOffNudge minutes={session.activeNudge} onDismiss={session.dismissNudge} />
        )}
      </>
    );
  }

  if (screen === 'result' && gameResult) {
    return (
      <>
        <CasinoChrome {...chromeProps}>
          <GameResultScreen
            result={gameResult}
            config={activeConfig}
            points={points}
            onPlayAgain={handlePlayAgain}
            onBackToLobby={() => setScreen('lobby')}
          />
        </CasinoChrome>
        {modalOverlay}
        {tabQuitConfirmOverlay}
        <ParticleBurst trigger={burstSeq.n} x={burstSeq.x} y={burstSeq.y} color={burstSeq.color} count={burstSeq.count} />
        {toastStack}
      </>
    );
  }

  // ── Playing screen ─────────────────────────────────────────────────────────
  return (
    <>
      <CasinoChrome {...chromeProps}>
        <div
          className="kf-fade-in"
          style={{
            padding: isMobile ? '8px 8px 12px' : '24px 20px 40px',
            gap: isMobile ? 8 : 14,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            minWidth: 0, boxSizing: 'border-box', width: '100%',
          }}
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
                if (screen === 'playing' && !isGameOver) {
                  setPendingQuitAction('lobby');
                } else {
                  setScreen('lobby');
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 3L5 9l6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="kf-panel" style={{ padding: '8px 20px', borderRadius: 999 }}>
              <div className="kf-serif kf-gold-text" style={{
                fontSize: isMobile ? 12 : 13, fontWeight: 700, letterSpacing: '0.28em',
              }}>
                {activeConfig.label} · {activeConfig.tagline}
              </div>
            </div>

            <button className="kf-icon-btn" aria-label="More" onClick={() => { sfx.click(); setActiveModal('tables'); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="12" r="1.6" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
                <circle cx="19" cy="12" r="1.6" fill="currentColor"/>
              </svg>
            </button>
          </div>

          {/* AI card */}
          <div className="kf-player-card kf-fade-in" style={{ width: '100%', maxWidth: contentMaxW }}>
            <div className={`kf-avatar ${isAIThinking ? 'kf-pulse-purple' : ''}`}>
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
                  KingfallAI
                </div>
                <span style={{
                  background: 'rgba(139,92,246,0.28)', color: '#c4b5fd',
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
                </div>
              </div>
            </div>
            {(() => {
              const isActive = gameState.currentTurn === 'black' && !isGameOver;
              const urgent = blackTime < 10;
              const low = blackTime < 30;
              const initial = Math.max(1, activeConfig.timeControl.initial);
              const pct = Math.max(0, Math.min(100, (blackTime / initial) * 100));
              return (
                <div className={isActive && urgent ? 'kf-clock-urgent' : ''} style={{
                  padding: '8px 14px',
                  border: `1px solid ${isActive ? (urgent ? '#ef4444' : '#c4b5fd') : 'var(--kf-border)'}`,
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)',
                  minWidth: 88, textAlign: 'center',
                  boxShadow: isActive
                    ? (urgent ? '0 0 16px rgba(239,68,68,0.55)' : '0 0 12px rgba(139,92,246,0.4)')
                    : 'none',
                }}>
                  <div className="kf-serif" style={{
                    color: urgent ? 'var(--kf-danger)' : low ? '#fbbf24' : 'var(--kf-cream)',
                    fontSize: 18, fontWeight: 900, letterSpacing: '0.06em', fontFeatureSettings: '"tnum"',
                  }}>
                    {formatClock(blackTime, urgent)}
                  </div>
                  <div style={{
                    marginTop: 4, height: 3, borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: urgent ? '#ef4444' : low ? '#fbbf24' : '#c4b5fd',
                      transition: 'width 0.15s linear',
                    }} />
                  </div>
                </div>
              );
            })()}
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
                      className="kf-pulse-purple"
                      style={{
                        position: 'absolute',
                        left: col * squareSize,
                        top: row * squareSize,
                        width: squareSize,
                        height: squareSize,
                        borderRadius: 4,
                        boxShadow: `inset 0 0 0 4px ${k === 'from' ? '#10b981' : '#fbbf24'}`,
                        background: k === 'from' ? 'rgba(16,185,129,0.16)' : 'rgba(251,191,36,0.20)',
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Player card */}
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
                </div>
              </div>
            </div>
            {(() => {
              const isActive = gameState.currentTurn === 'white' && !isGameOver;
              const urgent = whiteTime < 10;
              const low = whiteTime < 30;
              const initial = Math.max(1, activeConfig.timeControl.initial);
              const pct = Math.max(0, Math.min(100, (whiteTime / initial) * 100));
              return (
                <div className={isActive && urgent ? 'kf-clock-urgent' : ''} style={{
                  padding: '8px 14px',
                  border: `1px solid ${isActive ? (urgent ? '#ef4444' : '#fde68a') : 'var(--kf-border)'}`,
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.35)',
                  minWidth: 88, textAlign: 'center',
                  boxShadow: isActive
                    ? (urgent ? '0 0 16px rgba(239,68,68,0.55)' : '0 0 12px rgba(251,191,36,0.4)')
                    : 'none',
                }}>
                  <div className="kf-serif" style={{
                    color: urgent ? 'var(--kf-danger)' : low ? '#fbbf24' : 'var(--kf-cream)',
                    fontSize: 18, fontWeight: 900, letterSpacing: '0.06em', fontFeatureSettings: '"tnum"',
                  }}>
                    {formatClock(whiteTime, urgent)}
                  </div>
                  <div style={{
                    marginTop: 4, height: 3, borderRadius: 999,
                    background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: urgent ? '#ef4444' : low ? '#fbbf24' : '#fde68a',
                      transition: 'width 0.15s linear',
                    }} />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* QUICK ACTIONS: SOUND / AMBIENT / HINT / FOLD */}
          <div className="kf-panel" style={{
            width: '100%', maxWidth: contentMaxW, padding: '10px 8px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 4,
          }}>
            {[
              {
                key: 'sound', label: muted ? 'UNMUTE' : 'MUTE',
                icon: 'M4 9h4l4-4v14l-4-4H4V9z',
                onClick: () => { play('chipClick'); toggleMute(); },
              },
              {
                key: 'ambient', label: ambientOn ? 'AMB ON' : 'AMB OFF',
                icon: 'M12 4a8 8 0 100 16 8 8 0 000-16zM8 12h8',
                onClick: () => { play('chipClick'); toggleAmbient(); },
              },
              {
                key: 'hint', label: 'HINT',
                icon: 'M9 16h6M10 20h4M12 3a6 6 0 00-4 10c1 1 1 2 1 3h6c0-1 0-2 1-3a6 6 0 00-4-10z',
                disabled: hintsLeft <= 0 || gameState.currentTurn !== 'white',
                badge: hintsLeft > 0 ? hintsLeft : undefined,
                onClick: handleHint,
              },
              {
                key: 'fold', label: 'FOLD',
                icon: 'M4 21V3M4 4h12l-2 4 2 4H4',
                danger: true,
                onClick: handleResign,
              },
            ].map(a => (
              <button
                key={a.key}
                disabled={a.disabled}
                className="kf-tap"
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
                onMouseEnter={e => { if (!a.disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(139,92,246,0.10)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {a.badge && (
                  <span style={{
                    position: 'absolute', top: 4, right: 14,
                    background: '#fbbf24', color: '#14100a', fontSize: 9, fontWeight: 900,
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

          {/* Undo bar — RESIGN lives in QUICK ACTIONS as FOLD */}
          <div style={{ width: '100%', maxWidth: contentMaxW, display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              className="kf-btn"
              disabled={!canUndo || gameState.currentTurn !== 'white'}
              onClick={handleUndo}
              style={{ flex: 1 }}
            >UNDO MOVE</button>
          </div>

          <GameStatus
            gameState={gameState}
            config={activeConfig}
            isAIThinking={isAIThinking}
            onResign={handleResign}
            isMobile={isMobile || isTablet}
            boardWidth={boardPx}
          />

        </div>
      </CasinoChrome>
      {gameState.promotionPending && (
        <PromotionModal
          color={gameState.promotionPending.color}
          onChoose={(p) => { sfx.select(); resolvePromotion(p); }}
        />
      )}
      {modalOverlay}
      {tabQuitConfirmOverlay}
      <ParticleBurst trigger={burstSeq.n} x={burstSeq.x} y={burstSeq.y} color={burstSeq.color} count={burstSeq.count} />
      {toastStack}
      {session.activeNudge && <CoolOffNudge minutes={session.activeNudge} onDismiss={session.dismissNudge} />}
    </>
  );
};

// ── Session cool-off nudge ─────────────────────────────────────────────────
const CoolOffNudge: React.FC<{ minutes: 30 | 60; onDismiss: () => void }> = ({ minutes, onDismiss }) => (
  <div style={{
    position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 400, maxWidth: 420, width: 'calc(100% - 32px)',
    background: 'linear-gradient(135deg, rgba(76,29,149,0.9) 0%, rgba(30,14,60,0.95) 100%)',
    border: '1px solid rgba(139,92,246,0.55)',
    borderRadius: 14, padding: '14px 16px',
    display: 'flex', gap: 12, alignItems: 'center',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 32px rgba(139,92,246,0.28)',
    color: '#e2e8f0', backdropFilter: 'blur(6px)',
  }}>
    <div style={{ fontSize: 24, color: '#c4b5fd' }}>⌛</div>
    <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4, fontFamily: "'Crimson Pro', serif" }}>
      You've been playing for <b style={{ color: '#fbbf24' }}>{minutes} minutes</b>. Consider a short break —
      the throne room will still be here.
    </div>
    <button onClick={onDismiss} style={{
      background: 'transparent', border: '1px solid rgba(139,92,246,0.5)',
      borderRadius: 8, color: '#c4b5fd',
      fontSize: 10, letterSpacing: '0.15em', fontFamily: "'Cinzel', serif", fontWeight: 700,
      padding: '6px 12px', cursor: 'pointer',
    }}>OK</button>
  </div>
);

export default App;

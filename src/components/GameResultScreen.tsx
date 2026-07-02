import React, { useEffect, useRef } from 'react';
import type { GameResult, LevelConfig, PointsState } from '../types/game.types';
import { useWindowSize } from '../hooks/useWindowSize';
import ChessPiece from './ChessPiece';
import Confetti from './Confetti';
import { sfx } from '../utils/soundEngine';
import type { Piece } from '../types/chess.types';

interface GameResultScreenProps {
  result: GameResult;
  config: LevelConfig;
  points: PointsState;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number;
  size: number; color: string; life: number;
}

const useConfetti = (enabled: boolean, tint: 'gold' | 'ash') => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const palette = tint === 'gold'
      ? ['#f4d67a', '#d4a834', '#8a6018', '#fff2b8']
      : ['#8a6018', '#4a3820', '#3a2810'];

    const particles: Particle[] = [];
    const spawn = (n: number) => {
      const w = canvas.clientWidth;
      for (let i = 0; i < n; i++) {
        particles.push({
          x: w / 2 + (Math.random() - 0.5) * 60,
          y: -10,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2 + 2,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 6 + 4,
          color: palette[Math.floor(Math.random() * palette.length)],
          life: 1,
        });
      }
    };
    spawn(80);
    const t = setInterval(() => spawn(20), 250);
    setTimeout(() => clearInterval(t), 1400);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08;
        p.rot += p.vr;
        p.life -= 0.005;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0 || particles[i].y > canvas.clientHeight + 40) {
          particles.splice(i, 1);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
      window.removeEventListener('resize', resize);
    };
  }, [enabled, tint]);

  return canvasRef;
};

const GameResultScreen: React.FC<GameResultScreenProps> = ({
  result, config, points, onPlayAgain, onBackToLobby,
}) => {
  const { isMobile } = useWindowSize();
  const isWin = result.type === 'player_win';
  const isDraw = result.type === 'draw';
  const title = isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT';
  const titleTint = isWin ? 'var(--kf-success)' : isDraw ? 'var(--kf-warn)' : 'var(--kf-danger)';
  const glowRGB = isWin ? 'rgba(74,222,128,0.5)' : isDraw ? 'rgba(224,168,51,0.5)' : 'rgba(217,72,72,0.5)';

  const heroPiece: Piece = isWin
    ? { type: 'king', color: 'white' }
    : isDraw ? { type: 'bishop', color: 'white' }
    : { type: 'king', color: 'black' };

  const pointsColor = result.pointsChange > 0 ? 'var(--kf-success)'
    : result.pointsChange < 0 ? 'var(--kf-danger)'
    : 'var(--kf-warn)';
  const pointsLabel = result.pointsChange > 0 ? `+${result.pointsChange}`
    : result.pointsChange < 0 ? `${result.pointsChange}` : '±0';

  const confettiRef = useConfetti(isWin, 'gold');
  const playAgainRef = useRef<HTMLButtonElement>(null);

  // Autofocus Play Again so keyboard users can Enter immediately
  useEffect(() => {
    const t = setTimeout(() => { playAgainRef.current?.focus(); }, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="kf-screen kf-fade-in"
      style={{
        justifyContent: 'center',
        padding: isMobile ? '24px 16px calc(130px + var(--kf-safe-bottom))' : '40px',
        position: 'relative',
        minHeight: 'auto',
      }}
    >
      {isWin && (
        <canvas
          ref={confettiRef}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 0,
          }}
        />
      )}
      <Confetti active={isWin} intense={result.jackpotHit} />

      <div style={{ textAlign: 'center', width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}>

        <div style={{
          margin: '0 auto 16px',
          filter: `drop-shadow(0 20px 40px rgba(0,0,0,0.8)) drop-shadow(0 0 40px ${glowRGB})`,
        }}>
          <ChessPiece piece={heroPiece} size={isMobile ? 130 : 160} />
        </div>

        <div className="kf-ornament" style={{ marginBottom: 10 }}>◆</div>

        <h1 className="kf-serif" style={{
          fontSize: isMobile ? 44 : 56, fontWeight: 900, color: titleTint,
          margin: '0 0 6px', letterSpacing: '0.28em',
          textShadow: `0 0 40px ${glowRGB}`,
        }}>
          {title}
        </h1>

        <p className="kf-body" style={{
          color: 'var(--kf-muted)', fontSize: isMobile ? 13 : 15,
          letterSpacing: '0.05em', margin: '0 0 32px', fontStyle: 'italic', padding: '0 8px',
        }}>
          {result.reason}
        </p>

        <div className="kf-panel" style={{
          padding: isMobile ? '20px' : '24px 40px',
          marginBottom: 24,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 40,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="kf-serif" style={{ color: pointsColor, fontSize: isMobile ? 40 : 48, fontWeight: 900, lineHeight: 1 }}>
              {pointsLabel}
            </div>
            <div className="kf-eyebrow" style={{ marginTop: 6 }}>
              Points {result.pointsChange >= 0 ? 'Earned' : 'Lost'}
            </div>
          </div>

          <div style={{ width: isMobile ? '60%' : 1, height: isMobile ? 1 : 48, background: 'var(--kf-border-strong)' }} />

          <div style={{ textAlign: 'center' }}>
            <div className="kf-serif" style={{
              color: points.balance <= 4 ? 'var(--kf-danger)' : 'var(--kf-gold-light)',
              fontSize: isMobile ? 40 : 48, fontWeight: 900, lineHeight: 1,
            }}>
              {points.balance}
            </div>
            <div className="kf-eyebrow" style={{ marginTop: 6 }}>New Balance</div>
          </div>
        </div>

        <div className="kf-eyebrow" style={{ marginBottom: 24 }}>
          Played on <span style={{ color: config.color }}>{config.label}</span> difficulty
        </div>

        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          gap: 12, justifyContent: 'center',
        }}>
          <button
            ref={playAgainRef}
            className="kf-btn kf-btn--gold kf-tap"
            style={{ width: isMobile ? '100%' : 'auto' }}
            onClick={() => { sfx.click(); onPlayAgain(); }}
          >
            Play Again
          </button>
          <button
            className="kf-btn kf-tap"
            style={{ width: isMobile ? '100%' : 'auto' }}
            onClick={() => { sfx.click(); onBackToLobby(); }}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultScreen;

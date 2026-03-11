import React, { useState } from 'react';
import { DifficultyLevel, LEVEL_CONFIGS, PointsState } from '../types/game.types';
import { useWindowSize } from '../hooks/useWindowSize';

interface GameLobbyProps {
  points: PointsState;
  onStartGame: (level: DifficultyLevel) => void;
  onResetPoints: () => void;
}

const StatBox = ({ label, value, color }: { label: string; value: string | number; color: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ color, fontSize: 22,  fontWeight: 700 }}>{value}</div>
    <div style={{ color: '#5a4030', fontSize: 10,  marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
  </div>
);

const GameLobby: React.FC<GameLobbyProps> = ({ points, onStartGame, onResetPoints }) => {
  const [hoveredLevel, setHoveredLevel] = useState<DifficultyLevel | null>(null);
  const { isMobile, isTablet, width } = useWindowSize();
  const levels = Object.values(LEVEL_CONFIGS);

  const cardW = isMobile
    ? '100%'
    : isTablet
    ? 'calc(50% - 8px)'
    : 280;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, #1a0e00 0%, #0a0a0f 60%, #050508 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: isMobile ? '28px 16px 40px' : '40px 20px',
      boxSizing: 'border-box',

    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 24 : 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.5em', color: '#8a6020', marginBottom: 10 }}>
          ── ◆ ──
        </div>
        <h1 style={{
          fontSize: isMobile ? 42 : 'clamp(42px, 8vw, 72px)',
          fontWeight: 900,
          margin: 0,
          letterSpacing: '0.15em',
          textShadow: '0 0 60px rgba(212,168,32,0.3), 0 4px 20px rgba(0,0,0,0.8)',
          background: 'linear-gradient(180deg, #f0c040 0%, #d4a820 40%, #a07010 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          CHESS
        </h1>
        <p style={{
          color: '#7a5a30',
          fontSize: isMobile ? 12 : 16,
          letterSpacing: '0.2em',
          marginTop: 8,
          fontStyle: 'italic',
        }}>
          Chess · Wager · Conquer
        </p>
      </div>

      {/* Points Dashboard */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1208 0%, #0f0b06 100%)',
        border: '1px solid #3a2810',
        borderRadius: 12,
        padding: isMobile ? '16px 20px' : '20px 40px',
        marginBottom: isMobile ? 20 : 36,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 16 : 40,
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,150,0,0.1)',
        width: '100%',
        maxWidth: isMobile ? '100%' : 560,
        boxSizing: 'border-box',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            color: points.balance <= 8 ? '#f87171' : '#d4a820',
            fontSize: isMobile ? 44 : 52,
            fontWeight: 900,
            lineHeight: 1,
          }}>
            {points.balance}
          </div>
          <div style={{
            color: '#5a4030', fontSize: 10,
            marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>
            Point Balance
          </div>
        </div>

        <div style={{ width: isMobile ? '80%' : 1, height: isMobile ? 1 : 48, background: '#2a1a08' }} />

        <div style={{ display: 'flex', gap: isMobile ? 40 : 32 }}>
          <StatBox label="Wins" value={points.totalWins} color="#4ade80" />
          <StatBox label="Losses" value={points.totalLosses} color="#f87171" />
          <StatBox label="Draws" value={points.totalDraws} color="#facc15" />
        </div>
      </div>

      {/* Level Cards */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
        width: '100%',
        maxWidth: isMobile ? '100%' : isTablet ? 580 : 576,
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        {levels.map(cfg => {
          const canPlay = points.balance > cfg.cost;
          const isHovered = hoveredLevel === cfg.level;

          return (
            <div
              key={cfg.level}
              onClick={() => canPlay && onStartGame(cfg.level)}
              onMouseEnter={() => setHoveredLevel(cfg.level)}
              onMouseLeave={() => setHoveredLevel(null)}
              onTouchStart={() => setHoveredLevel(cfg.level)}
              onTouchEnd={() => setHoveredLevel(null)}
              style={{
                width: cardW,
                background: isHovered && canPlay
                  ? cfg.gradient
                  : 'linear-gradient(135deg, #12100a 0%, #0a0905 100%)',
                border: `1px solid ${isHovered && canPlay ? cfg.color + '60' : '#2a1a08'}`,
                borderRadius: 12,
                padding: isMobile ? '18px 16px' : '24px',
                cursor: canPlay ? 'pointer' : 'not-allowed',
                opacity: canPlay ? 1 : 0.45,
                transition: 'all 0.2s ease',
                transform: isHovered && canPlay && !isMobile ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered && canPlay
                  ? `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${cfg.color}20`
                  : '0 4px 16px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'hidden',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{
                  color: cfg.color,
                  fontSize: isMobile ? 16 : 18,
                  fontWeight: 900,
                  letterSpacing: '0.2em',
                }}>
                  {cfg.label}
                </div>
                {!canPlay && (
                  <span style={{ fontSize: 9, color: '#f87171', letterSpacing: '0.08em' }}>
                    NEED MORE PTS
                  </span>
                )}
              </div>

              <p style={{
                color: '#8a6840',
                fontSize: isMobile ? 12 : 13,
                lineHeight: 1.5,
                marginBottom: 14,
                fontStyle: 'italic',
              }}>
                {cfg.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <span style={{ color: '#5a4030', fontSize: 9, letterSpacing: '0.1em',}}>WAGER</span>
                    <div style={{ color: '#f87171',  fontSize: 15, fontWeight: 700 }}>
                      {cfg.cost} pts
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#5a4030', fontSize: 9, letterSpacing: '0.1em', }}>WIN</span>
                    <div style={{ color: '#4ade80',  fontSize: 15, fontWeight: 700 }}>
                      +{cfg.reward} pts
                    </div>
                  </div>
                </div>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  border: `2px solid ${cfg.color}60`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: cfg.color, fontSize: 16,
                }}>
                  ♟
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rule blurb */}
      <div style={{
        maxWidth: isMobile ? '100%' : 520,
        textAlign: 'center',
        color: '#4a3520',
        fontSize: 12,
        lineHeight: 1.7,
        marginBottom: 20,
        fontStyle: 'italic',
        padding: '0 8px',
      }}>
        Wager points to enter each level. Win = reclaim wager + earn reward.
        Draw = wager returned. Lose = wager forfeited. Balance must exceed wager to play.
      </div>

      {points.balance < 2 && (
        <button
          onClick={onResetPoints}
          style={{
            background: 'rgba(200,150,0,0.1)',
            border: '1px solid rgba(200,150,0,0.3)',
            borderRadius: 8,
            color: '#d4a820',
            fontSize: 12,
            letterSpacing: '0.1em',
            padding: '12px 28px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Reset Points to 20
        </button>
      )}
    </div>
  );
};

export default GameLobby;

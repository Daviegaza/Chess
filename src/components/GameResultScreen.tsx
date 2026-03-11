import React from 'react';
import { GameResult, LevelConfig, PointsState } from '../types/game.types';
import { useWindowSize } from '../hooks/useWindowSize';

interface GameResultScreenProps {
  result: GameResult;
  config: LevelConfig;
  points: PointsState;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

const GameResultScreen: React.FC<GameResultScreenProps> = ({
  result, config, points, onPlayAgain, onBackToLobby,
}) => {
  const { isMobile } = useWindowSize();
  const isWin = result.type === 'player_win';
  const isDraw = result.type === 'draw';
  const title = isWin ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';
  const titleColor = isWin ? '#4ade80' : isDraw ? '#facc15' : '#f87171';
  const symbol = isWin ? '♔' : isDraw ? '⚖' : '♚';
  const pointsColor = result.pointsChange > 0 ? '#4ade80' : result.pointsChange < 0 ? '#f87171' : '#facc15';
  const pointsLabel = result.pointsChange > 0 ? `+${result.pointsChange}` : result.pointsChange < 0 ? `${result.pointsChange}` : '±0';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, #1a0e00 0%, #0a0a0f 60%, #050508 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '32px 20px' : '40px',
      boxSizing: 'border-box',
    }}>
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 420 }}>

        <div style={{ fontSize: isMobile ? 64 : 80, marginBottom: 14, filter: `drop-shadow(0 0 20px ${titleColor}40)` }}>
          {symbol}
        </div>

        <h1 style={{

          fontSize: isMobile ? 44 : 56,
          fontWeight: 900,
          color: titleColor,
          margin: '0 0 8px',
          letterSpacing: '0.1em',
          textShadow: `0 0 40px ${titleColor}40`,
        }}>
          {title}
        </h1>

        <p style={{
          color: '#8a6840',

          fontSize: isMobile ? 12 : 14,
          letterSpacing: '0.1em',
          marginBottom: 32,
          fontStyle: 'italic',
          padding: '0 8px',
        }}>
          {result.reason}
        </p>

        {/* Points Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1208 0%, #0f0b06 100%)',
          border: '1px solid #3a2810',
          borderRadius: 12,
          padding: isMobile ? '20px' : '24px 40px',
          marginBottom: 28,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 16 : 40,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: pointsColor, fontSize: isMobile ? 40 : 48, fontWeight: 900, lineHeight: 1 }}>
              {pointsLabel}
            </div>
            <div style={{ color: '#5a4030', fontSize: 10,  marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              Points {result.pointsChange >= 0 ? 'Earned' : 'Lost'}
            </div>
          </div>

          <div style={{ width: isMobile ? '60%' : 1, height: isMobile ? 1 : 48, background: '#2a1a08' }} />

          <div style={{ textAlign: 'center' }}>
            <div style={{
              color: points.balance <= 4 ? '#f87171' : '#d4a820',
              fontSize: isMobile ? 40 : 48,
              fontWeight: 900,
              lineHeight: 1,
            }}>
              {points.balance}
            </div>
            <div style={{ color: '#5a4030', fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              New Balance
            </div>
          </div>
        </div>

        <div style={{
          color: '#5a4030',  fontSize: 13,
          marginBottom: 28, fontStyle: 'italic',
        }}>
          Played on <span style={{ color: config.color }}>{config.label}</span> difficulty
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 12,
          justifyContent: 'center',
        }}>
          <button
            onClick={onPlayAgain}
            style={{
              background: config.gradient,
              border: `1px solid ${config.color}50`,
              borderRadius: 8,
              color: '#fff',

              fontSize: 12,
              letterSpacing: '0.15em',
              padding: isMobile ? '14px' : '12px 28px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            Play Again
          </button>
          <button
            onClick={onBackToLobby}
            style={{
              background: 'transparent',
              border: '1px solid #3a2810',
              borderRadius: 8,
              color: '#8a6840',
              fontSize: 12,
              letterSpacing: '0.15em',
              padding: isMobile ? '14px' : '12px 28px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              width: isMobile ? '100%' : 'auto',
            }}
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultScreen;

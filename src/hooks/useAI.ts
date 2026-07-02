import { useCallback, useEffect, useRef } from 'react';
import { Move, PieceColor } from '../types/chess.types';
import { DifficultyLevel } from '../types/game.types';
import { GameState } from '../types/chess.types';
import { getAIMove, AILevel } from '../utils/aiEngine';

interface UseAIOptions {
  gameState: GameState;
  aiColor: PieceColor;
  difficulty: DifficultyLevel;
  enabled: boolean;
  onMoveMade: (move: Move) => void;
}

// Delay ranges (ms) per difficulty – makes it feel human
const AI_DELAY: Record<DifficultyLevel, [number, number]> = {
  easy:       [400, 800],
  medium:     [600, 1200],
  hard:       [800, 1600],
  expert:     [1000, 2200],
  highroller: [1200, 2600],
};

export function useAI({
  gameState,
  aiColor,
  difficulty,
  enabled,
  onMoveMade,
}: UseAIOptions): { isThinking: boolean } {
  const isThinkingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose thinking state reactively via a simple ref proxy
  // (parent can track via isCheckmate / isStalemate to stop AI)
  const computeMove = useCallback(() => {
    if (
      !enabled ||
      gameState.currentTurn !== aiColor ||
      gameState.isCheckmate ||
      gameState.isStalemate ||
      gameState.promotionPending
    ) {
      return;
    }

    isThinkingRef.current = true;

    const [minDelay, maxDelay] = AI_DELAY[difficulty];
    const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

    timeoutRef.current = setTimeout(() => {
      const move = getAIMove(
        gameState.board,
        aiColor,
        difficulty as AILevel,
        gameState.enPassantTarget,
        gameState.castlingRights
      );

      isThinkingRef.current = false;

      if (move) {
        onMoveMade(move);
      }
    }, delay);
  }, [
    enabled,
    gameState.board,
    gameState.currentTurn,
    gameState.isCheckmate,
    gameState.isStalemate,
    gameState.promotionPending,
    gameState.enPassantTarget,
    gameState.castlingRights,
    aiColor,
    difficulty,
    onMoveMade,
  ]);

  useEffect(() => {
    computeMove();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [computeMove]);

  return { isThinking: isThinkingRef.current };
}

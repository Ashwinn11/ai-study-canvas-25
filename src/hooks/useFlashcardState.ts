import { useReducer, useCallback } from 'react';
import { Flashcard } from '@/types';

interface FlashcardState extends Flashcard {
  isFlipped: boolean;
  isProcessed: boolean;
}

interface SessionState {
  cards: FlashcardState[];
  currentIndex: number;
  stats: {
    correct: number;
    needReview: number;
  };
  isComplete: boolean;
}

type Action =
  | { type: 'INITIALIZE_CARDS'; payload: Flashcard[] }
  | { type: 'FLIP_CARD' }
  | { type: 'RECORD_RATING'; payload: { quality: number } }
  | { type: 'NEXT_CARD' }
  | { type: 'RESET_SESSION' }
  | { type: 'COMPLETE_SESSION' };

const initialState: SessionState = {
  cards: [],
  currentIndex: 0,
  stats: {
    correct: 0,
    needReview: 0,
  },
  isComplete: false,
};

function flashcardReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'INITIALIZE_CARDS':
      return {
        ...state,
        cards: action.payload.map(card => ({
          ...card,
          isFlipped: false,
          isProcessed: false,
        })),
        currentIndex: 0,
        isComplete: false,
      };

    case 'FLIP_CARD':
      return {
        ...state,
        cards: state.cards.map((card, index) =>
          index === state.currentIndex
            ? { ...card, isFlipped: !card.isFlipped }
            : card
        ),
      };

    case 'RECORD_RATING': {
      const isCorrect = action.payload.quality >= 3;
      return {
        ...state,
        cards: state.cards.map((card, index) =>
          index === state.currentIndex
            ? { ...card, isProcessed: true }
            : card
        ),
        stats: {
          correct: state.stats.correct + (isCorrect ? 1 : 0),
          needReview: state.stats.needReview + (isCorrect ? 0 : 1),
        },
      };
    }

    case 'NEXT_CARD': {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.cards.length) {
        return {
          ...state,
          isComplete: true,
        };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        cards: state.cards.map((card, index) =>
          index === nextIndex
            ? { ...card, isFlipped: false }
            : card
        ),
      };
    }

    case 'RESET_SESSION':
      return {
        ...state,
        currentIndex: 0,
        stats: { correct: 0, needReview: 0 },
        isComplete: false,
        cards: state.cards.map(card => ({
          ...card,
          isFlipped: false,
          isProcessed: false,
        })),
      };

    case 'COMPLETE_SESSION':
      return {
        ...state,
        isComplete: true,
      };

    default:
      return state;
  }
}

export function useFlashcardState() {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  const initializeCards = useCallback((cards: Flashcard[]) => {
    dispatch({ type: 'INITIALIZE_CARDS', payload: cards });
  }, []);

  const flipCard = useCallback(() => {
    dispatch({ type: 'FLIP_CARD' });
  }, []);

  const recordRating = useCallback((quality: number) => {
    dispatch({ type: 'RECORD_RATING', payload: { quality } });
  }, []);

  const nextCard = useCallback(() => {
    dispatch({ type: 'NEXT_CARD' });
  }, []);

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const completeSession = useCallback(() => {
    dispatch({ type: 'COMPLETE_SESSION' });
  }, []);

  const currentCard = state.cards[state.currentIndex];
  const hasNextCard = state.currentIndex < state.cards.length - 1;

  return {
    // State
    currentCard,
    currentIndex: state.currentIndex,
    totalCards: state.cards.length,
    stats: state.stats,
    isComplete: state.isComplete,
    hasNextCard,

    // Actions
    initializeCards,
    flipCard,
    recordRating,
    nextCard,
    resetSession,
    completeSession,
  };
}

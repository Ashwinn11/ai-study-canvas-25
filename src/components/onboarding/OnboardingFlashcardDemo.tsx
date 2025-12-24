'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface DemoFlashcard {
  question: string;
  answer: string;
}

const DEMO_CARDS: Record<string, DemoFlashcard[]> = {
  forget: [
    {
      question: 'What is spaced repetition?',
      answer: 'A learning technique that schedules reviews at increasing intervals to maximize long-term retention.',
    },
    {
      question: 'When will I review this card again?',
      answer: 'First in 1 day, then 3 days, then 7 days, then 14 days - perfectly timed for your memory.',
    },
    {
      question: 'Why does this work?',
      answer: 'Your brain strengthens memories each time you successfully recall them. Spacing reviews optimizes this process.',
    },
  ],
  time: [
    {
      question: 'How fast can Masterly create flashcards?',
      answer: 'Upload your notes and get 50+ flashcards in under 30 seconds with AI.',
    },
    {
      question: 'How long should I study daily?',
      answer: 'Just 10 minutes a day with 20 cards is enough to see real improvement.',
    },
    {
      question: 'What about making notes?',
      answer: 'Skip manual note-taking. Upload once, study forever with AI-generated cards.',
    },
  ],
  overwhelm: [
    {
      question: 'How does Masterly break down content?',
      answer: 'AI analyzes your materials and creates bite-sized flashcards focusing on key concepts.',
    },
    {
      question: 'Can I study one topic at a time?',
      answer: 'Yes! Organize cards by topic and study at your own pace.',
    },
    {
      question: 'What if I have too many cards?',
      answer: 'Start with your daily goal (10-20 cards). The app prioritizes what you need to review.',
    },
  ],
  start: [
    {
      question: 'How do I get started?',
      answer: 'Upload your study materials, and AI will create flashcards automatically.',
    },
    {
      question: 'What should I upload first?',
      answer: 'Start with your most important topic or upcoming exam material.',
    },
    {
      question: 'How will I know what to study?',
      answer: 'The app shows you exactly which cards to review each day based on spaced repetition.',
    },
  ],
};

interface OnboardingFlashcardDemoProps {
  painPoint: 'forget' | 'time' | 'overwhelm' | 'start';
}

export default function OnboardingFlashcardDemo({ painPoint }: OnboardingFlashcardDemoProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const cards = DEMO_CARDS[painPoint] || DEMO_CARDS.forget;
  const currentCard = cards[currentIndex];

  // Reset state when painPoint changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [painPoint]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const getHeadline = () => {
    switch (painPoint) {
      case 'forget':
        return "AI turns your notes into memorable flashcards";
      case 'time':
        return "From notes to flashcards in seconds, not hours";
      case 'overwhelm':
        return "AI breaks down complex topics into simple cards";
      case 'start':
        return "This is how AI transforms your study material";
      default:
        return "See AI-powered flashcards in action";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
      {/* Personalized Headline */}
      <div className="text-center">
        <h2 className="text-sm font-semibold text-muted-foreground mb-1">
          Try it yourself
        </h2>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          {getHeadline()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Tap to flip, then swipe through all {cards.length} cards
        </p>
      </div>

      {/* Flashcard */}
      <div
        onClick={handleFlip}
        className="cursor-pointer mx-auto max-w-lg"
        style={{ perspective: '1000px' }}
      >
        <div
          className="relative h-80 rounded-lg border-2 p-6 flex items-center justify-center transition-all duration-500 shadow-lg hover:shadow-xl"
          style={{
            backgroundColor: '#b8e0d2',
            borderColor: '#b8e0d2',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            className="text-center absolute inset-0 flex flex-col items-center justify-center p-6 rounded-lg"
            style={{
              backgroundColor: '#b8e0d2',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              backfaceVisibility: 'hidden',
            }}
          >
            <p className="text-xs mb-2 font-medium text-black">
              {isFlipped ? 'Answer' : 'Question'}
            </p>
            <p className="text-xl text-black leading-relaxed font-medium">
              {isFlipped ? currentCard.answer : currentCard.question}
            </p>
            <p className="text-xs mt-4 text-black/70">Click to flip</p>
          </div>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex gap-2 justify-center">
        {cards.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-8 bg-primary'
                : 'w-2 bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Next Button */}
      {currentIndex < cards.length - 1 && (
        <div className="flex justify-center">
          <Button
            onClick={handleNext}
            variant="outline"
            className="gap-2"
          >
            Next Card
            <span>→</span>
          </Button>
        </div>
      )}
    </div>
  );
}

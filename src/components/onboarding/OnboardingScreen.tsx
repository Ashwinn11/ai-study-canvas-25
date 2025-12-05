'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Lightbulb, Zap, Clock, TrendingUp, ChevronLeft, ChevronRight, ArrowRight, Brain, Hourglass, AlertCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAIN_POINTS = [
  {
    value: 'forget',
    label: 'I forget everything instantly',
    icon: Brain,
  },
  {
    value: 'time',
    label: 'Notes take forever to make',
    icon: Hourglass,
  },
  {
    value: 'overwhelm',
    label: 'Too much content, too little time',
    icon: AlertCircle,
  },
  {
    value: 'start',
    label: "I don't know where to start",
    icon: HelpCircle,
  },
];

const BENEFITS = [
  {
    icon: Lightbulb,
    title: '90% Retention Rate',
    desc: 'Spaced repetition ensures you remember what matters',
  },
  {
    icon: Zap,
    title: '10 Minutes Daily',
    desc: 'Short, focused sessions that actually stick',
  },
  {
    icon: Clock,
    title: 'Smart Scheduling',
    desc: 'We remind you exactly when to review',
  },
  {
    icon: TrendingUp,
    title: 'Track Your Progress',
    desc: 'See your memory improve day by day',
  },
];

const CURRENT_GRADES = [
  { value: 'A', label: 'A+ or A' },
  { value: 'B', label: 'B+ or B' },
  { value: 'C', label: 'C+ or C' },
  { value: 'D', label: 'D or below' },
];

const DAILY_CARDS_OPTIONS = [
  { value: 10, label: '10 cards (Quick)' },
  { value: 20, label: '20 cards (Balanced)' },
  { value: 30, label: '30 cards (Serious)' },
  { value: 45, label: '45+ cards (Intense)' },
];

interface OnboardingScreenProps {
  userId: string;
}

export default function OnboardingScreen({ userId }: OnboardingScreenProps) {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding(userId);

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [painPoint, setPainPoint] = useState<string>('');
  const [currentGrade, setCurrentGrade] = useState<string>('');
  const [dailyCardsGoal, setDailyCardsGoal] = useState<number>(20);
  const [completing, setCompleting] = useState(false);

  // Validation
  const canProceedStep1 = !!painPoint;
  const canProceedStep3 = !!currentGrade && dailyCardsGoal > 0;

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (completing || !canProceedStep3) return;
    setCompleting(true);

    try {
      const success = await completeOnboarding({
        currentGrade: currentGrade || 'B',
        dailyCardsGoal: dailyCardsGoal,
      });

      if (success) {
        router.push('/dashboard');
      } else {
        setCompleting(false);
      }
    } catch (error) {
      console.error('[Onboarding] Error:', error);
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/20 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      {/* Header / Progress */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 relative z-10">
        {currentStep > 1 ? (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* Progress Bar */}
        <div className="flex gap-2 flex-1 mx-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={cn(
                'flex-1 h-1 rounded-full transition-all duration-300',
                step <= currentStep ? 'bg-primary' : 'bg-white/20'
              )}
            />
          ))}
        </div>

        <div className="w-10" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto">
          {/* Step 1: Pain Points */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-300 relative z-10">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-1">
                  Let's be real.
                </h2>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                  Studying is hard.
                </h1>
                <p className="text-lg text-muted-foreground">
                  Tell us what's holding you back. We'll fix it.
                </p>
              </div>

              <div className="space-y-3">
                {PAIN_POINTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      onClick={() => setPainPoint(item.value)}
                      className={cn(
                        'w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
                        painPoint === item.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/5 text-foreground border-white/10 hover:bg-white/10'
                      )}
                    >
                      <Icon className={cn(
                        'w-6 h-6 flex-shrink-0',
                        painPoint === item.value ? 'text-white' : 'text-primary'
                      )} />
                      <span className="font-semibold text-left">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Benefits */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in duration-300 relative z-10">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-1">
                  Here's How
                </h2>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                  You'll Remember Everything.
                </h1>
                <p className="text-lg text-muted-foreground">
                  Ready to make it happen? Let's set your goals.
                </p>
              </div>

              <div className="space-y-3">
                {BENEFITS.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mt-1">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Commitment */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in duration-300 relative z-10">
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-1">
                  Let's Make
                </h2>
                <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
                  A Deal.
                </h1>
                <p className="text-lg text-muted-foreground">
                  You commit to the goal. We handle the rest.
                </p>
              </div>

              {/* Current Grade Selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
                  Current Grade
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENT_GRADES.map((grade) => (
                    <button
                      key={grade.value}
                      onClick={() => setCurrentGrade(grade.value)}
                      className={cn(
                        'p-4 rounded-lg border font-semibold transition-all duration-200',
                        currentGrade === grade.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/5 text-foreground border-white/10 hover:bg-white/10'
                      )}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Commitment Selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block">
                  Daily Commitment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {DAILY_CARDS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDailyCardsGoal(option.value)}
                      className={cn(
                        'p-4 rounded-lg border font-semibold transition-all duration-200 text-center',
                        dailyCardsGoal === option.value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white/5 text-foreground border-white/10 hover:bg-white/10'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-4 sm:px-6 py-6 sm:py-8 bg-white/5 backdrop-blur-sm border-t border-white/10 relative z-10">
        <div className="w-full max-w-2xl mx-auto">
          {currentStep < 3 ? (
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !canProceedStep1) ||
                  (currentStep === 2 && false)
                }
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg',
                  (currentStep === 1 && !canProceedStep1)
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-primary text-white hover:shadow-xl hover:scale-105'
                )}
              >
                <ArrowRight className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceedStep3 || completing}
              className="w-full py-6 sm:py-8 text-lg font-semibold"
            >
              {completing ? 'Setting up...' : 'Start My Transformation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

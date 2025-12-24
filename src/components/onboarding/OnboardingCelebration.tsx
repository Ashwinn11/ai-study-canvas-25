'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Calendar, Target, Upload, Brain, BookOpen, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingCelebrationProps {
  currentGrade: string;
  dailyCardsGoal: number;
  painPoint: 'forget' | 'time' | 'overwhelm' | 'start';
  onCreateDeck: () => void;
}

const PAIN_POINT_LABELS: Record<string, string> = {
  forget: 'Never forget',
  time: 'Save time',
  overwhelm: 'Stay organized',
  start: 'Get started',
};

const NEXT_STEPS = [
  { icon: Upload, text: 'Upload your study material', color: 'text-blue-400' },
  { icon: Sparkles, text: 'AI creates summaries, flashcards & quizzes', color: 'text-purple-400' },
  { icon: BookOpen, text: 'Study with AI-powered tools', color: 'text-green-400' },
  { icon: Trophy, text: 'Watch your grades improve', color: 'text-yellow-400' },
];

export default function OnboardingCelebration({
  currentGrade,
  dailyCardsGoal,
  painPoint,
  onCreateDeck,
}: OnboardingCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Confetti animation
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confetti: Array<{
      x: number;
      y: number;
      r: number;
      d: number;
      color: string;
      tilt: number;
      tiltAngleIncremental: number;
      tiltAngle: number;
    }> = [];

    const colors = ['#b8e0d2', '#95b8d1', '#eac4d5', '#edafb8', '#f7e1d3'];

    for (let i = 0; i < 150; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * 150 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0,
      });
    }

    let animationId: number;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      confetti.forEach((c, i) => {
        ctx.beginPath();
        ctx.lineWidth = c.r / 2;
        ctx.strokeStyle = c.color;
        ctx.moveTo(c.x + c.tilt + c.r / 4, c.y);
        ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r / 4);
        ctx.stroke();

        c.tiltAngle += c.tiltAngleIncremental;
        c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
        c.tilt = Math.sin(c.tiltAngle - i / 3) * 15;

        if (c.y > canvas.height) {
          confetti[i] = {
            ...c,
            x: Math.random() * canvas.width,
            y: -10,
          };
        }
      });

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative z-10 pb-24">
      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.6 }}
      />

      {/* Header */}
      <div className="text-center space-y-2 relative z-10">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
            You're All Set!
          </h1>
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-lg text-muted-foreground">
          Your personalized study plan:
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 space-y-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            Goal: {currentGrade} → A+
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            Daily: {dailyCardsGoal} cards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-lg font-semibold text-foreground">
            Focus: {PAIN_POINT_LABELS[painPoint]}
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="space-y-4 relative z-10">
        <h3 className="font-semibold text-foreground text-center">
          Here's what happens next:
        </h3>

        <div className="space-y-3">
          {NEXT_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
                  {index + 1}
                </div>
                <div className={cn("w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0")}>
                  <Icon className={cn("w-5 h-5", step.color)} />
                </div>
                <p className="text-foreground font-medium flex-1">
                  {step.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievement Badge */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6 text-center space-y-2 relative z-10">
        <Trophy className="w-12 h-12 text-yellow-400 mx-auto" />
        <h3 className="text-xl font-bold text-foreground">
          First Achievement
        </h3>
        <p className="text-sm text-muted-foreground">
          Study Master (Unlocked)
        </p>
      </div>

      {/* CTA Button */}
      <div className="relative z-10">
        <Button
          onClick={onCreateDeck}
          className="w-full py-6 sm:py-8 text-lg font-semibold"
          size="lg"
        >
          Create My First Deck
        </Button>
      </div>
    </div>
  );
}

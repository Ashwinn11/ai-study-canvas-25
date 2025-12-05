
import { Metadata } from 'next';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LottieAnimation } from "@/components/ui/LottieAnimation";
import girlStudyingAnimation from "@/assets/animations/Great_knowledge.json";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Flame, Trophy, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Sign In - Masterly',
  description: 'Sign in to your Masterly account',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden">
      {/* Global Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
         <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
      </div>

      {/* Back Button */}
      <div className="absolute top-6 left-6 z-50">
        <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative z-10 w-full max-w-xl flex flex-col items-center text-center">
          
          {/* Lottie Animation with Glow */}
          <div className="relative mb-12 w-full max-w-lg">
             <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 animate-pulse-slow" />
             <LottieAnimation 
                animationData={girlStudyingAnimation} 
                className="w-full h-auto drop-shadow-2xl relative z-10"
              />
              
              {/* Floating Widgets */}
              <div className="absolute -right-4 top-10 bg-card/40 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl animate-float delay-700 flex items-center gap-3">
                <div className="bg-orange-500/20 p-2 rounded-lg">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground font-medium">Daily Streak</div>
                  <div className="text-sm font-bold text-foreground">12 Days</div>
                </div>
              </div>

              <div className="absolute -left-8 bottom-20 bg-card/40 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl animate-float delay-200 flex items-center gap-3">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-muted-foreground font-medium">Top 1%</div>
                  <div className="text-sm font-bold text-foreground">Achiever</div>
                </div>
              </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              Study less. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Learn more.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Say goodbye to burnout. Masterly turns your overwhelming notes into fun, interactive quizzes and flashcards that actually stick.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8 relative z-20">
         {/* Right Side Background Effects */}
         <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.15] pointer-events-none" />
         <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/10 pointer-events-none" />
        <div className="w-full max-w-md space-y-6">
          {/* Branding Text Above Card */}
          <div className="text-center space-y-4 animate-fade-in-up flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 mb-2">
              <Image 
                src="/brand-assets/icon.png" 
                alt="Masterly Logo" 
                fill 
                className="object-contain" 
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-bold text-primary tracking-tight">Masterly</h2>
              <p className="text-lg text-muted-foreground">Ready to ace your next exam?</p>
            </div>
          </div>

          <div className="bg-card/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 lg:p-10 space-y-8 animate-fade-in-up delay-100">
            
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
              <p className="text-muted-foreground">
                Sign in to continue your learning streak
              </p>
            </div>

            <div className="space-y-6">
              <GoogleSignInButton />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground">
                    Secure access
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-4 hover:text-primary transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline underline-offset-4 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

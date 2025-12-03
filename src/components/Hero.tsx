import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";

import { LottieAnimation } from "@/components/ui/LottieAnimation";
import thinkingAnimation from "@/assets/animations/learning.json";

export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-background pt-20 pb-10 lg:pt-32 lg:pb-20">
      
      {/* Background Pattern (Subtle dots or grid could go here) */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-30 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Column: Text & CTA */}
          <div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0">
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-balance animate-fade-in-up">
              The free, fun, and effective way to <span className="text-duolingo-green">master your studies.</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed text-balance animate-fade-in-up delay-100">
              Ditch the boring textbooks. Masterly turns your notes into bite-sized lessons, quizzes, and flashcards instantly.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up delay-200 justify-center lg:justify-start">
              <Button 
                size="lg" 
                className={cn(
                  "h-14 px-10 rounded-2xl-custom text-lg font-bold uppercase tracking-wide transition-all",
                  "bg-duolingo-green text-white shadow-3d hover:bg-duolingo-green/90 active:translate-y-[4px] active:shadow-none"
                )}
                asChild
              >
                <a href="/login">
                  Get Started
                </a>
              </Button>
              
              <a
                href="https://apps.apple.com/app/masterly-ai-flashcards-quiz/id6753760295"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:scale-105 transition-transform duration-300"
              >
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download on the App Store"
                  className="h-14"
                />
              </a>
            </div>
          </div>

          {/* Right Column: Hero Image (Mascot) */}
          <div className="flex-1 w-full max-w-lg lg:max-w-xl relative animate-bounce-in delay-300">
            <div className="relative aspect-square flex items-center justify-center">
              {/* Main Mascot Placeholder */}
              <LottieAnimation 
                animationData={thinkingAnimation} 
                className="w-full h-full drop-shadow-2xl animate-float"
              />
              
              {/* Floating Elements (Decorations) */}
              <div className="absolute top-10 right-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl-custom shadow-card transform rotate-6 animate-pulse-slow hidden md:block">
                <span className="text-4xl">🅰️+</span>
              </div>
              <div className="absolute bottom-10 left-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl-custom shadow-card transform -rotate-6 animate-pulse-slow delay-700 hidden md:block">
                 <Flame className="w-10 h-10 text-orange-500" />
               </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import heroImage from "@/assets/hero-study-ai.jpg";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden content-layer">
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-left space-y-8 animate-fade-in-up">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white drop-shadow-lg">
              Your Personal{" "}
              <span className="text-secondary drop-shadow-md">AI Study Coach</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl drop-shadow-md">
              Transform any study material into Feynman-style summaries, adaptive quizzes, 
              SM2-based flashcards, and exam readiness analytics. Study smarter, not harder.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <a 
                href="https://apps.apple.com/app/idXXXXXXXXX" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button variant="hero" size="lg" className="group">
                  <Download className="mr-2 h-5 w-5" />
                  Download on App Store
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
              
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-base font-medium text-white hover:text-white/80 transition-colors underline-offset-4 hover:underline drop-shadow-md"
              >
                See How It Works
              </button>
            </div>

            <div className="flex gap-6 items-center pt-4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary drop-shadow-md">10K+</div>
                <div className="text-sm text-white/80">Active Learners</div>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent drop-shadow-md">98%</div>
                <div className="text-sm text-white/80">Success Rate</div>
              </div>
              <div className="h-12 w-px bg-white/30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary drop-shadow-md">50K+</div>
                <div className="text-sm text-white/80">Hours Saved</div>
              </div>
            </div>
          </div>

          {/* Right content - Hero image */}
          <div className="relative animate-slide-in-right">
            <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-3xl p-4 border border-white/20">
              <img 
                src={heroImage} 
                alt="AI-powered study platform showing flashcard generation from uploaded documents"
                className="rounded-2xl shadow-elevated w-full"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-72 h-72 bg-secondary/30 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-accent/30 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

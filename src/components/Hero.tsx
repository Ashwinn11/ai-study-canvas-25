
import heroImage from "@/assets/hero-study-ai.jpg";
import { WaveBackground } from "@/components/ui/WaveBackground";

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden content-layer">
      <WaveBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-left space-y-8 animate-fade-in-up">

            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white drop-shadow-lg">
              Stop Cramming.{" "}
              <span className="text-secondary drop-shadow-md">Start Mastering.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/90 leading-relaxed max-w-2xl drop-shadow-md">
              Finally understand complex topics, remember everything without stress, and walk into any exam with confidence. 
              Your AI coach creates smart flashcards and adaptive quizzes that work together with spaced repetition.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <a
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-[#ff7664] to-[#ff8874] rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md"
              >
                Get Started Free
              </a>

              <a
                href="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-full hover:bg-white/20 hover:scale-105 transition-all duration-200"
              >
                Sign In
              </a>
            </div>

            <p className="text-sm text-white/70 drop-shadow-md">
              Also available on{' '}
              <a
                href="https://apps.apple.com/app/masterly-ai-flashcards-quiz/id6753760295"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white/90 transition-colors"
              >
                iOS App Store
              </a>
            </p>

            <div className="flex gap-6 items-center pt-4 bg-primary/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary drop-shadow-md">10K+</div>
                <div className="text-sm text-white/80">Active Learners</div>
              </div>
              <div className="h-12 w-px bg-primary/30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent drop-shadow-md">98%</div>
                <div className="text-sm text-white/80">Accuracy Rate</div>
              </div>
              <div className="h-12 w-px bg-primary/30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary drop-shadow-md">50K+</div>
                <div className="text-sm text-white/80">Hours Saved</div>
              </div>
            </div>
          </div>

          {/* Right content - Hero image */}
          <div className="relative animate-slide-in-right">
            <div className="relative z-10 bg-primary/10 backdrop-blur-md rounded-3xl p-4 border border-white/20">
              <img 
                src={heroImage.src} 
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

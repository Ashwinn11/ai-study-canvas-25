import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Brain, FolderKanban, Target, ShieldCheck, Sparkles, Zap } from "lucide-react";
import uploadFeature from "@/assets/upload-feature.jpg";
import aiEngine from "@/assets/ai-engine.jpg";
import examWorkspace from "@/assets/exam-workspace.jpg";
import masteryLoop from "@/assets/mastery-loop.jpg";
import { WaveBackground } from "@/components/ui/WaveBackground";

const features = [
  {
    icon: Upload,
    title: "Upload Anything, Master Everything",
    description: "Transform any study material into personalized learning",
    details: "Documents, images, audio, YouTube links - in any language. Our AI extracts key concepts and creates the perfect study system just for you.",
    image: uploadFeature,
    gradient: "from-primary to-orange-400",
    badge: "Multi-format",
    stats: "10+ formats supported"
  },
  {
    icon: Brain,
    title: "Feynman AI Tutor",
    description: "Learn like you're teaching it to someone else",
    details: "Our AI breaks down complex topics using the Feynman technique, then creates smart flashcards for recall and Bloom's taxonomy quizzes for deep understanding.",
    image: aiEngine,
    gradient: "from-accent to-blue-500",
    badge: "AI-powered",
    stats: "98% accuracy rate"
  },
  {
    icon: FolderKanban,
    title: "Exam Command Center",
    description: "Your mission control for every test",
    details: "Dedicated workspaces for SAT, ACT, AP, or any exam. Track progress, set deadlines, and see exactly what to study each day. No more guessing.",
    image: examWorkspace,
    gradient: "from-secondary to-purple-500",
    badge: "Organized",
    stats: "Unlimited exams"
  },
  {
    icon: Target,
    title: "SM2 Spaced Repetition",
    description: "Science-backed memory that actually lasts",
    details: "The proven SM2 algorithm schedules your reviews at the perfect moment. Adaptively adjusts based on your performance for maximum retention.",
    image: masteryLoop,
    gradient: "from-success to-green-500",
    badge: "Scientific",
    stats: "50K+ hours saved"
  },
  {
    icon: ShieldCheck,
    title: "Quality-Validated Content",
    description: "Every flashcard and quiz is accuracy-checked",
    details: "Rigorous AI validation ensures your study materials are reliable. Study with confidence knowing everything is fact-checked and optimized.",
    image: uploadFeature,
    gradient: "from-primary to-red-400",
    badge: "Verified",
    stats: "99.9% accuracy"
  },
  {
    icon: Sparkles,
    title: "Adaptive Learning Engine",
    description: "Gets smarter as you learn",
    details: "Tracks your learning patterns and adjusts difficulty automatically. Focus on weak spots, master strengths, and optimize your study time.",
    image: aiEngine,
    gradient: "from-accent to-indigo-500",
    badge: "Smart",
    stats: "Personalized for you"
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-20 lg:py-32 content-layer relative">
      <WaveBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6 border border-white/20">
            <Zap className="h-4 w-4 text-secondary" />
            <span className="text-sm font-medium text-white">AI-Powered Learning System</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            From <span className="text-white">Overwhelmed</span> to{" "}
            <span className="text-secondary">Exam-Ready</span>
          </h2>
          <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
            Stop cramming and start mastering. Our AI creates the perfect study system that adapts to how you learn best.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group relative overflow-hidden border-0 bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-500 animate-scale-in hover:shadow-[0_20px_40px_rgba(255,118,100,0.3)] hover:-translate-y-2"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Gradient border effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500`} />
              
              {/* Card content */}
              <div className="relative z-10 p-6 lg:p-8">
                {/* Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${feature.gradient} text-white text-xs font-medium`}>
                    <Sparkles className="h-3 w-3" />
                    {feature.badge}
                  </div>
                  <div className="text-xs text-white/70 font-medium">
                    {feature.stats}
                  </div>
                </div>

                {/* Image with overlay */}
                <div className="mb-6 relative h-40 lg:h-48 overflow-hidden rounded-xl">
                  <img 
                    src={feature.image.src} 
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${feature.gradient} opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
                </div>

                {/* Icon with gradient background */}
                <div className={`mb-4 inline-flex p-3 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>

                {/* Content */}
                <CardTitle className="text-xl lg:text-2xl font-bold text-white mb-3 group-hover:text-white/90 transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-white/80 text-base mb-4 leading-relaxed">
                  {feature.description}
                </CardDescription>
                
                {/* Expandable details */}
                <div className="space-y-3">
                  <div className="h-px bg-white/20" />
                  <p className="text-sm text-white/70 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                    {feature.details}
                  </p>
                </div>

                {/* Hover indicator */}
                <div className="mt-4 flex items-center gap-2 text-white/60 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Learn more</span>
                  <Zap className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 text-center animate-fade-in" style={{ animationDelay: '900ms' }}>
          <div className="inline-flex flex-col items-center gap-4 p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">10K+</div>
                <div className="text-sm text-white/80">Students Learning</div>
              </div>
              <div className="h-12 w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent">4.9★</div>
                <div className="text-sm text-white/80">App Rating</div>
              </div>
              <div className="h-12 w-px bg-white/20"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-secondary">50K+</div>
                <div className="text-sm text-white/80">Hours Saved</div>
              </div>
            </div>
            <button
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-4 px-8 py-3 bg-gradient-to-r from-secondary to-accent text-white font-semibold rounded-full hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              Start Your Free Trial
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Brain, FolderKanban, Target, ShieldCheck } from "lucide-react";
import uploadFeature from "@/assets/upload-feature.jpg";
import aiEngine from "@/assets/ai-engine.jpg";
import examWorkspace from "@/assets/exam-workspace.jpg";
import masteryLoop from "@/assets/mastery-loop.jpg";
import { BlobBackground } from "@/components/ui/BlobBackground";

const features = [
  {
    icon: Upload,
    title: "Upload Anything",
    description: "Documents, images, audio, and YouTube links in any language",
    details: "Seamlessly import study materials from multiple sources. Our AI processes PDFs, images, MP3s, and even YouTube videos to extract key learning points.",
    image: uploadFeature,
    color: "text-primary",
  },
  {
    icon: Brain,
    title: "AI Learning Engine",
    description: "Automatic creation of simplified study guides, flashcards, and quizzes",
    details: "Powered by advanced AI that creates Feynman-style summaries, validates outputs for accuracy, and adapts to your learning style.",
    image: aiEngine,
    color: "text-accent",
  },
  {
    icon: FolderKanban,
    title: "Exam Workspaces",
    description: "Group study packs by exam with due dates and progress tracking",
    details: "Organize materials by exam type (SAT, ACT, AP), set deadlines, track progress with visual dashboards, and countdown to exam day.",
    image: examWorkspace,
    color: "text-secondary",
  },
  {
    icon: Target,
    title: "Daily Mastery Loop",
    description: "SM2 spaced repetition, adaptive quizzes, and personalized report cards",
    details: "Scientific SM2 algorithm schedules reviews at optimal intervals. Get daily quiz drills, smart reminders, and detailed analytics on your mastery.",
    image: masteryLoop,
    color: "text-success",
  },
  {
    icon: ShieldCheck,
    title: "Always Works™ Accuracy",
    description: "AI output validation, reminder checks, and reliability guarantees",
    details: "Every AI-generated card, quiz, and summary goes through multiple validation checks. We guarantee accuracy so you can study with confidence.",
    image: uploadFeature,
    color: "text-primary",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 lg:py-32 content-layer relative">
      <BlobBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything You Need to <span className="text-white">Master Any Exam</span>
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Intelligent features that work together to transform how you study
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="group hover:shadow-elevated transition-all duration-300 border-2 hover:border-primary/20 animate-scale-in overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="mb-4 relative h-48 overflow-hidden rounded-lg">
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className={`${feature.color} mb-2`}>
                  <feature.icon className="h-10 w-10" />
                </div>
                <CardTitle className="text-2xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/70 leading-relaxed">
                  {feature.details}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

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
    title: "Upload Anything, Understand Everything",
    description: "Transform your study materials into clear, memorable insights",
    details: "Upload documents, images, audio, or YouTube links in any language. Our AI extracts key concepts and creates flashcards and quizzes you'll actually understand and remember.",
    image: uploadFeature,
    color: "text-primary",
  },
  {
    icon: Brain,
    title: "AI That Creates Smart Practice",
    description: "Personalized flashcards and quizzes that work together",
    details: "Our AI creates Feynman-style summaries, then generates both flashcards for recall and quizzes for application. They work together with spaced repetition for maximum retention.",
    image: aiEngine,
    color: "text-accent",
  },
  {
    icon: FolderKanban,
    title: "Exam Workspaces That Keep You Organized",
    description: "Separate spaces for each exam with smart tracking",
    details: "Create dedicated workspaces for SAT, ACT, AP, or any exam. Set deadlines, track progress, and see exactly what you need to study each day with your flashcards and quizzes.",
    image: examWorkspace,
    color: "text-secondary",
  },
  {
    icon: Target,
    title: "Daily Practice That Sticks",
    description: "SM2 spaced repetition for flashcards and quizzes",
    details: "Scientifically-proven scheduling optimizes when you see each flashcard and quiz question. The system adapts based on your performance for maximum memory retention.",
    image: masteryLoop,
    color: "text-success",
  },
  {
    icon: ShieldCheck,
    title: "Always Works™ Accuracy You Can Trust",
    description: "AI-validated flashcards and quizzes for reliable studying",
    details: "Every flashcard, quiz, and summary goes through rigorous validation. Study with confidence knowing your practice materials are accurate and trustworthy.",
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
            From Overwhelmed to{" "}
            <span className="text-white">Exam-Ready</span>
          </h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Turn study stress into confidence with AI-powered tools that understand exactly how you learn best
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

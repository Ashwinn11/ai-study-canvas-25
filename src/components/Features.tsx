import { cn } from "@/lib/utils";
import { Brain, FileText, LineChart, Mic, Upload } from "lucide-react";
import { LottieAnimation } from "@/components/ui/LottieAnimation";
import booksAnimation from "@/assets/animations/Books-stack.json";
import finishingStudiesAnimation from "@/assets/animations/finish_study.json";
import quizAnimation from "@/assets/animations/quiz.json";
import thinkingAnimation from "@/assets/animations/thinking.json";
import examAnimation from "@/assets/animations/exam.json";

const FeatureRow = ({ 
  title, 
  description, 
  animationData,
  icon: Icon, 
  imageSide = "right",
  className,
  bgColor = "bg-background"
}: {
  title: string;
  description: string;
  animationData: unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  imageSide?: "left" | "right";
  className?: string;
  bgColor?: string;
}) => {
  return (
    <div className={cn("py-20 md:py-32 group overflow-hidden", bgColor, className)}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "flex flex-col gap-12 md:gap-24 items-center",
          imageSide === "left" ? "md:flex-row-reverse" : "md:flex-row"
        )}>
          {/* Text Content */}
          <div className="flex-1 text-center md:text-left space-y-8 animate-fade-in-up [animation-timeline:view()] [animation-range:entry_20%_cover_30%]">
            <div className="inline-flex p-4 rounded-2xl-custom bg-white/10 backdrop-blur-sm border-2 border-white/20 shadow-sm mb-2 transform transition-transform duration-500 hover:scale-110 hover:rotate-6">
              <Icon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
              {title}
            </h3>
            <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0 font-medium">
              {description}
            </p>
          </div>

          {/* Animation Content */}
          <div className="flex-1 w-full max-w-md md:max-w-none animate-bounce-in [animation-timeline:view()] [animation-range:entry_20%_cover_40%]">
            <div className="relative aspect-square md:aspect-[4/3] w-full flex items-center justify-center">
              <LottieAnimation 
                animationData={animationData} 
                className="w-full h-full drop-shadow-2xl hover:scale-105 transition-transform duration-500 hover:rotate-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Features = () => {
  return (
    <section className="bg-background relative" id="features">
      <div className="space-y-0">
        <FeatureRow
          title="Everything you need, in one place."
          description="Upload PDFs, images, record lectures, or paste YouTube links. We handle it all."
          icon={Upload}
          animationData={booksAnimation}
          imageSide="right"
          bgColor="bg-transparent"
        />

        <FeatureRow
          title="Notes that write themselves."
          description="AI turns your chaos into structured, easy-to-read study guides instantly."
          icon={FileText}
          animationData={finishingStudiesAnimation}
          imageSide="left"
          bgColor="bg-white/5"
        />

        <FeatureRow
          title="Study like a scientist."
          description="Generate Flashcards & Quizzes instantly. Master topics with Spaced Repetition."
          icon={Brain}
          animationData={quizAnimation}
          imageSide="right"
          bgColor="bg-transparent"
        />

        <FeatureRow
          title="A personal tutor in your pocket."
          description="Stuck on a concept? Chat with your personal AI tutor 24/7."
          icon={Mic}
          animationData={thinkingAnimation}
          imageSide="left"
          bgColor="bg-white/5"
        />

        <FeatureRow
          title="Watch your grades soar."
          description="Daily exam practice & detailed report cards to track your success."
          icon={LineChart}
          animationData={examAnimation}
          imageSide="right"
          bgColor="bg-transparent"
        />
      </div>
    </section>
  );
};

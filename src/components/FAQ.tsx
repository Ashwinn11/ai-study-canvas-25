import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Download, Users } from "lucide-react";
import { WaveBackground } from "@/components/ui/WaveBackground";

const faqs = [
  {
    question: "What types of files can I upload?",
    answer: "Masterly supports documents (PDF, Word, PowerPoint), images (JPG, PNG), audio files (MP3, M4A), and video files. You can upload materials in any language, and our AI will process them into study-ready content.",
  },
  {
    question: "How accurate are the AI-generated study materials?",
    answer: "We use our Always Works™ validation system, which includes multiple AI accuracy checks, content verification, and user feedback loops. Every flashcard, quiz, and summary goes through rigorous validation before reaching you. We maintain a 98% accuracy rate.",
  },
  {
    question: "How does the spaced repetition scheduling work?",
    answer: "We use the proven SM2 algorithm, which schedules flashcard reviews at scientifically optimal intervals based on your performance. Cards you struggle with appear more frequently, while mastered cards are reviewed just before you'd forget them - maximizing retention while minimizing study time.",
  },
  {
    question: "Is my study data secure and private?",
    answer: "Absolutely. All your uploads and study data are encrypted end-to-end. We never share your personal information or study materials with third parties. Your data is stored securely on enterprise-grade servers and you can delete it anytime from your account settings.",
  },
  {
    question: "Can I use Masterly for multiple exams at once?",
    answer: "Yes! Exam Workspaces let you organize study materials by exam type (SAT, ACT, AP, etc.). Each workspace has its own progress tracking, due dates, and countdown timers. You can switch between workspaces seamlessly and study for multiple exams simultaneously.",
  },
  {
    question: "What happens after my free trial ends?",
    answer: "After your 1-week free trial (available on monthly and yearly plans), your subscription will automatically renew through the App Store unless you cancel. You can cancel anytime from your App Store subscription settings with no penalties.",
  },
];

export const FAQ = () => {
  return (
    <section id="faq" className="py-20 lg:py-32 content-layer relative">
      <WaveBackground position="bottom" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Your Questions,{" "}
            <span className="text-white">Answered</span>
          </h2>
          <p className="text-lg text-foreground/70">
            Get the clarity you need to start your transformation journey
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4 mb-16">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-background rounded-lg px-6 border-2 hover:border-primary/20 transition-colors"
            >
              <AccordionTrigger className="text-left text-lg font-semibold hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-foreground/70 leading-relaxed pt-2">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Secondary CTA */}
        <div className="bg-dark-surface rounded-2xl p-8 md:p-12 text-center text-white shadow-elevated animate-scale-in">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Study Game?
          </h3>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join 10,000+ students who are studying smarter with AI-powered learning
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="default"
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              asChild
            >
              <a href="https://apps.apple.com/app/masterly-ai-flashcards-quiz/id6753760295" target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-5 w-5" />
                Download on App Store
              </a>
            </Button>
            
            <button
              onClick={() => window.open('https://discord.gg/masterly', '_blank')}
              className="text-base font-medium text-white hover:text-white/80 transition-colors underline-offset-4 hover:underline flex items-center gap-2"
            >
              <Users className="h-5 w-5" />
              Join the Study Community
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

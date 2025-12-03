import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const reviews = [
  {
    name: "Sarah M.",
    role: "Pre-med Student",
    content: "I finally feel in control of my studies. The AI flashcards save me hours every week.",
    stars: 5,
    color: "bg-duolingo-green",
  },
  {
    name: "Michael R.",
    role: "Engineering Major",
    content: "My grades went up from B's to A's in just one semester. The spaced repetition really works.",
    stars: 5,
    color: "bg-duolingo-macaw",
  },
  {
    name: "Jessica L.",
    role: "Law Student",
    content: "Better than Quizlet. The AI understands my complex legal notes perfectly.",
    stars: 5,
    color: "bg-duolingo-bee",
  },
  {
    name: "Alex K.",
    role: "High School Senior",
    content: "Used this for my AP exams and got 5s on all of them. Highly recommend!",
    stars: 5,
    color: "bg-duolingo-fox",
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 bg-muted/50 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance tracking-tight">
            Loved by Students Everywhere
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of students who are crushing their exams with Masterly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reviews.map((review, i) => (
            <div 
              key={i} 
              className="p-8 rounded-2xl-custom bg-white/5 backdrop-blur-sm border-2 border-white/10 shadow-card hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl", review.color)}>
                  {review.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-foreground">{review.name}</div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{review.role}</div>
                </div>
              </div>
              
              <div className="flex gap-1 mb-4">
                {[...Array(review.stars)].map((_, j) => (
                  <Star key={j} className="h-5 w-5 fill-duolingo-bee text-duolingo-bee" />
                ))}
              </div>
              
              <p className="text-foreground/80 leading-relaxed font-medium">
                "{review.content}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "SAT Prep Student",
    avatar: "SC",
    content: "Masterly helped me improve my SAT score by 200 points! The spaced repetition flashcards made memorizing vocab so much easier.",
    rating: 5,
  },
  {
    name: "Marcus Williams",
    role: "AP Biology Student",
    avatar: "MW",
    content: "The AI summaries are incredible. What used to take me hours to review now takes 20 minutes. Game changer for exam season.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "College Freshman",
    avatar: "ER",
    content: "I love how I can upload lecture recordings and get instant study guides. The adaptive quizzes really test my understanding.",
    rating: 5,
  },
  {
    name: "James Park",
    role: "ACT Test Taker",
    avatar: "JP",
    content: "The exam workspaces keep me organized. I can see exactly where I am with each subject and what I need to focus on.",
    rating: 5,
  },
  {
    name: "Olivia Thompson",
    role: "Medical Student",
    avatar: "OT",
    content: "Always Works™ accuracy is no joke. The AI validation catches mistakes before they make it into my study cards. Lifesaver!",
    rating: 5,
  },
  {
    name: "David Kim",
    role: "High School Senior",
    avatar: "DK",
    content: "Went from struggling with retention to acing my finals. The daily mastery loop keeps me consistent without burning out.",
    rating: 5,
  },
];

const examLogos = [
  { name: "SAT", abbr: "SAT" },
  { name: "ACT", abbr: "ACT" },
  { name: "AP Exams", abbr: "AP" },
  { name: "MCAT", abbr: "MCAT" },
  { name: "GRE", abbr: "GRE" },
];

export const Testimonials = () => {
  return (
    <section className="py-20 lg:py-32 bg-white/90 backdrop-blur-sm content-layer">
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Loved by <span className="text-gradient-primary">10,000+ Students</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how Masterly is helping students ace their exams and save hundreds of study hours
          </p>
        </div>

        {/* Testimonial Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.name}
              className="hover:shadow-medium transition-shadow animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="pt-6">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm mb-6 leading-relaxed text-foreground/90">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-gradient-primary">
                    <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                      {testimonial.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Exam Trust Badges */}
        <div className="text-center animate-fade-in">
          <p className="text-sm text-muted-foreground mb-6 font-medium">
            Trusted for exam preparation
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {examLogos.map((exam) => (
              <div
                key={exam.abbr}
                className="px-6 py-3 bg-muted/50 rounded-lg font-bold text-lg text-foreground/70 hover:text-foreground transition-colors"
              >
                {exam.abbr}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Weekly Plan",
    price: "$7.99",
    period: "per week",
    description: "Perfect for short-term exam prep",
    features: [
      "Unlimited uploads",
      "AI study guides & flashcards",
      "Adaptive quizzes",
      "Basic analytics",
    ],
    cta: "Start Weekly",
    highlight: false,
    trial: null,
  },
  {
    name: "Monthly Plan",
    price: "$12.99",
    period: "per month",
    description: "Most popular for semester prep",
    features: [
      "Everything in Weekly",
      "Exam workspaces",
      "Progress tracking",
      "Advanced analytics",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlight: true,
    trial: "1-week free trial",
    badge: "Most Popular",
  },
  {
    name: "Yearly Plan",
    price: "$79.99",
    period: "per year",
    description: "Best value - save over 50%",
    features: [
      "Everything in Monthly",
      "Unlimited exam workspaces",
      "Personalized AI coaching",
      "Export study materials",
      "Early access to features",
    ],
    cta: "Start Free Trial",
    highlight: false,
    trial: "1-week free trial",
    badge: "Best Value",
    savings: "Save $76 annually",
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-20 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, <span className="text-gradient-primary">Transparent Pricing</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your study schedule. All plans include our core AI features.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`relative animate-scale-in ${
                plan.highlight
                  ? "border-primary shadow-elevated scale-105 md:scale-110"
                  : "hover:shadow-medium transition-shadow"
              }`}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {plan.badge && (
                <Badge 
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
                    plan.badge === "Best Value" ? "bg-success" : "bg-primary"
                  }`}
                >
                  {plan.badge}
                </Badge>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-gradient-primary">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                {plan.trial && (
                  <p className="text-sm font-medium text-accent mt-2">{plan.trial}</p>
                )}
                {plan.savings && (
                  <p className="text-sm font-semibold text-success mt-1">{plan.savings}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.highlight ? "hero" : "default"}
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <a href="https://apps.apple.com/app/idXXXXXXXXX" target="_blank" rel="noopener noreferrer">
                    {plan.cta}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-12 max-w-2xl mx-auto">
          All plans are billed through the App Store. Cancel anytime. Free trials available for monthly and yearly plans.
        </p>
      </div>
    </section>
  );
};

'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedLinks } from '@/components/seo/RelatedLinks';
import { StructuredData, schemas } from '@/components/seo/StructuredData';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { Footer } from '@/components/Footer';
import {
  ArrowRight,
  Brain,
  Clock,
  TrendingUp,
  Calendar,
  Lightbulb,
  Target,
  Repeat,
  BarChart3,
} from 'lucide-react';

const breadcrumbs = [
  { name: 'Home', href: '/' },
  { name: 'Spaced Repetition', href: '/spaced-repetition' },
];

const faqs = [
  {
    question: 'What is spaced repetition?',
    answer: 'Spaced repetition is a learning technique that involves reviewing information at increasing intervals. Masterly AI uses this to schedule your flashcard reviews optimally and provides daily exam reports with grades to track your progress.',
  },
  {
    question: 'How does spaced repetition work in Masterly AI?',
    answer: 'When you study with Masterly AI, our algorithm schedules reviews at optimal intervals. You can organize your flashcards into exams and get daily reports showing your progress with grades. The system adapts to how well you know each card.',
  },
  {
    question: 'Is spaced repetition scientifically proven?',
    answer: 'Yes! Dozens of peer-reviewed studies show that spaced repetition can improve long-term retention by 200-300% compared to traditional studying. Masterly AI implements these proven algorithms and adds daily progress tracking.',
  },
  {
    question: 'How long until I see results?',
    answer: 'Most students notice improved recall within 1-2 weeks of consistent use. With Masterly AI\'s daily exam reports, you can track your progress from day one. Try 3 free uploads to get started on iOS or Web.',
  },
];

const relatedLinks = [
  { href: '/ai-flashcard-maker', label: 'AI Flashcard Maker', description: 'Create cards automatically' },
  { href: '/anki-alternative', label: 'Anki Alternative', description: 'Better SRS implementation' },
  { href: '/pdf-to-flashcards', label: 'PDF to Flashcards', description: 'Convert study materials' },
];

const benefits = [
  {
    icon: Brain,
    title: 'Better Long-Term Memory',
    description: 'Retain information for months or years, not just until the exam',
  },
  {
    icon: Clock,
    title: 'Study Less, Learn More',
    description: 'Spend less time reviewing by focusing on what you are about to forget',
  },
  {
    icon: TrendingUp,
    title: 'Continuous Improvement',
    description: 'Your retention improves with each review cycle',
  },
  {
    icon: Target,
    title: 'Personalized Schedule',
    description: 'AI adapts to YOUR learning pace, not a one-size-fits-all approach',
  },
];

const howItWorks = [
  {
    step: 1,
    title: 'Learn New Material',
    description: 'Study new flashcards and concepts for the first time',
    icon: Lightbulb,
  },
  {
    step: 2,
    title: 'Initial Review',
    description: 'Review the material shortly after learning (same day or next day)',
    icon: Repeat,
  },
  {
    step: 3,
    title: 'Expanding Intervals',
    description: 'Each successful review extends the time until your next review',
    icon: Calendar,
  },
  {
    step: 4,
    title: 'Long-Term Retention',
    description: 'Eventually review only once a month or even less frequently',
    icon: BarChart3,
  },
];

export default function SpacedRepetitionPage() {
  return (
    <>
      <StructuredData
        data={[
          schemas.article({
            title: 'Spaced Repetition: The Science of Effective Learning',
            description: 'Learn how spaced repetition works and why it is the most effective way to memorize information long-term.',
            url: '/spaced-repetition',
          }),
          schemas.faqPage(faqs),
          schemas.howTo({
            title: 'How to Use Spaced Repetition',
            description: 'A step-by-step guide to implementing spaced repetition in your study routine',
            steps: howItWorks.map(step => ({
              name: step.title,
              text: step.description,
            })),
          }),
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
          <BlobBackground position="top" color="#ec4899" animate={true} />
          
          <div className="container mx-auto px-4 relative z-10">
            <Breadcrumbs items={breadcrumbs} className="mb-8 text-gray-400" />
            
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-500 text-sm font-medium mb-6">
                <Brain className="h-4 w-4" />
                Science-Backed Learning
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                <span className="text-pink-500">Spaced Repetition</span>
                <span className="block mt-2">The Science of Never Forgetting</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Learn how spaced repetition can help you remember things 2-3x longer. 
                Masterly AI uses proven SRS algorithms to optimize your study schedule automatically.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-pink-600 hover:bg-pink-700" asChild>
                  <Link href="/login">
                    Try Spaced Repetition <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* What is Spaced Repetition */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
                What is Spaced Repetition?
              </h2>
              
              <div className="prose prose-lg max-w-none text-muted-foreground">
                <p className="text-lg leading-relaxed mb-6">
                  Spaced repetition is a learning technique that leverages the psychological <strong className="text-foreground">spacing effect</strong> - 
                  the finding that our brains learn more effectively when we space out our study sessions over time, 
                  rather than cramming all at once.
                </p>
                
                <p className="text-lg leading-relaxed mb-6">
                  The technique was first described by psychologist Hermann Ebbinghaus in the 1880s when he 
                  discovered the <strong className="text-foreground">&quot;forgetting curve&quot;</strong> - showing how quickly we forget 
                  information without review: approximately 50% within an hour, and over 70% within 24 hours.
                </p>
                
                <p className="text-lg leading-relaxed">
                  By reviewing information at <strong className="text-foreground">strategically timed intervals</strong> - just before 
                  you&apos;re about to forget it - you can dramatically improve long-term retention while actually 
                  studying less overall.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How Spaced Repetition Works
              </h2>
              <p className="text-xl text-muted-foreground">
                A simple algorithm for perfect memory
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {howItWorks.map((item) => (
                <div
                  key={item.step}
                  className="p-6 rounded-2xl bg-background border border-border text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-pink-500" />
                  </div>
                  <div className="text-sm font-medium text-pink-500 mb-2">
                    Step {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Benefits of Spaced Repetition
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border hover:border-pink-500/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-pink-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The Science */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
                The Science Behind Spaced Repetition
              </h2>
              
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-background border border-border">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    📊 Research Findings
                  </h3>
                  <p className="text-muted-foreground">
                    Studies show that spaced repetition can improve long-term retention by <strong className="text-foreground">200-300%</strong> compared 
                    to traditional studying methods like re-reading or highlighting.
                  </p>
                </div>
                
                <div className="p-6 rounded-xl bg-background border border-border">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    🧠 How Your Brain Learns
                  </h3>
                  <p className="text-muted-foreground">
                    Each time you successfully recall information, you strengthen the neural pathways associated 
                    with that memory. Spaced reviews at optimal intervals maximize this strengthening effect.
                  </p>
                </div>
                
                <div className="p-6 rounded-xl bg-background border border-border">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    ⏰ The Optimal Schedule
                  </h3>
                  <p className="text-muted-foreground">
                    Masterly AI uses algorithms based on the SM-2 system to calculate perfect review intervals. 
                    Your schedule adapts to how well you know each flashcard individually.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Spaced Repetition FAQ
              </h2>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related Links */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <RelatedLinks
              links={relatedLinks}
              title="Start Using Spaced Repetition"
              variant="card"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 bg-pink-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Never Forget Again?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Try Masterly AI&apos;s spaced repetition system free.
              </p>
              <Button size="lg" className="h-14 px-8 text-lg bg-pink-600 hover:bg-pink-700" asChild>
                <Link href="/login">
                  Start Free Today
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}

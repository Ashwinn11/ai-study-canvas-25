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
  Check,
  X,
  Sparkles,
  Ban,
  Brain,
  Upload,
  Repeat,
  Crown,
} from 'lucide-react';

const breadcrumbs = [
  { name: 'Home', href: '/' },
  { name: 'Quizlet Alternative', href: '/quizlet-alternative' },
];

const faqs = [
  {
    question: 'Why is Masterly AI better than Quizlet?',
    answer: 'Masterly AI offers AI-powered flashcard, summary, and quiz generation (no extra charge), true spaced repetition algorithms with daily progress reports, no distracting ads, and exam organization features. Try 3 uploads free, then subscribe for unlimited access on iOS and Web.',
  },
  {
    question: 'Is Masterly AI free like Quizlet used to be?',
    answer: 'Masterly AI offers 3 free uploads to try the platform. After that, subscribe to one of our three-tier plans for unlimited uploads. Unlike Quizlet, we don\'t lock essential study features behind paywalls or show disruptive ads.',
  },
  {
    question: 'Does Masterly have spaced repetition like Quizlet?',
    answer: 'Masterly has BETTER spaced repetition than Quizlet. Quizlet Learn uses a simplified algorithm, while Masterly uses proven SM-2 based algorithms for optimal memory retention. Plus, you get daily exam reports with grades.',
  },
  {
    question: 'Can I create quizzes like on Quizlet?',
    answer: 'Absolutely! Masterly AI automatically generates both flashcards AND quizzes from your study materials (PDFs, images, audio, video, YouTube links, or text). Our AI creates questions tailored to your content.',
  },
];

const relatedLinks = [
  { href: '/anki-alternative', label: 'Anki Alternative', description: 'Compare with Anki' },
  { href: '/ai-flashcard-maker', label: 'AI Flashcard Maker', description: 'Generate cards with AI' },
  { href: '/pdf-to-flashcards', label: 'PDF to Flashcards', description: 'Convert your PDFs' },
];

const comparisonData = [
  { feature: 'AI Flashcard Generation', masterly: 'Free', quizlet: 'Paid Only' },
  { feature: 'True Spaced Repetition', masterly: true, quizlet: false },
  { feature: 'No Ads', masterly: true, quizlet: false },
  { feature: 'Upload PDFs', masterly: true, quizlet: 'Limited' },
  { feature: 'Quiz Generation', masterly: true, quizlet: true },
  { feature: 'Mobile App', masterly: true, quizlet: true },
  { feature: 'Offline Mode', masterly: true, quizlet: 'Paid Only' },
  { feature: 'Study Analytics', masterly: true, quizlet: true },
];

const advantages = [
  {
    icon: Ban,
    title: 'No Distracting Ads',
    description: 'Focus on studying, not closing pop-ups. We respect your attention.',
  },
  {
    icon: Brain,
    title: 'Real Spaced Repetition',
    description: 'Scientifically-proven SRS algorithms, not simplified Learn mode.',
  },
  {
    icon: Sparkles,
    title: 'Free AI Features',
    description: 'AI flashcard creation included free. No Quizlet Plus required.',
  },
  {
    icon: Upload,
    title: 'Upload Anything',
    description: 'PDFs, images, audio, video - way more than just text and images.',
  },
];

export default function QuizletAlternativePage() {
  return (
    <>
      <StructuredData
        data={[
          schemas.product({
            name: 'Masterly AI - Quizlet Alternative',
            description: 'The best Quizlet alternative with AI features, no ads, and real spaced repetition',
            price: '0',
            rating: 4.8,
            reviewCount: 1250,
          }),
          schemas.faqPage(faqs),
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
          <BlobBackground position="top" color="#6366f1" animate={true} />
          
          <div className="container mx-auto px-4 relative z-10">
            <Breadcrumbs items={breadcrumbs} className="mb-8 text-gray-400" />
            
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-sm font-medium mb-6">
                <Crown className="h-4 w-4" />
                Quizlet Alternative 2024
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                The Best <span className="text-indigo-500">Quizlet Alternative</span>
                <span className="block mt-2">Without the Ads</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Tired of Quizlet&apos;s ads and paywalls? Masterly AI gives you AI-powered flashcards, 
                real spaced repetition, and a distraction-free study experience. Free.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700" asChild>
                  <Link href="/login">
                    Try Masterly Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points Banner */}
        <section className="py-12 bg-muted/50 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Ads to close</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">$0</p>
                <p className="text-sm text-muted-foreground">For AI features</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">100%</p>
                <p className="text-sm text-muted-foreground">Focused studying</p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Masterly AI vs Quizlet
              </h2>
              <p className="text-xl text-muted-foreground">
                A fair comparison of features
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl overflow-hidden border border-border">
                {/* Header */}
                <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold text-foreground">
                  <div>Feature</div>
                  <div className="text-center text-primary">Masterly AI</div>
                  <div className="text-center">Quizlet</div>
                </div>
                
                {/* Rows */}
                {comparisonData.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 p-4 border-t border-border items-center"
                  >
                    <div className="text-foreground">{row.feature}</div>
                    <div className="text-center">
                      {typeof row.masterly === 'boolean' ? (
                        row.masterly ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span className="text-green-500 font-medium">{row.masterly}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof row.quizlet === 'boolean' ? (
                        row.quizlet ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )
                      ) : (
                        <span className="text-yellow-500 font-medium">{row.quizlet}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Advantages */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Students Prefer Masterly
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {advantages.map((advantage, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border hover:border-indigo-500/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
                    <advantage.icon className="h-6 w-6 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {advantage.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {advantage.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quizlet Frustrations */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
                Frustrated with Quizlet?
              </h2>
              
              <div className="space-y-4">
                {[
                  'Ads every few cards interrupt your study flow',
                  'Quizlet Plus costs $36/year for basic features',
                  'AI features are locked behind an even pricier tier',
                  'Learn mode is not true spaced repetition',
                ].map((frustration, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/20"
                  >
                    <X className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <p className="text-foreground">{frustration}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-6 rounded-xl bg-green-500/5 border border-green-500/20">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  With Masterly AI, you get:
                </h3>
                <div className="space-y-3">
                  {[
                    'Zero ads - ever',
                    'AI flashcards included free',
                    'Real spaced repetition algorithms',
                    'Upload PDFs, notes, lectures, and more',
                  ].map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <p className="text-foreground">{benefit}</p>
                    </div>
                  ))}
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
                Quizlet Alternative FAQ
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
              title="Explore More"
              variant="card"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 bg-indigo-500/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready for Ad-Free Studying?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join students who chose a better way to learn.
              </p>
              <Button size="lg" className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700" asChild>
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

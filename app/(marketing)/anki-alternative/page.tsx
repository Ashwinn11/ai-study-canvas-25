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
  Clock,
  Brain,
  Smartphone,
  Upload,
  Zap,
} from 'lucide-react';

const breadcrumbs = [
  { name: 'Home', href: '/' },
  { name: 'Anki Alternative', href: '/anki-alternative' },
];

const faqs = [
  {
    question: 'Is Masterly AI really a better Anki alternative?',
    answer: 'For most students, yes. Masterly AI offers automatic flashcard, summary, and quiz generation with AI, a modern mobile-first design on both iOS and Web, and requires zero setup. While Anki is powerful for advanced users, Masterly makes studying accessible to everyone with 3 free uploads to try.',
  },
  {
    question: 'Does Masterly AI have spaced repetition like Anki?',
    answer: 'Yes! Masterly AI uses scientifically-proven spaced repetition algorithms similar to Anki. Your cards are automatically scheduled for review at optimal intervals. Plus, you get daily exam reports with grades to track your progress.',
  },
  {
    question: 'Can I import my Anki decks to Masterly?',
    answer: 'Currently, you can recreate your decks by uploading source materials (PDFs, images, audio, video, YouTube links, or text) and letting AI generate the flashcards, summaries, and quizzes. We support all major formats.',
  },
  {
    question: 'Is Masterly AI free like Anki?',
    answer: 'Masterly AI offers 3 free uploads to try the platform. After that, subscribe to one of our three-tier plans for unlimited uploads. Unlike Anki, you get the same features on both iOS and Web with automatic cloud sync.',
  },
];

const relatedLinks = [
  { href: '/quizlet-alternative', label: 'Quizlet Alternative', description: 'Compare with Quizlet' },
  { href: '/ai-flashcard-maker', label: 'AI Flashcard Maker', description: 'Auto-generate cards' },
  { href: '/spaced-repetition', label: 'Spaced Repetition', description: 'Learn about SRS' },
];

const comparisonData = [
  { feature: 'AI Flashcard Generation', masterly: true, anki: false },
  { feature: 'Modern, Clean Design', masterly: true, anki: false },
  { feature: 'No Setup Required', masterly: true, anki: false },
  { feature: 'Free Mobile App', masterly: true, anki: false },
  { feature: 'Cloud Sync Built-in', masterly: true, anki: false },
  { feature: 'Upload PDFs/Notes', masterly: true, anki: false },
  { feature: 'Spaced Repetition', masterly: true, anki: true },
  { feature: 'Custom Card Templates', masterly: true, anki: true },
  { feature: 'Study Statistics', masterly: true, anki: true },
  { feature: 'Offline Mode', masterly: true, anki: true },
];

const advantages = [
  {
    icon: Sparkles,
    title: 'AI-Powered Creation',
    description: 'Upload notes or PDFs and get flashcards instantly. No manual card creation needed.',
  },
  {
    icon: Smartphone,
    title: 'Beautiful Mobile App',
    description: 'Free, modern mobile app that syncs automatically. No AnkiWeb struggles or paid iOS app.',
  },
  {
    icon: Clock,
    title: 'Zero Setup Time',
    description: 'Start studying in seconds. No plugins, no configuration, no learning curve.',
  },
  {
    icon: Brain,
    title: 'Same Proven SRS',
    description: 'Scientifically-backed spaced repetition, just like Anki, but beautifully implemented.',
  },
];

export default function AnkiAlternativePage() {
  return (
    <>
      <StructuredData
        data={[
          schemas.product({
            name: 'Masterly AI - Anki Alternative',
            description: 'The best Anki alternative with AI-powered flashcard creation and modern design',
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
          <BlobBackground position="top" color="#f97316" animate={true} />
          
          <div className="container mx-auto px-4 relative z-10">
            <Breadcrumbs items={breadcrumbs} className="mb-8 text-gray-400" />
            
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-medium mb-6">
                <Zap className="h-4 w-4" />
                Anki Alternative 2024
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                The Best <span className="text-orange-500">Anki Alternative</span>
                <span className="block mt-2">for Modern Students</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Love spaced repetition but hate Anki&apos;s complexity? Masterly AI gives you the same 
                powerful SRS with AI automation, beautiful design, and zero setup.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-orange-600 hover:bg-orange-700" asChild>
                  <Link href="/login">
                    Try Masterly Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Masterly AI vs Anki Comparison
              </h2>
              <p className="text-xl text-muted-foreground">
                See how we stack up against Anki
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <div className="rounded-2xl overflow-hidden border border-border">
                {/* Header */}
                <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold text-foreground">
                  <div>Feature</div>
                  <div className="text-center text-primary">Masterly AI</div>
                  <div className="text-center">Anki</div>
                </div>
                
                {/* Rows */}
                {comparisonData.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-3 p-4 border-t border-border items-center"
                  >
                    <div className="text-foreground">{row.feature}</div>
                    <div className="text-center">
                      {row.masterly ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </div>
                    <div className="text-center">
                      {row.anki ? (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-5 w-5 text-red-500 mx-auto" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Switch Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Students Switch from Anki
              </h2>
              <p className="text-xl text-muted-foreground">
                All the power of Anki, none of the hassle
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {advantages.map((advantage, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border hover:border-orange-500/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                    <advantage.icon className="h-6 w-6 text-orange-500" />
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

        {/* Anki Pain Points */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 text-center">
                Sound Familiar?
              </h2>
              
              <div className="space-y-4">
                {[
                  '"I spent more time setting up Anki than actually studying"',
                  '"The mobile app costs $25 and still feels outdated"',
                  '"I gave up trying to sync between devices"',
                  '"Creating cards manually takes forever"',
                ].map((quote, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl bg-background border border-border"
                  >
                    <p className="text-lg text-muted-foreground italic">
                      {quote}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="text-center mt-8">
                <p className="text-xl font-semibold text-foreground mb-4">
                  Masterly AI solves all of these problems.
                </p>
                <Button size="lg" className="bg-orange-600 hover:bg-orange-700" asChild>
                  <Link href="/login">
                    Switch to Masterly
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Anki Alternative FAQ
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
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <RelatedLinks
              links={relatedLinks}
              title="Explore More"
              variant="card"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Try a Better Anki?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of students who made the switch.
              </p>
              <Button size="lg" className="h-14 px-8 text-lg bg-orange-600 hover:bg-orange-700" asChild>
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

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
  Sparkles,
  FileText,
  Brain,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  Upload,
  BookOpen,
  Repeat,
} from 'lucide-react';

const breadcrumbs = [
  { name: 'Home', href: '/' },
  { name: 'AI Flashcard Maker', href: '/ai-flashcard-maker' },
];

const faqs = [
  {
    question: 'How does the AI flashcard maker work?',
    answer: 'Simply upload your study materials (PDFs, notes, or text), and our AI analyzes the content to extract key concepts. It then automatically generates flashcards with questions on one side and answers on the other, optimized for effective studying.',
  },
  {
    question: 'Is the AI flashcard maker free?',
    answer: 'Yes! Masterly AI offers a generous free plan that allows you to create AI-generated flashcards from your study materials. Premium plans offer additional features like unlimited uploads and advanced analytics.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'Our AI flashcard maker supports PDFs, images (photos of notes or textbooks), audio recordings, video lectures, and plain text. Just upload your content and let AI do the rest.',
  },
  {
    question: 'How accurate are the AI-generated flashcards?',
    answer: 'Our AI is trained on educational content and achieves high accuracy in identifying key concepts. You can always edit or customize the generated flashcards to match your study needs.',
  },
];

const relatedLinks = [
  { href: '/pdf-to-flashcards', label: 'PDF to Flashcards', description: 'Convert PDFs to study cards' },
  { href: '/spaced-repetition', label: 'Spaced Repetition', description: 'Learn faster with SRS' },
  { href: '/anki-alternative', label: 'Anki Alternative', description: 'Try a smarter option' },
];

const features = [
  {
    icon: Upload,
    title: 'Upload Any Format',
    description: 'PDFs, images, audio, video, or text - we handle it all',
  },
  {
    icon: Brain,
    title: 'AI-Powered Generation',
    description: 'Advanced AI extracts key concepts automatically',
  },
  {
    icon: Repeat,
    title: 'Spaced Repetition',
    description: 'Built-in SRS for optimal memory retention',
  },
  {
    icon: Clock,
    title: 'Save Hours',
    description: 'Create flashcards in seconds, not hours',
  },
];

const steps = [
  {
    number: '01',
    title: 'Upload Your Materials',
    description: 'Drop in your PDF, notes, or any study content',
  },
  {
    number: '02',
    title: 'AI Generates Cards',
    description: 'Our AI extracts key concepts and creates flashcards',
  },
  {
    number: '03',
    title: 'Start Studying',
    description: 'Review with spaced repetition for lasting memory',
  },
];

export default function AIFlashcardMakerPage() {
  return (
    <>
      <StructuredData
        data={[
          schemas.product({
            name: 'AI Flashcard Maker',
            description: 'Create flashcards automatically with AI from your study materials',
            price: '0',
            rating: 4.8,
            reviewCount: 1250,
          }),
          schemas.faqPage(faqs),
          schemas.howTo({
            title: 'How to Create AI Flashcards',
            description: 'Learn how to create flashcards automatically with Masterly AI',
            totalTime: 'PT2M',
            steps: steps.map(step => ({
              name: step.title,
              text: step.description,
            })),
          }),
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
          <BlobBackground position="top" color="#8b5cf6" animate={true} />
          
          <div className="container mx-auto px-4 relative z-10">
            <Breadcrumbs items={breadcrumbs} className="mb-8 text-gray-400" />
            
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                AI-Powered Study Tool
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                AI Flashcard Maker
                <span className="block text-primary mt-2">Create Cards in Seconds</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Stop wasting hours making flashcards manually. Upload your notes, PDFs, or lectures 
                and let AI create perfect study cards instantly. Free for students.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg" asChild>
                  <Link href="/login">
                    Start Creating Free <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Link 
                  href="/help"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Learn how it works →
                </Link>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                ✓ No credit card required &nbsp; ✓ Free forever plan &nbsp; ✓ 10,000+ students
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Use Our AI Flashcard Maker?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                The smartest way to create and study flashcards
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border hover:border-primary/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How the AI Flashcard Maker Works
              </h2>
              <p className="text-xl text-muted-foreground">
                Three simple steps to better studying
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="text-5xl font-bold text-primary/20 mb-4">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Button size="lg" asChild>
                <Link href="/login">
                  Try It Now - It's Free
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Frequently Asked Questions
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
              title="Explore More Features"
              variant="card"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Create Smarter Flashcards?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of students using AI to study more effectively.
              </p>
              <Button size="lg" className="h-14 px-8 text-lg" asChild>
                <Link href="/login">
                  Get Started Free
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

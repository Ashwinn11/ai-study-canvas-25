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
  Brain,
  BookOpen,
  Clock,
  ArrowRight,
  Upload,
  Repeat,
} from 'lucide-react';

const breadcrumbs = [
  { name: 'Home', href: '/' },
  { name: 'AI Flashcard Maker', href: '/ai-flashcard-maker' },
];

const faqs = [
  {
    question: 'How does the AI flashcard maker work?',
    answer: 'Upload your study materials (PDFs, images, audio, video, YouTube links, or text), and our AI automatically generates high-quality flashcards, summaries, and quizzes. Organize them into exams and study with spaced repetition that provides daily reports with grades.',
  },
  {
    question: 'Is the AI flashcard maker free?',
    answer: 'Masterly AI offers 3 free uploads to try the platform. After that, subscribe to one of our three-tier plans for unlimited uploads and full access to all features including spaced repetition, exam organization, and daily progress reports.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'We support PDFs, images (photos of notes or textbooks), audio recordings, video files, YouTube links, and plain text. Upload any study material and get instant flashcards, summaries, and quizzes.',
  },
  {
    question: 'How accurate are the AI-generated content?',
    answer: 'Our AI generates high-quality flashcards, summaries, and quiz questions from your materials. You can review and edit all generated content. The platform is available on both iOS and Web with the same features.',
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
    description: 'PDFs, images, audio, video, YouTube links, or text',
  },
  {
    icon: Brain,
    title: 'AI-Powered Generation',
    description: 'Get flashcards, summaries, AND quizzes automatically',
  },
  {
    icon: BookOpen,
    title: 'Organize into Exams',
    description: 'Group your materials into exams for structured studying',
  },
  {
    icon: Repeat,
    title: 'Spaced Repetition',
    description: 'Daily exam reports with grades track your progress',
  },
];

const steps = [
  {
    number: '01',
    title: 'Upload Your Materials',
    description: 'PDFs, images, audio, video, YouTube links, or text',
  },
  {
    number: '02',
    title: 'AI Generates Everything',
    description: 'Get flashcards, summaries, and quizzes instantly',
  },
  {
    number: '03',
    title: 'Organize & Study',
    description: 'Create exams and study with spaced repetition',
  },
];

export default function AIFlashcardMakerPage() {
  return (
    <>
      <StructuredData
        data={[
          schemas.product({
            name: 'AI Flashcard Maker',
            description: 'Create flashcards, summaries, and quizzes automatically with AI from your study materials',
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
                <span className="block text-primary mt-2">Flashcards, Summaries & Quizzes</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Upload PDFs, images, audio, video, or YouTube links and get AI-generated flashcards, summaries, and quizzes. 
                Organize into exams and study with spaced repetition that tracks your progress daily. Available on iOS and Web.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg" asChild>
                  <Link href="/login">
                    Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
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
                ✓ 3 free uploads to try &nbsp; ✓ iOS & Web app &nbsp; ✓ 10,000+ students
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Complete AI Study Platform
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Flashcards, summaries, quizzes, exam organization, and spaced repetition - all in one platform
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
                Ready to Transform Your Studying?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Try 3 free uploads. Then subscribe for unlimited access to AI-powered study tools.
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

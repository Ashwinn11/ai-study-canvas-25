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
  FileText,
  ArrowRight,
  Upload,
  Zap,
  Shield,
  Languages,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

const breadcrumbs = [
  { name: 'Home', href: '/' },
  { name: 'PDF to Flashcards', href: '/pdf-to-flashcards' },
];

const faqs = [
  {
    question: 'How do I convert a PDF to flashcards?',
    answer: 'Simply upload your PDF to Masterly AI, and our AI will automatically extract key concepts, definitions, and important information to create flashcards. The process takes just seconds.',
  },
  {
    question: 'What types of PDFs work best?',
    answer: 'Our AI works great with textbooks, lecture slides, study guides, research papers, and notes. Any PDF with readable text can be converted to flashcards.',
  },
  {
    question: 'Is the PDF conversion free?',
    answer: 'Yes! You can convert PDFs to flashcards for free with our basic plan. Premium plans offer unlimited conversions and additional features.',
  },
  {
    question: 'How accurate is the AI extraction?',
    answer: 'Our AI achieves over 95% accuracy in extracting key concepts from academic content. You can always edit or refine the generated flashcards.',
  },
];

const relatedLinks = [
  { href: '/ai-flashcard-maker', label: 'AI Flashcard Maker', description: 'Create cards from any source' },
  { href: '/spaced-repetition', label: 'Spaced Repetition', description: 'Optimize your memory' },
  { href: '/anki-alternative', label: 'Anki Alternative', description: 'A smarter choice' },
];

const benefits = [
  {
    icon: Zap,
    title: 'Instant Conversion',
    description: 'Upload your PDF and get flashcards in seconds, not hours',
  },
  {
    icon: Shield,
    title: 'Accurate Extraction',
    description: 'AI precisely identifies key concepts and definitions',
  },
  {
    icon: Languages,
    title: 'Multi-Language',
    description: 'Works with PDFs in multiple languages',
  },
  {
    icon: BookOpen,
    title: 'Any PDF Type',
    description: 'Textbooks, slides, notes, papers - all supported',
  },
];

const supportedTypes = [
  'Textbooks & E-books',
  'Lecture Slides & Presentations',
  'Study Guides & Notes',
  'Research Papers',
  'Course Materials',
  'Reference Documents',
];

export default function PDFToFlashcardsPage() {
  return (
    <>
      <StructuredData
        data={[
          schemas.product({
            name: 'PDF to Flashcards Converter',
            description: 'Convert any PDF to study flashcards automatically with AI',
            price: '0',
            rating: 4.9,
            reviewCount: 850,
          }),
          schemas.faqPage(faqs),
          schemas.howTo({
            title: 'How to Convert PDF to Flashcards',
            description: 'Learn how to convert any PDF to flashcards with Masterly AI',
            totalTime: 'PT1M',
            steps: [
              { name: 'Upload Your PDF', text: 'Click upload and select your PDF file' },
              { name: 'AI Processing', text: 'Our AI extracts key concepts automatically' },
              { name: 'Review & Study', text: 'Start studying with your new flashcards' },
            ],
          }),
        ]}
      />

      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
          <BlobBackground position="top" color="#10b981" animate={true} />
          
          <div className="container mx-auto px-4 relative z-10">
            <Breadcrumbs items={breadcrumbs} className="mb-8 text-gray-400" />
            
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium mb-6">
                <FileText className="h-4 w-4" />
                Instant PDF Conversion
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
                PDF to Flashcards
                <span className="block text-emerald-500 mt-2">Convert in Seconds</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Transform any PDF into study flashcards instantly. Textbooks, lecture slides, 
                notes - our AI extracts the key concepts for you. Free and easy to use.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700" asChild>
                  <Link href="/login">
                    <Upload className="mr-2 h-5 w-5" />
                    Upload PDF Free
                  </Link>
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                ✓ No sign-up required to try &nbsp; ✓ Instant results &nbsp; ✓ Free plan available
              </p>
            </div>
          </div>
        </section>

        {/* Supported Types */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Works With Any PDF
              </h2>
              <p className="text-xl text-muted-foreground">
                Convert these PDF types and more
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {supportedTypes.map((type, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-xl bg-background border border-border"
                >
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-foreground">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Why Convert PDFs with Masterly?
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-background border border-border hover:border-emerald-500/50 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <benefit.icon className="h-6 w-6 text-emerald-500" />
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

        {/* How It Works */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How PDF to Flashcards Works
              </h2>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    1. Upload PDF
                  </h3>
                  <p className="text-muted-foreground">
                    Drag and drop or click to upload your PDF file
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    2. AI Processes
                  </h3>
                  <p className="text-muted-foreground">
                    Our AI extracts key concepts and creates flashcards
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    3. Start Studying
                  </h3>
                  <p className="text-muted-foreground">
                    Review your flashcards with spaced repetition
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                PDF to Flashcards FAQ
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
              title="More Study Tools"
              variant="card"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Convert Your PDFs?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Turn your textbooks and notes into flashcards in seconds.
              </p>
              <Button size="lg" className="h-14 px-8 text-lg bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link href="/login">
                  Convert PDF Now
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

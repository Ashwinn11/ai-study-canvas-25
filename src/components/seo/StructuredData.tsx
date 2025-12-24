'use client';

import React from 'react';

interface StructuredDataProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

/**
 * Component for injecting JSON-LD structured data into pages
 * Supports single schema or array of schemas
 */
export function StructuredData({ data }: StructuredDataProps) {
  const schemas = Array.isArray(data) ? data : [data];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

/**
 * Pre-built schemas for common use cases
 */
export const schemas = {
  organization: () => ({
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'Masterly AI',
    url: 'https://masterlyapp.in',
    logo: 'https://masterlyapp.in/icon.png',
    description: 'AI-powered study coach that transforms your notes, PDFs, and lectures into flashcards, quizzes, and summaries.',
    sameAs: ['https://twitter.com/masterlyai'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@masterlyapp.in',
    },
    foundingDate: '2024',
    slogan: 'Study less. Learn more.',
  }),

  website: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Masterly AI',
    url: 'https://masterlyapp.in',
    description: 'Transform your study materials into AI-powered flashcards, quizzes, and summaries.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://masterlyapp.in/dashboard?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }),

  softwareApplication: () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Masterly AI',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web, iOS, Android',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1',
    },
    description: 'AI-powered study app that creates flashcards, quizzes, and summaries.',
    featureList: [
      'AI Flashcard Generator',
      'AI Quiz Generator',
      'PDF to Flashcards Converter',
      'Spaced Repetition System',
      'Active Recall Practice',
    ],
  }),

  faqPage: (faqs: Array<{ question: string; answer: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }),

  breadcrumb: (items: Array<{ name: string; url: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://masterlyapp.in${item.url}`,
    })),
  }),

  article: (config: {
    title: string;
    description: string;
    url: string;
    image?: string;
    datePublished?: string;
    dateModified?: string;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.title,
    description: config.description,
    image: config.image || 'https://masterlyapp.in/icon.png',
    datePublished: config.datePublished || new Date().toISOString(),
    dateModified: config.dateModified || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: 'Masterly AI Team',
      url: 'https://masterlyapp.in',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Masterly AI',
      url: 'https://masterlyapp.in',
      logo: {
        '@type': 'ImageObject',
        url: 'https://masterlyapp.in/icon.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://masterlyapp.in${config.url}`,
    },
  }),

  howTo: (config: {
    title: string;
    description: string;
    steps: Array<{ name: string; text: string; image?: string }>;
    totalTime?: string;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: config.title,
    description: config.description,
    ...(config.totalTime && { totalTime: config.totalTime }),
    step: config.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
    })),
  }),

  product: (config: {
    name: string;
    description: string;
    price?: string;
    rating?: number;
    reviewCount?: number;
  }) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: config.name,
    description: config.description,
    brand: {
      '@type': 'Brand',
      name: 'Masterly AI',
    },
    offers: {
      '@type': 'Offer',
      price: config.price || '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    ...(config.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: config.rating.toString(),
        reviewCount: config.reviewCount?.toString() || '100',
        bestRating: '5',
        worstRating: '1',
      },
    }),
  }),
};

/**
 * Default JSON-LD for the entire site
 */
export function DefaultJsonLd() {
  return (
    <StructuredData
      data={[
        schemas.organization(),
        schemas.website(),
        schemas.softwareApplication(),
      ]}
    />
  );
}

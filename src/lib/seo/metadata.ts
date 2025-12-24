/**
 * SEO Metadata Utilities
 * Centralized metadata generation for consistent SEO across the app
 */

import { Metadata } from 'next';

// Base URL for the application
export const BASE_URL = 'https://masterlyapp.in';

// Default site-wide metadata
export const DEFAULT_METADATA = {
  siteName: 'Masterly AI',
  title: 'Masterly AI - Free AI Flashcard & Quiz Maker for Students | Study Smarter',
  description: 'Free AI study app trusted by 10,000+ students. Instantly create flashcards, quizzes & summaries from PDFs, notes & lectures. Features spaced repetition, active recall & AI study coach. Better than Anki & Quizlet.',
  keywords: [
    'Masterly AI', 'AI flashcard maker', 'AI quiz generator', 'study app',
    'spaced repetition', 'active recall', 'PDF to flashcards', 'free flashcard app',
    'Anki alternative', 'Quizlet alternative', 'exam preparation', 'medical flashcards'
  ],
  author: 'Masterly AI Team',
  twitterHandle: '@masterlyai',
};

// Open Graph image defaults
export const OG_IMAGE = {
  url: `${BASE_URL}/icon.png`,
  width: 1200,
  height: 630,
  alt: 'Masterly AI - AI-Powered Study App',
};

/**
 * Interface for generating page metadata
 */
interface PageMetadataConfig {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  image?: {
    url: string;
    alt: string;
  };
  noIndex?: boolean;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

/**
 * Generates consistent metadata for any page
 */
export function generatePageMetadata(config: PageMetadataConfig): Metadata {
  const {
    title,
    description,
    path = '',
    keywords = [],
    image,
    noIndex = false,
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
  } = config;

  const fullUrl = `${BASE_URL}${path}`;
  const fullTitle = title.includes('Masterly') ? title : `${title} | Masterly AI`;
  const ogImage = image ? { url: image.url, alt: image.alt, width: 1200, height: 630 } : OG_IMAGE;

  const metadata: Metadata = {
    title: fullTitle,
    description,
    keywords: [...DEFAULT_METADATA.keywords, ...keywords].join(', '),
    authors: [{ name: author || DEFAULT_METADATA.author, url: BASE_URL }],
    creator: 'Masterly AI',
    publisher: 'Masterly AI',
    applicationName: 'Masterly AI',
    category: 'Education',
    metadataBase: new URL(BASE_URL),
    
    openGraph: {
      title: fullTitle,
      description,
      url: fullUrl,
      siteName: DEFAULT_METADATA.siteName,
      type,
      locale: 'en_US',
      images: [ogImage],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },
    
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage.url],
      creator: DEFAULT_METADATA.twitterHandle,
      site: DEFAULT_METADATA.twitterHandle,
    },
    
    alternates: {
      canonical: fullUrl,
    },
    
    robots: noIndex ? {
      index: false,
      follow: false,
    } : {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
  };

  return metadata;
}

/**
 * Pre-defined metadata templates for common pages
 */
export const PAGE_TEMPLATES = {
  landing: (keyword: string, description: string) => generatePageMetadata({
    title: `${keyword} - Free AI Study Tool | Masterly AI`,
    description,
    keywords: [keyword.toLowerCase(), `${keyword.toLowerCase()} app`, `best ${keyword.toLowerCase()}`],
  }),
  
  feature: (feature: string, description: string) => generatePageMetadata({
    title: `${feature} Feature | Masterly AI`,
    description,
    keywords: [feature.toLowerCase(), 'study tool', 'learning app'],
  }),
  
  comparison: (competitor: string) => generatePageMetadata({
    title: `Masterly AI vs ${competitor} - Which is Better? | Comparison Guide`,
    description: `Compare Masterly AI with ${competitor}. See why students choose Masterly AI as the best ${competitor} alternative for flashcards, quizzes, and AI-powered studying.`,
    keywords: [`${competitor} alternative`, `better than ${competitor}`, `${competitor} vs Masterly`],
  }),
  
  useCase: (useCase: string, description: string) => generatePageMetadata({
    title: `${useCase} | Masterly AI`,
    description,
    keywords: [useCase.toLowerCase(), 'study app', 'learning tool'],
  }),
};

/**
 * Generate JSON-LD structured data for different page types
 */
export function generateBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${BASE_URL}${crumb.url}`,
    })),
  };
}

export function generateArticleSchema(config: {
  title: string;
  description: string;
  url: string;
  image?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: config.title,
    description: config.description,
    image: config.image || `${BASE_URL}/icon.png`,
    datePublished: config.publishedTime || new Date().toISOString(),
    dateModified: config.modifiedTime || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: config.author || 'Masterly AI Team',
      url: BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Masterly AI',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icon.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}${config.url}`,
    },
  };
}

export function generateHowToSchema(config: {
  title: string;
  description: string;
  steps: Array<{ name: string; text: string; image?: string }>;
  totalTime?: string;
}) {
  return {
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
  };
}

export function generateProductSchema() {
  return {
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
    description: 'AI-powered study app that creates flashcards, quizzes, and summaries from your notes, PDFs, and lectures.',
    featureList: [
      'AI Flashcard Generator',
      'AI Quiz Generator',
      'PDF to Flashcards Converter',
      'Spaced Repetition System',
      'Active Recall Practice',
    ],
  };
}

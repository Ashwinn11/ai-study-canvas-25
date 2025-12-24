export function JsonLd() {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "Masterly AI",
    "url": "https://masterlyapp.in",
    "logo": "https://masterlyapp.in/icon.png",
    "description": "AI-powered study coach that transforms your notes, PDFs, and lectures into flashcards, quizzes, and summaries. Master any exam with spaced repetition and adaptive learning.",
    "sameAs": [
      "https://twitter.com/masterlyai"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "support@masterlyapp.in"
    },
    "foundingDate": "2024",
    "slogan": "Study less. Learn more."
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Masterly AI",
    "url": "https://masterlyapp.in",
    "description": "Transform your study materials into AI-powered flashcards, quizzes, and summaries. Master any exam with spaced repetition and adaptive learning.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://masterlyapp.in/dashboard?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Masterly AI",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250",
      "bestRating": "5",
      "worstRating": "1"
    },
    "description": "AI-powered study app that creates flashcards, quizzes, and summaries from your notes, PDFs, and lectures. Features spaced repetition, active recall, and Feynman technique for effective exam preparation.",
    "featureList": [
      "AI Flashcard Generator",
      "AI Quiz Generator", 
      "PDF to Flashcards Converter",
      "Spaced Repetition System",
      "Active Recall Practice",
      "Feynman Technique Learning",
      "Study Analytics Dashboard",
      "Multi-format Support (PDF, Notes, Lectures)"
    ],
    "screenshot": "https://masterlyapp.in/icon.png"
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Masterly AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Masterly AI is an AI-powered study app that automatically converts your notes, PDFs, and lectures into interactive flashcards, quizzes, and summaries. It uses spaced repetition and active recall to help you ace your exams."
        }
      },
      {
        "@type": "Question",
        "name": "Is Masterly AI free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Masterly AI offers a free plan for students with access to core features including AI flashcard generation, quiz creation, and spaced repetition learning."
        }
      },
      {
        "@type": "Question",
        "name": "How does Masterly AI compare to Anki or Quizlet?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Unlike Anki or Quizlet, Masterly AI automatically generates flashcards and quizzes from your study materials using AI. You don't need to manually create cards - just upload your notes or PDFs and let AI do the work."
        }
      },
      {
        "@type": "Question",
        "name": "What file formats does Masterly AI support?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Masterly AI supports PDFs, text notes, Word documents, and can process lecture transcripts. Simply upload your study materials and our AI will extract key concepts to create flashcards and quizzes."
        }
      },
      {
        "@type": "Question",
        "name": "Does Masterly AI use spaced repetition?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Masterly AI uses scientifically-proven spaced repetition algorithms to optimize your study schedule. The app automatically schedules reviews at optimal intervals to maximize long-term retention."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://masterlyapp.in"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Dashboard",
        "item": "https://masterlyapp.in/dashboard"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

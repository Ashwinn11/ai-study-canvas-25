/**
 * Internal Linking Strategy
 * Centralized link management for improved SEO and navigation
 */

export interface InternalLink {
    href: string;
    label: string;
    description?: string;
    keywords?: string[];
    category: 'main' | 'feature' | 'resource' | 'legal' | 'landing';
    priority: number; // 1-10, higher = more important
}

/**
 * All internal links organized by category
 */
export const INTERNAL_LINKS: Record<string, InternalLink> = {
    // Main navigation
    home: {
        href: '/',
        label: 'Home',
        description: 'Masterly AI - AI-powered study app',
        category: 'main',
        priority: 10,
    },
    dashboard: {
        href: '/dashboard',
        label: 'Dashboard',
        description: 'Your personalized study dashboard',
        category: 'main',
        priority: 9,
    },
    login: {
        href: '/login',
        label: 'Login',
        description: 'Sign in to Masterly AI',
        category: 'main',
        priority: 8,
    },

    // Features
    seeds: {
        href: '/seeds',
        label: 'Study Materials',
        description: 'Manage your uploaded study materials',
        keywords: ['study materials', 'notes', 'PDFs'],
        category: 'feature',
        priority: 8,
    },
    upload: {
        href: '/upload',
        label: 'Upload',
        description: 'Upload new study materials',
        keywords: ['upload PDF', 'upload notes', 'AI flashcards'],
        category: 'feature',
        priority: 8,
    },
    exams: {
        href: '/exams',
        label: 'Exams',
        description: 'Manage your exams and study schedules',
        keywords: ['exam prep', 'study schedule', 'test preparation'],
        category: 'feature',
        priority: 8,
    },

    // Resources
    help: {
        href: '/help',
        label: 'Help & Support',
        description: 'Get help with Masterly AI',
        keywords: ['help', 'support', 'FAQ', 'how to'],
        category: 'resource',
        priority: 6,
    },

    // Legal
    privacy: {
        href: '/privacy',
        label: 'Privacy Policy',
        description: 'Our privacy policy and data handling practices',
        category: 'legal',
        priority: 4,
    },
    terms: {
        href: '/terms',
        label: 'Terms of Service',
        description: 'Terms and conditions for using Masterly AI',
        category: 'legal',
        priority: 4,
    },

    // Programmatic SEO Landing Pages
    aiFlashcardMaker: {
        href: '/ai-flashcard-maker',
        label: 'AI Flashcard Maker',
        description: 'Create flashcards instantly with AI from your notes and PDFs',
        keywords: ['AI flashcard maker', 'auto flashcards', 'generate flashcards'],
        category: 'landing',
        priority: 9,
    },
    pdfToFlashcards: {
        href: '/pdf-to-flashcards',
        label: 'PDF to Flashcards',
        description: 'Convert any PDF to study flashcards automatically',
        keywords: ['PDF to flashcards', 'convert PDF', 'PDF study tool'],
        category: 'landing',
        priority: 9,
    },
    ankiAlternative: {
        href: '/anki-alternative',
        label: 'Anki Alternative',
        description: 'The best Anki alternative with AI-powered features',
        keywords: ['Anki alternative', 'better than Anki', 'Anki vs'],
        category: 'landing',
        priority: 9,
    },
    quizletAlternative: {
        href: '/quizlet-alternative',
        label: 'Quizlet Alternative',
        description: 'A smarter Quizlet alternative powered by AI',
        keywords: ['Quizlet alternative', 'better than Quizlet', 'Quizlet vs'],
        category: 'landing',
        priority: 9,
    },
    spacedRepetition: {
        href: '/spaced-repetition',
        label: 'Spaced Repetition',
        description: 'Learn faster with scientific spaced repetition',
        keywords: ['spaced repetition', 'SRS', 'memory technique'],
        category: 'landing',
        priority: 8,
    },
    medicalFlashcards: {
        href: '/medical-flashcards',
        label: 'Medical Flashcards',
        description: 'AI-powered flashcards for medical students',
        keywords: ['medical flashcards', 'MCAT', 'USMLE', 'medical study'],
        category: 'landing',
        priority: 8,
    },
};

/**
 * Get links by category
 */
export function getLinksByCategory(category: InternalLink['category']): InternalLink[] {
    return Object.values(INTERNAL_LINKS)
        .filter(link => link.category === category)
        .sort((a, b) => b.priority - a.priority);
}

/**
 * Get related links based on keywords
 */
export function getRelatedLinks(currentPath: string, keywords: string[], limit = 5): InternalLink[] {
    const links = Object.values(INTERNAL_LINKS)
        .filter(link => link.href !== currentPath)
        .map(link => {
            const matchScore = keywords.reduce((score, keyword) => {
                const keywordLower = keyword.toLowerCase();
                if (link.label.toLowerCase().includes(keywordLower)) score += 3;
                if (link.description?.toLowerCase().includes(keywordLower)) score += 2;
                if (link.keywords?.some(k => k.toLowerCase().includes(keywordLower))) score += 2;
                return score;
            }, 0);
            return { ...link, matchScore };
        })
        .filter(link => link.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

    return links;
}

/**
 * Get navigation links for header/footer
 */
export function getNavigationLinks(): InternalLink[] {
    return getLinksByCategory('main');
}

/**
 * Get footer links organized by section
 */
export function getFooterLinks() {
    return {
        main: getLinksByCategory('main').slice(0, 3),
        features: getLinksByCategory('feature'),
        resources: getLinksByCategory('resource'),
        legal: getLinksByCategory('legal'),
        landing: getLinksByCategory('landing').slice(0, 4),
    };
}

/**
 * Generate internal link HTML for SEO-friendly anchor tags
 */
export function generateLinkAttributes(link: InternalLink) {
    return {
        href: link.href,
        title: link.description || link.label,
        'aria-label': link.description || `Go to ${link.label}`,
    };
}

/**
 * Breadcrumb generation
 */
export interface Breadcrumb {
    name: string;
    href: string;
}

export function generateBreadcrumbs(path: string): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [{ name: 'Home', href: '/' }];

    const pathSegments = path.split('/').filter(Boolean);
    let currentPath = '';

    for (const segment of pathSegments) {
        currentPath += `/${segment}`;

        // Find matching link or generate from segment
        const matchingLink = Object.values(INTERNAL_LINKS).find(
            link => link.href === currentPath
        );

        if (matchingLink) {
            breadcrumbs.push({ name: matchingLink.label, href: currentPath });
        } else {
            // Convert segment to title case
            const name = segment
                .replace(/-/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
            breadcrumbs.push({ name, href: currentPath });
        }
    }

    return breadcrumbs;
}

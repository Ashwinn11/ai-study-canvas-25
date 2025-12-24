'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface RelatedLink {
  href: string;
  label: string;
  description?: string;
}

interface RelatedLinksProps {
  links: RelatedLink[];
  title?: string;
  className?: string;
  variant?: 'card' | 'inline' | 'minimal';
}

/**
 * Related links component for internal linking
 * Improves SEO by creating semantic connections between pages
 */
export function RelatedLinks({
  links,
  title = 'Related Topics',
  className,
  variant = 'card',
}: RelatedLinksProps) {
  if (links.length === 0) return null;

  if (variant === 'minimal') {
    return (
      <nav
        aria-label="Related content"
        className={cn('space-y-2', className)}
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </h3>
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-gray-300 hover:text-primary transition-colors"
                title={link.description}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  if (variant === 'inline') {
    return (
      <nav
        aria-label="Related content"
        className={cn('flex flex-wrap gap-2', className)}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-full',
              'text-sm text-gray-300 bg-white/5 border border-white/10',
              'hover:bg-white/10 hover:text-primary transition-all'
            )}
            title={link.description}
          >
            {link.label}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        ))}
      </nav>
    );
  }

  // Card variant (default)
  return (
    <section
      aria-label="Related content"
      className={cn('space-y-4', className)}
    >
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'group p-4 rounded-xl border border-white/10 bg-white/5',
              'hover:bg-white/10 hover:border-primary/30 transition-all'
            )}
          >
            <h4 className="font-semibold text-white group-hover:text-primary transition-colors">
              {link.label}
            </h4>
            {link.description && (
              <p className="mt-1 text-sm text-gray-400 line-clamp-2">
                {link.description}
              </p>
            )}
            <span className="mt-2 inline-flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Learn more
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * SEO-friendly anchor component with proper attributes
 */
interface SEOLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}

export function SEOLink({ href, children, external, className, ...props }: SEOLinkProps) {
  if (external) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  );
}

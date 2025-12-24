'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Accessible breadcrumb navigation component
 * Follows schema.org BreadcrumbList structure for SEO
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol 
        className="flex items-center space-x-2"
        itemScope
        itemType="https://schema.org/BreadcrumbList"
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;

          return (
            <li
              key={item.href}
              className="flex items-center"
              itemScope
              itemProp="itemListElement"
              itemType="https://schema.org/ListItem"
            >
              {index > 0 && (
                <ChevronRight 
                  className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" 
                  aria-hidden="true"
                />
              )}
              
              {isLast ? (
                <span
                  className="text-gray-400 font-medium"
                  aria-current="page"
                  itemProp="name"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'text-gray-500 hover:text-primary transition-colors',
                    'flex items-center gap-1'
                  )}
                  itemProp="item"
                >
                  {isFirst && <Home className="h-4 w-4" aria-hidden="true" />}
                  <span itemProp="name">{item.name}</span>
                </Link>
              )}
              
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Generate breadcrumb JSON-LD schema
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[], baseUrl = 'https://masterlyapp.in') {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.href}`,
    })),
  };
}

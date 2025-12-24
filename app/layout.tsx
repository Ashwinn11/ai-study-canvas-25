import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { metadata } from './metadata'
import { GlobalConfirmationDialog } from '@/components/GlobalConfirmationDialog'
import { OnboardingRedirect } from '@/components/OnboardingRedirect'
import { JsonLd } from '@/components/seo/JsonLd'

export { metadata }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* DNS Prefetch for external domains */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        
        {/* Preconnect for critical resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Font loading with display=swap for better performance */}
        <link 
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        
        {/* Favicon and app icons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon.png" />
        <link rel="shortcut icon" href="/icon.png" />
        
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="msapplication-TileColor" content="#8b5cf6" />
        
        {/* Additional SEO meta tags */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-title" content="Masterly AI" />
        <meta name="application-name" content="Masterly AI" />
        
        {/* Structured Data */}
        <JsonLd />
      </head>
      <body className="font-sans">
        <Providers>
          <OnboardingRedirect>
            {children}
            <GlobalConfirmationDialog />
          </OnboardingRedirect>
        </Providers>
      </body>
    </html>
  )
}
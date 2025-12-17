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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
        <link rel="shortcut icon" href="/favicon-32x32.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
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
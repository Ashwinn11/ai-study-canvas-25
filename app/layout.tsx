import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { metadata } from './metadata'
import { GlobalConfirmationDialog } from '@/components/GlobalConfirmationDialog'
import { OnboardingRedirect } from '@/components/OnboardingRedirect'

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
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
        <link rel="shortcut icon" href="/favicon.png" />
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
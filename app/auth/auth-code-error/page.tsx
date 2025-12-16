import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Authentication Error - Masterly AI',
  description: 'Authentication error',
};

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A2332] via-[#1A2332] to-[#2A3342] p-4">
      <Card className="w-full max-w-md border-white/10 bg-[#1A2332]/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-500/10">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Authentication Error</CardTitle>
          <CardDescription className="text-gray-400">
            We couldn't sign you in. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-sm text-gray-300 mb-2">
              This might have happened because:
            </p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>The authentication link expired</li>
              <li>The authentication was cancelled</li>
              <li>There was a network issue</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button variant="default" size="lg" className="w-full" asChild>
              <Link href="/login">Try Again</Link>
            </Button>

            <Button variant="ghost" size="lg" className="w-full" asChild>
              <Link href="/">Go to Homepage</Link>
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Need help?{' '}
            <a
              href="mailto:support@masterlyapp.in"
              className="underline hover:text-gray-400"
            >
              Contact Support
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

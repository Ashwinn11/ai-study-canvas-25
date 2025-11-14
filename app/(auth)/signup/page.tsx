import { Metadata } from 'next';
import Link from 'next/link';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Sign Up - Masterly',
  description: 'Create your Masterly account',
};

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A2332] via-[#1A2332] to-[#2A3342] p-4">
      <Card className="w-full max-w-md border-white/10 bg-[#1A2332]/50 backdrop-blur-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="text-4xl font-bold bg-gradient-to-r from-[#ff7664] to-[#F5C6FF] bg-clip-text text-transparent">
              Masterly
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">Get Started</CardTitle>
          <CardDescription className="text-gray-400">
            Sign in with Google to start your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <GoogleSignInButton />

          <p className="text-xs text-gray-500 text-center mt-4">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-gray-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline hover:text-gray-400">
              Privacy Policy
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

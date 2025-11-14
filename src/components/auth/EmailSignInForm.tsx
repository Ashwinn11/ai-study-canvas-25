'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface EmailSignInFormProps {
  mode: 'signin' | 'signup';
}

export function EmailSignInForm({ mode }: EmailSignInFormProps) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);

      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        toast.success('Check your email to confirm your account');
      } else {
        await signInWithEmail(email, password);
        toast.success('Successfully signed in!');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : `Failed to ${mode === 'signup' ? 'sign up' : 'sign in'}`;
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading
          ? mode === 'signup'
            ? 'Creating account...'
            : 'Signing in...'
          : mode === 'signup'
          ? 'Create account'
          : 'Sign in'}
      </Button>
    </form>
  );
}

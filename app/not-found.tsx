'use client';

import { useEffect } from 'react';
import { BlobBackground } from '@/components/ui/BlobBackground';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen content-layer py-20 relative">
      <BlobBackground position="top" color="#ff7664" animate={true} />
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="bg-white rounded-2xl shadow-elevated p-8 md:p-12 text-center">
          <h1 className="text-6xl font-bold mb-4 text-foreground">404</h1>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">Page Not Found</h2>
          <p className="text-foreground/70 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button asChild>
            <a href="/">Return Home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
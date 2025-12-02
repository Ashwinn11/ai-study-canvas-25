'use client';

import { Hero } from "@/components/Hero";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <FAQ />
      <Footer />
    </main>
  );
}
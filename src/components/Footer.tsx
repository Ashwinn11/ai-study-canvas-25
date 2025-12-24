'use client';

import { Mail, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-duolingo-green text-white py-16 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-6">
            <Link href="/" className="block">
              <h3 className="text-3xl font-black tracking-tight">Masterly AI</h3>
            </Link>
            <p className="text-white/90 max-w-sm text-lg font-medium leading-relaxed">
              The free, fun, and effective way to learn anything. AI-powered flashcards, quizzes, and spaced repetition.
            </p>
            
            <div className="flex items-center gap-2 text-sm font-bold text-white/80">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse"></span>
              Systems Operational
            </div>
          </div>

          {/* Features Column */}
          <div>
            <h4 className="font-bold mb-6 text-lg">Features</h4>
            <ul className="space-y-3 font-medium text-white/80">
              <li>
                <Link href="/ai-flashcard-maker" className="hover:text-white transition-colors">
                  AI Flashcard Maker
                </Link>
              </li>
              <li>
                <Link href="/pdf-to-flashcards" className="hover:text-white transition-colors">
                  PDF to Flashcards
                </Link>
              </li>
              <li>
                <Link href="/spaced-repetition" className="hover:text-white transition-colors">
                  Spaced Repetition
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  Help & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Alternatives Column */}
          <div>
            <h4 className="font-bold mb-6 text-lg">Compare</h4>
            <ul className="space-y-3 font-medium text-white/80">
              <li>
                <Link href="/anki-alternative" className="hover:text-white transition-colors">
                  Anki Alternative
                </Link>
              </li>
              <li>
                <Link href="/quizlet-alternative" className="hover:text-white transition-colors">
                  Quizlet Alternative
                </Link>
              </li>
            </ul>
            
            <h4 className="font-bold mt-8 mb-4 text-lg">Legal</h4>
            <ul className="space-y-3 font-medium text-white/80">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-6 text-lg">Contact</h4>
            <a
              href="mailto:support@masterlyapp.in"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium"
            >
              <Mail className="h-5 w-5" />
              support@masterlyapp.in
            </a>
            
            <div className="mt-8">
              <p className="text-sm font-medium text-white/60 mb-3">Download the app</p>
              <a
                href="https://apps.apple.com/app/masterly-ai-flashcards-quiz/id6753760295"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:scale-105 transition-transform duration-300"
                aria-label="Download Masterly AI on the App Store"
              >
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download on the App Store"
                  className="h-12"
                  loading="lazy"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-white/60">
            <p>© 2025 Masterly AI. All rights reserved.</p>
            <p className="text-center md:text-right flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-500 fill-current" aria-hidden="true" /> for students everywhere.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};


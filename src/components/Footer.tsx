'use client';

import { Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { Button } from "./ui/button";

export const Footer = () => {
  const { user } = useAuth();

  return (
    <footer className="bg-duolingo-green text-white py-16 relative overflow-hidden">
      
      {/* Mascot Easter Egg */}
      <div className="absolute -top-10 right-10 w-32 h-32 hidden lg:block animate-float">
        <img 
          src="/assets/features/raccoon_tutor.png" 
          alt="Mascot Peeking" 
          className="w-full h-full object-contain transform rotate-12"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="text-3xl font-black tracking-tight">Masterly</h3>
            <p className="text-white/90 max-w-sm text-lg font-medium leading-relaxed">
              The free, fun, and effective way to learn anything.
            </p>
            
            <div className="flex items-center gap-2 text-sm font-bold text-white/80">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse"></span>
              Systems Operational
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold mb-6 text-xl">Legal</h4>
            <ul className="space-y-4 font-medium text-white/80">
              <li>
                <a href="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-6 text-xl">Contact</h4>
            <a
              href="mailto:support@masterlyapp.in"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium"
            >
              <Mail className="h-5 w-5" />
              support@masterlyapp.in
            </a>
            
            <div className="mt-8">
              <a
                href="https://apps.apple.com/app/masterly-ai-flashcards-quiz/id6753760295"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block hover:scale-105 transition-transform duration-300"
              >
                <img
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download on the App Store"
                  className="h-12"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-white/60">
            <p>© 2025 Masterly. All rights reserved.</p>
            <p className="text-center md:text-right">
              Made with ❤️ for students everywhere.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

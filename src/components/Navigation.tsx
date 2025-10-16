'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import backgroundImage from "@/assets/background.png";

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation links
  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "Testimonials", href: "#testimonials" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ];

  // Handle scroll for background transparency
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  // Logo Component - uses transparent background.png
  const Logo: React.FC<{ className?: string }> = ({ 
    className = ""
  }) => {
    return (
      <img 
        src={backgroundImage.src}
        alt="Masterly"
        className={cn("w-16 h-16 object-contain transition-all duration-300 hover:scale-105", className)}
      />
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md bg-white/10 dark:bg-dark-surface/10 border border-white/20 dark:border-border/20 shadow-medium",
          className
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Logo />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href)}
                  className="text-sm font-medium transition-colors text-foreground/90 hover:text-foreground"
                >
                  {link.name}
                </button>
              ))}
            </nav>

            {/* CTA Button */}
            <div className="hidden md:block">
              <Button
                variant="default"
                size="sm"
                asChild
              >
                <a 
                  href="https://apps.apple.com/app/idXXXXXXXXX" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Download
                </a>
              </Button>
            </div>

            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="transition-colors text-white hover:text-white"
                   >
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                  <div className="flex flex-col space-y-6 mt-8">
                    {/* Mobile Logo */}
                    <div className="flex items-center justify-between">
                      <Logo />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <X className="h-6 w-6" />
                        <span className="sr-only">Close menu</span>
                      </Button>
                    </div>

                    {/* Mobile Navigation Links */}
                    <nav className="flex flex-col space-y-4">
                      {navLinks.map((link) => (
                        <button
                          key={link.name}
                          onClick={() => scrollToSection(link.href)}
                          className="text-lg font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {link.name}
                        </button>
                      ))}
                    </nav>

                    {/* Mobile CTA Button */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="default"
                        size="lg"
                        className="w-full"
                        asChild
                      >
                        <a 
                          href="https://apps.apple.com/app/idXXXXXXXXX" 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          Download on App Store
                        </a>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navigation;
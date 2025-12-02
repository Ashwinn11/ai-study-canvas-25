'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
const backgroundImage = "/brand-assets/background.png";

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

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
        src={backgroundImage}
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
          "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md bg-background/80 border-b border-border/40 shadow-sm",
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

            {/* CTA Button / User Menu */}
            <div className="hidden md:flex items-center gap-2">
              {loading ? (
                <div className="h-9 w-20 animate-pulse bg-white/10 rounded-md" />
              ) : user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <User className="h-4 w-4" />
                        Account
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="cursor-pointer">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="default" size="sm" asChild>
                  <Link href="/login">Get Started</Link>
                </Button>
              )}
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

                    {/* Mobile Auth Buttons */}
                    <div className="pt-4 border-t space-y-2">
                      {loading ? (
                        <div className="h-10 w-full animate-pulse bg-white/10 rounded-md" />
                      ) : user ? (
                        <>
                          <Button variant="default" size="lg" className="w-full" asChild>
                            <Link href="/dashboard">
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Dashboard
                            </Link>
                          </Button>
                          <Button variant="outline" size="lg" className="w-full" asChild>
                            <Link href="/profile">
                              <User className="h-4 w-4 mr-2" />
                              Profile
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="lg"
                            className="w-full text-red-500 hover:text-red-600"
                            onClick={signOut}
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out
                          </Button>
                        </>
                      ) : (
                        <Button variant="default" size="lg" className="w-full" asChild>
                          <Link href="/login">Get Started</Link>
                        </Button>
                      )}
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
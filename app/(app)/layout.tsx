'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  GraduationCap,
  User,
  LogOut,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const sidebarLinks = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Upload',
    href: '/upload',
    icon: Upload,
  },
  {
    name: 'My Seeds',
    href: '/seeds',
    icon: BookOpen,
  },
  {
    name: 'Exams',
    href: '/exams',
    icon: GraduationCap,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: User,
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center">
            <div className="text-2xl font-bold text-primary">
              Masterly
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {sidebarLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <li key={link.name}>
                        <Link
                          href={link.href}
                          className={cn(
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                                 : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
                          )}
                        >
                          <link.icon className="h-6 w-6 shrink-0" />
                          {link.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>

              {/* User info & Sign Out */}
              <li className="mt-auto">
                <div className="p-3 rounded-lg bg-accent border border-border">
                  <div className="text-sm text-accent-foreground mb-2">Signed in as</div>
                  <div className="text-sm font-medium truncate mb-3 text-accent-foreground">
                    {user?.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-white bg-background hover:bg-background/90"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="sticky top-0 z-40 lg:hidden">
        <div className="flex h-16 items-center gap-x-4 border-b border-border bg-card px-4 shadow-sm">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-r border-border bg-card p-0">
              <div className="flex flex-col h-full px-6 pb-4">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center">
                  <div className="text-2xl font-bold text-primary">
                    Masterly
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 mt-8">
                  <ul role="list" className="space-y-1">
                    {sidebarLinks.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/20'
                            )}
                          >
                            <link.icon className="h-6 w-6 shrink-0" />
                            {link.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* User info */}
                <div className="p-3 rounded-lg bg-accent border border-border mb-4">
                  <div className="text-sm text-accent-foreground mb-2">Signed in as</div>
                  <div className="text-sm font-medium truncate mb-3 text-accent-foreground">
                    {user?.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-white bg-background hover:bg-background/90"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1 text-sm font-semibold leading-6">
            Masterly
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-72">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}

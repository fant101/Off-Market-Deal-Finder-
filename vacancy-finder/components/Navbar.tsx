"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const navLinks = [
    { href: "/", label: "Search" },
    { href: "/saved", label: "Saved" },
    { href: "/watchlist", label: "Watchlists" },
    { href: "/intel", label: "Intel" },
    { href: "/deals", label: "Deals" },
    { href: "/history", label: "History" },
  ];

  return (
    <nav className="bg-resolute-dark-green border-b-2 border-resolute-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-resolute-gold font-display text-xl font-bold">
                Vacancy Finder
              </span>
              <span className="text-resolute-cream/50 text-xs font-body hidden sm:inline">
                by Resolute
              </span>
            </Link>
            <div className="flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "text-resolute-gold bg-resolute-gold/10"
                      : "text-resolute-cream/70 hover:text-resolute-cream hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-resolute-cream/60 text-sm hidden sm:inline">
                  {user.email}
                </span>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-resolute-cream/60 hover:text-resolute-cream text-sm transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-resolute-gold text-sm hover:text-resolute-gold-light transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

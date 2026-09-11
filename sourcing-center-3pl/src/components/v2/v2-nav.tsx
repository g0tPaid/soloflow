"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SourcingLogo } from "@/components/brand/sourcing-logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "#discovery", label: "Discover" },
  { href: "#new-idea", label: "New idea" },
  { href: "#network", label: "Network" },
  { href: "/3pl", label: "3PL", highlight: true },
  { href: "#workflow", label: "Workflow" },
  { href: "#trust", label: "Trust" },
];

export function V2Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-6xl items-center gap-4 rounded-2xl border px-4 py-2.5 transition-all duration-300",
          scrolled || open ? "glass shadow-[0_12px_40px_rgba(17,17,17,0.08)]" : "border-transparent bg-transparent",
        )}
      >
        <Link href="/" onClick={() => setOpen(false)} className="min-w-0">
          <SourcingLogo size="nav" />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm transition",
                l.highlight
                  ? "bg-accent px-3.5 font-semibold text-white shadow-[0_8px_20px_rgba(214,0,0,0.28)] hover:opacity-90"
                  : "text-muted hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/admin"
            className="rounded-full px-3 py-2 text-sm text-muted transition hover:text-ink"
          >
            Admin
          </Link>
          <Link
            href="#rfq"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:opacity-90"
          >
            Start Sourcing
          </Link>
        </div>
        <button
          type="button"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-line md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="pointer-events-auto mx-auto mt-2 max-w-6xl rounded-2xl border border-line bg-paper p-4 shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-sm",
                    l.highlight
                      ? "bg-accent font-semibold text-white"
                      : "text-ink",
                  )}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm text-ink"
              >
                Admin
              </Link>
              <Link
                href="#rfq"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-full bg-ink px-4 py-3 text-center text-sm font-medium text-paper dark:bg-accent"
              >
                Start Sourcing
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

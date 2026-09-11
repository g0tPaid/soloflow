"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Lightbulb, Plane, Search, ShieldCheck, Warehouse } from "lucide-react";
import { SourcingLogo } from "@/components/brand/sourcing-logo";
import { Container } from "@/components/ui/primitives";
import { company } from "@/lib/content";
import { companyHighlights, heroExamples } from "@/lib/v2-content";

function AnimatedHeadlineWord({
  children,
  delay = 0,
}: {
  children: string;
  delay?: number;
}) {
  return (
    <span
      className="headline-shimmer inline-block"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </span>
  );
}

export function V2Hero() {
  const [query, setQuery] = useState("");
  const [exampleIdx, setExampleIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setExampleIdx((i) => (i + 1) % heroExamples.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden pt-20 pb-8 sm:pt-24 sm:pb-12">
      <div className="absolute inset-0 mission-grid" aria-hidden />
      <div
        className="pointer-events-none absolute left-1/2 top-16 h-[20rem] w-[20rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(214,0,0,0.12), transparent 68%)",
        }}
        aria-hidden
      />

      <Container className="relative max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold uppercase tracking-[0.28em] text-accent"
        >
          Welcome to
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.06, duration: 0.55 }}
          className="mt-3 flex justify-center sm:mt-4"
        >
          <SourcingLogo size="hero" showByline className="items-center" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-auto mt-3 flex items-center justify-center gap-2.5 sm:mt-4"
        >
          <Image
            src="/dun-bradstreet.png"
            alt="Dun & Bradstreet"
            width={48}
            height={40}
            className="h-8 w-auto object-contain sm:h-9"
            unoptimized
          />
          <div className="text-left">
            <p className="text-[11px] font-medium text-ink sm:text-xs">
              {company.credentials.dunBradstreet}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-muted sm:text-xs">
              DUNS {company.credentials.dunsNumber}
            </p>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.55 }}
          className="font-headline mx-auto mt-6 max-w-5xl text-[2.1rem] font-semibold leading-[1.06] text-ink sm:mt-8 sm:text-5xl md:text-6xl lg:text-[4.25rem]"
        >
          One Platform for Product <AnimatedHeadlineWord>Ideation</AnimatedHeadlineWord>
          {" "}
          &amp;{" "}
          <AnimatedHeadlineWord delay={0.8}>Sourcing</AnimatedHeadlineWord>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, duration: 0.5 }}
          className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:mt-5 sm:text-lg"
        >
          {company.description}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mx-auto mt-6 grid max-w-4xl gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4"
        >
          {companyHighlights.map((item) => (
            <li
              key={item.label}
              className="rounded-[1.5rem] border border-accent/30 bg-accent-soft px-5 py-5 text-center shadow-[0_12px_32px_rgba(214,0,0,0.08)] sm:px-6 sm:py-6"
            >
              <p className="font-highlight text-[1.85rem] leading-[1.05] text-accent sm:text-[2.05rem] md:text-[2.2rem]">
                {item.label}
              </p>
              <p className="mt-2.5 text-sm font-medium text-ink sm:text-base">{item.detail}</p>
            </li>
          ))}
        </motion.ul>

        <motion.form
          id="rfq"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.5 }}
          onSubmit={(e) => e.preventDefault()}
          className="glass-card mx-auto mt-6 flex max-w-2xl scroll-mt-28 items-center gap-3 rounded-[1.75rem] px-4 py-3 sm:mt-8 sm:px-5 sm:py-4"
        >
          <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <div className="relative min-w-0 flex-1 text-left">
            <label htmlFor="manufacture-search" className="sr-only">
              What do you want to manufacture?
            </label>
            <input
              id="manufacture-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you want to manufacture?"
              className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted/70"
            />
            {!query ? (
              <p className="pointer-events-none mt-1 truncate text-xs text-muted">
                Try{" "}
                <AnimatePresence mode="wait">
                  <motion.span
                    key={heroExamples[exampleIdx]}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="inline-block font-medium text-ink"
                  >
                    {heroExamples[exampleIdx]}
                  </motion.span>
                </AnimatePresence>
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            className="hidden shrink-0 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white sm:inline-flex"
          >
            Search
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="mx-auto mt-6 grid max-w-2xl gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4"
        >
          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
            <Link
              href="#rfq"
              className="hero-cta-primary group relative flex h-full flex-col overflow-hidden rounded-2xl px-5 py-5 text-left sm:px-6 sm:py-6"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(circle at 20% 0%, rgba(255,255,255,0.22), transparent 55%)",
                }}
                aria-hidden
              />
              <span className="relative inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                <Search className="h-3.5 w-3.5" aria-hidden />
                Existing product
              </span>
              <span className="relative mt-2 inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Start sourcing
                <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
              <span className="relative mt-2 text-sm leading-snug text-white/80">
                Match verified factories, MOQs, and lead times for SKUs that already exist.
              </span>
            </Link>
          </motion.div>

          <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
            <Link
              href="#new-idea"
              className="hero-cta-idea group relative flex h-full flex-col overflow-hidden rounded-2xl px-5 py-5 text-left sm:px-6 sm:py-6"
            >
              <span className="relative inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                Brand-new invention
              </span>
              <span className="relative mt-2 inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                <Lightbulb className="h-5 w-5 text-accent" aria-hidden />
                I have a new product idea
              </span>
              <span className="relative mt-2 text-sm leading-snug text-muted">
                NDA first — then we develop, sample, and source what has never been made.
              </span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          className="mx-auto mt-4 grid max-w-2xl gap-3 sm:grid-cols-2"
        >
          <Link
            href="#visit"
            className="group flex items-center gap-4 rounded-2xl border border-accent/35 bg-accent-soft px-5 py-4 text-left shadow-[0_12px_32px_rgba(214,0,0,0.1)] transition hover:border-accent/55"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Plane className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                China visit
              </span>
              <span className="mt-0.5 block text-sm font-medium text-ink sm:text-base">
                Schedule a factory trip — Xiamen hosts you
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-accent transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="#3pl"
            className="group flex items-center gap-4 rounded-2xl border border-accent/35 bg-accent-soft px-5 py-4 text-left shadow-[0_12px_32px_rgba(214,0,0,0.1)] transition hover:border-accent/55"
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Warehouse className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                3PL · Xiamen &amp; Dubai
              </span>
              <span className="mt-0.5 block text-sm font-medium text-ink sm:text-base">
                Own warehouses — receive, store, pick, pack, ship
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 shrink-0 text-accent transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}

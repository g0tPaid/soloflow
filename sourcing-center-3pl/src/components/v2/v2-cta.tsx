"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Lightbulb, Search, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/primitives";

export function V2Cta() {
  return (
    <section className="pb-16 pt-6 sm:pb-24 sm:pt-8">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-line bg-ink px-6 py-14 text-paper sm:px-12 sm:py-20"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(214,0,0,0.35), transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Ready to build your next product?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-paper/70 sm:text-lg">
              Two clear doors — source an existing SKU, or invent something new under NDA with
              Seven Color Trading Co Ltd · China.
            </p>
            <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2 sm:gap-4">
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
                <Link
                  href="#discovery"
                  className="hero-cta-primary group flex h-full flex-col rounded-2xl px-5 py-5 text-left sm:px-6 sm:py-6"
                >
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                    <Search className="h-3.5 w-3.5" aria-hidden />
                    Existing product
                  </span>
                  <span className="mt-2 inline-flex items-center gap-2 font-display text-xl font-semibold text-white">
                    Start sourcing
                    <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                  <span className="mt-2 text-sm text-white/80">
                    Factories, MOQ, and lead times for products that already ship.
                  </span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.985 }}>
                <Link
                  href="#new-idea"
                  className="group flex h-full flex-col rounded-2xl border border-white/20 bg-white px-5 py-5 text-left text-ink sm:px-6 sm:py-6"
                >
                  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    Brand-new invention
                  </span>
                  <span className="mt-2 inline-flex items-center gap-2 font-display text-xl font-semibold">
                    <Lightbulb className="h-5 w-5 text-accent" aria-hidden />
                    I have a new product idea
                  </span>
                  <span className="mt-2 text-sm text-muted">
                    NDA first — develop, sample, and source what has never been made.
                  </span>
                </Link>
              </motion.div>
            </div>
            <Link
              href="/3pl"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-paper transition hover:bg-white/15"
            >
              Own 3PL in Xiamen &amp; Dubai
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

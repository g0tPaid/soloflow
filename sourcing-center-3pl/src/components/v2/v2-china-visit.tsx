"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Check } from "lucide-react";
import { ChinaVisitForm } from "@/components/v2/china-visit-form";
import { Container } from "@/components/ui/primitives";
import { chinaVisit, chinaVisitDays, chinaVisitIncludes } from "@/lib/v2-content";

export function V2ChinaVisit() {
  return (
    <section id="visit" className="scroll-mt-28 py-8 sm:py-12">
      <Container>
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              {chinaVisit.eyebrow}
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
              {chinaVisit.title}
            </h2>
            <p className="mt-4 max-w-xl text-muted sm:text-lg">{chinaVisit.description}</p>
            <ul className="mt-6 space-y-2">
              {chinaVisitIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-ink">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 grid gap-4">
              {chinaVisitDays.map((day, i) => (
                <motion.article
                  key={day.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-[1.5rem] border border-line bg-paper-elevated p-5 sm:p-6"
                >
                  <h3 className="font-display text-xl font-semibold text-ink">{day.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{day.text}</p>
                </motion.article>
              ))}
            </div>
            <Link
              href="/visit"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-ink transition hover:text-accent"
            >
              Full visit page
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <ChinaVisitForm />
        </div>
      </Container>
    </section>
  );
}

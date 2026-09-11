"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { fulfillment, fulfillmentHubs, fulfillmentSteps } from "@/lib/v2-content";

export function V2ThreePl() {
  return (
    <section id="3pl" className="scroll-mt-28 border-t border-line bg-paper-elevated/60 py-14 sm:py-20 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
            {fulfillment.eyebrow}
          </p>
          <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            {fulfillment.title}
          </h2>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">{fulfillment.description}</p>
        </div>

        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {fulfillmentSteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="flex shrink-0 items-center gap-2"
            >
              <span className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink">
                {step.title}
              </span>
              {i < fulfillmentSteps.length - 1 ? (
                <span className="text-muted" aria-hidden>
                  →
                </span>
              ) : null}
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {fulfillmentSteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="glass-card rounded-[1.5rem] p-5 sm:p-6"
            >
              <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-accent">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.text}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {fulfillmentHubs.map((hub, i) => (
            <motion.div
              key={hub.city}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 + i * 0.04 }}
              className="rounded-[1.5rem] border border-line bg-paper p-5 sm:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{hub.role}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                {hub.city}
                <span className="text-muted"> · {hub.country}</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{hub.text}</p>
            </motion.div>
          ))}
        </div>

        <Link
          href="/logistics"
          className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink transition hover:text-accent"
        >
          Freight lanes and customs
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </Container>
    </section>
  );
}

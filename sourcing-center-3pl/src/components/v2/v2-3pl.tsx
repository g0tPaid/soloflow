"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Warehouse } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { fulfillment, fulfillmentHubs, fulfillmentSteps } from "@/lib/v2-content";

export function V2ThreePl() {
  return (
    <section id="3pl" className="scroll-mt-28 py-8 sm:py-12">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] border border-accent/40 bg-ink px-5 py-12 text-paper shadow-[0_24px_80px_rgba(214,0,0,0.18)] sm:px-10 sm:py-16 lg:px-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(ellipse 55% 70% at 12% 0%, rgba(214,0,0,0.42), transparent 58%), radial-gradient(ellipse 40% 50% at 88% 100%, rgba(214,0,0,0.18), transparent 55%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                <Warehouse className="h-3.5 w-3.5" aria-hidden />
                {fulfillment.eyebrow}
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-paper/55">
                Own warehouses · not a broker
              </span>
            </div>
            <h2 className="mt-5 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              {fulfillment.title}
            </h2>
            <p className="mt-4 max-w-2xl text-paper/70 sm:text-lg">{fulfillment.description}</p>

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
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-paper">
                    {step.title}
                  </span>
                  {i < fulfillmentSteps.length - 1 ? (
                    <span className="text-paper/40" aria-hidden>
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
                  className="rounded-[1.5rem] border border-white/10 bg-white/10 p-5 sm:p-6"
                >
                  <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 font-display text-xl font-semibold text-paper">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-paper/65">{step.text}</p>
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
                  className="rounded-[1.5rem] border border-white/10 bg-paper px-5 py-5 text-ink sm:px-6 sm:py-6"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{hub.role}</p>
                  <h3 className="mt-2 font-display text-2xl font-semibold">
                    {hub.city}
                    <span className="text-muted"> · {hub.country}</span>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{hub.text}</p>
                </motion.div>
              ))}
            </div>

            <Link
              href="/logistics"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Freight lanes and customs
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}

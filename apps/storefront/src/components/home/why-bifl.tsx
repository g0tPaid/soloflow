'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Wrench,
  Gem,
  Leaf,
  Clock3,
  BadgeCheck,
} from 'lucide-react';

const items = [
  {
    icon: Shield,
    title: 'Lifetime durability',
    body: 'Built for decades of daily use — not a season of trends.',
  },
  {
    icon: Wrench,
    title: 'Repairable',
    body: 'Parts, seams, and finishes that can be serviced, not discarded.',
  },
  {
    icon: Gem,
    title: 'Premium materials',
    body: 'Full grain, solid metal, natural fibers — materials that age well.',
  },
  {
    icon: Leaf,
    title: 'Sustainable',
    body: 'Buying once is the most practical form of sustainability.',
  },
  {
    icon: Clock3,
    title: 'Timeless design',
    body: 'Quiet forms that stay relevant long after fashion moves on.',
  },
  {
    icon: BadgeCheck,
    title: 'Expert curated',
    body: 'Every product answers: will this still be useful in 20 years?',
  },
];

export function WhyBifl() {
  return (
    <section className="border-y border-border bg-card">
      <div className="container-pt py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Philosophy</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Why Buy It For Life?</h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            We only sell products that last decades, can be repaired, and earn their place in a
            quieter, better-equipped life.
          </p>
        </div>
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="space-y-4"
            >
              <item.icon className="h-6 w-6 text-accent" strokeWidth={1.5} />
              <h3 className="font-serif text-2xl">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{item.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Wrench,
  Gem,
  Clock3,
  BadgeCheck,
} from 'lucide-react';
import { SITE } from '@/lib/site';

const icons = [Shield, Wrench, Clock3, BadgeCheck, Gem];

export function WhyBifl() {
  return (
    <section className="border-y border-border bg-card">
      <div className="container-pt py-24 md:py-32">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Philosophy</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Why Buy It For Life?</h2>
          <p className="mt-5 text-base leading-relaxed text-muted">
            {SITE.philosophy}
          </p>
        </div>
        <div className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {SITE.principles.map((item, i) => {
            const Icon = icons[i] || BadgeCheck;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.4 }}
                className="space-y-4"
              >
                <Icon className="h-6 w-6 text-accent" strokeWidth={1.5} />
                <h3 className="font-serif text-2xl">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{item.body}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

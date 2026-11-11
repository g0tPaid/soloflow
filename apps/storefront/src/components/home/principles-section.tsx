'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { SITE } from '@/lib/site';

export function PrinciplesSection() {
  return (
    <section className="border-b border-border bg-card">
      <div className="container-pt py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Our Principles</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">
            Every product must pass these tests.
          </h2>
        </div>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {SITE.principles.map((item, i) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="border-t border-border pt-5"
            >
              <div className="flex items-start gap-2 text-accent">
                <Check className="mt-1 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden />
                <h3 className="font-serif text-2xl leading-tight text-foreground">{item.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

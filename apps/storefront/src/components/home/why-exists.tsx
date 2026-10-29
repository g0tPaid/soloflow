'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export function WhyExistsSection() {
  return (
    <section className="bg-foreground text-background">
      <div className="container-pt py-24 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Why we exist</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
            Modern products are designed to fail. We refuse that bargain.
          </h2>
          <div className="prose-pt mt-8 space-y-5 text-white/70">
            <p>
              Planned obsolescence taught a generation to replace instead of repair. Cheap
              materials, sealed designs, and disposable culture made ownership feel temporary.
            </p>
            <p>
              Practical Things exists for the opposite: buy fewer things, choose better ones, and
              keep them working. Repair culture is not nostalgia — it is respect for craft, money,
              and the planet.
            </p>
            <p>
              Quality over quantity. Timeless over trendy. Objects worth recommending for decades.
            </p>
          </div>
          <Link
            href="/philosophy"
            className="mt-10 inline-flex text-sm font-medium text-white underline underline-offset-4 hover:text-white/80"
          >
            Read our philosophy →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

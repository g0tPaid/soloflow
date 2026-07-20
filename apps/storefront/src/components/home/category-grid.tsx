'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Category } from '@/lib/types';

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="container-pt py-24 md:py-32">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Browse</p>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Featured categories</h2>
        </div>
        <Link
          href="/shop"
          className="hidden text-[11px] uppercase tracking-[0.18em] text-muted hover:text-foreground md:inline"
        >
          View all
        </Link>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.45 }}
          >
            <Link href={`/shop?category=${cat.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-border/40">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  fill
                  sizes="(max-width:768px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-2xl">{cat.title}</h3>
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted transition group-hover:text-accent">
                  Shop
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{cat.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

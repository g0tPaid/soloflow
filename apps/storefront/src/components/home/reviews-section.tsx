import Image from 'next/image';
import type { Review } from '@/lib/types';

export function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section className="container-pt py-24 md:py-32">
      <div className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Stories</p>
        <h2 className="mt-3 font-serif text-4xl md:text-5xl">Customer reviews</h2>
      </div>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {reviews.map((review) => (
          <figure key={review.id} className="flex flex-col">
            <div className="relative aspect-[4/5] overflow-hidden bg-border/40">
              <Image
                src={review.image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width:768px) 100vw, 33vw"
              />
            </div>
            <blockquote className="mt-6 flex-1 font-serif text-2xl leading-snug text-foreground">
              “{review.quote}”
            </blockquote>
            <figcaption className="mt-5 text-sm text-muted">
              <span className="text-foreground">{review.name}</span>
              <span className="mx-2">·</span>
              {review.location}
              <span className="mt-1 block text-xs uppercase tracking-[0.14em]">
                {review.product}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

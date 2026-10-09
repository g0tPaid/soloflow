import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function HomeHero() {
  return (
    <section className="relative min-h-[92vh] w-full overflow-hidden bg-foreground">
      <Image
        src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2400&q=80"
        alt="Quiet home objects arranged with care"
        fill
        priority
        className="object-cover opacity-75"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/25 to-foreground/20" />
      <div className="relative z-10 flex min-h-[92vh] flex-col justify-end px-6 pb-16 pt-32 md:px-12 md:pb-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">
          Practical Things
        </p>
        <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[0.95] text-white md:text-7xl lg:text-8xl">
          Stop Buying Things Twice.
        </h1>
        <p className="mt-6 max-w-lg text-base leading-relaxed text-white/85 md:text-lg">
          The world&apos;s most trusted collection of products built to last.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/shop">
            <Button size="lg" className="bg-white text-foreground hover:bg-white/90 hover:text-foreground">
              Explore Collection
            </Button>
          </Link>
          <Link href="/philosophy">
            <Button
              size="lg"
              variant="secondary"
              className="border-white/50 bg-transparent text-white hover:bg-white hover:text-foreground"
            >
              Learn Our Philosophy
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

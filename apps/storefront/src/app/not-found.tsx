import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-pt py-32 text-center">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">404</p>
      <h1 className="mt-4 font-serif text-5xl">Page not found</h1>
      <p className="mt-4 text-sm text-muted">This object was not in the collection.</p>
      <Link href="/" className="mt-10 inline-block">
        <Button>Return home</Button>
      </Link>
    </div>
  );
}

import Link from 'next/link';
import { SITE } from '@/lib/site';

const columns = [
  {
    title: 'Shop',
    links: [
      { href: '/shop', label: 'All products' },
      { href: '/shop?category=kitchen', label: 'Kitchen' },
      { href: '/shop?category=travel', label: 'Travel' },
      { href: '/shop?category=tools', label: 'Tools' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/journal', label: 'Journal' },
      { href: '/contact', label: 'Contact' },
      { href: '/account', label: 'Account' },
    ],
  },
  {
    title: 'Help',
    links: [
      { href: '/contact#warranty', label: 'Warranty' },
      { href: '/contact#returns', label: 'Returns' },
      { href: '/contact#shipping', label: 'Shipping' },
      { href: '/contact#privacy', label: 'Privacy' },
      { href: '/contact#terms', label: 'Terms' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <div className="container-pt grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-3xl">{SITE.name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            {SITE.tagline} Curated products built to last a lifetime.
          </p>
          <div className="mt-8 flex gap-5 text-[11px] uppercase tracking-[0.18em] text-muted">
            <a href={SITE.social.instagram} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Instagram
            </a>
            <a href={SITE.social.pinterest} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Pinterest
            </a>
            <a href={SITE.social.youtube} target="_blank" rel="noreferrer" className="hover:text-foreground">
              YouTube
            </a>
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted">
              {col.title}
            </p>
            <ul className="mt-5 space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-foreground/90 hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-pt flex flex-col gap-2 border-t border-border py-6 text-xs text-muted md:flex-row md:justify-between">
        <p>© {new Date().getFullYear()} {SITE.name}. Buy once. Buy better.</p>
        <p>Designed for longevity — not trends.</p>
      </div>
    </footer>
  );
}

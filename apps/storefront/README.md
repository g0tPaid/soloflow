# Practical Things

Premium Buy It For Life ecommerce storefront.

**Buy Once. Buy Better.**

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · Framer Motion
- Zustand (cart / wishlist) · React Hook Form + Zod
- Shopify Storefront API ready · Sanity CMS ready

## Local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## What’s included

- Home (full-bleed hero, categories, BIFL philosophy, products, journal, reviews, newsletter)
- Shop with filters (material, country, warranty/score, brand, price, availability) + sort
- Product pages with gallery zoom, sticky buy panel, BIFL scores, maintenance, FAQ, related
- Cart drawer, wishlist, instant search (⌘K)
- Checkout (demo), account stubs
- Journal magazine layout + article schema
- About & Contact
- Sitemap · robots.txt · Open Graph · Product/Article JSON-LD

Until Shopify/Sanity credentials are set, the app uses a curated mock catalog in `src/lib/catalog.ts`.

## Connect commerce + CMS

1. Create a Shopify custom app → Storefront API token
2. Set `SHOPIFY_STORE_DOMAIN` + `SHOPIFY_STOREFRONT_TOKEN`
3. Create a Sanity project for homepage / journal / navigation
4. Set `NEXT_PUBLIC_SANITY_PROJECT_ID` (+ dataset / token)
5. Swap catalog reads to `src/lib/shopify.ts` and `src/lib/sanity.ts`

## Brand

| Token | Value |
|---|---|
| Background | `#FAFAF7` |
| Text | `#1B1B1B` |
| Accent | `#2E6F40` |
| Headings | Cormorant Garamond |
| Body | Inter |

## Deploy

Any Node host (Vercel / Railway / Netlify). Set `NEXT_PUBLIC_SITE_URL` to the production origin.

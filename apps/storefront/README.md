# Practical Things

Premium Buy It For Life ecommerce storefront.

**Buy less. Repair more. Keep what works.**

V1 centers the Practical Things philosophy: resist planned obsolescence, choose repairable
products, understand long-term ownership cost, and buy fewer objects that earn their place.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · Framer Motion
- Zustand (cart / wishlist) · React Hook Form + Zod
- Shopify Storefront API ready · Sanity CMS ready
- Shopify OS 2.0 theme scaffold in `/themes/practical-things`

## Local

```bash
pnpm install
cp .env.example .env.local
pnpm dev -- --port 3002
```

Open [http://localhost:3002](http://localhost:3002).

## What’s included

- Home (hero, principles, collections, products, ownership stories, journal, newsletter)
- Shop filters: lifespan, repairability, country, warranty, material, lifetime warranty, spare parts, editor rating, weight, category, brand, price
- Product pages with gallery, story, BIFL scores, long-term cost, pros/cons, maintenance, reviews, FAQ schema
- Philosophy, 10 buying guides, community contribution forms
- Journal with reading progress, category tags, search, author pages
- Cart drawer, wishlist, instant search (⌘K)
- Sitemap · robots.txt · Open Graph · Organization/Product/Article/FAQ/Breadcrumb JSON-LD

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
| Background | `#FAFAF8` |
| Cards | `#FFFFFF` |
| Text | `#111111` |
| Secondary | `#666666` |
| Accent | `#245C4A` |
| Borders | `#E8E8E8` |
| Headings | Cormorant Garamond |
| Body | Inter |

## Deploy

See `DEPLOY.md` for Railway notes.

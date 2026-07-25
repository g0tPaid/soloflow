# Practical Things Shopify Theme

Shopify OS 2.0 scaffold for the Practical Things brand.

## Status

This is an installable theme starting point with brand settings, JSON templates, Liquid sections,
and snippets. The live commerce preview for Practical Things currently uses the Next.js storefront
in `apps/storefront`.

## Install locally

```bash
shopify theme dev --path themes/practical-things
```

To push to a development theme:

```bash
shopify theme push --path themes/practical-things --development
```

## Brand notes

- Background: `#FAFAF8`
- Card: `#FFFFFF`
- Text: `#111111`
- Muted: `#666666`
- Accent: `#245C4A`
- Border: `#E8E8E8`
- Headings: Cormorant Garamond
- Body: Inter

## Commerce wiring still needed

- Connect Practical Things product metafields for lifespan, repairability, warranty, material,
  country, rating, and ownership cost.
- Replace collection filter stubs with tag, search, or metafield filtering.
- Add production font loading for Cormorant Garamond and Inter.
- Expand cart, search, article, blog, and page templates beyond the editorial stubs.

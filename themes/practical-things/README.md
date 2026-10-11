# Practical Things Shopify Theme

Shopify OS 2.0 theme scaffold aligned with the Practical Things V1 storefront.

## Status

Installable theme with brand settings, JSON templates, Liquid sections, and snippets.
Product durability data is expected under `product.metafields.practical.*`.
The live commerce preview currently uses the Next.js storefront in `apps/storefront`.

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
- Headings: Cormorant Garamond (Google Fonts)
- Body: Inter (Google Fonts)

## Templates

- Homepage hero matches V1 copy and dual CTAs
- Product page includes ownership specs, story, why recommend, pros/cons, maintenance, spare parts, related products
- Collection filters stub lifespan, repairability, country, warranty, material, lifetime warranty, spare parts, editor rating, weight, category
- Cart and search use dedicated `main-cart` / `main-search` sections
- Organization JSON-LD is emitted from `snippets/meta-tags.liquid`

## Commerce wiring still needed

- Populate Practical Things metafields (`lifespan`, `repairability`, `warranty`, `country`, `materials`, `rating`, `story`, `why_recommend`, `pros`, `cons`, `maintenance`, `spare_parts`, `weight`)
- Replace collection filter stubs with live tag, search, or metafield filtering
- Expand article, blog, and page templates beyond editorial stubs

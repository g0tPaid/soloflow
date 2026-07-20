export const SITE = {
  name: 'Practical Things',
  tagline: 'Buy Once. Buy Better.',
  description:
    'Curated Buy It For Life products — repairable, timeless, and built to last decades.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://practicalthings.com',
  email: 'hello@practicalthings.com',
  social: {
    instagram: 'https://instagram.com/practicalthings',
    pinterest: 'https://pinterest.com/practicalthings',
    youtube: 'https://youtube.com/@practicalthings',
  },
} as const;

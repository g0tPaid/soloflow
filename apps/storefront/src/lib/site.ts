export const SITE = {
  name: 'Practical Things',
  tagline: 'Buy better things, keep them longer.',
  description:
    'Practical Things curates durable, repairable, timeless products worth owning for decades.',
  philosophy:
    'We believe the most practical purchase is the one that works beautifully, can be repaired, and earns its place year after year.',
  principles: [
    {
      title: 'Built to Last',
      body: 'Materials, construction, and maker reputation must support decades of real use.',
    },
    {
      title: 'Repairable',
      body: 'We favor products with serviceable parts, simple construction, and repair paths.',
    },
    {
      title: 'Timeless Design',
      body: 'Quiet, proven forms age better than trend-driven novelty.',
    },
    {
      title: 'Excellent Warranty',
      body: 'A strong warranty signals a maker willing to stand behind the work.',
    },
    {
      title: 'Worth Every Dollar',
      body: 'The best value is measured over years owned, not the lowest checkout price.',
    },
  ],
  newsletter: {
    eyebrow: 'Newsletter',
    title: 'Own less. Own better.',
    description: 'Join thousands of people learning how to buy better and own longer.',
  },
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://practicalthings.com',
  email: 'hello@practicalthings.com',
  social: {
    instagram: 'https://instagram.com/practicalthings',
    pinterest: 'https://pinterest.com/practicalthings',
    youtube: 'https://youtube.com/@practicalthings',
  },
} as const;

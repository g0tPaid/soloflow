import type { Article, Category, Product, Review } from './types';

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const categories: Category[] = [
  {
    slug: 'kitchen',
    title: 'Kitchen',
    description: 'Cookware and tools that outlast trends.',
    image: img('photo-1556910103-1c02745aae4d'),
  },
  {
    slug: 'tools',
    title: 'Tools',
    description: 'Hand tools worth handing down.',
    image: img('photo-1530124566582-a618bc2615dc'),
  },
  {
    slug: 'travel',
    title: 'Travel',
    description: 'Bags and kits built for decades of miles.',
    image: img('photo-1553062407-98eeb64c6a62'),
  },
  {
    slug: 'office',
    title: 'Office',
    description: 'Desk essentials with lasting craft.',
    image: img('photo-1497032628192-86f99bcd76bc'),
  },
  {
    slug: 'home',
    title: 'Home',
    description: 'Quiet objects that age with the house.',
    image: img('photo-1616486338812-3dadae4b4ace'),
  },
  {
    slug: 'outdoor',
    title: 'Outdoor',
    description: 'Gear for weather, not seasons.',
    image: img('photo-1551632811-561732d1e306'),
  },
];

export const products: Product[] = [
  {
    id: 'pt-cast-iron',
    slug: 'heirloom-cast-iron-skillet',
    title: 'Heirloom Cast Iron Skillet',
    subtitle: '12" pre-seasoned, made to cook for generations.',
    description:
      'A single-piece cast iron skillet with a polished cooking surface and pour spouts. Seasoned for immediate use, designed for a lifetime of heat cycles. No coatings. No planned obsolescence.',
    price: 145,
    images: [
      img('photo-1556911220-bff31c812dba'),
      img('photo-1604908176997-125f25cc6f3d'),
      img('photo-1506368249639-73a05d4d3072'),
    ],
    category: 'kitchen',
    brand: 'Field & Forge',
    material: 'Cast iron',
    countryOfOrigin: 'USA',
    manufacturer: 'Field & Forge Foundry',
    warranty: 'Lifetime',
    repairabilityScore: 95,
    lifetimeScore: 98,
    overallRating: 4.9,
    scores: {
      lifetime: 98,
      repairability: 95,
      materialQuality: 96,
      manufacturerReputation: 94,
      warranty: 100,
    },
    badges: ['Lifetime Warranty', 'Repairable', "Editor's Pick", 'Made in USA'],
    whyWeChose:
      'Cast iron improves with use. This skillet is machined flat, heavy enough for heat retention, and simple enough to reseason forever. It will still cook well in 2050.',
    maintenance: [
      'Wash with hot water and a soft brush; avoid soap when possible.',
      'Dry thoroughly and wipe with a thin coat of oil.',
      'Reseason at 450°F if food begins to stick.',
    ],
    faq: [
      {
        q: 'Is it pre-seasoned?',
        a: 'Yes. It arrives ready to cook. Seasoning deepens with every meal.',
      },
      {
        q: 'Can it go in the oven?',
        a: 'Yes — oven-safe to 500°F. The handle stays cool longer than thin pans.',
      },
    ],
    variants: [
      { id: '10', title: '10 inch', available: true, price: 120 },
      { id: '12', title: '12 inch', available: true, price: 145 },
    ],
    inStock: true,
    featured: true,
    editorPick: true,
    shippingNote: 'Ships in 2–4 business days',
  },
  {
    id: 'pt-backpack',
    slug: 'full-grain-daypack',
    title: 'Full Grain Daypack',
    subtitle: 'Vegetable-tanned leather. Built for twenty years of commuting.',
    description:
      'A structured daypack in full-grain leather with solid brass hardware and a cotton canvas lining. Designed to develop a rich patina, not peel or crack like bonded leather.',
    price: 420,
    images: [
      img('photo-1553062407-98eeb64c6a62'),
      img('photo-1548036328-c9fa89d128fa'),
      img('photo-1622560480605-d83c853bc5c3'),
    ],
    category: 'travel',
    brand: 'Atelier North',
    material: 'Full grain leather',
    countryOfOrigin: 'Italy',
    manufacturer: 'Atelier North',
    warranty: '10 years',
    repairabilityScore: 92,
    lifetimeScore: 94,
    overallRating: 4.8,
    scores: {
      lifetime: 94,
      repairability: 92,
      materialQuality: 97,
      manufacturerReputation: 91,
      warranty: 88,
    },
    badges: ['Repairable', "Editor's Pick", 'Handmade', 'Sustainable'],
    whyWeChose:
      'Most backpacks fail at zippers and seams. This one uses replaceable brass hardware, thick leather panels, and a pattern that ages into character instead of wear.',
    maintenance: [
      'Condition leather twice a year with a neutral cream.',
      'Keep dry overnight if soaked; air dry away from heat.',
      'Hardware can be replaced by any leather workshop.',
    ],
    faq: [
      {
        q: 'Will the color darken?',
        a: 'Yes. Full grain leather deepens and softens with use — that is intended.',
      },
    ],
    variants: [
      { id: 'tan', title: 'Natural Tan', available: true },
      { id: 'black', title: 'Black', available: true },
    ],
    inStock: true,
    featured: true,
    editorPick: true,
  },
  {
    id: 'pt-chef-knife',
    slug: 'carbon-steel-gyuto',
    title: 'Carbon Steel Gyuto',
    subtitle: '210mm blade. Sharpens for a lifetime.',
    description:
      'A Japanese gyuto forged from high-carbon steel with a wa handle in magnolia and buffalo horn. Carbon steel takes a sharper edge than stainless and rewards care.',
    price: 285,
    images: [
      img('photo-1593618998160-e34014e67546'),
      img('photo-1566454825481-9c31bd4d803f'),
    ],
    category: 'kitchen',
    brand: 'Kuroba',
    material: 'Carbon steel / Magnolia',
    countryOfOrigin: 'Japan',
    manufacturer: 'Kuroba Forge',
    warranty: 'Lifetime against defects',
    repairabilityScore: 90,
    lifetimeScore: 96,
    overallRating: 4.9,
    scores: {
      lifetime: 96,
      repairability: 90,
      materialQuality: 98,
      manufacturerReputation: 95,
      warranty: 92,
    },
    badges: ['Made in Japan', 'Repairable', "Editor's Pick"],
    whyWeChose:
      'If a knife cannot be sharpened indefinitely, it is disposable. This gyuto is forged to be reshaped, repaired, and used for decades.',
    maintenance: [
      'Hand wash and dry immediately.',
      'Oil the blade lightly if storing unused.',
      'Hone before each use; stone-sharpen as needed.',
    ],
    faq: [
      {
        q: 'Will it rust?',
        a: 'Carbon steel can patina and spot if left wet. Wipe dry after use — the patina is part of its character.',
      },
    ],
    variants: [{ id: '210', title: '210mm', available: true }],
    inStock: true,
    featured: true,
  },
  {
    id: 'pt-wool-blanket',
    slug: 'heritage-wool-blanket',
    title: 'Heritage Wool Blanket',
    subtitle: 'Heavyweight virgin wool. Warmth without obsolescence.',
    description:
      'A tightly woven virgin wool blanket with whipstitch edges. Naturally flame-resistant, odor-resistant, and repairable by any capable tailor.',
    price: 265,
    images: [
      img('photo-1631679706909-1844c1f6b6d3'),
      img('photo-1584100936595-c0654b55a2e2'),
    ],
    category: 'home',
    brand: 'North Loom',
    material: 'Virgin wool',
    countryOfOrigin: 'Scotland',
    manufacturer: 'North Loom Mills',
    warranty: '25 years',
    repairabilityScore: 88,
    lifetimeScore: 93,
    overallRating: 4.7,
    scores: {
      lifetime: 93,
      repairability: 88,
      materialQuality: 94,
      manufacturerReputation: 90,
      warranty: 90,
    },
    badges: ['Sustainable', 'Best Value', 'Limited Batch'],
    whyWeChose:
      'Synthetics pill and shed microplastics. This wool blanket can be cleaned, darned, and passed down — it does not need replacing every few winters.',
    maintenance: [
      'Air outdoors seasonally.',
      'Spot clean; professional clean when needed.',
      'Store with cedar, not mothballs.',
    ],
    faq: [],
    variants: [
      { id: 'grey', title: 'Heather Grey', available: true },
      { id: 'forest', title: 'Forest', available: false },
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'pt-mechanic-tool',
    slug: 'socket-set-chrome-vanadium',
    title: 'Chrome Vanadium Socket Set',
    subtitle: '72-tooth ratchet. Tools you buy once.',
    description:
      'A complete metric/SAE socket set in chrome vanadium steel with a lifetime replacement guarantee. Foam-lined case. No chrome flaking. No plastic ratchets.',
    price: 198,
    images: [
      img('photo-1530124566582-a618bc2615dc'),
      img('photo-1504148455328-c376907d081c'),
    ],
    category: 'tools',
    brand: 'Forgewright',
    material: 'Chrome vanadium steel',
    countryOfOrigin: 'Germany',
    manufacturer: 'Forgewright GmbH',
    warranty: 'Lifetime',
    repairabilityScore: 85,
    lifetimeScore: 97,
    overallRating: 4.8,
    scores: {
      lifetime: 97,
      repairability: 85,
      materialQuality: 95,
      manufacturerReputation: 93,
      warranty: 100,
    },
    badges: ['Lifetime Warranty', 'Made in Germany', 'Best Value'],
    whyWeChose:
      'Cheap tool sets fail at the ratchet. This one is rebuildable, warrantied for life, and precise enough for professional work.',
    maintenance: ['Wipe clean after use.', 'Light oil on ratchet mechanism yearly.'],
    faq: [],
    variants: [{ id: 'full', title: 'Full Set', available: true }],
    inStock: true,
    featured: true,
  },
  {
    id: 'pt-notebook',
    slug: 'linen-hardcover-notebook',
    title: 'Linen Hardcover Notebook',
    subtitle: 'Archival paper. A notebook worth keeping.',
    description:
      'Lay-flat binding, fountain-pen friendly paper, and a linen cover that ages gracefully. Designed as a lasting record, not a disposable pad.',
    price: 48,
    images: [
      img('photo-1531346878377-a5be20888e57'),
      img('photo-1517842645767-c639042777db'),
    ],
    category: 'office',
    brand: 'Plain & Ruled',
    material: 'Linen / Archival paper',
    countryOfOrigin: 'Japan',
    manufacturer: 'Plain & Ruled',
    warranty: '1 year',
    repairabilityScore: 70,
    lifetimeScore: 85,
    overallRating: 4.6,
    scores: {
      lifetime: 85,
      repairability: 70,
      materialQuality: 90,
      manufacturerReputation: 88,
      warranty: 60,
    },
    badges: ['Made in Japan', 'Sustainable', "Editor's Pick"],
    whyWeChose:
      'Most notebooks yellow and fall apart. Archival paper and sewn binding mean your notes remain readable for decades.',
    maintenance: ['Store flat away from humidity.'],
    faq: [],
    variants: [
      { id: 'a5', title: 'A5 Lined', available: true },
      { id: 'a5dot', title: 'A5 Dot', available: true },
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'pt-thermos',
    slug: 'double-wall-steel-flask',
    title: 'Double-Wall Steel Flask',
    subtitle: '24 hours cold. A lifetime of refills.',
    description:
      '18/8 stainless steel, vacuum insulated, with a replaceable gasket and a lid designed to be serviced — not thrown away.',
    price: 68,
    images: [
      img('photo-1602143407151-7111542de6e8'),
      img('photo-1523362628745-0c100150b504'),
    ],
    category: 'outdoor',
    brand: 'Trail Keep',
    material: '18/8 stainless steel',
    countryOfOrigin: 'USA',
    manufacturer: 'Trail Keep',
    warranty: 'Lifetime',
    repairabilityScore: 91,
    lifetimeScore: 95,
    overallRating: 4.7,
    scores: {
      lifetime: 95,
      repairability: 91,
      materialQuality: 93,
      manufacturerReputation: 89,
      warranty: 100,
    },
    badges: ['Lifetime Warranty', 'Repairable', 'Made in USA', 'Sustainable'],
    whyWeChose:
      'Most bottles fail when the seal wears out. Trail Keep sells replacement gaskets — the flask itself should outlast you.',
    maintenance: [
      'Hand wash; avoid dishwashers for the lid.',
      'Replace gasket every few years.',
    ],
    faq: [],
    variants: [
      { id: '500', title: '500ml', available: true },
      { id: '750', title: '750ml', available: true },
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'pt-desk-lamp',
    slug: 'brass-task-lamp',
    title: 'Brass Task Lamp',
    subtitle: 'Weighted base. Replaceable bulb. Timeless form.',
    description:
      'A machined brass task lamp with a fabric cord and a standard E26 socket. Built to be rewired, repolished, and kept on the desk for decades.',
    price: 310,
    images: [
      img('photo-1507473885765-e6ed057f782c'),
      img('photo-1513506003901-1e6a229e2d15'),
    ],
    category: 'office',
    brand: 'Studio Meridian',
    material: 'Solid brass',
    countryOfOrigin: 'USA',
    manufacturer: 'Studio Meridian',
    warranty: '15 years',
    repairabilityScore: 94,
    lifetimeScore: 96,
    overallRating: 4.8,
    scores: {
      lifetime: 96,
      repairability: 94,
      materialQuality: 97,
      manufacturerReputation: 90,
      warranty: 85,
    },
    badges: ['Repairable', 'Handmade', 'Made in USA', "Editor's Pick"],
    whyWeChose:
      'LED-integrated lamps die with their drivers. This lamp uses replaceable bulbs and serviceable wiring — light that lasts as long as brass does.',
    maintenance: [
      'Polish brass as desired, or let it patina.',
      'Any electrician can rewire the cord.',
    ],
    faq: [],
    variants: [
      { id: 'natural', title: 'Natural Brass', available: true },
      { id: 'blackened', title: 'Blackened Brass', available: true },
    ],
    inStock: true,
    featured: true,
  },
];

export const articles: Article[] = [
  {
    slug: 'why-cast-iron-beats-nonstick',
    title: 'Why Cast Iron Beats Nonstick',
    excerpt:
      'Coatings fail. Iron improves. A clear case for cookware that gets better with time.',
    cover: img('photo-1556911220-bff31c812dba'),
    author: {
      name: 'Elena Marsh',
      role: 'Editor',
      avatar: img('photo-1494790108377-be9c29b29330', 200),
    },
    publishedAt: '2026-03-12',
    tags: ['Kitchen', 'Materials'],
    body: [
      'Nonstick pans are designed to be replaced. Their coatings degrade, flake, and eventually fail — often within a few years of regular use.',
      'Cast iron asks for attention, not replacement. Seasoning builds a natural cooking surface that improves with heat cycles. Scratches do not ruin it. They become part of its history.',
      'When you buy a well-made skillet, you are buying decades of meals — and a tool your children can inherit.',
    ],
  },
  {
    slug: 'the-last-backpack-youll-ever-buy',
    title: "The Last Backpack You'll Ever Buy",
    excerpt:
      'What separates a bag that lasts two years from one that lasts twenty.',
    cover: img('photo-1553062407-98eeb64c6a62'),
    author: {
      name: 'Jonah Reed',
      role: 'Product Lead',
      avatar: img('photo-1507003211169-0a1dd7228f2d', 200),
    },
    publishedAt: '2026-02-28',
    tags: ['Travel', 'Leather'],
    body: [
      'Most backpacks fail quietly: a zipper tooth, a frayed strap, a foam panel that collapses. The product looks fine until it suddenly is not.',
      'A buy-it-for-life bag is repairable by design. Hardware can be replaced. Leather can be conditioned. Seams are built for stress, not for a season.',
      'Pay more once. Carry it for decades.',
    ],
  },
  {
    slug: 'the-beauty-of-full-grain-leather',
    title: 'The Beauty of Full Grain Leather',
    excerpt: 'Patina is not damage. It is proof of a material that lasts.',
    cover: img('photo-1548036328-c9fa89d128fa'),
    author: {
      name: 'Elena Marsh',
      role: 'Editor',
      avatar: img('photo-1494790108377-be9c29b29330', 200),
    },
    publishedAt: '2026-01-18',
    tags: ['Materials'],
    body: [
      'Full grain leather keeps the natural surface of the hide. It scratches, darkens, and softens — and grows more beautiful for it.',
      'Corrected grain and bonded leather try to look perfect forever. They peel instead.',
    ],
  },
  {
    slug: 'things-worth-buying-once',
    title: 'Things Worth Buying Once',
    excerpt: 'A shortlist of objects that repay their cost in years of use.',
    cover: img('photo-1616486338812-3dadae4b4ace'),
    author: {
      name: 'Sam Okonkwo',
      role: 'Curator',
      avatar: img('photo-1472099645785-5658abf4ff4e', 200),
    },
    publishedAt: '2025-12-04',
    tags: ['Philosophy'],
    body: [
      'Buying once is not about luxury. It is about refusing the cycle of cheap replacements.',
      'The right knife, blanket, lamp, or tool can remove dozens of future purchases from your life.',
    ],
  },
  {
    slug: 'repair-instead-of-replace',
    title: 'Repair Instead of Replace',
    excerpt: 'Repairability is the most honest measure of quality.',
    cover: img('photo-1581091226825-a6a2a5aee158'),
    author: {
      name: 'Jonah Reed',
      role: 'Product Lead',
      avatar: img('photo-1507003211169-0a1dd7228f2d', 200),
    },
    publishedAt: '2025-11-09',
    tags: ['Repair', 'Philosophy'],
    body: [
      'If a product cannot be opened, serviced, or parts-replaced, it was designed to be discarded.',
      'We score every product for repairability — because longevity without repair is just marketing.',
    ],
  },
];

export const reviews: Review[] = [
  {
    id: 'r1',
    name: 'Marcus T.',
    location: 'Portland, OR',
    quote:
      'I bought the skillet three years ago. It cooks better now than the day it arrived.',
    product: 'Heirloom Cast Iron Skillet',
    image: img('photo-1556911220-bff31c812dba', 800),
    rating: 5,
  },
  {
    id: 'r2',
    name: 'Priya N.',
    location: 'Brooklyn, NY',
    quote:
      'The daypack has become part of my uniform. Scuffs look intentional. Hardware still perfect.',
    product: 'Full Grain Daypack',
    image: img('photo-1553062407-98eeb64c6a62', 800),
    rating: 5,
  },
  {
    id: 'r3',
    name: 'Daniel K.',
    location: 'Austin, TX',
    quote:
      'Finally a tool set I trust enough to lend — and know I will get back intact.',
    product: 'Chrome Vanadium Socket Set',
    image: img('photo-1530124566582-a618bc2615dc', 800),
    rating: 5,
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}

export function getProductsByCategory(slug: string) {
  return products.filter((p) => p.category === slug);
}

export function searchCatalog(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return { products: [], articles: [] };
  return {
    products: products.filter((p) =>
      [p.title, p.brand, p.material, p.category, p.countryOfOrigin]
        .join(' ')
        .toLowerCase()
        .includes(q),
    ),
    articles: articles.filter((a) =>
      [a.title, a.excerpt, ...a.tags].join(' ').toLowerCase().includes(q),
    ),
  };
}

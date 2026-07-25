export type CategorySlug =
  | 'kitchen'
  | 'workshop'
  | 'tools'
  | 'travel'
  | 'office'
  | 'home'
  | 'outdoors'
  | 'photography'
  | 'everyday-carry'
  | 'coffee'
  | 'cooking'
  | 'writing'
  | 'garage'
  | 'camping'
  | 'bathroom'
  | 'bedroom'
  | 'garden';

export type ProductBadge =
  | 'Lifetime Worthy'
  | 'Lifetime Warranty'
  | 'Repairable'
  | "Editor's Pick"
  | 'Best Value'
  | 'Premium Choice'
  | 'Made in Japan'
  | 'Made in Germany'
  | 'Made in USA'
  | 'Field Tested'
  | 'Community Favorite';

export type BiflScores = {
  lifetime: number;
  repairability: number;
  materialQuality: number;
  manufacturerReputation: number;
  warranty: number;
};

export type ProductVariant = {
  id: string;
  title: string;
  available: boolean;
  price?: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  category: CategorySlug;
  brand: string;
  material: string;
  materials?: string[];
  countryOfOrigin: string;
  manufacturer: string;
  warranty: string;
  expectedLifespan: string;
  longTermCostCheap: number;
  longTermCostPremium: number;
  cheapAlternativeName: string;
  premiumYears: number;
  pros: string[];
  cons: string[];
  whoShouldBuy: string[];
  whoShouldNotBuy: string[];
  sparePartsAvailable: boolean;
  repairable: boolean;
  repairabilityScore: number;
  lifetimeScore: number;
  overallRating: number;
  scores: BiflScores;
  badges: ProductBadge[];
  whyWeChose: string;
  maintenance: string[];
  faq: { q: string; a: string }[];
  variants: ProductVariant[];
  inStock: boolean;
  featured?: boolean;
  editorPick?: boolean;
  shippingNote?: string;
};

export type Category = {
  slug: CategorySlug;
  title: string;
  description: string;
  image: string;
};

export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  author: { name: string; role: string; avatar: string };
  publishedAt: string;
  tags: string[];
  body: string[];
};

export type GuideSection = {
  h2: string;
  paragraphs: string[];
};

export type BuyingGuide = {
  slug: string;
  title: string;
  excerpt: string;
  intro: string;
  sections: GuideSection[];
  faqs: { q: string; a: string }[];
  relatedProductSlugs: string[];
  publishedAt: string;
  readingMinutes: number;
  seoTitle: string;
  seoDescription: string;
};

export type Review = {
  id: string;
  name: string;
  location: string;
  quote: string;
  product: string;
  image: string;
  rating: number;
};

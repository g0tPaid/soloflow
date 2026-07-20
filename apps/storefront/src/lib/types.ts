export type CategorySlug =
  | 'kitchen'
  | 'tools'
  | 'travel'
  | 'office'
  | 'home'
  | 'outdoor';

export type ProductBadge =
  | 'Lifetime Warranty'
  | 'Repairable'
  | "Editor's Pick"
  | 'Best Value'
  | 'Made in Japan'
  | 'Made in Germany'
  | 'Made in USA'
  | 'Handmade'
  | 'Limited Batch'
  | 'Sustainable';

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
  countryOfOrigin: string;
  manufacturer: string;
  warranty: string;
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

export type Review = {
  id: string;
  name: string;
  location: string;
  quote: string;
  product: string;
  image: string;
  rating: number;
};

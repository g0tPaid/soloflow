import { HomeHero } from '@/components/home/hero';
import { PrinciplesSection } from '@/components/home/principles-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedProducts } from '@/components/home/featured-products';
import { WhyExistsSection } from '@/components/home/why-exists';
import { EditorialSection } from '@/components/home/editorial-section';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { articles, categories, products } from '@/lib/catalog';

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <PrinciplesSection />
      <CategoryGrid categories={categories} />
      <FeaturedProducts products={products.filter((p) => p.featured).slice(0, 8)} />
      <WhyExistsSection />
      <EditorialSection articles={articles} />
      <NewsletterSection />
    </>
  );
}

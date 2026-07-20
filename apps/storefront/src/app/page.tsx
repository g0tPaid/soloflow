import { HomeHero } from '@/components/home/hero';
import { CategoryGrid } from '@/components/home/category-grid';
import { WhyBifl } from '@/components/home/why-bifl';
import { FeaturedProducts } from '@/components/home/featured-products';
import { EditorialSection } from '@/components/home/editorial-section';
import { ReviewsSection } from '@/components/home/reviews-section';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { articles, categories, products, reviews } from '@/lib/catalog';

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <CategoryGrid categories={categories} />
      <WhyBifl />
      <FeaturedProducts products={products.filter((p) => p.featured).slice(0, 8)} />
      <EditorialSection articles={articles} />
      <ReviewsSection reviews={reviews} />
      <NewsletterSection />
    </>
  );
}

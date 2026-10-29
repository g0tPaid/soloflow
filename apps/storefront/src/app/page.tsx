import { HomeHero } from '@/components/home/hero';
import { PrinciplesSection } from '@/components/home/principles-section';
import { CategoryGrid } from '@/components/home/category-grid';
import { FeaturedProducts } from '@/components/home/featured-products';
import { WhyExistsSection } from '@/components/home/why-exists';
import { ReviewsSection } from '@/components/home/reviews-section';
import { EditorialSection } from '@/components/home/editorial-section';
import { NewsletterSection } from '@/components/home/newsletter-section';
import { articles, categories, products, reviews } from '@/lib/catalog';
import { SITE } from '@/lib/site';
import { JsonLd } from '@/components/seo/json-ld';

export default function HomePage() {
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    sameAs: [SITE.social.instagram, SITE.social.pinterest, SITE.social.youtube],
  };

  const webSiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/shop?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <JsonLd data={[orgLd, webSiteLd]} />
      <HomeHero />
      <PrinciplesSection />
      <CategoryGrid categories={categories} />
      <FeaturedProducts products={products.filter((p) => p.featured).slice(0, 8)} />
      <WhyExistsSection />
      <ReviewsSection reviews={reviews} />
      <EditorialSection articles={articles} />
      <NewsletterSection />
    </>
  );
}

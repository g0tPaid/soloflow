import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, products, reviews } from '@/lib/catalog';
import { ProductDetail } from '@/components/product/product-detail';
import { SITE } from '@/lib/site';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: 'Product' };
  return {
    title: product.title,
    description: product.subtitle,
    openGraph: {
      title: product.title,
      description: product.subtitle,
      images: [{ url: product.images[0] }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.subtitle,
      images: [product.images[0]],
    },
    alternates: { canonical: `${SITE.url}/products/${product.slug}` },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);
  const productReviews = reviews.filter((r) => r.product === product.title);
  const fallbackReviews = productReviews.length ? productReviews : reviews.slice(0, 2);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    image: product.images,
    description: product.description,
    brand: { '@type': 'Brand', name: product.brand },
    material: product.material,
    countryOfOrigin: product.countryOfOrigin,
    weight: {
      '@type': 'QuantitativeValue',
      value: product.weightGrams,
      unitCode: 'GRM',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: product.overallRating,
      reviewCount: Math.max(fallbackReviews.length, 3),
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE.url}/shop` },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${SITE.url}/products/${product.slug}`,
      },
    ],
  };

  const faqLd =
    product.faq.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: product.faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }
      : null;

  return (
    <>
      <JsonLd data={[productLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])]} />
      <ProductDetail product={product} related={related} reviews={fallbackReviews} />
    </>
  );
}

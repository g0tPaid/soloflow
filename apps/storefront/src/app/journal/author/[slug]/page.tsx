import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAuthor, getAuthors } from '@/lib/authors';
import { readingTime } from '@/lib/utils';
import { SITE } from '@/lib/site';
import { JsonLd } from '@/components/seo/json-ld';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAuthors().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return { title: 'Author' };
  return {
    title: `${author.name} — Journal`,
    description: `Articles by ${author.name}, ${author.role} at Practical Things.`,
    alternates: { canonical: `${SITE.url}/journal/author/${author.slug}` },
  };
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    url: `${SITE.url}/journal/author/${author.slug}`,
    image: author.avatar,
    worksFor: { '@type': 'Organization', name: SITE.name, url: SITE.url },
  };

  return (
    <div className="container-pt py-14 md:py-20">
      <JsonLd data={personLd} />
      <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full bg-border">
          <Image src={author.avatar} alt="" fill className="object-cover" sizes="96px" />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Author</p>
          <h1 className="mt-2 font-serif text-5xl">{author.name}</h1>
          <p className="mt-2 text-sm text-muted">{author.role}</p>
        </div>
      </div>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        {author.articles.map((article) => (
          <Link key={article.slug} href={`/journal/${article.slug}`} className="group block">
            <div className="relative aspect-[16/10] overflow-hidden bg-border/40">
              <Image
                src={article.cover}
                alt=""
                fill
                className="object-cover transition duration-700 group-hover:scale-[1.02]"
                sizes="(max-width:768px) 100vw, 50vw"
              />
            </div>
            <p className="mt-5 text-[11px] uppercase tracking-[0.16em] text-muted">
              {article.tags[0]} · {readingTime(article.body.join(' '))} min
            </p>
            <h2 className="mt-2 font-serif text-3xl group-hover:text-accent">{article.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{article.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

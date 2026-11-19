import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { CtaBand } from "@/components/shared/page-shell";
import { Container } from "@/components/ui/primitives";
import { company } from "@/lib/content";
import { absoluteUrl, threePlFaqJsonLd, threePlPageJsonLd } from "@/lib/seo";
import { fulfillment, fulfillmentFaqs, fulfillmentHubs, fulfillmentSteps } from "@/lib/v2-content";

export const metadata: Metadata = {
  title: "3PL Warehouses in Xiamen & Dubai",
  description:
    "Own 3PL in Xiamen, China and Dubai / Al Ain, UAE. Sourcing Center receives, stores, picks, packs, and ships from warehouses we operate — tied to China factory sourcing. Not a broker.",
  keywords: [
    "3PL Xiamen",
    "3PL Dubai",
    "3PL China warehouse",
    "Al Ain 3PL",
    "China pick pack ship",
    "Seven Color Trading 3PL",
  ],
  alternates: { canonical: absoluteUrl("/3pl") },
  openGraph: {
    title: "3PL Warehouses in Xiamen & Dubai | Sourcing Center",
    description:
      "Own 3PL warehouses in China and the UAE. Receive, store, pick, pack, and ship with Seven Color Trading Co Ltd.",
    url: absoluteUrl("/3pl"),
    type: "website",
  },
};

export default function ThreePlPage() {
  return (
    <>
      <JsonLd data={threePlPageJsonLd()} />
      <JsonLd data={threePlFaqJsonLd()} />
      <Container className="pb-16 pt-28 sm:pt-32">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
          Seven Color Trading Co Ltd · own warehouses · not a broker
        </p>
        <h1 className="mt-3">
          <span className="block font-display text-[4.25rem] font-semibold leading-[0.85] tracking-tight text-accent sm:text-[7rem] lg:text-[8.5rem]">
            {fulfillment.eyebrow}
          </span>
          <span className="mt-5 block font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
            {fulfillment.title}
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted sm:text-lg">{fulfillment.description}</p>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Legal entity {company.legalNameFull}. DUNS {company.credentials.dunsNumber}. Desks and warehouses in{" "}
          {fulfillmentHubs.map((h) => `${h.city}, ${h.country}`).join(" and ")}.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {fulfillmentSteps.map((step) => (
            <article key={step.title} className="rounded-3xl border border-line bg-paper-elevated p-6">
              <h3 className="font-display text-xl font-semibold text-ink">3PL {step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {fulfillmentHubs.map((hub) => (
            <article key={hub.city} className="rounded-3xl border border-line bg-paper p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{hub.role}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                {hub.city} · {hub.country}
              </h3>
              <p className="mt-2 text-sm text-muted">{hub.text}</p>
            </article>
          ))}
        </div>

        <section className="mt-16" aria-labelledby="three-pl-faq">
          <h2 id="three-pl-faq" className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Frequently asked questions about 3PL
          </h2>
          <dl className="mt-8 grid gap-4 md:grid-cols-2">
            {fulfillmentFaqs.map((item) => (
              <div key={item.q} className="rounded-3xl border border-line bg-paper-elevated p-6">
                <dt className="font-display text-lg font-semibold text-ink">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted" data-seo-answer>
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-10 text-sm text-muted">
          Need sea, air, or express after the warehouse?{" "}
          <Link href="/logistics" className="font-medium text-ink underline decoration-accent/40 underline-offset-4">
            Freight lanes and customs
          </Link>
          .
        </p>
      </Container>
      <CtaBand
        title="Talk to the 3PL desk"
        description="Tell us the SKU, quantity, and whether stock should sit in Xiamen or Dubai. A relationship manager replies within 24 hours."
      />
    </>
  );
}

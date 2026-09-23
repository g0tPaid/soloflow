import type { Metadata } from "next";
import Link from "next/link";
import { WorldShippingMap } from "@/components/home/world-map";
import { PageHero, CtaBand } from "@/components/shared/page-shell";
import { Container } from "@/components/ui/primitives";
import { absoluteUrl } from "@/lib/seo";
import { fulfillment, fulfillmentHubs, fulfillmentSteps } from "@/lib/v2-content";

export const metadata: Metadata = {
  title: "3PL, Freight & Customs from China",
  description:
    "Own 3PL warehouses in Xiamen and Dubai plus sea, air, and express freight. Sourcing Center consolidates in China, stages through the UAE, and delivers with tracking.",
  keywords: ["3PL China freight", "sea air express from China", "Dubai hub logistics", "Xiamen warehouse shipping"],
  alternates: { canonical: absoluteUrl("/logistics") },
  openGraph: {
    title: "3PL, Freight & Customs from China | Sourcing Center",
    description:
      "Warehouses we run in Xiamen and Dubai, then sea, air, or express with tracking.",
    url: absoluteUrl("/logistics"),
  },
};

export default function LogisticsPage() {
  return (
    <>
      <PageHero
        eyebrow="3PL & Logistics"
        title="Warehouses we run — freight that matches how you buy"
        description="Full 3PL in Xiamen and Dubai, tied to the sourcing desk. Then sea, air, or express with tracking your ops team can trust."
      />
      <Container className="py-16">
        <h2>
          <span className="block font-display text-[3.5rem] font-semibold leading-[0.85] tracking-tight text-accent sm:text-7xl">
            {fulfillment.eyebrow}
          </span>
          <span className="mt-4 block font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {fulfillment.title}
          </span>
        </h2>
        <p className="mt-3 max-w-2xl text-muted">{fulfillment.description}</p>
        <p className="mt-3 text-sm">
          <Link href="/3pl" className="font-medium text-accent underline-offset-4 hover:underline">
            Full 3PL warehouse page
          </Link>
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {fulfillmentSteps.map((step) => (
            <div key={step.title} className="rounded-3xl border border-line bg-paper-elevated p-6">
              <h3 className="font-display text-xl font-semibold text-ink">3PL {step.title}</h3>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {fulfillmentHubs.map((hub) => (
            <div key={hub.city} className="rounded-3xl border border-line bg-paper p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{hub.role}</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                {hub.city} · {hub.country}
              </h3>
              <p className="mt-2 text-sm text-muted">{hub.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Freight lanes
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Consolidate in China, stage through Dubai when needed, and deliver with tracking.
          </p>
        </div>
        <WorldShippingMap />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Sea freight", "Cost-efficient containers and LCL for replenishment."],
            ["Air freight", "Launch windows and urgent replenishment."],
            ["Express", "Samples and small parcels with door delivery."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-3xl border border-line bg-paper-elevated p-6">
              <h3 className="font-display text-xl font-semibold text-ink">{t}</h3>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </Container>
      <CtaBand />
    </>
  );
}

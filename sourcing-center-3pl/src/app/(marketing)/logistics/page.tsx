import type { Metadata } from "next";
import { WorldShippingMap } from "@/components/home/world-map";
import { PageHero, CtaBand } from "@/components/shared/page-shell";
import { Container } from "@/components/ui/primitives";
import { fulfillment, fulfillmentHubs, fulfillmentSteps } from "@/lib/v2-content";

export const metadata: Metadata = {
  title: "3PL & Logistics",
  description:
    "Own warehouses in Xiamen and Dubai — receive, store, pick, pack, and ship — plus sea, air, and express freight.",
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
        <p className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
          {fulfillment.eyebrow}
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {fulfillment.title}
        </h2>
        <p className="mt-3 max-w-2xl text-muted">{fulfillment.description}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {fulfillmentSteps.map((step) => (
            <div key={step.title} className="rounded-3xl border border-line bg-paper-elevated p-6">
              <h3 className="font-display text-xl font-semibold text-ink">{step.title}</h3>
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
              <h2 className="font-display text-xl font-semibold text-ink">{t}</h2>
              <p className="mt-2 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </Container>
      <CtaBand />
    </>
  );
}

import type { Metadata } from "next";
import { ChinaVisitForm } from "@/components/v2/china-visit-form";
import { CtaBand } from "@/components/shared/page-shell";
import { Container } from "@/components/ui/primitives";
import { company } from "@/lib/content";
import { absoluteUrl } from "@/lib/seo";
import { chinaVisit, chinaVisitDays, chinaVisitIncludes } from "@/lib/v2-content";

export const metadata: Metadata = {
  title: "Schedule a Factory Visit in China",
  description:
    "Book a hosted factory visit in Xiamen with Seven Color Trading — airport pickup, verified factories, warehouse, and QC. Not a tourist tour.",
  keywords: [
    "China factory visit",
    "schedule factory tour Xiamen",
    "sourcing trip China",
    "Seven Color Trading visit",
  ],
  alternates: { canonical: absoluteUrl("/visit") },
  openGraph: {
    title: "Schedule a Factory Visit in China | Sourcing Center",
    description: chinaVisit.description,
    url: absoluteUrl("/visit"),
  },
};

export default function VisitPage() {
  return (
    <>
      <Container className="pb-16 pt-28 sm:pt-32">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted">
          {company.legalName} · Xiamen desk
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          {chinaVisit.title}
        </h1>
        <p className="mt-4 max-w-2xl text-muted sm:text-lg">{chinaVisit.description}</p>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {chinaVisitDays.map((day) => (
              <article key={day.title} className="rounded-3xl border border-line bg-paper-elevated p-6">
                <h2 className="font-display text-xl font-semibold text-ink">{day.title}</h2>
                <p className="mt-2 text-sm text-muted">{day.text}</p>
              </article>
            ))}
            <ul className="rounded-3xl border border-line bg-paper p-6 text-sm text-ink">
              {chinaVisitIncludes.map((item) => (
                <li key={item} className="border-b border-line py-2 last:border-0 last:pb-0 first:pt-0">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ChinaVisitForm />
        </div>
      </Container>
      <CtaBand
        title="Prefer WhatsApp first?"
        description="Message the China desk and we will lock dates the same day."
      />
    </>
  );
}

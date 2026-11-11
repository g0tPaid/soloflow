import { company } from "@/lib/content";
import { fulfillment, fulfillmentFaqs, fulfillmentHubs, fulfillmentSteps } from "@/lib/v2-content";

export const siteUrl = "https://sourcing.center";

export const seoKeywords = [
  "factory visit China",
  "schedule China sourcing trip",
  "3PL China",
  "3PL Xiamen",
  "3PL Dubai",
  "warehouse fulfillment China",
  "China sourcing",
  "product sourcing from China",
  "Seven Color Trading",
  "Sourcing Center",
  "own warehouse 3PL",
  "pick pack ship China",
  "GCC 3PL",
  "Al Ain warehouse",
];

export const defaultDescription =
  "Sourcing.center by Seven Color Trading Co Ltd. Product ideation and China sourcing, plus own 3PL warehouses in Xiamen and Dubai — receive, store, pick, pack, and ship. Not a broker.";

export function absoluteUrl(path = "") {
  if (!path) return siteUrl;
  return path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: company.name,
        legalName: company.legalNameFull,
        alternateName: [company.legalName, "Seven Color Trading", "sourcing.center"],
        url: siteUrl,
        foundingDate: company.founded,
        duns: company.credentials.dunsNumber,
        email: company.emails.corporate,
        telephone: company.phones,
        description: defaultDescription,
        brand: { "@type": "Brand", name: company.brand },
        address: company.offices.map((o) => ({
          "@type": "PostalAddress",
          streetAddress: o.address,
          addressLocality: o.city,
          addressCountry: o.country,
        })),
        department: [
          {
            "@type": "Warehouse",
            name: "Sourcing Center 3PL — Xiamen HQ warehouse",
            address: {
              "@type": "PostalAddress",
              streetAddress: company.offices[1]?.address,
              addressLocality: "Xiamen",
              addressRegion: "Fujian",
              addressCountry: "CN",
            },
          },
          {
            "@type": "Warehouse",
            name: "Sourcing Center 3PL — Dubai / Al Ain warehouse",
            address: {
              "@type": "PostalAddress",
              streetAddress: company.offices[0]?.address,
              addressLocality: "Al Ain",
              addressRegion: "Abu Dhabi",
              addressCountry: "AE",
            },
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: company.name,
        description: defaultDescription,
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "Service",
        "@id": `${siteUrl}/3pl#service`,
        name: "3PL warehouse fulfillment in Xiamen and Dubai",
        serviceType: "Third-party logistics",
        url: `${siteUrl}/3pl`,
        description: fulfillment.description,
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: ["CN", "AE", "US", "EU", "GCC"],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "3PL operations",
          itemListElement: fulfillmentSteps.map((step, i) => ({
            "@type": "Offer",
            position: i + 1,
            itemOffered: {
              "@type": "Service",
              name: `3PL ${step.title}`,
              description: step.text,
            },
          })),
        },
        hoursAvailable: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
          opens: "08:30",
          closes: "19:00",
        },
      },
    ],
  };
}

export function threePlFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: fulfillmentFaqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export function threePlPageJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${siteUrl}/3pl#webpage`,
    url: `${siteUrl}/3pl`,
    name: "3PL warehouses in Xiamen and Dubai | Sourcing Center",
    description: fulfillment.description,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/3pl#service` },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "[data-seo-answer]"],
    },
    mainEntity: fulfillmentHubs.map((hub) => ({
      "@type": "Place",
      name: `${hub.city} ${hub.role}`,
      description: hub.text,
    })),
  };
}

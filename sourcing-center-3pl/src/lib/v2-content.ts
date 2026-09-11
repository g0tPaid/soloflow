/** Version 2 landing content — company facts always from src/lib/content.ts (v1) */

export const heroExamples = [
  "Portable blender",
  "Luxury packaging",
  "LED mirror",
  "Hotel furniture",
  "Wedding dress",
  "Pet accessories",
] as const;

/** Brand-new invention examples for the ideation search */
export const newIdeaExamples = [
  "A foldable travel steamer for silk",
  "Smart pet feeder with camera",
  "Refillable skincare pod system",
  "Modular hotel bedside light",
  "Child-safe magnetic building tiles",
] as const;

export const companyHighlights = [
  {
    label: "NO MOQ",
    detail: "Start from one unit",
  },
  {
    label: "Verified Factories",
    detail: "Audited suppliers only",
  },
  {
    label: "Photo & Video QC",
    detail: "Approve before it ships",
  },
] as const;

export const discoveryFilters = [
  "Trending Products",
  "Low Competition",
  "High Margin",
  "Fast Growing",
  "Private Label Ready",
  "OEM Ready",
] as const;

export const trendingProducts = [
  {
    name: "Portable Blender Bottle",
    tag: "Trending",
    growth: "+142%",
    moq: "50 pcs",
    price: "$3.80–$6.20",
    lead: "12–18 days",
    image: "/products/portable-blender-v2.jpg",
    tone: "from-[#1a1a1a] to-[#3a3a3a]",
  },
  {
    name: "Smart LED Vanity Mirror",
    tag: "High Margin",
    growth: "+98%",
    moq: "100 pcs",
    price: "$14–$22",
    lead: "18–25 days",
    image: "/products/led-mirror-v2.jpg",
    tone: "from-[#111827] to-[#374151]",
  },
  {
    name: "Matte Luxury Gift Box",
    tag: "Private Label",
    growth: "+76%",
    moq: "200 pcs",
    price: "$1.10–$2.40",
    lead: "10–15 days",
    image: "/products/luxury-gift-box-v2.jpg",
    tone: "from-[#3f0d12] to-[#7f1d1d]",
  },
  {
    name: "Hotel Lobby Lounge Chair",
    tag: "OEM Ready",
    growth: "+64%",
    moq: "20 pcs",
    price: "$85–$140",
    lead: "25–35 days",
    image: "/products/hotel-lounge-chair-v2.jpg",
    tone: "from-[#1c1917] to-[#44403c]",
  },
  {
    name: "Pet Travel Carrier",
    tag: "Fast Growing",
    growth: "+121%",
    moq: "100 pcs",
    price: "$9.50–$16",
    lead: "15–22 days",
    image: "/products/pet-carrier-v2.jpg",
    tone: "from-[#0c1a17] to-[#134e4a]",
  },
  {
    name: "Silk Blend Evening Dress",
    tag: "Low Competition",
    growth: "+55%",
    moq: "30 pcs",
    price: "$28–$48",
    lead: "20–30 days",
    image: "/products/evening-dress-v2.jpg",
    tone: "from-[#1e1033] to-[#4c1d95]",
  },
] as const;

/** Existing brand / catalog-style ideation demo */
export const ideationDemo = {
  input: "I want to start a skincare brand.",
  products: ["Vitamin C serum set", "Clay mask jars", "Travel mini kit"],
  costs: "$1.80–$4.60 / unit",
  regions: "Guangdong · Zhejiang",
  moq: "100–300 pcs",
  margins: "48–65% retail",
  shipping: "Air 5–8d · Sea 22–30d",
} as const;

/** Brand-new product invention demo — NDA first, then development */
export const newProductDemo = {
  input: "I invented a foldable travel steamer that fits in a laptop sleeve.",
  concept: "Compact dual-voltage garment steamer · silicone water tank · travel lock",
  protection: "NDA signed before we open the brief with any factory",
  development: "Materials · BOM · packaging · cost targets with buildable makers",
  sampling: "Prototype samples first — start from 1 unit, scale when ready",
  regions: "Shenzhen · Zhongshan (small appliances)",
  costs: "Tooling quote + $8–$14 / unit at 500 pcs",
  moq: "No MOQ for sampling · production when you are ready",
  shipping: "Sample air 4–7d · bulk sea 22–30d",
} as const;

type PathProfile = {
  match: RegExp;
  concept: (idea: string) => string;
  regions: string;
  costs: string;
  development: string;
  sampling: string;
};

const NEW_PRODUCT_PROFILES: PathProfile[] = [
  {
    match: /steam|iron|garment|laptop sleeve|travel steamer/i,
    concept: () =>
      "Compact dual-voltage garment steamer · silicone water tank · travel lock",
    regions: "Shenzhen · Zhongshan (small appliances)",
    costs: "Tooling quote + $8–$14 / unit at 500 pcs",
    development: "Materials · BOM · packaging · cost targets with buildable makers",
    sampling: "Prototype samples first — start from 1 unit, scale when ready",
  },
  {
    match: /pet|dog|cat|feeder|carrier|animal/i,
    concept: (idea) =>
      `Pet-tech brief from your note · soft goods + electronics if needed · “${clip(idea)}”`,
    regions: "Dongguan · Yiwu (pet · soft goods)",
    costs: "Sample $12–$28 · bulk $6–$18 / unit at 300 pcs",
    development: "Size grades · mesh/fabric BOM · safety tether · packaging insert",
    sampling: "Soft prototype → fit test with pets → revise → pilot run",
  },
  {
    match: /skin|beauty|serum|cosmetic|refill|pod/i,
    concept: (idea) =>
      `Beauty formula + pack system · airless / refill options · “${clip(idea)}”`,
    regions: "Guangzhou · Shanghai (cosmetics)",
    costs: "Formula + pack $1.40–$4.80 / unit at 1,000 pcs",
    development: "INCI draft · pack tooling · stability · claim-safe labeling",
    sampling: "Lab samples → pack mockups → pilot fill under NDA",
  },
  {
    match: /light|lamp|led|mirror|electronics|smart|device|charger/i,
    concept: (idea) =>
      `Electronics DFM brief · PCB + enclosure · “${clip(idea)}”`,
    regions: "Shenzhen · Dongguan (electronics)",
    costs: "PCBA + enclosure $4–$16 / unit at 500 pcs",
    development: "Schematic · enclosure · firmware scope · certifications path",
    sampling: "Engineering sample → EVT → DVT → mass",
  },
  {
    match: /furniture|chair|hotel|lobby|sofa|table/i,
    concept: (idea) =>
      `Hospitality furniture brief · frame + upholstery · “${clip(idea)}”`,
    regions: "Foshan · Zhejiang (furniture)",
    costs: "Sample $90–$180 · bulk $55–$140 / unit",
    development: "CAD · foam/fabric BOM · knock-down packing · fire codes",
    sampling: "1–2 showroom samples → revise · hotel pilot order",
  },
  {
    match: /dress|apparel|fashion|fabric|textile|silk|gown/i,
    concept: (idea) =>
      `Apparel tech-pack path · fit + fabric · “${clip(idea)}”`,
    regions: "Hangzhou · Guangzhou (apparel)",
    costs: "Sample $35–$90 · bulk $18–$48 / unit at 50 pcs",
    development: "Tech pack · graded sizes · fabric mill · trim board",
    sampling: "Proto → fit sample → size set → bulk",
  },
  {
    match: /pack|box|gift|packaging|label/i,
    concept: (idea) =>
      `Private-label packaging brief · rigid / folding · “${clip(idea)}”`,
    regions: "Dongguan · Wenzhou (packaging)",
    costs: "Tooling + $0.80–$2.80 / unit at 1,000 pcs",
    development: "Dieline · material · foil/emboss · insert tray",
    sampling: "White sample → printed proof → mass",
  },
];

function clip(idea: string, n = 42) {
  const t = idea.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export type DevelopmentPathResult = {
  concept: string;
  protection: string;
  development: string;
  sampling: string;
  regions: string;
  costs: string;
  moq: string;
  shipping: string;
};

/** Build a development-path card set from a free-text product idea. */
export function mapDevelopmentPath(idea: string): DevelopmentPathResult {
  const text = idea.trim();
  const profile =
    NEW_PRODUCT_PROFILES.find((p) => p.match.test(text)) ??
    ({
      match: /.*/,
      concept: (i: string) =>
        `Manufacturable concept brief · materials + form · “${clip(i || "your invention")}”`,
      regions: "Guangdong · Zhejiang (matched to category)",
      costs: "Sample quote first · unit cost after BOM lock",
      development: "Materials · BOM · packaging · cost targets with buildable makers",
      sampling: "Prototype samples first — start from 1 unit, scale when ready",
    } satisfies PathProfile);

  return {
    concept: profile.concept(text || newProductDemo.input),
    protection: "NDA signed before we open the brief with any factory",
    development: profile.development,
    sampling: profile.sampling,
    regions: profile.regions,
    costs: profile.costs,
    moq: "No MOQ for sampling · production when you are ready",
    shipping: "Sample air 4–7d · bulk sea 22–30d",
  };
}

export type CatalogPlanResult = {
  products: string;
  costs: string;
  regions: string;
  moq: string;
  margins: string;
  shipping: string;
};

/** Build a catalog / brand plan card set from free text. */
export function mapCatalogPlan(idea: string): CatalogPlanResult {
  const text = idea.trim().toLowerCase();
  if (/skin|beauty|serum|cosmetic/.test(text)) {
    return {
      products: "Vitamin C serum set · Clay mask jars · Travel mini kit",
      costs: "$1.80–$4.60 / unit",
      regions: "Guangdong · Zhejiang",
      moq: "100–300 pcs",
      margins: "48–65% retail",
      shipping: "Air 5–8d · Sea 22–30d",
    };
  }
  if (/pet|dog|cat/.test(text)) {
    return {
      products: "Soft travel carrier · Slow feeder bowl · Grooming kit",
      costs: "$3.20–$14 / unit",
      regions: "Yiwu · Dongguan",
      moq: "50–200 pcs",
      margins: "42–60% retail",
      shipping: "Air 5–9d · Sea 22–30d",
    };
  }
  if (/home|kitchen|blend|mirror|led/.test(text)) {
    return {
      products: "Portable blender · LED vanity mirror · Gift box set",
      costs: "$3.80–$22 / unit",
      regions: "Shenzhen · Zhongshan",
      moq: "50–200 pcs",
      margins: "45–62% retail",
      shipping: "Air 5–8d · Sea 22–30d",
    };
  }
  return {
    products: ideationDemo.products.join(" · "),
    costs: ideationDemo.costs,
    regions: ideationDemo.regions,
    moq: ideationDemo.moq,
    margins: ideationDemo.margins,
    shipping: ideationDemo.shipping,
  };
}

export const ideaPathSteps = [
  {
    n: "01",
    title: "Share the idea (NDAs signed)",
    text: "A sketch, a sample photo, or just a sentence — protected under NDA before we open the brief.",
  },
  {
    n: "02",
    title: "Shape the design",
    text: "Materials, sizing, packaging, and cost targets — refined with factories that can actually build it.",
  },
  {
    n: "03",
    title: "Prototype & source",
    text: "Samples first. Verified makers. No MOQ games — start small, and scale when it is right.",
  },
  {
    n: "04",
    title: "Prove & ship",
    text: "Photo and video QC before anything leaves China. Then freight to your door.",
  },
] as const;

export const supplySteps = [
  "China Factory",
  "Warehouse",
  "Inspection",
  "Sea Freight",
  "USA",
  "Europe",
  "Middle East",
  "Australia",
] as const;

export const fulfillment = {
  eyebrow: "3PL",
  title: "World-class fulfillment in our own warehouses",
  description:
    "Sourcing Center 3PL is receive, store, pick, pack, and ship in warehouses we operate in Xiamen, China and Dubai / Al Ain, UAE — not a broker. Fulfillment sits on the same desk as China sourcing, factory QC, and freight.",
} as const;

export const fulfillmentFaqs = [
  {
    q: "Does Sourcing Center offer 3PL in China?",
    a: "Yes. Seven Color Trading Co Ltd runs its own 3PL warehouse in Xiamen, China. Goods move from the factory floor into our warehouse for count, photo QC, storage, pick, pack, and export — not through a third-party marketplace or broker.",
  },
  {
    q: "Where are Sourcing Center 3PL warehouses?",
    a: "Two own warehouses: Xiamen, Fujian, China (HQ warehouse and sourcing desk) and Dubai / Al Ain, United Arab Emirates (branch warehouse for GCC replenishment).",
  },
  {
    q: "Is Sourcing Center a 3PL broker or a warehouse operator?",
    a: "Operator. We run the warehouses. Receive, store, pick, pack, and ship are in-house and tied to the sourcing relationship manager — not a separate 3PL you have to onboard.",
  },
  {
    q: "What 3PL services are included with China sourcing?",
    a: "Inbound from factories, storage in Xiamen or Dubai, pick to your SKU list (one unit or a container program), packing and labeling, then sea, air, or express freight with tracking.",
  },
  {
    q: "Who should use Sourcing Center 3PL?",
    a: "Importers, Amazon/Walmart sellers, GCC retailers, and brands that source in China and need a warehouse in Xiamen and/or Dubai instead of a broker or a marketplace FBA-only flow.",
  },
] as const;

export const fulfillmentSteps = [
  { title: "Receive", text: "Inbound from the factory floor into our warehouse — counted and photographed." },
  { title: "Store", text: "Hold stock in Xiamen or Dubai until you release it, with no marketplace middleman." },
  { title: "Pick", text: "Orders pulled to your SKU list — one unit or a container program." },
  { title: "Pack", text: "Cartons, labeling, and consolidations staged for the lane you actually buy." },
  { title: "Ship", text: "Sea, air, or express with tracking — China HQ and Dubai hub on the same desk." },
] as const;

export const fulfillmentHubs = [
  {
    city: "Xiamen",
    country: "China",
    role: "HQ warehouse",
    text: "Sourcing headquarters and warehouse — inbound from factories, QC, and export staging.",
  },
  {
    city: "Dubai / Al Ain",
    country: "UAE",
    role: "Branch warehouse",
    text: "Regional hub for GCC replenishment — stage, pick, and ship closer to your market.",
  },
] as const;

export const whyPoints = [
  { title: "One partner", text: "Ideas, factories, QC, and freight handled by one China desk." },
  { title: "Thousands of factories", text: "Mapped capacity across electronics, home, fashion, and industrial." },
  { title: "Verified suppliers", text: "License checks, audits, and production proof before you commit." },
  { title: "Factory audits", text: "On-ground teams in China validating what catalogs claim." },
  { title: "Inspection", text: "Photo & video QC — approve before anything ships." },
  { title: "Logistics", text: "Own 3PL in Xiamen and Dubai — plus sea, air, and express." },
  { title: "Private label", text: "Packaging, branding, and white-label programs that scale." },
  { title: "OEM / ODM", text: "From concept and tooling to mass production — including brand-new inventions." },
  { title: "Product development", text: "Turn a sketch or new idea into a manufacturable SKU under NDA." },
] as const;

export const workflowSteps = [
  {
    title: "Idea",
    text: "Share the SKU or invention — protected under NDA when it is new.",
  },
  {
    title: "Research",
    text: "Demand, specs, and cost bands before anyone tools up.",
  },
  {
    title: "Factory matching",
    text: "Verified makers in the right region for your category.",
  },
  {
    title: "Quotation",
    text: "Clear unit cost, tooling, MOQ, and lead time — no fog.",
  },
  {
    title: "Sampling",
    text: "Prototypes first. Approve the piece before volume.",
  },
  {
    title: "Production",
    text: "Line start with on-ground oversight in China.",
  },
  {
    title: "Inspection",
    text: "Photo & video QC — you sign off before it leaves.",
  },
  {
    title: "Shipping",
    text: "Sea, air, or express with tracked handoff.",
  },
  {
    title: "Delivered",
    text: "At your door — ready to sell or stock.",
  },
] as const;

export const dashboardModules = [
  "Orders",
  "Messages",
  "Invoices",
  "QC Reports",
  "Inspection Photos",
  "Shipment Tracking",
  "Factory Files",
  "Payments",
] as const;

export const platformStats = [
  { value: "10,000+", label: "Factories" },
  { value: "150+", label: "Industries" },
  { value: "40+", label: "Countries" },
  { value: "Since 2014", label: "On the ground in China" },
] as const;

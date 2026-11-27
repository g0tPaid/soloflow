"use client";

import "@fontsource/noto-sans-sc/400.css";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useOrganizationId } from "@/hooks/use-organization";
import { apiFetch } from "@/lib/api";
import {
  exporterAttachmentKinds,
  exporterDocumentKinds,
  exportTotals,
  exportCompletionIssues,
  exportCurrentDocumentKinds,
  type ExporterOrderData,
  type ExporterProfileData,
  type ExporterPaymentData,
} from "@flowbooks/shared";
import {
  download,
  decodeAttachment,
  docNames,
  renderExporterPdf,
  zipFiles,
  type ExporterDoc,
} from "./documents";
import {
  Globe2,
  ArrowLeft,
  Plus,
  FileDown,
  CheckCircle2,
  Package,
  Wallet,
  Truck,
  ChartNoAxesCombined,
} from "lucide-react";

type Directory = {
  id: string;
  kind: string;
  name: string;
  data: Record<string, string>;
};
type Payment = { id: string; data: ExporterPaymentData };
type Attachment = {
  id: string;
  filename: string;
  category: string;
  contentType: string;
};
type Order = {
  id: string;
  number: string;
  data: ExporterOrderData;
  parties: {
    customer: Record<string, string>;
    supplier: Record<string, string>;
  };
  sample: boolean;
  completedAt: string | null;
  documents: ExporterDoc[];
  payments: Payment[];
  attachments: Attachment[];
};
type Workspace = {
  profile: ExporterProfileData | null;
  directory: Directory[];
  orders: Order[];
};
type Audit = { id: string; actorId: string; action: string; createdAt: string };
const sections = [
  "Dashboard",
  "Export Orders",
  "Proforma Invoices (PI)",
  "Commercial Invoices (CI)",
  "Packing Lists (PL)",
  "Customers",
  "Suppliers / Factories",
  "Products",
  "Payments",
  "Customs & Tax Records",
  "Shipment Tracking",
  "Export Documents",
  "Reports",
  "Settings",
];
const cls = "rounded-lg border bg-card p-4 shadow-sm";
const btn =
  "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40";
const alt =
  "rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-40";
const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";
const today = () => new Date().toISOString().slice(0, 10);
const blankProfile: ExporterProfileData = {
  englishName: "",
  chineseName: "",
  creditCode: "",
  address: "",
  contact: "",
  phone: "",
  email: "",
  bankName: "",
  bankAccount: "",
  swift: "",
  logo: "",
  currency: "USD",
  paymentTerms: "",
  incoterms: "",
  numberingPrefix: "EXP",
  numberFormat: "PREFIX_TYPE_SEQUENCE",
  numberWidth: 6,
};
const blankLine = (): ExporterOrderData["lines"][number] => ({
  productId: "",
  description: "",
  hsCode: "",
  origin: "China",
  unit: "pcs",
  quantity: 1,
  purchasePrice: 0,
  salePrice: 0,
  packages: 0,
  packageType: "",
  netWeight: 0,
  grossWeight: 0,
  dimensions: "",
  cbm: 0,
  marks: "",
});
const blankOrder = (
  profile: ExporterProfileData | null,
): ExporterOrderData => ({
  customerId: "",
  supplierId: "",
  date: today(),
  currency: profile?.currency || "USD",
  purchaseCurrency: "CNY",
  lines: [blankLine()],
  paymentTerms: profile?.paymentTerms || "",
  incoterms: profile?.incoterms || "",
  notes: "",
  purchase: {
    fapiaoNumber: "",
    fapiaoDate: "",
    supplierPaidDate: "",
    supplierBankReference: "",
    notes: "",
  },
  customs: {
    declarationNumber: "",
    clearanceDate: "",
    broker: "",
    declaredQuantity: 0,
    declaredValue: 0,
    currency: profile?.currency || "USD",
    hsCodes: "",
    notes: "",
  },
  tax: {
    vatInvoiceAmount: 0,
    vatAmount: 0,
    rmbRate: profile?.currency === "CNY" ? 1 : 0,
    treatment: "UNCONFIRMED",
    confirmedBy: "",
    refundStatus: "NOT_REVIEWED",
    notes: "",
  },
  shipment: {
    forwarder: "",
    method: "",
    trackingNumber: "",
    awb: "",
    departure: "",
    destination: "",
    estimatedArrival: "",
    actualArrival: "",
    status: "PENDING",
  },
});
const label = (k: string) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/Hs Code/g, "HS code")
    .replace(/Cbm/g, "CBM")
    .replace(/Rmb/g, "RMB")
    .replace(/Awb/g, "AWB / B/L");
const format = (n: number, c: string) => `${c} ${n.toFixed(2)}`;
const fieldsFor = (kind: string): Record<string, string> =>
  kind === "products"
    ? { name: "", description: "", hsCode: "", origin: "China", unit: "pcs" }
    : {
        name: "",
        address: "",
        country: "",
        contact: "",
        phone: "",
        email: "",
        taxId: "",
      };
function Fields<T extends object>({
  value,
  onChange,
  omit = [],
  options = {},
}: {
  value: T;
  onChange: (v: T) => void;
  omit?: string[];
  options?: Record<string, string[]>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(value)
        .filter(
          ([k, v]) =>
            !omit.includes(k) && ["string", "number"].includes(typeof v),
        )
        .map(([k, v]) => (
          <label key={k} className="space-y-1 text-sm">
            <span className="font-medium">{label(k)}</span>
            {options[k] ? (
              <select
                className={input}
                value={v}
                onChange={(e) => onChange({ ...value, [k]: e.target.value })}
              >
                {options[k].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                className={input}
                value={v}
                type={
                  typeof v === "number"
                    ? "number"
                    : /date|departure|arrival/i.test(k)
                      ? "date"
                      : "text"
                }
                step={typeof v === "number" ? "any" : undefined}
                min={typeof v === "number" ? 0 : undefined}
                onChange={(e) =>
                  onChange({
                    ...value,
                    [k]:
                      typeof v === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            )}
          </label>
        ))}
    </div>
  );
}
function Select({
  title,
  value,
  onChange,
  items,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  items: Directory[];
}) {
  return (
    <label className="text-sm font-medium">
      {title}
      <select
        className={input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select…</option>
        {items.map((i) => (
          <option key={i.id} value={i.id}>
            {i.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ExporterPage() {
  const { data: session } = useSession();
  const { organizationId, isReady } = useOrganizationId();
  return (
    <ExporterWorkspace
      key={`${organizationId ?? "none"}:${session?.user.id ?? "signed-out"}:${!!session?.accessToken}`}
      token={session?.accessToken}
      organizationId={organizationId}
      isReady={isReady}
    />
  );
}

function RecordFields({
  value,
  omit = [],
}: {
  value: object;
  omit?: string[];
}) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(value)
        .filter(
          ([key, v]) =>
            !omit.includes(key) &&
            (typeof v === "string" || typeof v === "number"),
        )
        .map(([key, v]) => (
          <div key={key}>
            <dt className="text-xs text-muted-foreground">{label(key)}</dt>
            <dd className="break-words text-sm font-medium">
              {v === "" ? "Not recorded" : String(v)}
            </dd>
          </div>
        ))}
    </dl>
  );
}

function ExporterWorkspace({
  token,
  organizationId,
  isReady,
}: {
  token?: string;
  organizationId: string | null;
  isReady: boolean;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [section, setSection] = useState("Dashboard"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState<ExporterOrderData | null>(null),
    [sample, setSample] = useState(false),
    [history, setHistory] = useState<Audit[]>([]);
  const [profile, setProfile] = useState(blankProfile),
    [dirEdit, setDirEdit] = useState<{
      id?: string;
      data: Record<string, string>;
    } | null>(null),
    [payment, setPayment] = useState<ExporterPaymentData>({
      amount: 0,
      currency: "USD",
      rateToOrderCurrency: 1,
      date: today(),
      method: "Bank transfer",
      bankReference: "",
      type: "DEPOSIT",
    }),
    [attachmentKind, setAttachmentKind] = useState<string>("FACTORY_FAPIAO");
  const request = <T,>(path: string, method = "GET", body?: unknown) =>
    apiFetch<T>(`/exporter${path}`, {
      token,
      organizationId: organizationId || undefined,
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  async function refresh() {
    const result = await request<Workspace>("/workspace");
    setWorkspace(result);
    setProfile(result.profile || blankProfile);
    return result;
  }
  useEffect(() => {
    setWorkspace(null);
    setSelected("");
    setDraft(null);
    setError("");
    if (token && organizationId) refresh().catch((e) => setError(e.message));
  }, [token, organizationId]);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function navigate(s: string) {
    setSection(s);
    setSelected("");
    setDraft(null);
    setDirEdit(null);
    setError("");
  }
  const orders = workspace?.orders || [],
    directory = workspace?.directory || [],
    order = orders.find((o) => o.id === selected);
  const byKind = (k: string) => directory.filter((d) => d.kind === k);
  const totals = (o: Order) =>
    exportTotals(
      o.data,
      o.payments.map((p) => p.data),
    );
  const issues = (o: Order) =>
    exportCompletionIssues(
      o.data,
      o.payments.map((p) => p.data),
      exportCurrentDocumentKinds(o.data, o.documents),
      o.attachments.map((a) => a.category),
    );
  function workflowStage(o: Order) {
    if (o.completedAt) return "Completed";
    const pending = issues(o);
    if (pending.includes("Factory payment and fapiao"))
      return "Factory purchase";
    if (pending.includes("PI")) return "Proforma invoice";
    if (pending.includes("Customer payment")) return "Customer payment";
    if (pending.includes("CI") || pending.includes("PL"))
      return "Commercial documents";
    if (pending.includes("Official customs declaration"))
      return "Chinese customs";
    if (pending.includes("Tax accountant confirmation"))
      return "Tax confirmation";
    if (pending.includes("Delivery and shipping documents")) return "Shipment";
    return "Ready to complete";
  }
  function open(o: Order) {
    setSelected(o.id);
    setDraft(null);
    setPayment((p) => ({
      ...p,
      currency: o.data.currency,
      amount: totals(o).outstanding,
    }));
    setHistory([]);
    request<Audit[]>(`/orders/${o.id}/history`)
      .then(setHistory)
      .catch((e) => setError(e.message));
  }
  async function getAttachment(o: Order, a: Attachment) {
    const f = await request<{
      base64: string;
      contentType: string;
      filename: string;
    }>(`/orders/${o.id}/attachments/${a.id}`);
    return decodeAttachment(f.base64, f.contentType);
  }
  async function archive(o: Order) {
    const files = await Promise.all(
      o.attachments.map(async (a) => ({
        name: `${a.category}/${a.id}-${a.filename}`,
        blob: await getAttachment(o, a),
      })),
    );
    for (const d of o.documents)
      files.push({ name: `${d.number}.pdf`, blob: await renderExporterPdf(d) });
    const hist = await request<Audit[]>(`/orders/${o.id}/history`);
    files.push({
      name: "order-record.json",
      blob: new Blob([JSON.stringify({ order: o, history: hist }, null, 2)], {
        type: "application/json",
      }),
    });
    download(await zipFiles(files), `${o.number}.zip`);
  }
  const docKind = section.startsWith("Proforma")
    ? "PI"
    : section.startsWith("Commercial")
      ? "CI"
      : section.startsWith("Packing")
        ? "PL"
        : null;
  const dirKind =
    section === "Customers"
      ? "customers"
      : section === "Suppliers / Factories"
        ? "suppliers"
        : section === "Products"
          ? "products"
          : null;
  const liveOrders = orders.filter((o) => !o.sample);
  const sales = Object.entries(
    liveOrders.reduce<Record<string, number>>(
      (a, o) => ({
        ...a,
        [o.data.currency]: (a[o.data.currency] || 0) + totals(o).total,
      }),
      {},
    ),
  );
  const pending = Object.entries(
    liveOrders.reduce<Record<string, number>>(
      (a, o) => ({
        ...a,
        [o.data.currency]: (a[o.data.currency] || 0) + totals(o).outstanding,
      }),
      {},
    ),
  );
  const orderTable = (rows: Order[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b text-muted-foreground">
          <tr>
            {["Order", "Customer", "Sale", "Outstanding", "Status", ""].map(
              (h, i) => (
                <th className="p-3" key={i}>
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="p-3 font-medium">
                {o.number}
                {o.sample && (
                  <span className="ml-2 rounded bg-amber-100 px-2 text-amber-900">
                    SAMPLE
                  </span>
                )}
              </td>
              <td className="p-3">{o.parties.customer.name}</td>
              <td className="p-3">
                {format(totals(o).total, o.data.currency)}
              </td>
              <td className="p-3">
                {format(totals(o).outstanding, o.data.currency)}
              </td>
              <td className="p-3">{workflowStage(o)}</td>
              <td className="p-3">
                <button className={alt} onClick={() => open(o)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="p-8 text-center text-muted-foreground">
          No export orders yet.
        </p>
      )}
    </div>
  );
  const documentList = (docs: ExporterDoc[]) => (
    <div className="space-y-2">
      {docs.map((d) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded border p-3"
          key={d.id}
        >
          <div>
            <p className="font-medium">
              {d.number} · {docNames[d.kind]}
            </p>
            <p className="text-xs text-muted-foreground">
              {d.snapshot.orderNumber} · {d.createdAt.slice(0, 10)}{" "}
              {d.snapshot.sample ? " · SAMPLE" : ""}
            </p>
          </div>
          <button
            className={alt}
            disabled={busy}
            onClick={() =>
              action(async () =>
                download(await renderExporterPdf(d), `${d.number}.pdf`),
              )
            }
          >
            <FileDown className="mr-1 inline h-4 w-4" /> PDF
          </button>
        </div>
      ))}
      {!docs.length && (
        <p className="text-sm text-muted-foreground">
          No documents issued yet.
        </p>
      )}
    </div>
  );
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="border-b p-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <ArrowLeft size={14} /> Back to SoloFlow
          </Link>
          <div className="mt-5 flex items-center gap-3">
            <span className="rounded-xl bg-red-600 p-3 text-white">
              <Globe2 size={24} />
            </span>
            <div>
              <h1 className="font-semibold">Exporter Module</h1>
              <p className="text-xs text-muted-foreground">
                Independent export workspace
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => navigate(s)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${section === s ? "bg-red-600/10 font-semibold text-red-600" : "text-muted-foreground hover:bg-muted"}`}
            >
              {s}
            </button>
          ))}
        </nav>
      </aside>
      <main className="space-y-5 p-4 lg:ml-64 lg:p-8">
        <div className="flex items-center justify-between border-b pb-4 lg:hidden">
          <Link href="/dashboard" className="text-sm">
            <ArrowLeft className="inline" size={16} /> SoloFlow
          </Link>
          <span className="font-semibold">Exporter Module</span>
        </div>
        <select
          className={`${input} lg:hidden`}
          value={section}
          onChange={(e) => navigate(e.target.value)}
        >
          {sections.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-red-600">
              SoloFlow · Exporter
            </p>
            <h2 className="mt-1 text-2xl font-semibold">
              {order ? order.number : section}
            </h2>
            <p className="text-sm text-muted-foreground">
              {workspace?.profile?.englishName ||
                "Independent export business records"}
            </p>
          </div>
          {order && (
            <button
              className={alt}
              onClick={() => {
                setSelected("");
                setDraft(null);
              }}
            >
              ← Back to list
            </button>
          )}
        </header>
        {error && (
          <p
            role="alert"
            className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {!workspace ? (
          <div className={cls}>
            {!isReady
              ? "Loading organization…"
              : !token
                ? "Sign in to access the exporter workspace."
                : !organizationId
                  ? "Select an organization in SoloFlow first."
                  : error
                    ? "Exporter workspace unavailable."
                    : "Loading exporter workspace…"}
          </div>
        ) : (
          <>
            {!order && !draft && section === "Dashboard" && (
              <>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    {
                      title: "Export orders",
                      value: liveOrders.length,
                      icon: Package,
                    },
                    {
                      title: "Pending payments",
                      value: liveOrders.filter((o) => totals(o).outstanding > 0)
                        .length,
                      icon: Wallet,
                    },
                    {
                      title: "Completed exports",
                      value: liveOrders.filter((o) => o.completedAt).length,
                      icon: CheckCircle2,
                    },
                    {
                      title: "Pending shipments",
                      value: liveOrders.filter(
                        (o) => o.data.shipment.status === "PENDING",
                      ).length,
                      icon: Truck,
                    },
                  ].map((m) => (
                    <div className={cls} key={m.title}>
                      <m.icon className="mb-2 text-red-600" size={20} />
                      <p className="text-sm text-muted-foreground">{m.title}</p>
                      <p className="text-3xl font-semibold">{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className={cls}>
                    <h3 className="font-medium">Total export sales</h3>
                    {sales.map(([c, v]) => (
                      <p key={c} className="text-xl font-semibold">
                        {format(v, c)}
                      </p>
                    ))}
                    {!sales.length && <p>—</p>}
                  </div>
                  <div className={cls}>
                    <h3 className="font-medium">
                      Outstanding customer payments
                    </h3>
                    {pending.map(([c, v]) => (
                      <p key={c} className="text-xl font-semibold">
                        {format(v, c)}
                      </p>
                    ))}
                    {!pending.length && <p>—</p>}
                  </div>
                </div>
                {!workspace.profile && (
                  <div className={cls}>
                    <p>
                      Set your exporter company details before issuing
                      documents.
                    </p>
                    <button
                      className={btn + " mt-3"}
                      onClick={() => navigate("Settings")}
                    >
                      Configure exporter
                    </button>
                  </div>
                )}
                <div className={cls}>
                  <h3 className="mb-3 font-semibold">Export workflow status</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      "Factory purchase",
                      "Proforma invoice",
                      "Customer payment",
                      "Commercial documents",
                      "Chinese customs",
                      "Tax confirmation",
                      "Shipment",
                      "Ready to complete",
                      "Completed",
                    ].map((stage) => (
                      <div key={stage} className="rounded-md bg-muted p-3">
                        <p className="text-xs text-muted-foreground">{stage}</p>
                        <p className="text-xl font-semibold">
                          {
                            liveOrders.filter((o) => workflowStage(o) === stage)
                              .length
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={cls}>
                  <h3 className="mb-3 font-semibold">
                    Recent export transactions
                  </h3>
                  {orderTable(orders.slice(0, 8))}
                </div>
                <div className={cls}>
                  <h3 className="mb-3 font-semibold">Recent documents</h3>
                  {documentList(
                    orders
                      .flatMap((o) => o.documents)
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .slice(0, 5),
                  )}
                </div>
              </>
            )}
            {!order && !draft && section === "Settings" && (
              <div className={cls}>
                <h3 className="mb-4 font-semibold">Exporter company profile</h3>
                <Fields
                  value={profile}
                  onChange={setProfile}
                  omit={["logo"]}
                  options={{
                    numberFormat: [
                      "PREFIX_TYPE_SEQUENCE",
                      "PREFIX_YEAR_TYPE_SEQUENCE",
                      "TYPE_PREFIX_SEQUENCE",
                    ],
                  }}
                />
                <label className="mt-4 block text-sm">
                  Company logo{" "}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={async (e) => {
                      if (e.target.files?.[0])
                        setProfile((p) => ({ ...p, logo: "" }));
                      const f = e.target.files?.[0];
                      if (f) {
                        const logo = await readFile(f);
                        setProfile((p) => ({ ...p, logo }));
                      }
                    }}
                  />
                </label>
                {profile.logo && (
                  <img
                    src={profile.logo}
                    alt="Logo"
                    className="mt-2 h-16 object-contain"
                  />
                )}
                <button
                  className={btn + " mt-4"}
                  disabled={busy}
                  onClick={() =>
                    action(() => request("/profile", "POST", profile))
                  }
                >
                  Save company settings
                </button>
              </div>
            )}
            {!order && !draft && dirKind && (
              <>
                <div className={cls}>
                  <button
                    className={btn}
                    onClick={() => setDirEdit({ data: fieldsFor(dirKind) })}
                  >
                    <Plus size={16} className="inline" /> Add record
                  </button>
                  {dirEdit && (
                    <div className="mt-4 space-y-3">
                      <Fields
                        value={dirEdit.data}
                        onChange={(data) => setDirEdit({ ...dirEdit, data })}
                      />
                      <button
                        className={btn}
                        disabled={busy}
                        onClick={() =>
                          action(async () => {
                            await request(
                              `/directory/${dirKind}${dirEdit.id ? "/" + dirEdit.id : ""}`,
                              dirEdit.id ? "PATCH" : "POST",
                              dirEdit.data,
                            );
                            setDirEdit(null);
                          })
                        }
                      >
                        Save
                      </button>
                      <button
                        className={alt + " ml-2"}
                        onClick={() => setDirEdit(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className={cls}>
                  {byKind(dirKind).map((d) => (
                    <div
                      className="flex justify-between border-b p-3"
                      key={d.id}
                    >
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.data.address || d.data.description || ""}
                        </p>
                      </div>
                      <button
                        className={alt}
                        onClick={() => setDirEdit({ id: d.id, data: d.data })}
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                  {!byKind(dirKind).length && <p>No records yet.</p>}
                </div>
              </>
            )}
            {!order && !draft && section === "Export Orders" && (
              <div className={cls}>
                <button
                  className={btn + " mb-3"}
                  onClick={() => {
                    setDraft(blankOrder(workspace.profile));
                    setSample(false);
                  }}
                >
                  <Plus size={16} className="inline" /> New export order
                </button>
                {orderTable(orders)}
              </div>
            )}
            {!order &&
              !draft &&
              (docKind || section === "Export Documents") && (
                <div className={cls}>
                  {documentList(
                    orders
                      .flatMap((o) => o.documents)
                      .filter((d) => !docKind || d.kind === docKind),
                  )}
                  <p className="mt-4 text-sm text-muted-foreground">
                    Issue new documents and download complete archives from
                    Export Orders.
                  </p>
                </div>
              )}
            {!order &&
              !draft &&
              [
                "Payments",
                "Customs & Tax Records",
                "Shipment Tracking",
                "Reports",
              ].includes(section) && (
                <div className={cls}>
                  {section === "Reports" && (
                    <>
                      <h3 className="mb-3 flex items-center gap-2 font-semibold">
                        <ChartNoAxesCombined size={18} /> Export sales by
                        currency (live orders)
                      </h3>
                      {sales.map(([c, v]) => (
                        <p key={c}>{format(v, c)}</p>
                      ))}
                    </>
                  )}
                  {section === "Payments" && (
                    <div className="mb-4 space-y-2">
                      {orders.flatMap((o) =>
                        o.payments.map((p) => (
                          <p key={p.id}>
                            {o.number} · {p.data.date} ·{" "}
                            {format(p.data.amount, p.data.currency)} ·{" "}
                            {p.data.type}
                          </p>
                        )),
                      )}
                    </div>
                  )}
                  {orderTable(orders)}
                </div>
              )}
            {draft && (
              <div className={cls + " space-y-5"}>
                <h3 className="font-semibold">
                  {order ? "Edit export order" : "Create export order"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    title="Overseas customer"
                    items={byKind("customers")}
                    value={draft.customerId}
                    onChange={(customerId) =>
                      setDraft({ ...draft, customerId })
                    }
                  />
                  <Select
                    title="Domestic supplier"
                    items={byKind("suppliers")}
                    value={draft.supplierId}
                    onChange={(supplierId) =>
                      setDraft({ ...draft, supplierId })
                    }
                  />
                </div>
                <Fields
                  value={draft}
                  onChange={setDraft}
                  omit={["customerId", "supplierId"]}
                />
                {!order && (
                  <label className="text-sm">
                    <input
                      type="checkbox"
                      checked={sample}
                      onChange={(e) => setSample(e.target.checked)}
                    />{" "}
                    Sample / test order (excluded from live totals)
                  </label>
                )}
                <h3 className="font-semibold">
                  Products, pricing and packing details
                </h3>
                {draft.lines.map((l, i) => (
                  <div key={i} className="space-y-3 rounded border p-3">
                    <Select
                      title="Product"
                      items={byKind("products")}
                      value={l.productId}
                      onChange={(productId) => {
                        const p = directory.find((d) => d.id === productId);
                        setDraft({
                          ...draft,
                          lines: draft.lines.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  productId,
                                  description:
                                    p?.data.description || p?.name || "",
                                  hsCode: p?.data.hsCode || "",
                                  origin: p?.data.origin || "China",
                                  unit: p?.data.unit || "pcs",
                                }
                              : x,
                          ),
                        });
                      }}
                    />
                    <Fields
                      value={l}
                      omit={["productId"]}
                      onChange={(v) =>
                        setDraft({
                          ...draft,
                          lines: draft.lines.map((x, j) => (j === i ? v : x)),
                        })
                      }
                    />
                    {draft.lines.length > 1 && (
                      <button
                        className={alt}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            lines: draft.lines.filter((_, j) => j !== i),
                          })
                        }
                      >
                        Remove line
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className={alt}
                  onClick={() =>
                    setDraft({ ...draft, lines: [...draft.lines, blankLine()] })
                  }
                >
                  + Add product line
                </button>
                <h3 className="font-semibold">Factory purchase / fapiao</h3>
                <Fields
                  value={draft.purchase}
                  onChange={(purchase) => setDraft({ ...draft, purchase })}
                />
                <h3 className="font-semibold">Chinese customs (record only)</h3>
                <p className="text-sm text-muted-foreground">
                  Official documents must come from authorities or brokers.
                  Upload them after saving.
                </p>
                <Fields
                  value={draft.customs}
                  onChange={(customs) => setDraft({ ...draft, customs })}
                />
                <h3 className="font-semibold">Export tax / VAT</h3>
                <p className="text-sm text-muted-foreground">
                  RMB rate = RMB per unit of sales currency. Treatment must be
                  confirmed by a qualified accountant.
                </p>
                <Fields
                  value={draft.tax}
                  options={{
                    treatment: [
                      "UNCONFIRMED",
                      "REFUND",
                      "EXEMPTION",
                      "OTHER",
                      "NOT_APPLICABLE",
                    ],
                    refundStatus: [
                      "NOT_REVIEWED",
                      "PENDING",
                      "APPROVED",
                      "REJECTED",
                      "NOT_APPLICABLE",
                    ],
                  }}
                  onChange={(tax) => setDraft({ ...draft, tax })}
                />
                <h3 className="font-semibold">Shipment tracking</h3>
                <Fields
                  value={draft.shipment}
                  options={{ status: ["PENDING", "IN_TRANSIT", "DELIVERED"] }}
                  onChange={(shipment) => setDraft({ ...draft, shipment })}
                />
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    className={btn}
                    onClick={() =>
                      action(async () => {
                        const result = await request<{ id: string }>(
                          order ? `/orders/${order.id}` : "/orders",
                          order ? "PATCH" : "POST",
                          order ? draft : { data: draft, sample },
                        );
                        setSelected(result.id);
                        setDraft(null);
                      })
                    }
                  >
                    Save export order
                  </button>
                  <button className={alt} onClick={() => setDraft(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {order && !draft && (
              <>
                <div className={cls}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">
                      {order.parties.supplier.name} → Exporter →{" "}
                      {order.parties.customer.name}{" "}
                      {order.sample ? " (SAMPLE)" : ""}
                    </h3>
                    {!order.completedAt && (
                      <button
                        className={btn}
                        onClick={() => setDraft(order.data)}
                      >
                        Edit transaction
                      </button>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      [
                        "Sales",
                        format(totals(order).total, order.data.currency),
                      ],
                      [
                        "Purchase",
                        format(
                          totals(order).purchase,
                          order.data.purchaseCurrency,
                        ),
                      ],
                      [
                        "Received",
                        format(totals(order).paid, order.data.currency),
                      ],
                      [
                        "Outstanding",
                        format(totals(order).outstanding, order.data.currency),
                      ],
                    ].map(([k, v]) => (
                      <div className="rounded bg-muted p-3" key={k}>
                        <p className="text-xs text-muted-foreground">{k}</p>
                        <p className="font-semibold">{v}</p>
                      </div>
                    ))}
                  </div>
                  <h4 className="mt-4 mb-2 font-medium">Workflow checklist</h4>
                  {issues(order).length ? (
                    <ul className="list-disc pl-5 text-sm">
                      {issues(order).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-green-600">
                      All required checkpoints recorded.
                    </p>
                  )}
                  {order.completedAt ? (
                    <p className="mt-4 text-sm font-semibold text-green-600">
                      Completed · {order.completedAt.slice(0, 10)}
                    </p>
                  ) : (
                    <button
                      className={btn + " mt-4"}
                      disabled={busy || issues(order).length > 0}
                      onClick={() =>
                        action(() =>
                          request(`/orders/${order.id}/complete`, "POST", {}),
                        )
                      }
                    >
                      Mark completed
                    </button>
                  )}
                </div>
                <div className={cls}>
                  <h3 className="mb-3 font-semibold">Documents</h3>
                  {!order.completedAt && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {exporterDocumentKinds
                        .filter((k) => k !== "RECEIPT")
                        .map((k) => (
                          <button
                            disabled={busy}
                            key={k}
                            className={alt}
                            onClick={() =>
                              action(() =>
                                request(
                                  `/orders/${order.id}/documents/${k}`,
                                  "POST",
                                  {},
                                ),
                              )
                            }
                          >
                            Issue {docNames[k]}
                          </button>
                        ))}
                    </div>
                  )}
                  {documentList(order.documents)}
                  <button
                    className={btn + " mt-3"}
                    disabled={busy}
                    onClick={() => action(() => archive(order))}
                  >
                    Download complete ZIP archive
                  </button>
                </div>
                <div className={cls}>
                  <h3 className="mb-3 font-semibold">
                    Customer payment records
                  </h3>
                  {order.payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap justify-between border-b p-2 text-sm"
                    >
                      <span>
                        {p.data.date} · {format(p.data.amount, p.data.currency)}{" "}
                        · {p.data.type} · {p.data.bankReference}
                      </span>
                      {!order.completedAt && (
                        <button
                          className={alt}
                          disabled={busy}
                          onClick={() =>
                            action(() =>
                              request(
                                `/orders/${order.id}/documents/RECEIPT`,
                                "POST",
                                { paymentId: p.id },
                              ),
                            )
                          }
                        >
                          Issue receipt
                        </button>
                      )}
                    </div>
                  ))}
                  {!order.completedAt && (
                    <div className="mt-3 space-y-3">
                      <Fields
                        value={payment}
                        options={{ type: ["DEPOSIT", "BALANCE", "OTHER"] }}
                        onChange={setPayment}
                      />
                      <p className="text-xs text-muted-foreground">
                        Rate = order currency units per unit received. Use 1 for
                        matching currencies.
                      </p>
                      <button
                        className={btn}
                        disabled={busy}
                        onClick={() =>
                          action(() =>
                            request(
                              `/orders/${order.id}/payments`,
                              "POST",
                              payment,
                            ),
                          )
                        }
                      >
                        Record payment
                      </button>
                    </div>
                  )}
                </div>
                <div className={cls}>
                  <h3 className="mb-3 font-semibold">Supporting documents</h3>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Official fapiao, customs and shipping documents are uploaded
                    originals, never generated by SoloFlow.
                  </p>
                  {order.attachments.map((a) => (
                    <div
                      className="flex flex-wrap justify-between border-b p-2 text-sm"
                      key={a.id}
                    >
                      <span>
                        {a.category} · {a.filename}
                      </span>
                      <button
                        className={alt}
                        onClick={() =>
                          action(async () =>
                            download(await getAttachment(order, a), a.filename),
                          )
                        }
                      >
                        Download
                      </button>
                    </div>
                  ))}
                  {!order.completedAt && (
                    <div className="mt-3 space-y-2">
                      <select
                        className={input}
                        value={attachmentKind}
                        onChange={(e) => setAttachmentKind(e.target.value)}
                      >
                        {exporterAttachmentKinds.map((k) => (
                          <option key={k}>{k}</option>
                        ))}
                      </select>
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        disabled={busy}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f)
                            await action(async () => {
                              if (f.size > 10_000_000)
                                throw new Error("File exceeds 10 MB");
                              const base64 = (await readFile(f)).split(",")[1];
                              await request(
                                `/orders/${order.id}/attachments`,
                                "POST",
                                {
                                  category: attachmentKind,
                                  filename: f.name,
                                  contentType: f.type,
                                  base64,
                                },
                              );
                            });
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className={cls}>
                  <h3 className="mb-2 font-semibold">Transaction record</h3>
                  <div className="space-y-4">
                    <RecordFields
                      value={order.data}
                      omit={["customerId", "supplierId"]}
                    />
                    <details className="rounded border p-3" open>
                      <summary className="cursor-pointer font-medium">
                        Products and packing
                      </summary>
                      {order.data.lines.map((l, i) => (
                        <div className="mt-3 rounded border p-3" key={i}>
                          <RecordFields value={l} omit={["productId"]} />
                        </div>
                      ))}
                    </details>
                    <details className="rounded border p-3">
                      <summary className="cursor-pointer font-medium">
                        Overseas buyer
                      </summary>
                      <div className="mt-3">
                        <RecordFields value={order.parties.customer} />
                      </div>
                    </details>
                    <details className="rounded border p-3">
                      <summary className="cursor-pointer font-medium">
                        Domestic supplier and factory payment
                      </summary>
                      <div className="mt-3 space-y-4">
                        <RecordFields value={order.parties.supplier} />
                        <RecordFields value={order.data.purchase} />
                      </div>
                    </details>
                    <details className="rounded border p-3" open>
                      <summary className="cursor-pointer font-medium">
                        Official customs records (references only)
                      </summary>
                      <div className="mt-3">
                        <RecordFields value={order.data.customs} />
                      </div>
                    </details>
                    <details className="rounded border p-3" open>
                      <summary className="cursor-pointer font-medium">
                        Export tax / VAT records
                      </summary>
                      <div className="mt-3">
                        <RecordFields
                          value={{
                            ...order.data.tax,
                            rmbEquivalent:
                              totals(order).rmbEquivalent.toFixed(2),
                          }}
                        />
                      </div>
                    </details>
                    <details className="rounded border p-3" open>
                      <summary className="cursor-pointer font-medium">
                        Shipment record
                      </summary>
                      <div className="mt-3">
                        <RecordFields value={order.data.shipment} />
                      </div>
                    </details>
                  </div>
                </div>
                <div className={cls}>
                  <h3 className="mb-2 font-semibold">Audit history</h3>
                  <button
                    className={alt}
                    onClick={() =>
                      request<Audit[]>(`/orders/${order.id}/history`)
                        .then(setHistory)
                        .catch((e) => setError(e.message))
                    }
                  >
                    Refresh history
                  </button>
                  {history.map((h) => (
                    <p className="border-b py-2 text-sm" key={h.id}>
                      {h.createdAt.replace("T", " ").slice(0, 19)} · {h.action}{" "}
                      · {h.actorId}
                    </p>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

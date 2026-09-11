"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plane, Send } from "lucide-react";
import {
  chinaVisitDurations,
  chinaVisitFocus,
} from "@/lib/v2-content";

export function ChinaVisitForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-[1.75rem] border border-line bg-paper p-8 text-center"
      >
        <p className="font-display text-2xl font-semibold text-ink">Visit request received</p>
        <p className="mt-3 text-sm text-muted">
          The Xiamen desk will confirm factories, hotel, and pickup within 24 hours.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.75rem] border border-line bg-paper p-5 shadow-[0_20px_60px_rgba(17,17,17,0.08)] sm:p-7"
      aria-label="Schedule a China factory visit"
    >
      <div className="mb-5 flex items-center gap-2">
        <Plane className="h-5 w-5 text-accent" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Book a visit</p>
          <h3 className="font-display text-xl font-semibold text-ink">Tell us when you can be in China</h3>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Name *</span>
          <input
            required
            name="name"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Company</span>
          <input
            name="company"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Email *</span>
          <input
            required
            type="email"
            name="email"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">WhatsApp / phone *</span>
          <input
            required
            name="phone"
            placeholder="+971 … or +86 …"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent placeholder:text-muted/70 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Preferred start date *</span>
          <input
            required
            type="date"
            name="startDate"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Duration</span>
          <select
            name="duration"
            defaultValue="3 days"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          >
            {chinaVisitDurations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Travelers</span>
          <input
            name="travelers"
            type="number"
            min={1}
            defaultValue={1}
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-muted">Focus</span>
          <select
            name="focus"
            className="w-full rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent focus:ring-2"
          >
            {chinaVisitFocus.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block text-muted">What should we put on the itinerary?</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Category, factories you already like, whether you want the 3PL warehouse, Canton Fair overlap…"
            className="w-full resize-y rounded-2xl border border-line bg-paper-elevated px-4 py-3 text-ink outline-none ring-accent placeholder:text-muted/70 focus:ring-2"
          />
        </label>
      </div>
      <button
        type="submit"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      >
        <Send className="h-4 w-4" aria-hidden />
        Request China visit
      </button>
      <p className="mt-3 text-center text-[11px] text-muted">
        Hosted in Xiamen · reply in 24h · not a brokered tourist tour
      </p>
    </form>
  );
}

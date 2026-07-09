import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME } from '@flowbooks/shared';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy policy for ${APP_NAME}`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-foreground">
        <div>
          <Link href="/login" className="text-primary hover:underline text-sm">
            ← Back to {APP_NAME}
          </Link>
          <h1 className="mt-4 text-2xl font-semibold">Privacy Policy</h1>
          <p className="text-muted-foreground mt-1">Last updated: July 9, 2026</p>
        </div>

        <p>
          {APP_NAME} (&quot;we&quot;, &quot;our&quot;) helps small businesses create invoices, track
          expenses, and send receipts. This policy explains what data we collect and how we use it.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Information we collect</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Account details you provide (name, email, password)</li>
            <li>Business information (company name, logo, address, bank details)</li>
            <li>Customer, product, invoice, expense, and receipt data you enter</li>
            <li>Session and authentication data needed to keep you signed in</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">How we use your data</h2>
          <p className="text-muted-foreground">
            We use your data only to run {APP_NAME}: generating invoices and PDFs, showing your
            dashboard, and saving your business records. We do not sell your data to third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Where data is stored</h2>
          <p className="text-muted-foreground">
            Your data is stored on secure servers and transmitted over HTTPS. You are responsible for
            the accuracy of customer and business information you enter.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Data deletion</h2>
          <p className="text-muted-foreground">
            You may request deletion of your account and data by contacting us at the email below. We
            will process requests within a reasonable time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-medium">Contact</h2>
          <p className="text-muted-foreground">
            Questions about this policy:{' '}
            <a href="mailto:support@soloflow.app" className="text-primary hover:underline">
              support@soloflow.app
            </a>
          </p>
        </section>
      </article>
    </div>
  );
}

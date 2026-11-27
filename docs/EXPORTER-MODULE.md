# Standalone Exporter Module

Open **Exporter Module** from the SoloFlow desktop sidebar or mobile home navigation. Return to SoloFlow using the Back link. Exporter data is tenant-scoped and saved in `exporter_*` tables. No existing invoice, customer, expense, quote or product table is read or written by the exporter workflow.

## Deployment and safety

1. Take a database backup using the normal private backup procedure; do not export production data into source control.
2. Apply the additive migration `20261127080000_exporter_module` using the usual Prisma migration workflow in a staging environment. Verify that all eight new exporter tables exist before opening the module.
3. Build `@flowbooks/database`, `@flowbooks/shared`, `@flowbooks/api`, and `@flowbooks/web` and run the regression suites. Deploy only after staging checks pass.
4. Owners and administrators configure the exporter profile. Owners, administrators, managers and accountants can manage export orders. Other existing SoloFlow roles have no exporter access by default.

The module shares authentication and tenant membership only. Profile, directory, orders, payments, attachments, audit events and numbering are isolated. Each issued document has an immutable data snapshot; revised documents receive new numbers. Completed orders are read-only. Currency totals are grouped by currency rather than adding unrelated currencies without conversion. Attachments are private and limited to PDF/PNG/JPEG files up to 10 MB.

## Sample acceptance run (isolated staging organization)

Use the exporter and overseas buyer names supplied by the business owner, not details from the existing invoicing profile. Create a **SAMPLE** factory and product (one electric curtain motor). Save the independent exporter profile and overseas customer. Use invented *test prices only* (such as CNY 250 purchase and USD 100 sale), a user-selected test conversion rate, and select **Sample / test order**. Sample orders are excluded from live dashboard totals and their generated documents are visibly marked SAMPLE.

1. Create the order linked to the domestic factory, overseas customer and one motor. Record quantity, sample prices, actual package measurements or clearly test-only measurements, and a confirmed classification for any live order.
2. Issue and download a PI. Record a test deposit of USD 40 and test balance of USD 60; verify outstanding changes from USD 100 to USD 60 to USD 0. Issue a payment receipt.
3. Enter confirmed HS code, origin and packing details when available, issue CI and PL, and download their PDFs. Check that the exporter is the seller and the factory is not shown as the overseas seller.
4. Test that generated PI/CI/PL cannot satisfy the customs checkpoint. Do not fabricate government declaration numbers, fapiao documents, or tax approvals. The test order should remain incomplete until valid supporting records are available.
5. Record legitimate factory payment, fapiao, customs, tax accountant confirmation and shipping records only when supplied. Upload supporting originals to the correct category. Verify the completion gate, audit history and ZIP archive. Do not substitute internally generated documents for official originals.

Do not assume any export qualifies for a refund or exemption. Tax treatment defaults to unconfirmed and requires a named confirmation. This module records the business's confirmed treatment; it does not determine tax eligibility or submit customs declarations.

## Verification

- The shared validation suite covers partial payments, foreign-currency conversion, invalid dates/prices/weights, the customs/tax completion gate, and outdated CI/PL snapshots.
- The API suite covers organization membership, role restrictions, scoped queries and private attachments.
- The web tests cover module navigation, sample-data exclusion from live totals, PDF generation and ZIP structure.
- A disposable PostgreSQL integration run applied the migration to the original schema and checked that the legacy invoice, customer, expense and numbering records remained byte-for-byte unchanged. The isolated one-motor test created the six document types, recorded a USD 40 deposit and USD 60 balance, rejected overpayment, checked audit events and cross-organization isolation, and refused completion without legitimate customs and tax evidence. No government records were fabricated.
- A separate PDF run inspected generated documents (including the Chinese exporter name) and validated the archive with a standard ZIP reader.
- Existing unrelated regression failures in the legacy dashboard mock, currency-control mocks, PDF test timeout/image Blob mock, and offline-browser startup were reproduced on the untouched baseline. They are outside the exporter change scope.

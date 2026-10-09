# Multi-session billing — 9 October 2026

Implemented locally as provider-independent internal billing. No hosted database changes, push or deployment were performed for this feature.

## Workflow

1. Open **Factures → Créer une facture** (English: **Invoices → Create invoice**).
2. Choose the patient, optionally filter by date, and select completed visits.
3. Check each visit's price and VAT rate. If a historical price is missing, enter the agreed price; the current catalogue price is shown only as a suggestion.
4. Enter a reason for a zero VAT rate or an adjustment to a saved historical price.
5. Leave the document unpaid, or explicitly confirm that full payment has already been received. An official invoice reference can optionally be entered at creation.
6. Review and create one itemized document. Identical treatments/practitioners/prices/taxes are grouped with a quantity, preserving every visit date.

The existing single-service creation path remains available. A direct appointment invoice continues to use that path. Existing documents remain readable.

## Integrity and accounting behavior

- One patient per document; 1–100 completed, past/due visits; maximum total €50,000.
- Planned, future and archived visits are excluded from the new session selector.
- An appointment and its linked clinical record count as one visit.
- Active legacy appointment invoices also block a second invoice for that visit.
- Amounts are validated and totaled in integer cents on the server. Per-line VAT rounding is shared by the preview, print template and billing CSV.
- Creation is atomic: invoice, items and retry key commit together. A stable request key makes retries safe; concurrent administrators cannot claim the same visit twice.
- Patient/session versions are checked again when saving. Stale data produces a conflict instead of an unnoticed overwrite.
- Issued item snapshots cannot be edited. Later changes to catalogue prices or patient sessions do not rewrite the saved invoice lines.
- Cancellation keeps the original document and lines, releases visits for an explicit replacement, and cannot be reversed on a session invoice. Refunded documents continue to reserve their visits.
- Completion does not imply payment. The new flow defaults to unpaid. Payment tracking currently supports unpaid or fully paid, plus existing cancellation/refund states; partial payments and instalments are outside this change.
- Mixed treatment categories allocate revenue using saved line amounts, while document counts still count each invoice once.
- Full backup/restore includes invoice items. Older backup formats can omit the new table.
- No invoicing provider API, certification, ATCUD, QR issuance or tax-authority submission was added. Documents say **internal / no fiscal value**. Placeholder clinic registration numbers and assumed patient addresses were removed from the invoice preview.

## API changes

| Method and route | Access | Behavior |
|---|---|---|
| `GET /api/admin/patients/[id]/billing-sessions` | Admin session | Patient-scoped completed visits, saved prices and existing invoice links; optional date filters; default 50, maximum 100 rows per page. |
| `POST /api/admin/invoices/sessions` | Admin session | Creates an internal multi-session invoice; requires `Idempotency-Key`; 64 KiB streamed request limit; validates prices, VAT and ownership; atomic duplicate protection. |
| Existing invoice list/detail routes | Existing access rules | Include saved `items`, document kind and optional external reference; category filters include matching item categories. |
| `POST /api/admin/invoices` | Admin session | The older appointment flow now returns 409 if that appointment is already invoiced. |
| `GET /api/admin/invoices/export` | Owner step-up | Correct mixed-VAT totals, session count, dates, official reference and internal-document designation in CSV. |
| Existing full JSON backup/restore | Existing owner access | Preserves line allocations and snapshot history. |

The regenerated [full API inventory](API-ROUTES.md) contains **37 route paths and 55 exported handlers**. All **43 anonymous authorization probes** against protected handlers returned 401 on the isolated local development server.

## Validation

- Production build: passed using isolated local storage and disabled external messaging credentials.
- TypeScript: passed.
- Full regression suite: **200 passed**.
- Production-focused suite: **8 passed**.
- Session billing suite with the local-file libSQL adapter: **12 passed** (also included in the SQLite regression run).
- Tests cover mixed VAT and CSV export, historical prices, patient ownership, stale versions, duplicate selections, simultaneous billing, retry recovery, cancellation/replacement, old invoices, immutable lines, backup restoration and category revenue allocation.
- Browser verification at `http://localhost:3009/admin?tab=invoices`: created a synthetic three-session document, checked grouped quantities and dates, checked €150.00 net + €11.50 VAT = €161.50 total, then reopened the selector and confirmed all three visits were disabled as already invoiced.
- The print action was invoked and its dialog dismissed. Print-template contents and amounts are tested; a saved PDF file and physical printer output were not inspected.

The local synthetic example is **Session Billing [TEST]**, document **FT 2026/0289**. Browser screenshots and final command logs are in the workspace's `output` directory. This report supplements the earlier deployment audit; earlier performance measurements were not rerun and do not measure this new workflow.

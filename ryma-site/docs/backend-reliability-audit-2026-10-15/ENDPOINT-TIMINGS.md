# Per-handler HTTP timings — 15 October 2026

Source: [endpoint-timings.json](endpoint-timings.json). Run against an isolated local production-mode Next server and disposable SQLite fixture. Percentiles are client-observed wall-clock HTTP latency; small-fixture timings are not production SLO evidence.

The “success” column counts 2xx responses. “4xx/5xx” responses here include deliberate validation errors, missing-record probes, authorization failures, and expected unavailable-provider responses; they are not all unexpected defects. Read handlers received 10 samples; most write handlers received one intentionally invalid or missing-record probe. See the report for workflow tests that exercise successful writes.

| Handler | Access exercised | Samples | Status distribution | Mean ms | p95 ms | 2xx / samples |
|---|---|---:|---|---:|---:|---:|
| `POST /api/admin/analytics/password` | owner | 1 | 400×1 | 14.9 | 14.9 | 0/1 |
| `GET /api/admin/analytics` | owner | 10 | 200×10 | 18.3 | 26.2 | 10/10 |
| `GET /api/admin/appointments/[id]` | admin | 10 | 404×10 | 13.1 | 17.1 | 0/10 |
| `PATCH /api/admin/appointments/[id]` | admin | 1 | 404×1 | 16.2 | 16.2 | 0/1 |
| `DELETE /api/admin/appointments/[id]` | admin | 1 | 404×1 | 17.4 | 17.4 | 0/1 |
| `POST /api/admin/appointments/multiple/preview` | admin | 1 | 422×1 | 7.4 | 7.4 | 0/1 |
| `POST /api/admin/appointments/multiple` | admin | 1 | 422×1 | 6.4 | 6.4 | 0/1 |
| `GET /api/admin/appointments` | admin | 10 | 200×10 | 18.4 | 34.4 | 10/10 |
| `POST /api/admin/appointments` | admin | 1 | 422×1 | 16.8 | 16.8 | 0/1 |
| `GET /api/admin/events` | admin | 10 | 200×10 | 5.9 | 18.3 | 10/10 |
| `GET /api/admin/export` | owner | 10 | 200×10 | 12.8 | 19.8 | 10/10 |
| `GET /api/admin/invoices/[id]` | admin | 10 | 404×10 | 13.9 | 19.6 | 0/10 |
| `PUT /api/admin/invoices/[id]` | admin | 1 | 404×1 | 15.6 | 15.6 | 0/1 |
| `DELETE /api/admin/invoices/[id]` | owner | 1 | 404×1 | 15.7 | 15.7 | 0/1 |
| `GET /api/admin/invoices/export` | owner | 10 | 200×10 | 14.0 | 17.7 | 10/10 |
| `GET /api/admin/invoices` | admin | 10 | 200×10 | 16.7 | 26.7 | 10/10 |
| `POST /api/admin/invoices` | admin | 1 | 422×1 | 21.6 | 21.6 | 0/1 |
| `POST /api/admin/invoices/sessions` | admin | 1 | 422×1 | 18.4 | 18.4 | 0/1 |
| `GET /api/admin/me` | admin | 10 | 200×10 | 13.8 | 19.3 | 10/10 |
| `GET /api/admin/patients/[id]/billing-sessions` | admin | 10 | 404×10 | 15.5 | 17.8 | 0/10 |
| `POST /api/admin/patients/[id]/sessions` | admin | 1 | 404×1 | 17.2 | 17.2 | 0/1 |
| `PATCH /api/admin/patients/[id]/sessions` | admin | 1 | 422×1 | 12.9 | 12.9 | 0/1 |
| `DELETE /api/admin/patients/[id]/sessions` | admin | 1 | 422×1 | 3.6 | 3.6 | 0/1 |
| `GET /api/admin/patients` | admin | 10 | 200×10 | 13.7 | 16.9 | 10/10 |
| `POST /api/admin/patients` | admin | 1 | 422×1 | 14.9 | 14.9 | 0/1 |
| `DELETE /api/admin/patients` | owner | 1 | 422×1 | 4.5 | 4.5 | 0/1 |
| `GET /api/admin/practitioners` | admin | 10 | 200×10 | 10.9 | 16.4 | 10/10 |
| `POST /api/admin/practitioners` | admin | 1 | 422×1 | 12.4 | 12.4 | 0/1 |
| `DELETE /api/admin/prescriptions/[id]` | admin | 1 | 200×1 | 17.6 | 17.6 | 1/1 |
| `GET /api/admin/prescriptions` | admin | 10 | 200×10 | 13.8 | 16.2 | 10/10 |
| `POST /api/admin/prescriptions` | admin | 1 | 422×1 | 16.4 | 16.4 | 0/1 |
| `GET /api/admin/reviews` | admin | 10 | 200×10 | 10.9 | 16.6 | 10/10 |
| `PATCH /api/admin/reviews` | admin | 1 | 400×1 | 16.3 | 16.3 | 0/1 |
| `DELETE /api/admin/reviews` | admin | 1 | 400×1 | 14.8 | 14.8 | 0/1 |
| `POST /api/admin/slots/bulk` | admin | 1 | 422×1 | 5.9 | 5.9 | 0/1 |
| `GET /api/admin/slots` | admin | 10 | 200×10 | 15.1 | 15.8 | 10/10 |
| `POST /api/admin/slots` | admin | 1 | 422×1 | 13.9 | 13.9 | 0/1 |
| `GET /api/admin/treatments` | admin | 10 | 200×10 | 15.6 | 17.6 | 10/10 |
| `POST /api/admin/treatments` | admin | 1 | 409×1 | 17.9 | 17.9 | 0/1 |
| `GET /api/admin/whatsapp` | admin | 10 | 200×10 | 13.9 | 17.3 | 10/10 |
| `POST /api/appointments` | public | 1 | 422×1 | 4.8 | 4.8 | 0/1 |
| `POST /api/contact` | public | 1 | 422×1 | 13.5 | 13.5 | 0/1 |
| `GET /api/health` | public | 10 | 200×10 | 13.8 | 17.0 | 10/10 |
| `GET /api/practitioners` | public | 10 | 200×10 | 15.6 | 18.6 | 10/10 |
| `GET /api/reviews` | public | 10 | 200×10 | 15.6 | 17.1 | 10/10 |
| `POST /api/reviews` | public | 1 | 400×1 | 15.6 | 15.6 | 0/1 |
| `GET /api/slots` | public | 10 | 200×10 | 12.8 | 20.0 | 10/10 |
| `GET /api/treatments` | public | 10 | 200×10 | 13.7 | 16.9 | 10/10 |
| `POST /api/whatsapp/jobs` | job-secret | 1 | 401×1 | 18.6 | 18.6 | 0/1 |
| `GET /api/whatsapp/webhook` | public | 10 | 403×10 | 13.7 | 16.9 | 0/10 |
| `POST /api/whatsapp/webhook` | public | 1 | 503×1 | 15.1 | 15.1 | 0/1 |

## Special cases

- Four stateful auth lifecycle handlers were separately exercised once: login 200 (146.8 ms), owner verification 200 (120.0 ms), lock 200 (23.7 ms), logout 200 (14.2 ms).
- Booking CAPTCHA gate: missing token 403 (20.3 ms), invalid/wrong-action token 403 (14.6 ms), synthetic valid token 201 (17.9 ms). The synthetic verifier does not contact Google.
- WhatsApp webhook POST returned 503 because the integration is deliberately disabled in the fixture. The jobs endpoint returned 401 without the configured bearer scheduler secret.
- Prescription DELETE returned 200 for a nonexistent id in this fixture, indicating idempotent/no-op deletion behavior at HTTP level; consider returning 404 or documenting this contract consistently.

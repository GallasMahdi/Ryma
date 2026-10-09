# Spanish localization — 9 October 2026

Spanish (`es`, displayed as **Español**) is available throughout the public website and administration interface, alongside Portuguese, English and French.

## Coverage

- Language selection on the public navigation, mobile drawer, admin login and admin controls. The selected language persists in local storage and the language cookie, sets the document language, and participates in language cycling.
- Public page text, booking forms and calendars, service discovery, body-map labels, contact/review forms, legal pages and all eight complete journal articles.
- Administration navigation, appointments, recurring sessions, patients, team management, treatment editing, invoices, prescriptions, analytics, help and dialog labels.
- Spanish treatment names, descriptions, clinical lists and FAQs are accepted, preserved by validation and editable in the ES content tab.
- API error messages, patient and administrator booking emails, contact email labels, WhatsApp booking conversations, printable billing/prescription templates, CSV headings, shared document messages and calendar event titles.
- Spanish date/number formatting and server-rendered page metadata. Existing identifiers, URL slugs, status codes and payment codes keep their canonical values.

## Verification

- `npm run test:regression`: **210 tests passed**. Includes the new Spanish tests and Spanish UI persistence/editor tests.
- `npm run test:production`: **8 tests passed**.
- After the last browser corrections, `node --test scripts/test-spanish.cjs scripts/test-treatments-ui.cjs scripts/test-scheduling.cjs`: **98 tests passed**.
- `npm run build:audit`: **passed**, including TypeScript and production page generation, against an isolated temporary database.
- `npm run audit:i18n`: **0 issues** in four dictionaries, eight articles and 171 localized records. The audit checks nested arrays, language selectors and language-choice branches, including branches referencing calendar constants.
- Audit of the explicitly selected local preview endpoint: **13 published fictional treatments**, including Spanish names, descriptions, lists and FAQs; **0 issues**.
- Browser checks on the built app: language dropdown, mobile navigation, persistence after reload/navigation, Spanish booking treatment selection and calendar (Octubre / Dom–Sáb), admin sign-in and Spanish language option, admin dashboard and treatment editor with ES selected.
- Email tests use a mocked transport. Browser tests use a separate fictional demo database with outbound email and WhatsApp disabled.

## Content scope

Interface translations do not rewrite patient notes, review text, practitioner-entered biographies, historical issued documents or administrator-authored treatment descriptions. These records keep their original wording. Existing treatments without an ES translation continue to use their available text; their Spanish versions can be entered in **Tratamientos → Editar → ES**. The fictional catalogue is translated to exercise the complete Spanish workflow. No production database was rewritten during this work.

To audit a real catalogue explicitly, set `SERVICE_AUDIT_URL` to its `/api/treatments` URL and run `npm run audit:i18n`. Missing content translations produce a nonzero exit code and identify the exact treatment field. Omitting the URL audits source translations only and reports that runtime content was not checked.

The earlier production-audit documents in this repository describe separate configuration and deployment findings. A successful local build does not establish that the hosted environment is configured or deployed correctly.

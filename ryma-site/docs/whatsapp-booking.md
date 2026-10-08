# WhatsApp booking for Ryma Kiné

The clinic number configured in the website's WhatsApp links is **+351 933 467 880**.
Setting that number in code does not register it with Meta or activate messaging.
The integration is disabled unless its server environment explicitly enables it.

## Implemented

- Official Cloud API webhook verification and validation of the raw-body HMAC signature.
- Portuguese, English and French booking messages with paginated treatment/date/time lists.
- Simple text shortcuts for a recognised treatment, today/tomorrow/ISO date, and morning/afternoon. This is a guided booking assistant, not an unrestricted AI interpreter.
- Patient name, phone from the verified inbound message, and an explicit confirmation button.
- A 30-minute selection expiry; old buttons cannot book a new selection. Browsing does not hold a slot.
- Shared appointment database and duration-aware availability, including breaks and blocked half-hour intervals.
- Database constraints/triggers protect concurrent bookings across website, dashboard and WhatsApp.
- `source = whatsapp` and a WhatsApp label in the appointment detail modal.
- Database-backed dashboard revision events every three seconds, in addition to existing live events and fallback refreshes. This works across server processes without a separate Redis service.
- Durable inbound messages, per-conversation leases, replay protection, idempotent booking keys, and outgoing-message retries.
- Protected integration status at `GET /api/admin/whatsapp` using the normal admin session.

The default is **PENDING**, matching existing website appointment requests. Messages explicitly say the clinic must approve them. Set `WHATSAPP_AUTO_CONFIRM=true` for immediate confirmation.

## Meta account setup

1. Create/select the clinic's Meta business portfolio, developer app and WhatsApp Business Account.
2. Check the onboarding path for the existing number before migrating it. If it is already in the WhatsApp or WhatsApp Business phone app, do not remove the account as a development step. Use Meta's supported onboarding path for that account or a separate test number.
3. Use Meta's test phone first. A patient test number must be a different WhatsApp account from the clinic sender number.
4. Obtain the **Phone Number ID**, server access token with the required WhatsApp messaging permission, and app secret. The Phone Number ID is a Meta identifier, not `351933467880`.
5. Choose the supported Graph API version displayed by Meta. Complete any required phone verification, display-name approval, billing and business checks before production use.

Official references:
- [Meta Cloud API collection and setup](https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api)
- [WhatsApp Business messaging policy](https://whatsappbusiness.com/policy/)
- [WhatsApp platform pricing](https://whatsappbusiness.com/products/platform-pricing/)

## Server configuration

Use the placeholders in `.env.example`. Store actual secrets only in `.env.local` or your hosting provider's encrypted environment settings. Do not put tokens in client code, commit them, or paste them into the chat.

| Variable | Value |
|---|---|
| `WHATSAPP_ENABLED` | `true` only when ready to receive/send |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta's ID for the registered clinic/test number |
| `WHATSAPP_ACCESS_TOKEN` | Production server access token, with a rotation/expiry plan |
| `WHATSAPP_APP_SECRET` | Meta app secret used for incoming signature verification |
| `WHATSAPP_VERIFY_TOKEN` | A random secret you choose for webhook verification |
| `WHATSAPP_GRAPH_VERSION` | Supported version from Meta, in `vNN.0` format |
| `WHATSAPP_JOB_SECRET` | Another random secret, protecting retry jobs |
| `WHATSAPP_AUTO_CONFIRM` | `false` by default; `true` for automatic booking confirmation |
| `WHATSAPP_ALLOWED_SENDERS` | During testing, comma-separated patient numbers in international digits, without `+` |

Use the existing persistent Turso configuration for serverless deployments. SQLite is supported for development and explicitly configured persistent single-server deployments. Additive tables/columns and booking guards are installed by database initialization. Existing appointments are preserved, including historical overlaps; new overlapping appointments are rejected.

The scheduling model remains the existing single shared clinic calendar. Full treatment durations must fit the published half-hour grid, currently 08:30–12:30 and 14:00–17:30. These are derived booking windows, not the broader marketing hours on the website. Review these times with the clinic before launch. Multiple independent practitioners/rooms need a resource-aware calendar model.

## Deploy and register the webhook

1. Deploy the app to a public HTTPS domain with the server secrets configured.
2. Configure Meta's callback as `https://YOUR_DOMAIN/api/whatsapp/webhook` and supply your `WHATSAPP_VERIFY_TOKEN`.
3. Subscribe the app to the WABA's `messages` webhook field. Verification alone is not a message subscription.
4. Schedule an authenticated **POST** to `https://YOUR_DOMAIN/api/whatsapp/jobs` every minute with `Authorization: Bearer YOUR_WHATSAPP_JOB_SECRET`. Use a scheduler that supports POST and an Authorization header. Merely setting the secret does not create the schedule.
5. Check `/api/admin/whatsapp` while signed in. This reports configuration and queue counts without revealing secrets. `retryJobConfigured` means a secret exists, not that the external scheduler has been verified.
6. Send a message from an allowed patient test number. Complete a booking and check its date, treatment, phone, status and WhatsApp source in the dashboard. Check simultaneous website bookings and the worker schedule before removing the sender allowlist.

The webhook saves incoming messages before acknowledging them, then uses Next.js `after()` for prompt processing. The scheduled worker recovers unfinished work following restarts or temporary failures. Do not rely on `after()` alone for delivery reliability.

## Failure and privacy behavior

- A retry uses the same booking request key. A committed appointment can be recovered even if the worker crashed before saving its response.
- Outgoing failures retry with backoff. API acceptance is recorded as `sent`; it is not proof the patient read or received the message. This release does not ingest delivery/read receipts.
- Free-form replies expire before the 24-hour service window closes. This release does not send reminder templates or proactive booking-status notifications.
- A network timeout after Meta accepts a send can result in a repeated confirmation message on retry; it cannot create another appointment.
- Raw inbound message content is erased after successful processing. Successful outgoing content is erased after Meta accepts it. Conversation state expires after 30 minutes and is removed after a day; queue metadata is retained for up to 30 days by the worker. Failed outgoing content is retained for diagnosis until cleanup.
- `STOP` ends the guided conversation. It does not cancel an existing appointment. `human` / `humano` / `humain` provides the clinic's phone number; it does not forward a message or open a staff inbox.
- No clinical questions, medical records, insurance documents or clinical AI advice are part of this flow. Review the clinic's privacy notice and follow-up messaging permissions before enabling additional features.

## Local verification

```powershell
npm run test:whatsapp
$env:RYMA_TEST_ADAPTER = 'libsql'
npm run test:whatsapp
Remove-Item Env:RYMA_TEST_ADAPTER
npm run test:phone
npm run test:reviews
npx tsc --noEmit
npm run build
```

The WhatsApp tests use disposable local SQLite/libSQL databases, synthetic patients and a mocked Meta transport. They do not read `.env.local`, use the clinic's live database, or send real WhatsApp messages. Live Meta delivery still requires onboarding and the smoke test above.

Future additions: approved reminder/status templates with explicit follow-up preferences; self-service cancellation/rescheduling with ownership checks; a staff conversation inbox; richer natural-language interpretation; practitioner/room-specific capacity.

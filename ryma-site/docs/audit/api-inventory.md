# Registre des API

32 fichiers route.ts ; 49 méthodes exportées. Aucun Server Action « use server » trouvé dans src. La colonne garde est déterminée méthode par méthode.

| Méthode | Route | Garde serveur | Contrôle direct sans session | Source |
|---|---|---|---|---|
| POST | /api/admin/analytics/lock | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/analytics/lock/route.ts:12](../../src/app/api/admin/analytics/lock/route.ts#L12) |
| POST | /api/admin/analytics/password | requireOwnerAnalytics | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/analytics/password/route.ts:17](../../src/app/api/admin/analytics/password/route.ts#L17) |
| GET | /api/admin/analytics | requireOwnerAnalytics | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/analytics/route.ts:10](../../src/app/api/admin/analytics/route.ts#L10) |
| POST | /api/admin/analytics/verify | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/analytics/verify/route.ts:23](../../src/app/api/admin/analytics/verify/route.ts#L23) |
| POST | /api/admin/appointments/multiple/preview | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/multiple/preview/route.ts:34](../../src/app/api/admin/appointments/multiple/preview/route.ts#L34) |
| POST | /api/admin/appointments/multiple | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/multiple/route.ts:17](../../src/app/api/admin/appointments/multiple/route.ts#L17) |
| GET | /api/admin/appointments | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/route.ts:19](../../src/app/api/admin/appointments/route.ts#L19) |
| POST | /api/admin/appointments | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/route.ts:65](../../src/app/api/admin/appointments/route.ts#L65) |
| GET | /api/admin/appointments/[id] | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/[id]/route.ts:24](../../src/app/api/admin/appointments/[id]/route.ts#L24) |
| PATCH | /api/admin/appointments/[id] | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/[id]/route.ts:41](../../src/app/api/admin/appointments/[id]/route.ts#L41) |
| DELETE | /api/admin/appointments/[id] | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/appointments/[id]/route.ts:128](../../src/app/api/admin/appointments/[id]/route.ts#L128) |
| GET | /api/admin/events | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/events/route.ts:11](../../src/app/api/admin/events/route.ts#L11) |
| GET | /api/admin/export | requireOwnerAnalytics | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/export/route.ts:18](../../src/app/api/admin/export/route.ts#L18) |
| GET | /api/admin/invoices/export | requireOwnerAnalytics | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/invoices/export/route.ts:17](../../src/app/api/admin/invoices/export/route.ts#L17) |
| GET | /api/admin/invoices | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/invoices/route.ts:18](../../src/app/api/admin/invoices/route.ts#L18) |
| POST | /api/admin/invoices | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/invoices/route.ts:76](../../src/app/api/admin/invoices/route.ts#L76) |
| GET | /api/admin/invoices/[id] | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/invoices/[id]/route.ts:15](../../src/app/api/admin/invoices/[id]/route.ts#L15) |
| PUT | /api/admin/invoices/[id] | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/invoices/[id]/route.ts:32](../../src/app/api/admin/invoices/[id]/route.ts#L32) |
| DELETE | /api/admin/invoices/[id] | requireOwnerAnalytics | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/invoices/[id]/route.ts:74](../../src/app/api/admin/invoices/[id]/route.ts#L74) |
| POST | /api/admin/login | public / spécifique | Voir matrice du rapport | [src/app/api/admin/login/route.ts:17](../../src/app/api/admin/login/route.ts#L17) |
| POST | /api/admin/logout | session + révocation interne | Voir matrice du rapport | [src/app/api/admin/logout/route.ts:10](../../src/app/api/admin/logout/route.ts#L10) |
| GET | /api/admin/me | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/me/route.ts:15](../../src/app/api/admin/me/route.ts#L15) |
| GET | /api/admin/patients | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/patients/route.ts:21](../../src/app/api/admin/patients/route.ts#L21) |
| POST | /api/admin/patients | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/patients/route.ts:89](../../src/app/api/admin/patients/route.ts#L89) |
| DELETE | /api/admin/patients | requireOwnerAnalytics | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/patients/route.ts:157](../../src/app/api/admin/patients/route.ts#L157) |
| POST | /api/admin/patients/[id]/sessions | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/patients/[id]/sessions/route.ts:17](../../src/app/api/admin/patients/[id]/sessions/route.ts#L17) |
| PATCH | /api/admin/patients/[id]/sessions | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/patients/[id]/sessions/route.ts:95](../../src/app/api/admin/patients/[id]/sessions/route.ts#L95) |
| DELETE | /api/admin/patients/[id]/sessions | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/patients/[id]/sessions/route.ts:136](../../src/app/api/admin/patients/[id]/sessions/route.ts#L136) |
| GET | /api/admin/practitioners | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/practitioners/route.ts:8](../../src/app/api/admin/practitioners/route.ts#L8) |
| POST | /api/admin/practitioners | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/practitioners/route.ts:17](../../src/app/api/admin/practitioners/route.ts#L17) |
| GET | /api/admin/prescriptions | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/prescriptions/route.ts:11](../../src/app/api/admin/prescriptions/route.ts#L11) |
| POST | /api/admin/prescriptions | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/prescriptions/route.ts:27](../../src/app/api/admin/prescriptions/route.ts#L27) |
| DELETE | /api/admin/prescriptions/[id] | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/prescriptions/[id]/route.ts:9](../../src/app/api/admin/prescriptions/[id]/route.ts#L9) |
| GET | /api/admin/reviews | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/reviews/route.ts:11](../../src/app/api/admin/reviews/route.ts#L11) |
| PATCH | /api/admin/reviews | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/reviews/route.ts:42](../../src/app/api/admin/reviews/route.ts#L42) |
| DELETE | /api/admin/reviews | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/reviews/route.ts:78](../../src/app/api/admin/reviews/route.ts#L78) |
| POST | /api/admin/slots/bulk | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/slots/bulk/route.ts:8](../../src/app/api/admin/slots/bulk/route.ts#L8) |
| GET | /api/admin/slots | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/slots/route.ts:10](../../src/app/api/admin/slots/route.ts#L10) |
| POST | /api/admin/slots | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/slots/route.ts:30](../../src/app/api/admin/slots/route.ts#L30) |
| GET | /api/admin/whatsapp | requireAdmin | PASS — HTTP 401, AUTH-01 | [src/app/api/admin/whatsapp/route.ts:8](../../src/app/api/admin/whatsapp/route.ts#L8) |
| POST | /api/appointments | public / spécifique | Voir matrice du rapport | [src/app/api/appointments/route.ts:29](../../src/app/api/appointments/route.ts#L29) |
| GET | /api/health | public / spécifique | Voir matrice du rapport | [src/app/api/health/route.ts:12](../../src/app/api/health/route.ts#L12) |
| GET | /api/practitioners | public / spécifique | Voir matrice du rapport | [src/app/api/practitioners/route.ts:5](../../src/app/api/practitioners/route.ts#L5) |
| GET | /api/reviews | public / spécifique | Voir matrice du rapport | [src/app/api/reviews/route.ts:9](../../src/app/api/reviews/route.ts#L9) |
| POST | /api/reviews | public / spécifique | Voir matrice du rapport | [src/app/api/reviews/route.ts:37](../../src/app/api/reviews/route.ts#L37) |
| GET | /api/slots | public / spécifique | Voir matrice du rapport | [src/app/api/slots/route.ts:17](../../src/app/api/slots/route.ts#L17) |
| POST | /api/whatsapp/jobs | public / spécifique | Voir matrice du rapport | [src/app/api/whatsapp/jobs/route.ts:9](../../src/app/api/whatsapp/jobs/route.ts#L9) |
| GET | /api/whatsapp/webhook | public / spécifique | Voir matrice du rapport | [src/app/api/whatsapp/webhook/route.ts:11](../../src/app/api/whatsapp/webhook/route.ts#L11) |
| POST | /api/whatsapp/webhook | public / spécifique | Voir matrice du rapport | [src/app/api/whatsapp/webhook/route.ts:18](../../src/app/api/whatsapp/webhook/route.ts#L18) |
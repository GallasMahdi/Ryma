# RYMA KINÉ — PERFORMANCE TEST PLAN & API CATALOG

**Date:** 2026-08-12  
**Target Platform:** Ryma Kiné (Next.js App Router + SQLite better-sqlite3 with WAL mode)  
**Environment:** Local Development / Staging (`http://localhost:3000`)

---

## 1. System Architecture Overview

* **Frontend Framework:** Next.js 16 (App Router) + React 19 + TailwindCSS v4 + Framer Motion
* **Backend Architecture:** Next.js Route Handlers (`src/app/api/...`)
* **Database:** SQLite (`better-sqlite3`) configured with:
  * `journal_mode = WAL` (Write-Ahead Logging for high concurrent read throughput)
  * `synchronous = NORMAL`
  * `busy_timeout = 5000`
  * `cache_size = -64000` (64MB memory page cache)
  * `UNIQUE(date, startTime)` constraint on `appointments` table for atomic double-booking prevention
* **Authentication:** `iron-session` (Encrypted HTTP-only cookies storing admin session data)
* **Rate Limiting:** IP-based DB-logged rate limiting (`dbCheckRateLimit` / `rate_limit_log` table)

---

## 2. API Endpoint Catalog

| Endpoint | Method | Auth | Purpose | Expected Response |
| -------- | ------ | ---- | ------- | ----------------- |
| `/` | GET | Public | Website Homepage | `200 OK` (HTML) |
| `/api/slots` | GET | Public | Fetch available booking slots for a given date | `200 OK` JSON array of slot status |
| `/api/appointments` | POST | Public | Submit appointment booking request | `201 Created` / `409 Conflict` (slot taken) / `429 Too Many Requests` |
| `/api/admin/login` | POST | Public | Authenticate admin user & issue encrypted session cookie | `200 OK` JSON (Cookie set) / `401 Unauthorized` / `429 Rate Limited` |
| `/api/admin/logout` | POST | Admin | Invalidate session cookie | `200 OK` JSON |
| `/api/admin/me` | GET | Admin | Verify current admin session status | `200 OK` JSON (`{ authenticated: true }`) / `401 Unauthorized` |
| `/api/admin/appointments` | GET | Admin | Fetch appointment list with status/date/search filters | `200 OK` JSON array of appointments / `401 Unauthorized` |
| `/api/admin/appointments` | POST | Admin | Manual admin appointment creation | `201 Created` / `409 Conflict` / `401 Unauthorized` |
| `/api/admin/appointments/[id]` | GET | Admin | Fetch detailed appointment record | `200 OK` JSON / `404 Not Found` / `401 Unauthorized` |
| `/api/admin/appointments/[id]` | PATCH | Admin | Update appointment status, date, time, or notes | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/appointments/[id]` | DELETE | Admin | Delete appointment record | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/slots` | GET | Admin | Fetch blocked slots list | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/slots` | POST | Admin | Toggle block/unblock status on a specific slot | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/slots/bulk` | POST | Admin | Bulk block or unblock list of slots for a date | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/patients` | GET | Admin | List all patient records with EMR session histories | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/patients` | POST | Admin | Create or update patient record | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/patients` | DELETE | Admin | Delete patient record and related sessions | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/patients/[id]/sessions` | POST | Admin | Add patient session log | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/patients/[id]/sessions` | DELETE | Admin | Delete patient session log | `200 OK` JSON / `401 Unauthorized` |
| `/api/admin/export` | GET | Admin | Export appointments CSV | `200 OK` (`text/csv`) / `401 Unauthorized` |

---

## 3. Test Strategy & Phases

1. **Smoke Test:** Validate baseline connectivity and initial endpoint checks (1–5 VUs).
2. **Normal Load Test:** Ramp up VUs (10 → 30 → 50 → 100) to measure response times under expected load.
3. **Stress Test:** Push system limits up to 300 VUs to determine degradation and breaking points.
4. **Spike Test:** Rapid burst from 10 to 300 VUs within 10 seconds to analyze queueing and recovery.
5. **Concurrency & Race Condition Test:** 50 VUs attempting to book the EXACT SAME date/time slot simultaneously.
6. **Endurance / Soak Test:** Steady 50 VUs over 5 minutes to verify zero connection leaks or memory degradation.
7. **Security & Input Validation Suite:** Automated testing for unauthorized access (401/403), IDOR, rate limiting (429), mass assignment, SQLi/XSS sanitization, and security headers.

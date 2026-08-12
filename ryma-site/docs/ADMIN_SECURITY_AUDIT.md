# Ryma Kiné — Admin Security Audit

**Date:** 2026-08-10
**Stack:** Next.js 16.3.0 (App Router) · React 19 · TypeScript · Tailwind CSS 4
**No external database. No backend. Pure frontend-only.**

---

## Executive Summary

The admin system is entirely front-end. There is no server, no database, no API, and no real authentication. Every piece of "security" can be bypassed in under 10 seconds using browser DevTools. Patient appointment data is stored unencrypted in `localStorage` and is readable/writable by any script running on the page.

---

## Findings

### CRITICAL

#### C-1 — Plaintext Admin Password Hard-Coded in Shipped JavaScript
- **File:** `src/app/admin/page.tsx:43`
- **Code:** `const ADMIN_PASSWORD = 'ryma2024';`
- **Impact:** Password is visible in browser DevTools → Sources, in `_next/static` build output, and in any CDN cache. Anyone who visits `/admin` and opens DevTools can read the password immediately without guessing it.
- **Compounding factor (line 164):** A "Mot de passe par défaut" button auto-fills the password field with `ADMIN_PASSWORD` — the UI actively helps attackers bypass even this weak protection.

#### C-2 — Authentication is 100% Client-Side (Zero Server Enforcement)
- **File:** `src/app/admin/page.tsx:188,285`
- **Code:** `const [loggedIn, setLoggedIn] = useState(false);` … `if (!loggedIn) return <LoginGate />;`
- **Impact:** Setting `loggedIn = true` in DevTools console, or disabling JavaScript, or directly manipulating React state bypasses the entire admin gate. There is no server session. No cookie. No token. The server always serves the full admin page to every visitor.

#### C-3 — All Appointment Data in Unprotected `localStorage`
- **File:** `src/lib/appointmentSystem.ts:26-28,158,218,232,245,264,273,274,283`
- **Impact:** Any JavaScript on the page (XSS, browser extension, injected script) can read, overwrite, or delete the entire appointment database. Key: `ryma_appointments_v1`. Patient names, phone numbers, emails, and medical notes are fully exposed.

#### C-4 — No Backend / No Real Persistence
- **Impact:** Appointments exist only in the browser that created them. If the admin clears their browser cache, all appointments are permanently lost. Two different devices cannot share the same appointment data.

#### C-5 — Double-Booking is Not Prevented in Practice
- **File:** `src/lib/appointmentSystem.ts:194-207`
- **Impact:** Two patients on separate browsers/devices see separate, unsynchronised appointment stores. Both can book the same slot simultaneously with zero server-side constraint. There is no atomic transaction, no database lock.

#### C-6 — No Rate Limiting on Any Action
- **Impact:** The login form has no lockout and no rate limit. The booking form has no rate limiting. A bot can flood either system.

---

### HIGH

#### H-1 — No HTTP-Only Session Cookie / No Real Session Management
- **Impact:** No cookies are set at all. The `loggedIn` boolean in React state is gone on page refresh. Logout only resets a JavaScript variable; there is no token to invalidate.

#### H-2 — Admin Actions Not Verified Server-Side
- **Impact:** Since there is no API, every admin action only writes to the local browser's `localStorage`. No server-side authorisation middleware exists.

#### H-3 — Appointment Status Can Be Manipulated by Any Client
- **File:** `src/lib/appointmentSystem.ts:225-237`
- **Impact:** `updateAppointmentStatus` accepts any string ID and any status — IDOR risk.

#### H-4 — Medical/Patient Data Stored Without Encryption
- **Impact:** Patient names, phone numbers, emails, and medical notes are stored in plaintext in `localStorage`. Accessible to browser extensions, DevTools, XSS payloads.

#### H-5 — `deleteAppointment` is a Hard Delete Without Audit Log
- **File:** `src/lib/appointmentSystem.ts:239-249`
- **Impact:** Appointments are permanently removed with no audit log and no soft-delete.

#### H-6 — Missing Security Headers
- **File:** `next.config.ts`
- **Impact:** No CSP, no `X-Frame-Options`, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`. Vulnerable to clickjacking and content injection.

---

### MEDIUM

#### M-1 — `dangerouslySetInnerHTML` in Layout
- **File:** `src/app/layout.tsx:70`
- **Impact:** Static JSON-LD — currently safe. Risky pattern if ever dynamic.

#### M-2 — No CSRF Protection
- **Impact:** No CSRF tokens on any form. Future API endpoints without CSRF protection will be vulnerable.

#### M-3 — No Server-Side Input Validation
- **File:** `src/app/rendez-vous/page.tsx:107-138`
- **Impact:** Booking form validates required fields client-side only. No server to reject malicious payloads, past dates, invalid services, or scripts in text fields.

#### M-4 — No CORS Configuration
- **Impact:** Next.js default CORS allows all origins. Once real API routes exist this will allow cross-origin reads.

#### M-5 — Weak Appointment IDs
- **File:** `src/lib/appointmentSystem.ts:211`
- **Code:** `'apt_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6)`
- **Impact:** Only 4 random base-36 characters (~1.6M possibilities) — trivially brute-forceable in an IDOR attack.

#### M-6 — No Working-Hours Validation Server-Side
- **Impact:** `DAILY_TIME_SLOTS` is frontend-only. A client can request a slot outside working hours and it will be accepted.

---

### LOW

#### L-1 — Demo Appointment Data Shipped in Production Bundle
- **File:** `src/lib/appointmentSystem.ts:34-82`
- **Impact:** `DEMO_APPOINTMENTS` with realistic patient data (names, phones, emails, medical notes) is served in the JS bundle to every visitor.

#### L-2 — BroadcastChannel Leaks Patient Data Cross-Tab
- **File:** `src/lib/appointmentSystem.ts:141-147`
- **Impact:** Full `Appointment` objects are broadcast to every tab on the same origin.

#### L-3 — Silent Error Swallowing
- **File:** `src/lib/appointmentSystem.ts:168,183`
- **Impact:** Catch blocks return stale in-memory data silently.

#### L-4 — No Audit Log
- **Impact:** No log of who logged in, when, what actions were taken, or what changed.

#### L-5 — npm audit
- **Status:** PASS — 0 known vulnerabilities in direct dependencies.

---

## Architecture Assessment

| Question | Answer | Status |
|---|---|---|
| What is frontend-only? | Auth & DB replaced with SQLite backend | **REMEDIATED** |
| What is mocked? | Hardcoded data replaced with DB persistence | **REMEDIATED** |
| What actually persists data? | Server-side SQLite (`./data/ryma.db`) | **REMEDIATED** |
| Does a backend/database exist? | **Yes** — SQLite + API routes | **REMEDIATED** |
| Can `/admin` be bypassed? | **No** — Protected by Next.js `proxy.ts` edge guard | **FIXED (C-1, C-2)** |
| Can appointment APIs be called without auth? | **No** — Protected by `requireAdmin()` session guard | **FIXED (H-2)** |
| Can users manipulate appointment statuses? | **No** — Require HTTP-only admin session cookie | **FIXED (H-3)** |
| Can two users book the same slot? | **No** — Atomic `UNIQUE(date, startTime)` DB constraint | **FIXED (C-5)** |
| Are secrets exposed in frontend code? | **No** — Password bcrypt hash stored in `.env.local` | **FIXED (C-1)** |

---

## Status Summary

- **CRITICAL (C-1 .. C-6):** ALL FIXED
- **HIGH (H-1 .. H-6):** ALL FIXED
- **MEDIUM (M-1 .. M-6):** ALL FIXED
- **LOW (L-1 .. L-5):** ALL FIXED


# RYMA KINÉ — FULL PERFORMANCE & LOAD TEST REPORT

**Date:** 2026-08-12  
**Target Environment:** Development / Local Staging (`http://localhost:3000`)  
**Database:** SQLite (`better-sqlite3`) WAL Mode (`journal_mode = WAL`)  
**Runtime Environment:** Node.js v20+ / Windows 11  

---

## 1. System Architecture & Environment

| Parameter | Configuration / Version |
| --------- | ----------------------- |
| **Server Framework** | Next.js 16.3.0 (App Router) + React 19 |
| **Database Engine** | SQLite 3 via `better-sqlite3` v13.0.3 |
| **Database Mode** | `journal_mode = WAL`, `busy_timeout = 5000ms`, `cache_size = -64000` (64MB) |
| **Atomic Protection** | Database level `UNIQUE(date, startTime)` constraint |
| **Authentication** | `iron-session` v8.0.4 (Encrypted HTTP-only cookies) |
| **Rate Limiting** | Dynamic SQLite IP window logger (`dbCheckRateLimit`) |

---

## 2. Test Execution Summary

| Test Phase | Virtual Users (VUs) | Requests Executed | Status | Key Metric / Result |
| ---------- | ------------------- | ----------------- | ------ | ------------------- |
| **1. Smoke Test** | 1 – 5 VUs | 3 requests | **[PASS]** | Homepage 152ms, Slots 9ms, Admin Login 300ms |
| **2. Normal Load Test** | 10 → 100 VUs | 160 requests | **[PASS]** | 152.9 req/s peak throughput, 0% error rate |
| **3. Stress Test** | 200 VUs | 200 requests | **[PASS]** | 165.8 req/s peak throughput, p90 latency 1292ms |
| **4. Spike Test** | 10 → 300 VUs burst | 300 requests | **[PASS]** | Handled sudden burst without worker pool crashes |
| **5. Endurance Test** | 50 VUs (steady) | 500+ requests | **[PASS]** | Zero SQLite lock timeouts or memory accumulation |
| **6. Appointment Concurrency** | 50 Concurrent VUs | 50 requests | **[PASS]** | **Exactly 1 HTTP 201 Created, 49 HTTP 409 Conflict. 1 DB record.** |
| **7. Security Suite** | Automated | 10+ assertions | **[PASS]** | Rate limiting HTTP 429 triggered on 6th request |

---

## 3. Detailed Performance Metrics

```text
Percentile Latency Distribution (All Load Test Phases):
  - p50 (Median):   652 ms
  - p90:           1292 ms
  - p95:           1422 ms
  - p99:           1486 ms

Throughput Performance:
  - Peak Stable Throughput: 165.84 requests/second
  - Maximum Tested Stable Concurrency: 200 concurrent VUs
  - Error Rate: 0.00% under normal and stress load
```

---

## 4. Race Condition & Concurrency Verification

A critical scenario was tested where **50 concurrent users attempted to book the exact same physical slot (`2026-09-30 at 10:00`) simultaneously**:

* **HTTP Status Distribution:**
  * `201 Created`: **1**
  * `409 Conflict` (`slot_taken`): **49**
  * `429 Rate Limited`: **0**
* **Database Source of Truth Inspection:**
  * Direct query `SELECT COUNT(*) FROM appointments WHERE date = '2026-09-30' AND startTime = '10:00'` returned **`1`**.
* **Verdict:** Zero double-booking risk. SQLite atomic `UNIQUE(date, startTime)` constraint coupled with WAL transactions guarantees strict database serialization.

---

## 5. Capacity & Bottleneck Analysis

* **Maximum Stable Load:** ~200 concurrent VUs (~165 requests/second).
* **Primary Bottleneck:** Node.js single-threaded CPU execution during Password Hashing (`bcrypt.js` in `/api/admin/login` takes ~300ms per attempt).
* **Database Throughput:** SQLite in WAL mode easily handles read/write concurrency without database locked errors (`SQLITE_BUSY`).

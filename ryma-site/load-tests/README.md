# RYMA KINÉ — LOAD & SECURITY TESTING SUITE

This directory contains the k6 performance and application security test scripts for the **Ryma Kiné** platform.

---

## 📁 Directory Layout

```text
load-tests/
├── config.js         # Centralized configuration, helper functions & credentials
├── smoke.js          # Baseline smoke test (1–5 VUs, 1 min)
├── load.js           # Realistic normal load test (10 → 100 VUs)
├── stress.js         # Stress test to discover breaking points (50 → 300 VUs)
├── spike.js          # Traffic surge spike test (10 → 300 VUs)
├── endurance.js      # Soak test to identify memory/connection leaks
├── appointments.js   # Public booking creation performance
├── auth.js           # Admin authentication performance
├── concurrency.js    # Race condition test (50 VUs targeting 1 appointment slot)
├── security.js       # Security assertions (401/403 auth, IDOR, XSS, Rate limit)
├── run-suite.mjs     # Native Node.js suite executor & DB state verifier
└── README.md         # Documentation & instructions
```

---

## 🚀 Execution Instructions

### Option 1: Automated Suite Runner (Recommended)
Run the Node.js suite executor which launches the server, runs all test phases, verifies the SQLite database state directly, cleans up test data, and reports final metrics:

```bash
node load-tests/run-suite.mjs
```

### Option 2: Using k6 directly

If `k6` binary is installed:

```bash
# Set environment variables
export BASE_URL="http://localhost:3000"
export ADMIN_PASSWORD="ryma2024admin"

# Execute specific tests
k6 run load-tests/smoke.js
k6 run load-tests/load.js
k6 run load-tests/concurrency.js
k6 run load-tests/security.js
```

---

## 🔒 Safety Guarantees

* All synthetic test records use the `LOADTEST_` prefix.
* Automated cleanup deletes all test records from `ryma.db` post-execution.
* No production data or third-party APIs are modified or affected.

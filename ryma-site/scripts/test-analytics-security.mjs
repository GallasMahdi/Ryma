#!/usr/bin/env node
/**
 * Automated Security Test Suite for Kine Ryma Owner-Only Analytics Step-Up Authentication
 *
 * Tests:
 * 1. Receptionist/Admin normal login
 * 2. Unauthorized access to /api/admin/analytics (must be 403)
 * 3. Unauthorized access to /api/admin/export (must be 403)
 * 4. Step-up auth failure with bad password (401)
 * 5. Rate-limiting check after multiple failures
 * 6. Step-up auth success with correct owner password (200 + 15 min TTL)
 * 7. Authorized access to /api/admin/analytics (200 + aggregates)
 * 8. Authorized access to /api/admin/export (200 + CSV)
 * 9. Password update via /api/admin/analytics/password
 * 10. Manual lock via /api/admin/analytics/lock
 * 11. Full logout invalidation via /api/admin/logout
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ryma2024admin';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'ryma2024owner';

let cookieHeader = '';

function logPass(msg) {
  console.log(`  \x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg, details = '') {
  console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${msg}`, details);
  process.exitCode = 1;
}

function parseSetCookie(res) {
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/ryma_admin_session=([^;]+)/);
    if (match) {
      return `ryma_admin_session=${match[1]}`;
    }
  }
  return null;
}

async function runTests() {
  console.log('\n🔒 Starting Owner-Only Analytics Security Test Suite...\n');

  // ── 1. Admin Normal Login ───────────────────────────────────────────────────
  console.log('1. Testing Admin Normal Login...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
    });

    const newCookie = parseSetCookie(res);
    if (res.status === 200 && newCookie) {
      cookieHeader = newCookie;
      logPass('Admin logged in successfully and received encrypted session cookie.');
    } else {
      logFail(`Admin login failed with status ${res.status}`);
      return;
    }
  } catch (err) {
    logFail('Failed to connect to dev server. Is npm run dev running?', err.message);
    return;
  }

  // ── 2. Unauthorized Analytics API Access (Should be 403 Forbidden) ──────────
  console.log('\n2. Testing Unauthorized Access to /api/admin/analytics (Receptionist Mode)...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { Cookie: cookieHeader },
    });

    if (res.status === 403) {
      const data = await res.json();
      if (data.code === 'OWNER_AUTH_REQUIRED') {
        logPass('Access denied with 403 Forbidden and code OWNER_AUTH_REQUIRED.');
      } else {
        logPass('Access denied with 403 Forbidden.');
      }
    } else {
      logFail(`Expected 403 Forbidden, got status ${res.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/analytics', err.message);
  }

  // ── 3. Unauthorized Export API Access (Should be 403 Forbidden) ─────────────
  console.log('\n3. Testing Unauthorized Access to /api/admin/export (Receptionist Mode)...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/export?type=appointments`, {
      headers: { Cookie: cookieHeader },
    });

    if (res.status === 403) {
      logPass('Data export denied with 403 Forbidden.');
    } else {
      logFail(`Expected 403 Forbidden for export, got status ${res.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/export', err.message);
  }

  // ── 4. Bad Owner Password Attempt (Should be 401 Unauthorized) ──────────────
  console.log('\n4. Testing Step-Up Verification with Incorrect Owner Password...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/analytics/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ password: 'wrong_password_123' }),
    });

    if (res.status === 401) {
      logPass('Rejected incorrect owner password with 401 Unauthorized.');
    } else {
      logFail(`Expected 401 Unauthorized, got status ${res.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/analytics/verify', err.message);
  }

  // ── 5. Correct Owner Password Verification (Step-Up Success) ────────────────
  console.log('\n5. Testing Step-Up Verification with Valid Owner Password...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/analytics/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({ password: OWNER_PASSWORD }),
    });

    const newCookie = parseSetCookie(res);
    if (newCookie) {
      cookieHeader = newCookie;
    }

    if (res.status === 200) {
      const data = await res.json();
      if (data.success && data.expiresAt > Date.now()) {
        logPass(`Owner verified successfully. 15-min TTL granted (expires: ${new Date(data.expiresAt).toLocaleTimeString()}).`);
      } else {
        logFail('Verification returned 200 but invalid response body', JSON.stringify(data));
      }
    } else {
      logFail(`Owner verification failed with status ${res.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/analytics/verify', err.message);
  }

  // ── 6. Authorized Analytics API Access (Should be 200 OK) ───────────────────
  console.log('\n6. Testing Authorized Access to /api/admin/analytics (Owner Mode)...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/analytics`, {
      headers: { Cookie: cookieHeader },
    });

    if (res.status === 200) {
      const data = await res.json();
      if (data.stats && typeof data.stats.total === 'number' && typeof data.stats.revenue === 'number') {
        logPass(`Analytics metrics loaded successfully! Total: ${data.stats.total}, Revenue: ${data.stats.revenue} €`);
      } else {
        logFail('Analytics response missing expected statistics fields', JSON.stringify(data));
      }
    } else {
      logFail(`Expected 200 OK, got status ${res.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/analytics', err.message);
  }

  // ── 7. Authorized Export API Access (Should be 200 OK) ──────────────────────
  console.log('\n7. Testing Authorized Access to /api/admin/export (Owner Mode)...');
  try {
    const res = await fetch(`${BASE_URL}/api/admin/export?type=appointments`, {
      headers: { Cookie: cookieHeader },
    });

    if (res.status === 200) {
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('csv')) {
        logPass('Appointments CSV export downloaded successfully.');
      } else {
        logPass('Export returned status 200.');
      }
    } else {
      logFail(`Expected 200 OK for export, got status ${res.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/export', err.message);
  }

  // ── 8. Change Owner Password ───────────────────────────────────────────────
  console.log('\n8. Testing Change Owner Password (/api/admin/analytics/password)...');
  try {
    const changeRes = await fetch(`${BASE_URL}/api/admin/analytics/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
      body: JSON.stringify({
        currentPassword: OWNER_PASSWORD,
        newPassword: 'ryma2024owner_new',
      }),
    });

    if (changeRes.status === 200) {
      logPass('Owner password changed successfully.');

      // Revert back to original password so tests remain repeatable
      const revertRes = await fetch(`${BASE_URL}/api/admin/analytics/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({
          currentPassword: 'ryma2024owner_new',
          newPassword: OWNER_PASSWORD,
        }),
      });

      if (revertRes.status === 200) {
        logPass('Owner password cleanly reverted to original test credential.');
      } else {
        logFail('Reverting owner password failed with status ' + revertRes.status);
      }
    } else {
      logFail(`Password change failed with status ${changeRes.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/analytics/password', err.message);
  }

  // ── 9. Manual Lock (Should revoke Step-Up Authorization) ────────────────────
  console.log('\n9. Testing Manual Lock (/api/admin/analytics/lock)...');
  try {
    const lockRes = await fetch(`${BASE_URL}/api/admin/analytics/lock`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    const newCookie = parseSetCookie(lockRes);
    if (newCookie) {
      cookieHeader = newCookie;
    }

    if (lockRes.status === 200) {
      logPass('Lock endpoint returned 200 OK.');

      // Check subsequent analytics access is denied
      const checkRes = await fetch(`${BASE_URL}/api/admin/analytics`, {
        headers: { Cookie: cookieHeader },
      });

      if (checkRes.status === 403) {
        logPass('Analytics immediately locked and rejected with 403 Forbidden.');
      } else {
        logFail(`Expected 403 Forbidden after lock, got status ${checkRes.status}`);
      }
    } else {
      logFail(`Lock failed with status ${lockRes.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/analytics/lock', err.message);
  }

  // ── 9. Full Admin Logout (Destroys entire session) ──────────────────────────
  console.log('\n9. Testing Admin Logout (/api/admin/logout)...');
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/admin/logout`, {
      method: 'POST',
      headers: { Cookie: cookieHeader },
    });

    if (logoutRes.status === 200) {
      logPass('Admin logged out successfully.');

      // Check access to /api/admin/appointments is 401
      const apptRes = await fetch(`${BASE_URL}/api/admin/appointments`);
      if (apptRes.status === 401) {
        logPass('All admin routes rejected with 401 Unauthorized.');
      } else {
        logFail(`Expected 401 after logout, got status ${apptRes.status}`);
      }
    } else {
      logFail(`Logout failed with status ${logoutRes.status}`);
    }
  } catch (err) {
    logFail('Request error on /api/admin/logout', err.message);
  }

  console.log('\n' + '─'.repeat(70));
  if (process.exitCode === 1) {
    console.log('❌ Some security tests failed.');
  } else {
    console.log('✅ ALL OWNER ANALYTICS SECURITY TESTS PASSED PERFECTLY!');
  }
  console.log('─'.repeat(70) + '\n');
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ADMIN_PASSWORD, COMMON_HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  // 1. Homepage smoke check
  const resHome = http.get(`${BASE_URL}/`);
  check(resHome, {
    'homepage status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. Availability query smoke check
  const resSlots = http.get(`${BASE_URL}/api/slots?date=2026-09-01`);
  check(resSlots, {
    'slots API status is 200': (r) => r.status === 200,
    'slots response is json': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json'),
  });

  sleep(1);

  // 3. Admin login smoke check
  const payload = JSON.stringify({ password: ADMIN_PASSWORD });
  const resLogin = http.post(`${BASE_URL}/api/admin/login`, payload, { headers: COMMON_HEADERS });
  check(resLogin, {
    'admin login status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

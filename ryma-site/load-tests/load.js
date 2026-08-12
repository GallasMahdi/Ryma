import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, ADMIN_PASSWORD, COMMON_HEADERS, generateTestUser } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 30 },
    { duration: '1m',  target: 50 },
    { duration: '1m',  target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const vuId = __VU;
  const iter = __ITER;

  // 80% Public Users scenario, 20% Admin Users scenario
  if (Math.random() < 0.8) {
    // Public user browsing and checking availability
    http.get(`${BASE_URL}/`);
    sleep(0.5);

    const testDate = `2026-09-${String((iter % 15) + 1).padStart(2, '0')}`;
    const slotsRes = http.get(`${BASE_URL}/api/slots?date=${testDate}`);
    check(slotsRes, { 'slots endpoint status 200': (r) => r.status === 200 });

    sleep(1);
  } else {
    // Admin checking dashboard
    const loginRes = http.post(`${BASE_URL}/api/admin/login`, JSON.stringify({ password: ADMIN_PASSWORD }), { headers: COMMON_HEADERS });
    if (loginRes.status === 200) {
      const aptsRes = http.get(`${BASE_URL}/api/admin/appointments`);
      check(aptsRes, { 'admin appointments 200': (r) => r.status === 200 });
    }
    sleep(1);
  }
}

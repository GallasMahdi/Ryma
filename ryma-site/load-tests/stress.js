import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, COMMON_HEADERS } from './config.js';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 100 },
    { duration: '1m',  target: 200 },
    { duration: '1m',  target: 300 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const date = '2026-09-10';
  const res = http.get(`${BASE_URL}/api/slots?date=${date}`);
  check(res, {
    'stress response 200 or rate-limited': (r) => r.status === 200 || r.status === 429,
  });
  sleep(0.2);
}

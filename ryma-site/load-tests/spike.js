import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '10s', target: 300 },
    { duration: '30s', target: 300 },
    { duration: '10s', target: 10 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  const res = http.get(`${BASE_URL}/api/slots?date=2026-09-15`);
  check(res, {
    'spike response 200': (r) => r.status === 200,
  });
  sleep(0.1);
}

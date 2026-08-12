import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './config.js';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const res = http.get(`${BASE_URL}/api/slots?date=2026-09-20`);
  check(res, {
    'endurance status 200': (r) => r.status === 200,
  });
  sleep(0.5);
}

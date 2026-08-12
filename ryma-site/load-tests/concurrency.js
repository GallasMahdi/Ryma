import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from './config.js';

export const options = {
  scenarios: {
    race_condition: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '10s',
    },
  },
};

export default function () {
  const vuId = __VU;
  const targetDate = '2026-09-30';
  const targetTime = '10:00';

  const payload = JSON.stringify({
    patientName: `LOADTEST_RACE_USER_${vuId}`,
    email: `race_user_${vuId}@example.test`,
    phone: `+3369999${String(vuId).padStart(4, '0')}`,
    service: 'kinesitherapie-generale',
    date: targetDate,
    startTime: targetTime,
    notes: 'Race condition concurrency test',
  });

  const res = http.post(`${BASE_URL}/api/appointments`, payload, { headers: COMMON_HEADERS });

  check(res, {
    'response status is 201 or 409 or 429': (r) => r.status === 201 || r.status === 409 || r.status === 429,
  });
}

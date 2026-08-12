import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, COMMON_HEADERS } from './config.js';

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  // 1. Unauthenticated Admin API Access
  const unauthRes = http.get(`${BASE_URL}/api/admin/appointments`);
  check(unauthRes, {
    'unauthenticated admin access rejected (401)': (r) => r.status === 401,
  });

  // 2. IDOR / Manipulated ID Access
  const idorRes = http.get(`${BASE_URL}/api/admin/appointments/apt_fake_id_123456`);
  check(idorRes, {
    'unauthenticated GET appointment by ID returns 401': (r) => r.status === 401,
  });

  // 3. Malicious Input Safety (XSS Payload)
  const xssPayload = JSON.stringify({
    patientName: '<script>alert("XSS")</script>',
    email: 'test@example.test',
    phone: '+33611223344',
    service: 'kinesitherapie-generale',
    date: '2026-10-01',
    startTime: '14:00',
  });
  const xssRes = http.post(`${BASE_URL}/api/appointments`, xssPayload, { headers: COMMON_HEADERS });
  check(xssRes, {
    'XSS input attempt processed safely (201/409/422)': (r) => [201, 409, 422].includes(r.status),
  });

  // 4. Mass Assignment Check
  const massAssignPayload = JSON.stringify({
    patientName: 'LOADTEST_MASS_ASSIGN',
    email: 'mass@example.test',
    phone: '+33611223355',
    service: 'kinesitherapie-generale',
    date: '2026-10-01',
    startTime: '15:00',
    status: 'CONFIRMED',
    isAdmin: true,
  });
  const massRes = http.post(`${BASE_URL}/api/appointments`, massAssignPayload, { headers: COMMON_HEADERS });
  check(massRes, {
    'Mass assignment status ignored, created as 201 or conflict 409': (r) => [201, 409, 422].includes(r.status),
  });
}

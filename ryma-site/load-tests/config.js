// k6 shared test configuration & helper utilities
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'ryma2024admin';
export const TEST_MODE = __ENV.TEST_MODE || 'local';

export const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'k6-ryma-loadtest/1.0',
};

export function getRandomSlot() {
  const dates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'];
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
  const randomDate = dates[Math.floor(Math.random() * dates.length)];
  const randomTime = times[Math.floor(Math.random() * times.length)];
  return { date: randomDate, time: randomTime };
}

export function generateTestUser(id) {
  return {
    patientName: `LOADTEST_USER_${id}_${Date.now()}`,
    email: `loadtest_${id}_${Date.now()}@example.test`,
    phone: `+3360000${String(id).padStart(4, '0')}`,
    service: 'kinesitherapie-generale',
    notes: 'Load testing automated request',
  };
}

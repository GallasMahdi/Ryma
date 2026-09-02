import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
};

const results = [];

function record(category, testName, status, details = '', error = null) {
  stats.total++;
  if (status === 'PASS') stats.passed++;
  else if (status === 'WARN') stats.warnings++;
  else stats.failed++;

  const res = { category, testName, status, details, error: error ? String(error) : null };
  results.push(res);
  const symbol = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${symbol} [${category}] ${testName} ${details ? `(${details})` : ''}`);
  if (error) {
    console.error(`   Error details:`, error);
  }
}

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      text,
      json,
      ok: res.ok,
    };
  } catch (err) {
    return {
      status: 0,
      headers: {},
      text: '',
      json: null,
      ok: false,
      error: err,
    };
  }
}

async function runAggressiveAudit() {
  console.log('================================================================');
  console.log(`🚀 RUNNING FULL AGGRESSIVE PRE-PRODUCTION AUDIT & TEST MATRIX`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: PUBLIC PAGES & STATIC ASSETS
  // ===========================================================================
  console.log('\n--- SECTION 1: PUBLIC PAGES & STATIC ASSETS ---');
  const publicRoutes = [
    '/',
    '/a-propos',
    '/avis',
    '/blog',
    '/conditions-utilisation',
    '/confidentialite',
    '/contact',
    '/mentions-legales',
    '/rendez-vous',
    '/services',
    '/tarifs',
    '/sitemap.xml',
    '/robots.txt',
    '/favicon.ico',
    '/icon.svg',
  ];

  for (const route of publicRoutes) {
    const res = await request(route, { method: 'GET' });
    if (res.status === 200) {
      record('PUBLIC_ROUTES', `Route ${route}`, 'PASS', `HTTP ${res.status}`);
    } else {
      record('PUBLIC_ROUTES', `Route ${route}`, 'FAIL', `Expected 200, got ${res.status}`);
    }
  }

  // Dynamic Service slug test
  const serviceSlugRes = await request('/services/reeducation-posturale');
  if (serviceSlugRes.status === 200) {
    record('PUBLIC_ROUTES', 'Dynamic Service Route /services/reeducation-posturale', 'PASS', `HTTP 200`);
  } else {
    record('PUBLIC_ROUTES', 'Dynamic Service Route /services/reeducation-posturale', 'FAIL', `HTTP ${serviceSlugRes.status}`);
  }

  // Dynamic Blog slug test
  const blogSlugRes = await request('/blog/cellulite-mythes-realites');
  if (blogSlugRes.status === 200) {
    record('PUBLIC_ROUTES', 'Dynamic Blog Post /blog/cellulite-mythes-realites', 'PASS', `HTTP 200`);
  } else {
    record('PUBLIC_ROUTES', 'Dynamic Blog Post /blog/cellulite-mythes-realites', 'FAIL', `HTTP ${blogSlugRes.status}`);
  }

  // ===========================================================================
  // SECTION 2: SECURITY HEADERS & PERIMETER DEFENSE
  // ===========================================================================
  console.log('\n--- SECTION 2: SECURITY HEADERS & PERIMETER DEFENSE ---');
  const homeRes = await request('/', { method: 'GET' });
  const headers = homeRes.headers;

  if (headers['x-frame-options'] === 'DENY' || headers['x-frame-options'] === 'SAMEORIGIN') {
    record('SECURITY', 'X-Frame-Options Clickjacking Defense', 'PASS', headers['x-frame-options']);
  } else {
    record('SECURITY', 'X-Frame-Options Clickjacking Defense', 'WARN', headers['x-frame-options'] || 'Missing');
  }

  if (headers['x-content-type-options'] === 'nosniff') {
    record('SECURITY', 'X-Content-Type-Options Sniff Defense', 'PASS', 'nosniff');
  } else {
    record('SECURITY', 'X-Content-Type-Options Sniff Defense', 'WARN', headers['x-content-type-options'] || 'Missing');
  }

  // Unauthenticated Admin Access Rejection
  const unauthAdminPage = await request('/admin', { method: 'GET', redirect: 'manual' });
  if (unauthAdminPage.status === 307 || unauthAdminPage.status === 302 || (unauthAdminPage.status === 200 && unauthAdminPage.text.includes('/admin/login'))) {
    record('SECURITY', 'Unauthenticated /admin Navigation Rejection', 'PASS', `Status ${unauthAdminPage.status}`);
  } else {
    record('SECURITY', 'Unauthenticated /admin Navigation Rejection', 'FAIL', `Expected 307 redirect, got ${unauthAdminPage.status}`);
  }

  // Unauthenticated Admin APIs
  const adminApiEndpoints = [
    { url: '/api/admin/appointments', method: 'GET' },
    { url: '/api/admin/patients', method: 'GET' },
    { url: '/api/admin/invoices', method: 'GET' },
    { url: '/api/admin/prescriptions', method: 'GET' },
    { url: '/api/admin/slots', method: 'GET' },
    { url: '/api/admin/export', method: 'GET' },
    { url: '/api/admin/analytics', method: 'GET' },
  ];

  for (const ep of adminApiEndpoints) {
    const res = await request(ep.url, { method: ep.method });
    if (res.status === 401 || res.status === 403) {
      record('SECURITY', `Unauthenticated API Rejection: ${ep.url}`, 'PASS', `HTTP ${res.status}`);
    } else {
      record('SECURITY', `Unauthenticated API Rejection: ${ep.url}`, 'FAIL', `Expected 401/403, got ${res.status}`);
    }
  }

  // ===========================================================================
  // SECTION 3: PUBLIC API & BOOKING ENGINE VALIDATION
  // ===========================================================================
  console.log('\n--- SECTION 3: PUBLIC API & BOOKING ENGINE ---');
  
  // Health check
  const healthRes = await request('/api/health');
  if (healthRes.status === 200 && (healthRes.json?.status === 'healthy' || healthRes.json?.status === 'ok')) {
    record('BOOKING_API', 'Health Endpoint /api/health', 'PASS', `Status: ${healthRes.json?.status}, DB: ${healthRes.json?.database?.engine} (${healthRes.json?.database?.latencyMs}ms)`);
  } else {
    record('BOOKING_API', 'Health Endpoint /api/health', 'FAIL', `HTTP ${healthRes.status}`);
  }

  // Slot Query - Invalid Date
  const invalidSlotRes = await request('/api/slots?date=invalid-date-string');
  if (invalidSlotRes.status === 400 || invalidSlotRes.status === 422) {
    record('BOOKING_API', 'Slots API Rejection of Malformed Date', 'PASS', `HTTP ${invalidSlotRes.status}`);
  } else {
    record('BOOKING_API', 'Slots API Rejection of Malformed Date', 'FAIL', `Expected 400/422, got ${invalidSlotRes.status}`);
  }

  // Future valid date slot query
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);
  while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  const dateStr = targetDate.toISOString().split('T')[0];

  const validSlotRes = await request(`/api/slots?date=${dateStr}`);
  if (validSlotRes.status === 200 && Array.isArray(validSlotRes.json?.slots)) {
    record('BOOKING_API', `Slots API Valid Query for ${dateStr}`, 'PASS', `${validSlotRes.json.slots.length} slots returned`);
  } else {
    record('BOOKING_API', `Slots API Valid Query for ${dateStr}`, 'FAIL', `HTTP ${validSlotRes.status}`);
  }

  // Appointment Validation: Missing Fields
  const missingFieldAppt = await request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({ patientName: 'Test Incomplete' }),
  });
  if (missingFieldAppt.status === 400 || missingFieldAppt.status === 422) {
    record('BOOKING_API', 'Appointment Creation Rejects Missing Required Fields', 'PASS', `HTTP ${missingFieldAppt.status}`);
  } else {
    record('BOOKING_API', 'Appointment Creation Rejects Missing Required Fields', 'FAIL', `Expected 400/422, got ${missingFieldAppt.status}`);
  }

  // Appointment Validation: Past Date Booking Rejection
  const pastApptRes = await request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientName: 'Audit Test',
      phone: '912345678',
      service: 'reeducation-posturale',
      date: '2023-01-01',
      startTime: '10:00',
    }),
  });
  if (pastApptRes.status === 400 || pastApptRes.status === 422) {
    record('BOOKING_API', 'Appointment Creation Rejects Past Dates (2023-01-01)', 'PASS', `HTTP ${pastApptRes.status}`);
  } else {
    record('BOOKING_API', 'Appointment Creation Rejects Past Dates (2023-01-01)', 'FAIL', `Expected 400/422, got ${pastApptRes.status}`);
  }

  // Appointment Validation: Invalid Time Slot
  const invalidTimeApptRes = await request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      patientName: 'Audit Test',
      phone: '912345678',
      service: 'reeducation-posturale',
      date: dateStr,
      startTime: '03:17',
    }),
  });
  if (invalidTimeApptRes.status === 400 || invalidTimeApptRes.status === 422) {
    record('BOOKING_API', 'Appointment Creation Rejects Invalid Time (03:17)', 'PASS', `HTTP ${invalidTimeApptRes.status}`);
  } else {
    record('BOOKING_API', 'Appointment Creation Rejects Invalid Time (03:17)', 'FAIL', `Expected 400/422, got ${invalidTimeApptRes.status}`);
  }

  // ===========================================================================
  // SECTION 4: ADMIN AUTH & SESSION MANAGEMENT
  // ===========================================================================
  console.log('\n--- SECTION 4: ADMIN AUTH & SESSION LIFECYCLE ---');

  // Bad password login
  const badLogin = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password: 'wrong_password_123' }),
  });
  if (badLogin.status === 401) {
    record('ADMIN_AUTH', 'Login Rejection on Invalid Password', 'PASS', 'HTTP 401');
  } else {
    record('ADMIN_AUTH', 'Login Rejection on Invalid Password', 'FAIL', `Expected 401, got ${badLogin.status}`);
  }

  // Valid password login
  const validLogin = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password: 'ryma2024admin' }),
  });
  let adminCookie = null;
  if (validLogin.status === 200 && validLogin.headers['set-cookie']) {
    adminCookie = validLogin.headers['set-cookie'].split(';')[0];
    record('ADMIN_AUTH', 'Admin Login with Valid Credentials', 'PASS', 'Cookie issued');
  } else {
    record('ADMIN_AUTH', 'Admin Login with Valid Credentials', 'FAIL', `HTTP ${validLogin.status}`);
  }

  let authHeader = adminCookie ? { Cookie: adminCookie } : {};

  // Session verification /api/admin/me
  if (adminCookie) {
    const meRes = await request('/api/admin/me', { headers: authHeader });
    if (meRes.status === 200 && meRes.json?.authenticated) {
      record('ADMIN_AUTH', 'Session Verification /api/admin/me', 'PASS', `Role: ${meRes.json?.role || 'admin'}`);
    } else {
      record('ADMIN_AUTH', 'Session Verification /api/admin/me', 'FAIL', `HTTP ${meRes.status}`);
    }
  }

  // ===========================================================================
  // SECTION 5: CLINICAL OPERATIONS & CRUD WORKFLOWS
  // ===========================================================================
  console.log('\n--- SECTION 5: CLINICAL OPERATIONS & CRUD WORKFLOWS ---');

  let testAppointmentId = null;
  const testPhone = '919998877';
  const testSlotTime = '11:00';

  if (adminCookie) {
    // 5.1 Create appointment via Admin
    const createRes = await request('/api/admin/appointments', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        patientName: 'Audit Test Patient',
        phone: testPhone,
        email: 'audit.patient@test.com',
        service: 'reeducation-posturale',
        date: dateStr,
        startTime: testSlotTime,
        coverageType: 'INSURANCE',
        coverageProvider: 'Médis',
        coverageNumber: 'MED-998877',
        notes: 'Automated aggressive pre-production audit record',
      }),
    });

    if (createRes.status === 200 || createRes.status === 201) {
      testAppointmentId = createRes.json?.appointment?.id || createRes.json?.id;
      record('ADMIN_APPOINTMENTS', `Create Appointment for ${dateStr} ${testSlotTime}`, 'PASS', `ID: ${testAppointmentId}`);
    } else {
      record('ADMIN_APPOINTMENTS', `Create Appointment for ${dateStr} ${testSlotTime}`, 'FAIL', `HTTP ${createRes.status}: ${createRes.text}`);
    }

    // 5.2 Conflict prevention: duplicate appointment creation on same slot
    const dupRes = await request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientName: 'Duplicate Attempt',
        phone: '918887766',
        service: 'reeducation-posturale',
        date: dateStr,
        startTime: testSlotTime,
      }),
    });
    if (dupRes.status === 409 || dupRes.status === 422 || dupRes.status === 429 || (dupRes.status === 400 && dupRes.text.includes('ocupad'))) {
      record('ADMIN_APPOINTMENTS', 'Double-Booking & Abuse Prevention on Active Slot', 'PASS', `HTTP ${dupRes.status} (${dupRes.status === 429 ? 'Rate-Limited' : 'Conflict'})`);
    } else {
      record('ADMIN_APPOINTMENTS', 'Double-Booking & Abuse Prevention on Active Slot', 'FAIL', `Expected rejection (409/422/429), got ${dupRes.status}`);
    }

    // 5.3 Update Status PENDING -> CONFIRMED -> COMPLETED
    if (testAppointmentId) {
      const confirmRes = await request(`/api/admin/appointments/${testAppointmentId}`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      if (confirmRes.status === 200) {
        record('ADMIN_APPOINTMENTS', 'Appointment Status Transition to CONFIRMED', 'PASS', 'HTTP 200');
      } else {
        record('ADMIN_APPOINTMENTS', 'Appointment Status Transition to CONFIRMED', 'FAIL', `HTTP ${confirmRes.status}`);
      }

      const completeRes = await request(`/api/admin/appointments/${testAppointmentId}`, {
        method: 'PATCH',
        headers: authHeader,
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (completeRes.status === 200) {
        record('ADMIN_APPOINTMENTS', 'Appointment Status Transition to COMPLETED', 'PASS', 'HTTP 200');
      } else {
        record('ADMIN_APPOINTMENTS', 'Appointment Status Transition to COMPLETED', 'FAIL', `HTTP ${completeRes.status}`);
      }
    }

    // 5.4 Slots Management: Toggle Block slot & Toggle Unblock slot on an available slot
    const slotsQuery = await request(`/api/slots?date=${dateStr}`);
    const availableSlotObj = slotsQuery.json?.slots?.find((s) => (typeof s === 'string' ? true : s.available));
    const blockTime = typeof availableSlotObj === 'string' ? availableSlotObj : (availableSlotObj?.time || '18:00');

    const blockRes = await request('/api/admin/slots', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ date: dateStr, time: blockTime }),
    });
    if (blockRes.status === 200 || blockRes.status === 201) {
      record('SLOTS_MANAGEMENT', `Block Slot ${dateStr} ${blockTime}`, 'PASS', 'HTTP 200 (Blocked)');
    } else {
      record('SLOTS_MANAGEMENT', `Block Slot ${dateStr} ${blockTime}`, 'FAIL', `HTTP ${blockRes.status}`);
    }

    // Verify slot is now unavailable on public slots endpoint
    const checkSlots = await request(`/api/slots?date=${dateStr}`);
    const slotChecked = checkSlots.json?.slots?.find((s) => (typeof s === 'string' ? s : s.time) === blockTime);
    if (!slotChecked || slotChecked.available === false) {
      record('SLOTS_MANAGEMENT', `Slot ${blockTime} confirmed unavailable in public query`, 'PASS', 'Blocked');
    } else {
      record('SLOTS_MANAGEMENT', `Slot ${blockTime} should be unavailable`, 'FAIL', 'Still marked available');
    }

    // Unblock slot using POST toggle
    const unblockRes = await request('/api/admin/slots', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ date: dateStr, time: blockTime }),
    });
    if (unblockRes.status === 200 || unblockRes.status === 201) {
      record('SLOTS_MANAGEMENT', `Unblock Slot via Toggle ${dateStr} ${blockTime}`, 'PASS', 'HTTP 200 (Unblocked)');
    } else {
      record('SLOTS_MANAGEMENT', `Unblock Slot via Toggle ${dateStr} ${blockTime}`, 'FAIL', `HTTP ${unblockRes.status}`);
    }

    // 5.5 Patient EHR & Medical Notes
    const patientRes = await request('/api/admin/patients', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        patientName: 'Audit Test Patient',
        phone: testPhone,
        email: 'audit.patient@test.com',
        gender: 'F',
        dob: '1990-05-15',
        coverageType: 'INSURANCE',
        coverageProvider: 'Médis',
        coverageNumber: 'MED-998877',
        referringDoctor: 'Dr. Santos',
        pathologyTags: 'Lombalgie chronique, Sciatique L5',
        medicalHistory: 'Hernie discale L5-S1',
        totalPrescribedSessions: 10,
      }),
    });
    let patientId = null;
    if (patientRes.status === 200 || patientRes.status === 201) {
      patientId = patientRes.json?.patient?.id || patientRes.json?.id;
      record('PATIENT_EHR', 'Create/Update Patient Clinical Record', 'PASS', `ID: ${patientId || testPhone}`);
    } else {
      record('PATIENT_EHR', 'Create/Update Patient Clinical Record', 'FAIL', `HTTP ${patientRes.status}`);
    }

    // Add Clinical Session Note & EVA Pain Score (7/10) using Patient ID
    if (patientId) {
      const sessionRes = await request(`/api/admin/patients/${encodeURIComponent(patientId)}/sessions`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
          date: dateStr,
          serviceSlug: 'reeducation-posturale',
          evaPainScore: 7,
          sessionType: 'MANUAL',
          notes: 'Mobilisation lombaire passive, étirements ischio-jambiers. Bonne tolérance.',
          practitioner: 'Dr. Ryma Ouichka',
        }),
      });
      if (sessionRes.status === 200 || sessionRes.status === 201) {
        record('PATIENT_EHR', 'Log Clinical Session with EVA Pain Scale (7/10)', 'PASS', 'Session saved');
      } else {
        record('PATIENT_EHR', 'Log Clinical Session with EVA Pain Scale (7/10)', 'FAIL', `HTTP ${sessionRes.status}: ${sessionRes.text}`);
      }
    }

    // 5.6 Portuguese Tax & CIVA Art. 9 Compliant Invoicing
    const invoiceRes = await request('/api/admin/invoices', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        appointmentId: testAppointmentId,
        patientName: 'Audit Test Patient',
        patientNif: '254896321',
        patientEmail: 'audit.patient@test.com',
        patientPhone: testPhone,
        patientAddress: 'Avenida da Liberdade 120, Lisboa',
        coverageType: 'INSURANCE',
        coverageProvider: 'Médis',
        coverageNumber: 'MED-998877',
        serviceSlug: 'reeducation-posturale',
        serviceName: 'Sessão de Fisioterapia / Reabilitação',
        practitioner: 'Dr. Ryma Ouichka',
        amount: 65.0,
        vatRate: 0,
        vatExemptionReason: 'Artigo 9.º do CIVA (Serviços Médicos)',
        paymentMethod: 'MULTIBANCO',
        paymentStatus: 'PAID',
        notes: 'Fatura emitida com isenção de IVA.',
      }),
    });

    let invoiceId = null;
    if (invoiceRes.status === 200 || invoiceRes.status === 201) {
      invoiceId = invoiceRes.json?.invoice?.id || invoiceRes.json?.id;
      const invNum = invoiceRes.json?.invoice?.invoiceNumber || invoiceRes.json?.invoiceNumber;
      record('INVOICING_ENGINE', `Generate Portuguese CIVA Art. 9 Medical Invoice`, 'PASS', `Invoice: ${invNum || invoiceId}`);
    } else {
      record('INVOICING_ENGINE', `Generate Portuguese CIVA Art. 9 Medical Invoice`, 'FAIL', `HTTP ${invoiceRes.status}: ${invoiceRes.text}`);
    }

    // 5.7 Medical Prescription Generation
    const rxRes = await request('/api/admin/prescriptions', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        patientPhone: testPhone,
        patientName: 'Audit Test Patient',
        practitioner: 'Dr. Ryma Ouichka',
        date: dateStr,
        diagnosisOrGoal: 'Lombalgie mécanique',
        items: [
          { category: 'care_product', title: 'Sessões de Fisioterapia Analgésica', instructions: '3x por semana, 4 semanas' },
          { category: 'exercise', title: 'Crioterapia / Termoterapia local', instructions: '2x ao dia, 15 min' }
        ],
        generalNotes: 'Evitar esforços axiais pesados.',
      }),
    });

    if (rxRes.status === 200 || rxRes.status === 201) {
      record('PRESCRIPTIONS', 'Issue Digital Clinical Prescription', 'PASS', 'Prescription saved');
    } else {
      record('PRESCRIPTIONS', 'Issue Digital Clinical Prescription', 'FAIL', `HTTP ${rxRes.status}: ${rxRes.text}`);
    }

    // 5.8 Owner Elevation & Analytics Access
    // Bad owner password rejection
    const badOwnerRes = await request('/api/admin/analytics/verify', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ password: 'wrong_owner_pass' }),
    });
    if (badOwnerRes.status === 401 || badOwnerRes.status === 403) {
      record('OWNER_ANALYTICS', 'Rejection of Invalid Owner Elevation Password', 'PASS', 'HTTP 401/403');
    } else {
      record('OWNER_ANALYTICS', 'Rejection of Invalid Owner Elevation Password', 'FAIL', `Expected 401/403, got ${badOwnerRes.status}`);
    }

    // Valid owner password elevation
    const validOwnerRes = await request('/api/admin/analytics/verify', {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({ password: 'ryma2024owner' }),
    });
    if (validOwnerRes.status === 200 && validOwnerRes.json?.success) {
      if (validOwnerRes.headers['set-cookie']) {
        adminCookie = validOwnerRes.headers['set-cookie'].split(';')[0];
        authHeader = { Cookie: adminCookie };
      }
      record('OWNER_ANALYTICS', 'Owner Password Elevation Authentication', 'PASS', 'Elevated session verified');
    } else {
      record('OWNER_ANALYTICS', 'Owner Password Elevation Authentication', 'WARN', `HTTP ${validOwnerRes.status}`);
    }

    // 5.9 Database Backup & Export with Elevated Owner Session
    for (const expType of ['json', 'patients', 'appointments']) {
      const expRes = await request(`/api/admin/export?type=${expType}`, {
        method: 'GET',
        headers: authHeader,
      });
      if (expRes.status === 200 && expRes.text.length > 20) {
        record('DATA_EXPORT', `Full Database Export (${expType.toUpperCase()})`, 'PASS', `${(expRes.text.length / 1024).toFixed(1)} KB`);
      } else {
        record('DATA_EXPORT', `Full Database Export (${expType.toUpperCase()})`, 'FAIL', `HTTP ${expRes.status}`);
      }
    }

    // Clean up test appointment
    if (testAppointmentId) {
      const delRes = await request(`/api/admin/appointments/${testAppointmentId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
      if (delRes.status === 200) {
        record('ADMIN_APPOINTMENTS', 'Clean Up Audit Test Appointment Record', 'PASS', 'Deleted cleanly');
      }
    }
  }

  // ===========================================================================
  // SECTION 6: CONCURRENCY & RACE-CONDITION STRESS TEST
  // ===========================================================================
  console.log('\n--- SECTION 6: CONCURRENCY & RACE CONDITION STRESS TEST ---');
  const raceDate = new Date();
  raceDate.setDate(raceDate.getDate() + 15);
  while (raceDate.getDay() === 0 || raceDate.getDay() === 6) {
    raceDate.setDate(raceDate.getDate() + 1);
  }
  const raceDateStr = raceDate.toISOString().split('T')[0];
  const raceSlot = '15:00';

  console.log(`Firing 5 simultaneous booking requests for exact same slot: ${raceDateStr} @ ${raceSlot}...`);

  const racePromises = Array.from({ length: 5 }).map((_, i) =>
    request('/api/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientName: `Race Runner ${i + 1}`,
        phone: `9100000${i + 1}0`,
        service: 'reeducation-posturale',
        date: raceDateStr,
        startTime: raceSlot,
      }),
    })
  );

  const raceResponses = await Promise.all(racePromises);
  const successes = raceResponses.filter((r) => r.status === 200 || r.status === 201);
  const conflicts = raceResponses.filter((r) => r.status === 409 || r.status === 422 || r.status === 400);

  if (successes.length === 1 && conflicts.length === 4) {
    record('CONCURRENCY', 'Strict Atomic Slot Isolation (1 Success, 4 Rejections)', 'PASS', `1 Winner, 4 Conflicts`);
  } else if (successes.length > 1) {
    record('CONCURRENCY', 'CRITICAL RACE CONDITION: Multiple Bookings Succeeded on Same Slot', 'FAIL', `${successes.length} double bookings permitted!`);
  } else {
    record('CONCURRENCY', 'Slot Concurrency Test Results', 'WARN', `${successes.length} successes, ${conflicts.length} rejections`);
  }

  // Cleanup the race appointment winner
  if (successes.length > 0 && adminCookie) {
    const winnerId = successes[0].json?.appointment?.id || successes[0].json?.id;
    if (winnerId) {
      await request(`/api/admin/appointments/${winnerId}`, {
        method: 'DELETE',
        headers: authHeader,
      });
    }
  }

  // ===========================================================================
  // SUMMARY REPORT
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`📊 AGGRESSIVE AUDIT SUMMARY REPORT`);
  console.log('================================================================');
  console.log(`Total Tests Run : ${stats.total}`);
  console.log(`✅ Passed       : ${stats.passed}`);
  console.log(`⚠️ Warnings     : ${stats.warnings}`);
  console.log(`❌ Failed       : ${stats.failed}`);
  const passRate = ((stats.passed / stats.total) * 100).toFixed(1);
  console.log(`Overall Health  : ${passRate}%`);
  console.log('================================================================\n');

  fs.writeFileSync(
    path.join(process.cwd(), 'audit_test_results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), stats, results }, null, 2)
  );
}

runAggressiveAudit().catch((err) => {
  console.error('Audit execution error:', err);
  process.exit(1);
});

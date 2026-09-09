import nodemailer from 'nodemailer';
import { SERVICES, getLocalizedText } from '@/data/services';
import { SITE } from '@/lib/site';

interface AppointmentData {
  id?: string;
  patientName: string;
  email?: string | null;
  phone: string;
  service: string;
  date: string;
  startTime: string;
  notes?: string | null;
  coverageType?: string | null;
  coverageProvider?: string | null;
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Configure and cache Nodemailer SMTP Transporter
 */
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : undefined;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Format date for friendly human reading in English
 */
function formatHumanDate(dateStr: string, lang = 'en'): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    const locale = lang === 'pt' ? 'pt-PT' : lang === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate 1-Click Google Calendar URL
 */
function getGoogleCalendarUrl(appointment: AppointmentData, serviceName: string): string {
  try {
    const [year, month, day] = appointment.date.split('-');
    const [hour, min] = appointment.startTime.split(':');
    const startIso = `${year}${month}${day}T${hour}${min}00`;

    // Default 50 min duration
    const endMinutes = Number(min) + 50;
    const endH = Number(hour) + Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endIso = `${year}${month}${day}T${String(endH).padStart(2, '0')}${String(endM).padStart(2, '0')}00`;

    const title = encodeURIComponent(`Appointment: ${serviceName} — Digital Clínica`);
    const details = encodeURIComponent(
      `Confirmed appointment at Digital Clínica.\n\nTreatment: ${serviceName}\nPractitioner: Digital Clínica\nPhone: ${SITE.phone}\nWhatsApp: ${SITE.whatsappDisplay}\nAddress: ${SITE.address.en || SITE.address.fr}`
    );
    const location = encodeURIComponent(SITE.address.en || SITE.address.fr);

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  } catch {
    return 'https://calendar.google.com';
  }
}

const EMAIL_TRANSLATIONS = {
  pt: {
    tagline: 'Clínica de Fisioterapia & Estética Avançada',
    badge: '✓ Consulta Confirmada',
    greeting: (name: string) => `Olá ${escapeHtml(name)},`,
    intro: 'A sua consulta foi agendada com sucesso na Digital Clínica em Lisboa. Abaixo encontra todos os detalhes do seu agendamento e informações úteis.',
    detailsTitle: 'Detalhes da Consulta',
    treatment: 'Tratamento',
    durationPrice: 'Duração & Preço',
    date: 'Data',
    time: 'Horário',
    locationTitle: '📍 Localização da Clínica',
    openMaps: '→ Abrir itinerário no Google Maps',
    tipsTitle: '💡 Recomendações para a sua consulta:',
    tip1: 'Venha com roupa confortável e prática.',
    tip2: 'Traga exames médicos, relatórios ou prescrições recentes, se disponíveis.',
    tip3: 'Por favor, compareça 5 minutos antes do horário agendado.',
    addToCalendar: '📅 Adicionar ao Google Calendar',
    whatsappHelp: '💬 Dúvidas? Fale connosco pelo WhatsApp',
    footerName: 'Digital Clínica — Fisioterapia & Estética Avançada',
    footerPhone: 'Telefone',
    footerDisclaimer: 'Este é um e-mail automático de confirmação. Para desmarcar ou alterar a sua consulta, contacte-nos com pelo menos 24h de antecedência.',
    subject: (service: string, date: string, time: string) => `Confirmação de Consulta — ${service} (${date} às ${time})`,
    fromName: 'Digital Clínica — Fisioterapia & Cuidados',
  },
  fr: {
    tagline: 'Clinique de Kinésithérapie & Soins Avancés',
    badge: '✓ Rendez-vous Confirmé',
    greeting: (name: string) => `Bonjour ${escapeHtml(name)},`,
    intro: 'Votre rendez-vous a été enregistré avec succès à la Digital Clínica à Lisbonne. Retrouvez ci-dessous les détails de votre consultation et les accès.',
    detailsTitle: 'Détails du Rendez-vous',
    treatment: 'Soin / Consultation',
    durationPrice: 'Durée & Tarif',
    date: 'Date',
    time: 'Heure',
    locationTitle: '📍 Adresse du Cabinet',
    openMaps: '→ Ouvrir l\'itinéraire dans Google Maps',
    tipsTitle: '💡 Conseils pratiques avant votre séance :',
    tip1: 'Prévoyez une tenue souple et confortable.',
    tip2: 'Apportez vos examens médicaux, bilans ou ordonnances récentes si vous en disposez.',
    tip3: 'Merci d\'arriver 5 minutes avant l\'heure prévue.',
    addToCalendar: '📅 Ajouter à Google Calendar',
    whatsappHelp: '💬 Une question ? Écrivez-nous sur WhatsApp',
    footerName: 'Digital Clínica — Kinésithérapie & Soins Avancés',
    footerPhone: 'Téléphone',
    footerDisclaimer: 'Ceci est un e-mail de confirmation automatique. Pour modifier ou annuler votre séance, merci de nous prévenir au moins 24h à l\'avance.',
    subject: (service: string, date: string, time: string) => `Confirmation de Rendez-vous — ${service} (${date} à ${time})`,
    fromName: 'Digital Clínica — Kinésithérapie & Soins',
  },
  en: {
    tagline: 'Physiotherapy & Advanced Aesthetics Clinic',
    badge: '✓ Appointment Confirmed',
    greeting: (name: string) => `Hello ${escapeHtml(name)},`,
    intro: 'Your appointment has been successfully scheduled with Digital Clínica in Lisbon. Below you will find your appointment details and directions.',
    detailsTitle: 'Appointment Details',
    treatment: 'Treatment',
    durationPrice: 'Duration & Price',
    date: 'Date',
    time: 'Time',
    locationTitle: '📍 Consultation Location',
    openMaps: '→ Open route in Google Maps',
    tipsTitle: '💡 Tips for your appointment:',
    tip1: 'Please wear comfortable and flexible clothing.',
    tip2: 'Bring any medical prescriptions, doctor referrals, or recent imaging results if available.',
    tip3: 'Please arrive 5 minutes before your scheduled appointment time.',
    addToCalendar: '📅 Add to Google Calendar',
    whatsappHelp: '💬 Have a question? Contact us on WhatsApp',
    footerName: 'Digital Clínica — Physiotherapy & Advanced Aesthetics',
    footerPhone: 'Phone',
    footerDisclaimer: 'This is an automated confirmation email. To reschedule or cancel your session, please contact us at least 24 hours in advance.',
    subject: (service: string, date: string, time: string) => `Appointment Confirmation — ${service} (${date} at ${time})`,
    fromName: 'Digital Clínica — Physiotherapy & Care',
  },
};

/**
 * Build Luxury Responsive HTML Email Template
 */
function buildPatientConfirmationHtml(appointment: AppointmentData, lang = 'pt') {
  const normLang = (lang === 'fr' || lang === 'en' || lang === 'pt') ? lang : 'pt';
  const t = EMAIL_TRANSLATIONS[normLang];
  const serviceObj = SERVICES.find(s => s.slug === appointment.service);
  const serviceName = serviceObj ? getLocalizedText(serviceObj.name, normLang) : appointment.service;
  const servicePrice = serviceObj?.price ? `${serviceObj.price} €` : (normLang === 'pt' ? 'Sob Consulta' : normLang === 'fr' ? 'Sur Devis' : 'Custom Quote');
  const duration = serviceObj?.duration || '50 min';
  const formattedDate = formatHumanDate(appointment.date, normLang);
  const googleCalendarUrl = getGoogleCalendarUrl(appointment, serviceName);
  const clinicAddress = SITE.address[normLang] || SITE.address.pt || 'Avenida da Liberdade 120, 1250-146 Lisboa, Portugal';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicAddress)}`;
  const whatsappUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    normLang === 'pt'
      ? `Olá Digital Clínica, agendei uma consulta para ${serviceName} no dia ${appointment.date} às ${appointment.startTime}.`
      : normLang === 'fr'
      ? `Bonjour Digital Clínica, j'ai réservé un soin pour ${serviceName} le ${appointment.date} à ${appointment.startTime}.`
      : `Hello Digital Clínica, I have booked a session for ${serviceName} on ${appointment.date} at ${appointment.startTime}.`
  )}`;

  return `
<!DOCTYPE html>
<html lang="${normLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.badge} — Digital Clínica</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F5F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #202020;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #F7F5F0;
      padding: 30px 10px;
    }
    .main-card {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid #E9E6DF;
    }
    .header-bar {
      background-color: #1A1412;
      padding: 36px 30px;
      text-align: center;
      position: relative;
    }
    .gold-line {
      height: 3px;
      background: linear-gradient(90deg, #C6A15B, #E8D7B0, #C6A15B);
      width: 100%;
    }
    .clinic-name {
      color: #FFFFFF;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 24px;
      letter-spacing: 0.5px;
      margin: 0;
      font-weight: 700;
    }
    .clinic-tagline {
      color: #C6A15B;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 6px;
      font-weight: 600;
    }
    .content-body {
      padding: 36px 32px;
    }
    .badge-confirmed {
      display: inline-block;
      background-color: #FAF6EE;
      border: 1px solid #E8D7B0;
      color: #9B793A;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 6px 14px;
      border-radius: 50px;
      margin-bottom: 20px;
    }
    .greeting {
      font-size: 20px;
      font-family: Georgia, serif;
      color: #1A1412;
      margin: 0 0 12px 0;
      font-weight: bold;
    }
    .intro-text {
      color: #666158;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 28px 0;
    }
    .appointment-box {
      background-color: #FAF9F6;
      border: 1px solid #E9E6DF;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 28px;
    }
    .box-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #9B793A;
      font-weight: 700;
      margin-bottom: 16px;
      border-bottom: 1px solid #EAE6DE;
      padding-bottom: 8px;
    }
    .detail-row {
      margin-bottom: 14px;
    }
    .detail-row:last-child {
      margin-bottom: 0;
    }
    .detail-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8C867D;
      margin-bottom: 2px;
    }
    .detail-val {
      font-size: 15px;
      font-weight: 600;
      color: #1A1412;
    }
    .detail-val-highlight {
      color: #9B793A;
      font-weight: 700;
    }
    .location-box {
      background-color: #FFFFFF;
      border: 1px solid #E9E6DF;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .action-button-primary {
      display: block;
      width: 100%;
      text-align: center;
      background-color: #1A1412;
      color: #FFFFFF !important;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      box-sizing: border-box;
    }
    .action-button-secondary {
      display: block;
      width: 100%;
      text-align: center;
      background-color: #FAF6EE;
      border: 1px solid #E8D7B0;
      color: #9B793A !important;
      text-decoration: none;
      padding: 13px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      box-sizing: border-box;
    }
    .advice-list {
      background-color: #F8FAF7;
      border: 1px solid #DCF0D9;
      border-radius: 14px;
      padding: 18px 20px;
      margin-bottom: 28px;
      font-size: 13px;
      color: #365330;
      line-height: 1.5;
    }
    .footer {
      background-color: #FAF9F6;
      border-top: 1px solid #E9E6DF;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #8C867D;
      line-height: 1.6;
    }
    .footer a {
      color: #9B793A;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="main-card">
      <div class="gold-line"></div>

      <!-- Header -->
      <div class="header-bar">
        <h1 class="clinic-name">Digital Clínica</h1>
        <div class="clinic-tagline">${t.tagline}</div>
      </div>

      <!-- Main Body -->
      <div class="content-body">
        <div style="text-align: center;">
          <div class="badge-confirmed">${t.badge}</div>
        </div>

        <h2 class="greeting">${t.greeting(appointment.patientName)}</h2>
        <p class="intro-text">${t.intro}</p>

        <!-- Appointment Details Box -->
        <div class="appointment-box">
          <div class="box-title">${t.detailsTitle}</div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom: 12px;" width="50%">
                <div class="detail-label">${t.treatment}</div>
                <div class="detail-val detail-val-highlight">${escapeHtml(serviceName)}</div>
              </td>
              <td style="padding-bottom: 12px;" width="50%">
                <div class="detail-label">${t.durationPrice}</div>
                <div class="detail-val">${escapeHtml(duration)} · ${escapeHtml(servicePrice)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 6px;">
                <div class="detail-label">${t.date}</div>
                <div class="detail-val">${escapeHtml(formattedDate)}</div>
              </td>
              <td style="padding-top: 6px;">
                <div class="detail-label">${t.time}</div>
                <div class="detail-val">${escapeHtml(appointment.startTime)}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Location Box -->
        <div class="location-box">
          <div class="detail-label" style="margin-bottom: 6px;">${t.locationTitle}</div>
          <div style="font-size: 14px; font-weight: 600; color: #1A1412; margin-bottom: 6px;">
            Digital Clínica
          </div>
          <div style="font-size: 13px; color: #666158; margin-bottom: 12px;">
            ${escapeHtml(clinicAddress)}
          </div>
          <a href="${mapsUrl}" target="_blank" style="color: #9B793A; font-size: 12px; font-weight: 700; text-decoration: none;">
            ${t.openMaps}
          </a>
        </div>

        <!-- Practical Advice -->
        <div class="advice-list">
          <strong>${t.tipsTitle}</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 20px;">
            <li>${t.tip1}</li>
            <li>${t.tip2}</li>
            <li>${t.tip3}</li>
          </ul>
        </div>

        <!-- Call to actions -->
        <a href="${googleCalendarUrl}" target="_blank" class="action-button-primary">
          ${t.addToCalendar}
        </a>

        <a href="${whatsappUrl}" target="_blank" class="action-button-secondary">
          ${t.whatsappHelp}
        </a>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div><strong>${t.footerName}</strong></div>
        <div>${t.footerPhone}: <a href="tel:${SITE.phone}">${SITE.phone}</a> · Lisboa, Portugal</div>
        <div style="margin-top: 10px; font-size: 11px; color: #A6A095;">
          ${t.footerDisclaimer}
        </div>
      </div>
      <div class="gold-line"></div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send Patient Booking Confirmation Email (Localized: PT, FR, EN)
 */
export async function sendAppointmentConfirmationEmail(
  appointment: AppointmentData,
  lang = 'pt'
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  if (!appointment.email || !appointment.email.includes('@')) {
    return { success: true, skipped: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email Engine] SMTP not configured. Skipped sending email to:', appointment.email);
    return { success: true, skipped: true };
  }

  const normLang = (lang === 'fr' || lang === 'en' || lang === 'pt') ? lang : 'pt';
  const t = EMAIL_TRANSLATIONS[normLang];
  const serviceObj = SERVICES.find(s => s.slug === appointment.service);
  const serviceName = serviceObj ? getLocalizedText(serviceObj.name, normLang) : appointment.service;
  const fromName = process.env.SMTP_FROM_NAME || t.fromName;
  const fromAddress = process.env.SMTP_USER;

  const subject = t.subject(serviceName, appointment.date, appointment.startTime);
  const html = buildPatientConfirmationHtml(appointment, normLang);

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: appointment.email,
      subject,
      html,
    });

    console.log(`[Email Engine] ✅ Patient confirmation email sent successfully (${normLang.toUpperCase()}) to ${appointment.email} (MessageID: ${info.messageId})`);
    return { success: true };
  } catch (err) {
    console.error('[Email Engine] ❌ Failed to send confirmation email:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Send Clinic Owner / Admin New Booking Alert (English)
 */
export async function sendAdminNewBookingNotification(
  appointment: AppointmentData
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return { success: true, skipped: true };

  const transporter = getTransporter();
  if (!transporter) return { success: true, skipped: true };

  const serviceObj = SERVICES.find(s => s.slug === appointment.service);
  const serviceName = serviceObj?.name?.en || serviceObj?.name?.fr || appointment.service;
  const fromName = process.env.SMTP_FROM_NAME || 'Digital Clínica System';
  const fromAddress = process.env.SMTP_USER;

  const subject = `🔔 New Online Booking: ${appointment.patientName} (${appointment.date} at ${appointment.startTime})`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 14px; background-color: #FFFFFF;">
      <h2 style="color: #0F172A; margin-top: 0; font-size: 20px;">New Online Appointment Received!</h2>
      <p style="color: #475569; font-size: 14px;">A patient has just booked an appointment on the clinic website:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Patient</td>
          <td style="padding: 10px 0; color: #0F172A; font-weight: bold;">${escapeHtml(appointment.patientName)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Phone</td>
          <td style="padding: 10px 0; color: #0F172A;"><a href="tel:${escapeHtml(appointment.phone)}" style="color: #2563EB; text-decoration: none;">${escapeHtml(appointment.phone)}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Email</td>
          <td style="padding: 10px 0; color: #0F172A;">${escapeHtml(appointment.email || 'Not provided')}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Requested Care</td>
          <td style="padding: 10px 0; color: #0F172A; font-weight: bold;">${escapeHtml(serviceName)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Date & Time</td>
          <td style="padding: 10px 0; color: #0F172A; font-weight: bold;">${escapeHtml(appointment.date)} at ${escapeHtml(appointment.startTime)}</td>
        </tr>
        ${appointment.notes ? `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Notes</td>
          <td style="padding: 10px 0; color: #0F172A;">${escapeHtml(appointment.notes)}</td>
        </tr>
        ` : ''}
      </table>

      <div style="margin-top: 24px;">
        <a href="https://wa.me/${appointment.phone.replace(/[^0-9]/g, '')}" style="display: inline-block; background-color: #22C55E; color: #FFFFFF; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: bold;">
          💬 Contact Patient on WhatsApp
        </a>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: adminEmail,
      subject,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('[Email Engine] Failed to send admin alert email:', err);
    return { success: false, error: (err as Error).message };
  }
}

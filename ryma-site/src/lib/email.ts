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

/**
 * Build Luxury Responsive HTML Email Template (English)
 */
function buildPatientConfirmationHtml(appointment: AppointmentData, lang = 'en') {
  const serviceObj = SERVICES.find(s => s.slug === appointment.service);
  const serviceName = serviceObj ? getLocalizedText(serviceObj.name, 'en') || getLocalizedText(serviceObj.name, 'fr') : appointment.service;
  const servicePrice = serviceObj?.price ? `${serviceObj.price} €` : 'Custom Quote';
  const duration = serviceObj?.duration || '50 min';
  const formattedDate = formatHumanDate(appointment.date, 'en');
  const googleCalendarUrl = getGoogleCalendarUrl(appointment, serviceName);
  const clinicAddress = SITE.address.en || SITE.address.fr || 'Avenida da Liberdade 120, 1250-146 Lisbon, Portugal';
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinicAddress)}`;
  const whatsappUrl = `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(
    `Hello Digital Clínica, I have booked a session for ${serviceName} on ${appointment.date} at ${appointment.startTime}.`
  )}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation — Digital Clinica</title>
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
        <div class="clinic-tagline">Physiotherapy & Advanced Care Clinic</div>
      </div>

      <!-- Main Body -->
      <div class="content-body">
        <div style="text-align: center;">
          <div class="badge-confirmed">✓ Appointment Confirmed</div>
        </div>

        <h2 class="greeting">Hello ${appointment.patientName},</h2>
        <p class="intro-text">
          Your appointment has been successfully scheduled. We look forward to welcoming you for your consultation.
        </p>

        <!-- Appointment Details Box -->
        <div class="appointment-box">
          <div class="box-title">Appointment Details</div>

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-bottom: 12px;" width="50%">
                <div class="detail-label">Treatment</div>
                <div class="detail-val detail-val-highlight">${serviceName}</div>
              </td>
              <td style="padding-bottom: 12px;" width="50%">
                <div class="detail-label">Duration & Price</div>
                <div class="detail-val">${duration} · ${servicePrice}</div>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 6px;">
                <div class="detail-label">Date</div>
                <div class="detail-val">${formattedDate}</div>
              </td>
              <td style="padding-top: 6px;">
                <div class="detail-label">Time</div>
                <div class="detail-val">${appointment.startTime}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Location Box -->
        <div class="location-box">
          <div class="detail-label" style="margin-bottom: 6px;">📍 Consultation Location</div>
          <div style="font-size: 14px; font-weight: 600; color: #1A1412; margin-bottom: 6px;">
            Digital Clínica
          </div>
          <div style="font-size: 13px; color: #666158; margin-bottom: 12px;">
            ${clinicAddress}
          </div>
          <a href="${mapsUrl}" target="_blank" style="color: #9B793A; font-size: 12px; font-weight: 700; text-decoration: none;">
            → Open route in Google Maps
          </a>
        </div>

        <!-- Practical Advice -->
        <div class="advice-list">
          <strong>💡 Tips for your appointment:</strong>
          <ul style="margin: 6px 0 0 0; padding-left: 20px;">
            <li>Please wear comfortable and flexible clothing.</li>
            <li>Bring any medical prescriptions, doctor referrals, or recent imaging results if available.</li>
            <li>Please arrive 5 minutes before your scheduled appointment time.</li>
          </ul>
        </div>

        <!-- Call to actions -->
        <a href="${googleCalendarUrl}" target="_blank" class="action-button-primary">
          📅 Add to Google Calendar
        </a>

        <a href="${whatsappUrl}" target="_blank" class="action-button-secondary">
          💬 Have a question? Contact us on WhatsApp
        </a>
      </div>

      <!-- Footer -->
      <div class="footer">
        <div><strong>Digital Clínica — Physiotherapy & Advanced Aesthetics</strong></div>
        <div>Phone: <a href="tel:${SITE.phone}">${SITE.phone}</a> · Lisbon, Portugal</div>
        <div style="margin-top: 10px; font-size: 11px; color: #A6A095;">
          This is an automated confirmation email. To reschedule or cancel your session, please contact us at least 24 hours in advance.
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
 * Send Patient Booking Confirmation Email (English)
 */
export async function sendAppointmentConfirmationEmail(
  appointment: AppointmentData,
  lang = 'en'
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  if (!appointment.email || !appointment.email.includes('@')) {
    return { success: true, skipped: true };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.log('[Email Engine] SMTP not configured. Skipped sending email to:', appointment.email);
    return { success: true, skipped: true };
  }

  const serviceObj = SERVICES.find(s => s.slug === appointment.service);
  const serviceName = serviceObj ? getLocalizedText(serviceObj.name, 'en') || getLocalizedText(serviceObj.name, 'fr') : appointment.service;
  const fromName = process.env.SMTP_FROM_NAME || 'Digital Clínica — Physiotherapy & Care';
  const fromAddress = process.env.SMTP_USER;

  const subject = `Appointment Confirmation — ${serviceName} (${appointment.date} at ${appointment.startTime})`;

  const html = buildPatientConfirmationHtml(appointment, lang);

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: appointment.email,
      subject,
      html,
    });

    console.log(`[Email Engine] ✅ Patient confirmation email sent successfully to ${appointment.email} (MessageID: ${info.messageId})`);
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
          <td style="padding: 10px 0; color: #0F172A; font-weight: bold;">${appointment.patientName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Phone</td>
          <td style="padding: 10px 0; color: #0F172A;"><a href="tel:${appointment.phone}" style="color: #2563EB; text-decoration: none;">${appointment.phone}</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Email</td>
          <td style="padding: 10px 0; color: #0F172A;">${appointment.email || 'Not provided'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Requested Care</td>
          <td style="padding: 10px 0; color: #0F172A; font-weight: bold;">${serviceName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Date & Time</td>
          <td style="padding: 10px 0; color: #0F172A; font-weight: bold;">${appointment.date} at ${appointment.startTime}</td>
        </tr>
        ${appointment.notes ? `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 10px 0; color: #64748B; font-weight: 600;">Notes</td>
          <td style="padding: 10px 0; color: #0F172A;">${appointment.notes}</td>
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

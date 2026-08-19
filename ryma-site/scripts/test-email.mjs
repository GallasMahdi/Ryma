import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Manually parse .env.local if needed
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

async function testEmail() {
  console.log('\n========================================');
  console.log('TESTING GMAIL SMTP ENGLISH EMAIL DISPATCH');
  console.log('========================================\n');

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');
  const recipient = process.env.SMTP_USER || 'mehdi.gallas.98@gmail.com';

  console.log(`SMTP Host: ${host}:${port}`);
  console.log(`SMTP User: ${user}`);
  console.log(`Target Test Recipient: ${recipient}\n`);

  if (!user || !pass) {
    console.error('ERROR: SMTP_USER or SMTP_PASS is missing in .env.local');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user, pass },
  });

  console.log('1. Verifying SMTP connection with Gmail...');
  try {
    await transporter.verify();
    console.log('   ✅ SMTP Connection Verified Successfully with Google Servers!');
  } catch (err) {
    console.error('   ❌ SMTP Verification Failed:', err);
    process.exit(1);
  }

  console.log('\n2. Sending test luxury English booking confirmation email...');
  const testHtml = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #E9E6DF;">
      <div style="height: 3px; background: linear-gradient(90deg, #C6A15B, #E8D7B0, #C6A15B);"></div>
      <div style="background-color: #1A1412; padding: 30px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 22px;">Ryma Ouichka</h1>
        <div style="color: #C6A15B; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Physiotherapy & Advanced Care Clinic</div>
      </div>
      <div style="padding: 30px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #202020;">
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="background-color: #FAF6EE; border: 1px solid #E8D7B0; color: #9B793A; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 5px 14px; border-radius: 20px; letter-spacing: 1px;">
            ✓ Appointment Confirmed
          </span>
        </div>
        <h2 style="margin: 0 0 10px 0; font-size: 18px; font-family: Georgia, serif;">Hello Mahdi,</h2>
        <p style="color: #666158; font-size: 14px; line-height: 1.6;">
          Your appointment has been successfully scheduled. Here is a summary of your session:
        </p>

        <div style="background-color: #FAF9F6; border: 1px solid #E9E6DF; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #8C867D; font-size: 12px; text-transform: uppercase;">Treatment</td>
              <td style="padding: 6px 0; font-weight: bold; color: #9B793A; text-align: right;">Renata França Lymphatic Drainage</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C867D; font-size: 12px; text-transform: uppercase;">Date</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">Friday, August 28, 2026</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C867D; font-size: 12px; text-transform: uppercase;">Time</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">14:30</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #8C867D; font-size: 12px; text-transform: uppercase;">Price</td>
              <td style="padding: 6px 0; font-weight: bold; text-align: right;">90 €</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #FFFFFF; border: 1px solid #E9E6DF; border-radius: 10px; padding: 14px; margin-bottom: 20px; font-size: 13px;">
          📍 <strong>Ryma Ouichka Clinic:</strong> Avenida da Liberdade 120, 1250-146 Lisbon, Portugal
        </div>

        <a href="https://calendar.google.com" target="_blank" style="display: block; text-align: center; background-color: #1A1412; color: #FFFFFF; text-decoration: none; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: bold; margin-bottom: 10px;">
          📅 Add to Google Calendar
        </a>
      </div>
      <div style="background-color: #FAF9F6; border-top: 1px solid #E9E6DF; padding: 16px; text-align: center; font-size: 11px; color: #8C867D;">
        Ryma Ouichka — Licensed Physiotherapist · Lisbon, Portugal
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Ryma Ouichka — Physiotherapy & Care" <${user}>`,
      to: recipient,
      subject: `Appointment Confirmation — Renata França Lymphatic Drainage (August 28, 2026)`,
      html: testHtml,
    });

    console.log(`   ✅ ENGLISH EMAIL DELIVERED SUCCESSFULLY!`);
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Check your inbox at: ${recipient}\n`);
  } catch (err) {
    console.error('   ❌ Failed to send email:', err);
    process.exit(1);
  }

  console.log('========================================');
  console.log('EMAIL TEST COMPLETE');
  console.log('========================================\n');
}

testEmail().catch(console.error);

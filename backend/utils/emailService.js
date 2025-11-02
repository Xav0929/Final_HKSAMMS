// utils/emailService.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('EMAIL SERVICE LOADED');

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject) {
    console.error('sendEmail: Missing `to` or `subject`');
    throw new Error('`to` and `subject` are required');
  }

  const payload = {
    from: 'HK-SAMMS <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject,
    text: text || '',
    html: html || text?.replace(/\n/g, '<br>'),
  };

  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const data = await resend.emails.send(payload);

      // SUCCESS
      console.log('EMAIL SENT');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (text?.includes('OTP')) {
        const otp = text.match(/OTP code is (\d+)/)?.[1];
        if (otp) console.log(`OTP: ${otp}`);
      }
      console.log(`Resend ID: ${data.id}`);
      console.log(`Preview: https://resend.com/emails/${data.id}`);
      console.log('---');

      return data; // Return real data
    } catch (err) {
      lastError = err;
      const status = err?.statusCode || 'unknown';
      const message = err?.message || 'no message';

      console.error(`EMAIL ATTEMPT ${attempt} FAILED (status ${status}): ${message}`);
      if (attempt < maxRetries) {
        console.log(`Retrying in ${1000 * attempt}ms...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // ALL ATTEMPTS FAILED
  console.error('ALL EMAIL ATTEMPTS FAILED');
  throw lastError;
}

module.exports = { sendEmail };
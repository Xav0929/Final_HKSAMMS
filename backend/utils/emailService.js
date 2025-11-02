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
      const response = await resend.emails.send(payload);

      // SUCCESS: Resend returns { id: 're_...' }
      if (!response?.id) {
        throw new Error('Resend returned no ID');
      }

      console.log('EMAIL SENT');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (text?.includes('OTP')) {
        const otp = text.match(/OTP code is (\d+)/)?.[1];
        if (otp) console.log(`OTP: ${otp}`);
      }
      console.log(`Resend ID: ${response.id}`);
      console.log(`Preview: https://resend.com/emails/${response.id}`);
      console.log('---');

      return response;
    } catch (err) {
      lastError = err;
      const status = err?.statusCode || err?.response?.status || 'unknown';
      const message = err?.message || 'no message';

      console.error(`EMAIL ATTEMPT ${attempt} FAILED (status ${status}): ${message}`);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${1000 * attempt}ms...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // ALL FAILED
  console.error('ALL EMAIL ATTEMPTS FAILED');
  console.error('Final error:', lastError?.message || lastError);
  throw lastError; // This will go to route → 500 error
}

module.exports = { sendEmail };
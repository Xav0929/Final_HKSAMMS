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
      // ADD TIMEOUT: 10 seconds max
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await resend.emails.send(payload, { signal: controller.signal });
      clearTimeout(timeout);

      // VALIDATE RESPONSE
      if (!response || typeof response !== 'object') {
        throw new Error('Resend returned invalid response');
      }
      if (!response.id) {
        throw new Error(`Resend returned no ID: ${JSON.stringify(response)}`);
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
      const isTimeout = err.name === 'AbortError';
      const status = isTimeout ? 'timeout' : (err?.statusCode || 'unknown');
      const message = err.message || 'no message';

      console.error(`EMAIL ATTEMPT ${attempt} FAILED (${status}): ${message}`);
      if (attempt < maxRetries) {
        const delay = 1000 * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error('ALL EMAIL ATTEMPTS FAILED');
  throw lastError;
}

module.exports = { sendEmail };
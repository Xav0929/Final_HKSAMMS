// utils/emailService.js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject) {
    console.error('sendEmail: Missing `to` or `subject`');
    throw new Error('Email `to` and `subject` are required');
  }

  const payload = {
    from: 'HK-SAMMS <onboarding@resend.dev>',
    to: Array.isArray(to) ? to : [to],
    subject,
    text: text || '',
    html: html || text?.replace(/\n/g, '<br>'),
  };

  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const data = await resend.emails.send(payload);

      // SUCCESS LOG (you'll see this in Render!)
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

      return data;
    } catch (err) {
      lastError = err;
      const status = err?.statusCode || 'unknown';
      const msg = err?.message || 'no message';

      // FAILURE LOG (clear in Render)
      console.error('EMAIL FAILED');
      console.error(`Attempt: ${attempt}/${maxRetries + 1}`);
      console.error(`To: ${to}`);
      console.error(`Error (${status}): ${msg}`);
      if (attempt <= maxRetries) {
        console.log(`Retrying in ${1000 * attempt}ms...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
      console.log('---');
    }
  }

  console.error('ALL EMAIL ATTEMPTS FAILED');
  throw lastError;
}

module.exports = { sendEmail };
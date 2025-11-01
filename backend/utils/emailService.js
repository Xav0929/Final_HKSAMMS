// emailService.js (new helper file)
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, subject, text }) {
  try {
    await resend.emails.send({
      from: 'HK-SAMMS <noreply@hksamms.app>', // You can customize this
      to,
      subject,
      text,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error(`❌ Email send failed:`, error);
  }
}

module.exports = { sendEmail };

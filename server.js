const express = require('express');
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.use('/data', express.static(path.join(__dirname, 'data'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'application/json');
  }
}));

const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimit) {
    if (now - entry.start > RATE_LIMIT_WINDOW) rateLimit.delete(ip);
  }
}, 5 * 60 * 1000);

app.post('/api/contact', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { name, email, company, message, website } = req.body;

    if (website) {
      return res.status(200).json({ success: true, message: 'Thank you for your enquiry!' });
    }

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const toEmail = process.env.CONTACT_TO_EMAIL;
    if (!toEmail) {
      console.error('CONTACT_TO_EMAIL environment variable not set');
      return res.status(500).json({ error: 'Contact form is not configured yet. Please try again later.' });
    }

    let sent = false;

    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = require('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'HalloweenVoice <onboarding@resend.dev>',
          to: toEmail,
          subject: `New Enquiry from ${name}`,
          html: `
            <h2>New Enquiry from HalloweenVoice.co.uk</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        });
        sent = true;
      } catch (err) {
        console.error('Resend error:', err.message);
      }
    }

    if (!sent && process.env.SMTP_HOST) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: toEmail,
          subject: `New Enquiry from ${name}`,
          html: `
            <h2>New Enquiry from HalloweenVoice.co.uk</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Company:</strong> ${company || 'Not provided'}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `
        });
        sent = true;
      } catch (err) {
        console.error('SMTP error:', err.message);
      }
    }

    if (!sent) {
      console.log('--- CONTACT FORM SUBMISSION (email not configured) ---');
      console.log(`Name: ${name}`);
      console.log(`Email: ${email}`);
      console.log(`Company: ${company || 'N/A'}`);
      console.log(`Message: ${message}`);
      console.log('---');
    }

    res.json({ success: true, message: 'Thank you for your enquiry! We\'ll be in touch soon.' });

  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HalloweenVoice server running on port ${PORT}`);
});

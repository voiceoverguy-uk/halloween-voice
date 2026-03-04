const express = require('express');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const PORT = 5000;

app.set('trust proxy', 1);
app.use(express.json());

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

const rateMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now - entry.start > RATE_WINDOW) rateMap.delete(ip);
  }
}, 5 * 60 * 1000);

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

app.post('/api/contact', async (req, res) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return res.status(503).json({ ok: false, error: 'Email service not configured. Please try again later.' });
    }

    const ip = req.ip || 'unknown';

    if (isRateLimited(ip)) {
      return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
    }

    const { name, email, company, message, website } = req.body;

    if (website) {
      return res.json({ ok: true });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ ok: false, error: 'Name is required.' });
    }
    if (!email || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ ok: false, error: 'A valid email address is required.' });
    }
    if (!message || message.trim().length < 40) {
      return res.status(400).json({ ok: false, error: 'Message must be at least 40 characters.' });
    }

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(email.trim());
    const safeCompany = company && company.trim() ? escapeHtml(company.trim()) : '';
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br>');

    const resend = new Resend(process.env.RESEND_API_KEY);

    const timestamp = new Date().toISOString();
    const htmlBody = `
      <h2>New Halloween Voice Enquiry</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      ${safeCompany ? `<p><strong>Company:</strong> ${safeCompany}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
      <hr>
      <p style="color:#888;font-size:12px;">Sent from halloweenvoice.co.uk at ${timestamp}</p>
    `;

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'VoiceoverGuy <noreply@voiceoverguy.co.uk>',
      to: 'enquiries@voiceoverguy.co.uk',
      replyTo: email.trim(),
      subject: `HalloweenVoice.co.uk enquiry – ${safeName}`,
      html: htmlBody
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ ok: false, error: 'Failed to send email. Please try again.' });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('Contact endpoint error:', err);
    return res.status(500).json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HalloweenVoice server running on port ${PORT}`);
});

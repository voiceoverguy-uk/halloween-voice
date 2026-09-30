const express = require('express');
const path = require('path');
const fs = require('fs');
const { Resend } = require('resend');
const { getSiteFacts, renderHome } = require('./lib/site-facts');
const { createReviewsService } = require('./lib/google-reviews');
const { renderMedia } = require('./lib/media-catalog');

const app = express();
const PORT = 5000;
const homepageTemplate = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const reviews = createReviewsService();
app.locals.mailer = {
  configured: () => Boolean(process.env.RESEND_API_KEY),
  send: (message) => new Resend(process.env.RESEND_API_KEY).emails.send(message)
};

app.set('trust proxy', 1);
app.use(express.json());

app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const now = new Date();
  res.type('html').send(renderMedia(renderHome(homepageTemplate, now), getSiteFacts(now).arabellaAge));
});
app.get('/index.html', (req, res) => res.redirect(308, '/'));

app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
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

app.get('/api/reviews', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await reviews.getReviews());
});
app.all('/api/reviews', (req, res) => res.set('Allow', 'GET, HEAD').status(405).json({ error: 'Method not allowed' }));

const rateMap = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now - entry.start > RATE_WINDOW) rateMap.delete(ip);
  }
}, 5 * 60 * 1000).unref();

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
    if (!app.locals.mailer.configured()) {
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

    const site = req.headers.host || 'Website';

    const { error } = await app.locals.mailer.send({
      from: process.env.RESEND_FROM || 'VoiceoverGuy <noreply@voiceoverguy.co.uk>',
      to: 'enquiries@voiceoverguy.co.uk',
      replyTo: email.trim(),
      subject: `${site} enquiry – ${safeName}`,
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

app.all('/api/contact', (req, res) => res.set('Allow', 'POST').status(405).json({ error: 'Method not allowed' }));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((req, res) => {
  res.status(404).type('text/plain').send('Not found');
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HalloweenVoice server running on port ${PORT}`);
  });
}

module.exports = app;

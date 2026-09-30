const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { getSiteFacts, renderHome } = require('../lib/site-facts');
const { renderMedia } = require('../lib/media-catalog');
const {
  createReviewsService, FRESH_FOR, KEEP_STALE_FOR, RETRY_AFTER
} = require('../lib/google-reviews');
const app = require('../server');

const source = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');

test('UK calendar dates drive initial experience, DOB-based age and copyright', () => {
  assert.deepEqual(getSiteFacts(new Date('2026-09-30T12:00:00Z')), {
    year: 2026, experienceYears: 26, arabellaAge: 10
  });
  assert.equal(getSiteFacts(new Date('2027-06-03T22:59:59Z')).arabellaAge, 10);
  assert.equal(getSiteFacts(new Date('2027-06-03T23:00:00Z')).arabellaAge, 11);
  assert.equal(getSiteFacts(new Date('2028-06-03T22:59:59Z')).arabellaAge, 11);
  assert.equal(getSiteFacts(new Date('2028-06-03T23:00:00Z')).arabellaAge, 12);
  assert.equal(getSiteFacts(new Date('2026-12-31T23:59:59Z')).experienceYears, 26);
  assert.equal(getSiteFacts(new Date('2027-01-01T00:00:00Z')).experienceYears, 27);

  const html = renderHome(source, new Date('2027-06-03T23:00:00Z'));
  assert.match(html, /<span id="voYears">27<\/span>\+ years/);
  assert.match(html, /<span id="arabellaAge">11<\/span> years old/);
  assert.match(html, /<span id="copyrightYear">2027<\/span>/);
  assert.equal((html.match(/27\+ years experience/g) || []).length, 3);
  assert.doesNotMatch(html, /\{\{(?:EXPERIENCE_YEARS|ARABELLA_AGE|COPYRIGHT_YEAR)\}\}/);
  assert.doesNotMatch(html, /Rated\s*<strong|Arabella 9 years|\(\+ years\)|Only <span id="arabellaAge"><\/span>/);
});

test('schema describes a brand, Guy and the site without an invented employer', () => {
  const html = renderMedia(renderHome(source, new Date('2026-09-30T12:00:00Z')), 10);
  const jsonLd = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const entity = (type) => jsonLd.find((node) => node['@type'] === type);
  assert.equal(entity('Organization'), undefined);
  assert.equal(entity('Brand')['@id'], 'https://halloweenvoice.co.uk/#brand');
  assert.equal(entity('WebSite')['@id'], 'https://halloweenvoice.co.uk/#website');
  assert.equal(entity('WebPage')['@id'], 'https://halloweenvoice.co.uk/#webpage');
  assert.equal(entity('WebPage').isPartOf['@id'], entity('WebSite')['@id']);
  assert.equal(entity('WebPage').about['@id'], entity('Person')['@id']);
  assert.equal(entity('Person').worksFor, undefined);
  assert.equal(entity('Person')['@id'], 'https://halloweenvoice.co.uk/#guy-harris');
  assert.doesNotMatch(html, /www\.halloweenvoice\.co\.uk/);
  assert.match(html, /rel="canonical" href="https:\/\/halloweenvoice\.co\.uk\/"/);
  assert.match(html, /property="og:url" content="https:\/\/halloweenvoice\.co\.uk\/"/);
  assert.match(html, /class="reviews-stars" id="reviewStars" aria-hidden="true" hidden/);
  assert.match(html, /aria-controls="navLinks" aria-expanded="false"/);
  assert.equal((html.match(/class="video-trigger"/g) || []).length, 6);
  assert.match(html, /id="formStatus" role="status" aria-live="polite"/);
});

test('review values update, failed lookups never renew freshness, and old data expires', async () => {
  let clock = Date.UTC(2026, 8, 30);
  let count = 124;
  let fail = false;
  let requests = 0;
  const service = createReviewsService({
    now: () => clock,
    fetchReviews: async () => {
      requests++;
      if (fail) throw new Error('simulated provider outage');
      return { rating: 5, reviewCount: count };
    }
  });

  const first = await service.getReviews();
  assert.deepEqual(first, {
    status: 'fresh', rating: 5, reviewCount: 124,
    checkedAt: new Date(clock).toISOString()
  });
  clock += FRESH_FOR - 1;
  assert.equal((await service.getReviews()).status, 'fresh');
  assert.equal(requests, 1);

  clock += 1;
  fail = true;
  const stale = await service.getReviews();
  assert.equal(stale.status, 'stale');
  assert.equal(stale.checkedAt, first.checkedAt);
  assert.equal(stale.reviewCount, 124);
  clock += RETRY_AFTER - 1;
  assert.equal((await service.getReviews()).checkedAt, first.checkedAt);
  assert.equal(requests, 2);

  clock += 1;
  fail = false;
  count = 125;
  const refreshed = await service.getReviews();
  assert.equal(refreshed.status, 'fresh');
  assert.equal(refreshed.reviewCount, 125);
  assert.notEqual(refreshed.checkedAt, first.checkedAt);
  fail = true;
  clock = Date.parse(refreshed.checkedAt) + KEEP_STALE_FOR;
  assert.equal((await service.getReviews()).status, 'stale');
  clock += 1;
  assert.deepEqual(await service.getReviews(), { status: 'unavailable' });
});

test('review provider invalid data and concurrent requests cannot masquerade as ratings', async () => {
  let clock = 1_000_000_000;
  let provider = async () => ({ rating: 5, reviewCount: '119' });
  const service = createReviewsService({ now: () => clock, fetchReviews: () => provider() });
  assert.deepEqual(await service.getReviews(), { status: 'unavailable' });
  clock += RETRY_AFTER;
  provider = async () => ({ rating: 5, reviewCount: 126 });
  assert.equal((await service.getReviews()).reviewCount, 126);

  let release;
  let calls = 0;
  const pending = createReviewsService({
    now: () => clock,
    fetchReviews: () => {
      calls++;
      return new Promise((resolve) => { release = resolve; });
    }
  });
  const one = pending.getReviews();
  const two = pending.getReviews();
  release({ rating: 4.9, reviewCount: 127 });
  assert.equal((await one).reviewCount, 127);
  assert.equal((await two).reviewCount, 127);
  assert.equal(calls, 1);
});

test('review strip labels fresh, stale and unavailable values without inventing a count', () => {
  const script = fs.readFileSync(path.join(__dirname, '../public/script.js'), 'utf8');
  const start = script.indexOf('function strongNumber(value)');
  const end = script.indexOf("fetch('/api/reviews')", start);
  assert.ok(start > 0 && end > start, 'review rendering code is present');

  const reviewsText = {
    textContent: '',
    replaceChildren(...parts) {
      this.textContent = parts.map((part) => typeof part === 'string' ? part : part.textContent).join('');
    }
  };
  const reviewStars = { hidden: true };
  const renderReviews = vm.runInNewContext(
    script.slice(start, end) + '\nrenderReviews',
    {
      reviewsText, reviewStars,
      document: { createElement: () => ({ textContent: '' }) }
    }
  );

  renderReviews({ status: 'fresh', rating: 5, reviewCount: 125 });
  assert.equal(reviewsText.textContent, 'Rated 5.0 on Google by 125 VoiceoverGuy clients');
  assert.equal(reviewStars.hidden, false);
  renderReviews({
    status: 'stale', rating: 5, reviewCount: 123,
    checkedAt: '2026-09-29T10:00:00.000Z'
  });
  assert.match(reviewsText.textContent, /Last verified 29 September 2026: rated 5\.0 on Google by 123 VoiceoverGuy clients \(current Google data temporarily unavailable\)/);
  renderReviews({ status: 'unavailable' });
  assert.equal(reviewsText.textContent, 'VoiceoverGuy client reviews on Google are temporarily unavailable.');
  assert.equal(reviewStars.hidden, true);
});

test('local HTTP routes, HTML, static files and safe contact validation', async (t) => {
  const previousMailer = app.locals.mailer;
  const sent = [];
  app.locals.mailer = {
    configured: () => true,
    send: async (message) => { sent.push(message); return { error: null }; }
  };
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => { app.locals.mailer = previousMailer; server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options) => fetch(base + url, { redirect: 'manual', ...options });

  const home = await request('/');
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('cache-control'), 'no-store');
  const html = await home.text();
  assert.match(html, /<span id="voYears">\d+<\/span>\+ years/);
  assert.match(html, /<span id="arabellaAge">\d+<\/span>/);
  assert.match(html, /<span id="copyrightYear">\d{4}<\/span>/);
  assert.doesNotMatch(html, /\{\{|\b119\b|Rated <strong/);

  const oldPath = await request('/index.html');
  assert.equal(oldPath.status, 308);
  assert.equal(oldPath.headers.get('location'), '/');
  for (const url of ['/nonexistent', '/about', '/favicon.ico', '/missing.css']) {
    assert.equal((await request(url)).status, 404, url);
  }
  assert.equal((await request('/api/does-not-exist')).status, 404);
  assert.equal((await request('/api/contact')).status, 405);
  assert.equal((await request('/api/contact')).headers.get('allow'), 'POST');
  assert.equal((await request('/api/reviews', { method: 'POST' })).status, 405);
  for (const url of [
    '/styles.css', '/script.js', '/manifest.json', '/sitemap.xml', '/robots.txt',
    '/data/demos.json', '/data/videos.json', '/images/favicon-48x48.png',
    '/images/apple-touch-icon.png', '/audio/dracula-voice-showreel-26-guy-harris.mp3'
  ]) {
    assert.equal((await request(url, { method: 'HEAD' })).status, 200, url);
  }
  const sitemap = await (await request('/sitemap.xml')).text();
  assert.equal((sitemap.match(/<loc>/g) || []).length, 1);
  assert.match(sitemap, /<loc>https:\/\/halloweenvoice\.co\.uk\/<\/loc>/);
  assert.doesNotMatch(sitemap, /lastmod|www\.halloweenvoice/);
  const robots = await (await request('/robots.txt')).text();
  assert.match(robots, /Sitemap: https:\/\/halloweenvoice\.co\.uk\/sitemap\.xml/);

  // These are local requests using a fake mailer. No production email is sent.
  async function contact(body) {
    return request('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }
  const invalid = await contact({ name: '', email: 'not-an-email', message: 'short' });
  assert.equal(invalid.status, 400);
  assert.equal(sent.length, 0);
  const validBody = {
    name: 'Test Client', email: 'test@example.invalid', company: '',
    message: 'A sufficiently long test message for local validation only.'
  };
  const valid = await contact(validBody);
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).ok, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'enquiries@voiceoverguy.co.uk');
  assert.equal(sent[0].replyTo, validBody.email);

  app.locals.mailer.send = async () => ({ error: { message: 'simulated rejection' } });
  const originalLog = console.error;
  console.error = () => {};
  try {
    const failed = await contact(validBody);
    assert.equal(failed.status, 500);
    assert.equal((await failed.json()).ok, false);
  } finally {
    console.error = originalLog;
  }
  assert.match(html, /name="name" required/);
  assert.match(html, /name="email" required/);
  assert.match(html, /name="message" rows="5" required minlength="40"/);
});
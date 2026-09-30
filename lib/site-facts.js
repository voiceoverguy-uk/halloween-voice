const START_YEAR = 2000;
const ARABELLA_BIRTH = { year: 2016, month: 6, day: 4 };
const londonDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
});

function getSiteFacts(now = new Date()) {
  const parts = Object.fromEntries(
    londonDateFormatter.formatToParts(now)
      .filter((part) => ['year', 'month', 'day'].includes(part.type))
      .map((part) => [part.type, Number(part.value)])
  );
  const age = parts.year - ARABELLA_BIRTH.year -
    (parts.month < ARABELLA_BIRTH.month ||
    (parts.month === ARABELLA_BIRTH.month && parts.day < ARABELLA_BIRTH.day) ? 1 : 0);

  return {
    year: parts.year,
    experienceYears: parts.year - START_YEAR,
    arabellaAge: age
  };
}

function renderHome(template, now = new Date()) {
  const facts = getSiteFacts(now);
  const values = {
    '{{EXPERIENCE_YEARS}}': facts.experienceYears,
    '{{ARABELLA_AGE}}': facts.arabellaAge,
    '{{COPYRIGHT_YEAR}}': facts.year
  };
  for (const [token, value] of Object.entries(values)) {
    if (!template.includes(token)) throw new Error(`Homepage template missing ${token}`);
    template = template.replaceAll(token, String(value));
  }
  return template;
}

module.exports = { getSiteFacts, renderHome };
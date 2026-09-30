const https = require('https');

const PLACE_ID = 'ChIJL1W4QyVneUgRBV8j4XrOzaM';
const FRESH_FOR = 24 * 60 * 60 * 1000;
const KEEP_STALE_FOR = 7 * 24 * 60 * 60 * 1000;
const RETRY_AFTER = 10 * 60 * 1000;

function fetchGoogleReviews() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return Promise.reject(new Error('Google Places is not configured'));

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', PLACE_ID);
  url.searchParams.set('fields', 'rating,user_ratings_total');
  url.searchParams.set('key', apiKey);

  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('error', reject);
      response.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (response.statusCode !== 200 || json.status !== 'OK' || !json.result) {
            throw new Error('Google Places returned no valid result');
          }
          resolve({
            rating: json.result.rating,
            reviewCount: json.result.user_ratings_total
          });
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(8000, () => request.destroy(new Error('Google Places timed out')));
    request.on('error', reject);
  });
}

function validReviews(value) {
  return value && typeof value.rating === 'number' &&
    Number.isFinite(value.rating) && value.rating > 0 && value.rating <= 5 &&
    Number.isSafeInteger(value.reviewCount) && value.reviewCount > 0;
}

function createReviewsService({ fetchReviews = fetchGoogleReviews, now = Date.now } = {}) {
  let lastSuccess = null;
  let lastAttemptAt = -Infinity;
  let pending = null;

  function state(at) {
    if (!lastSuccess || at - lastSuccess.time > KEEP_STALE_FOR) {
      return { status: 'unavailable' };
    }
    return {
      status: at - lastSuccess.time < FRESH_FOR ? 'fresh' : 'stale',
      rating: lastSuccess.rating,
      reviewCount: lastSuccess.reviewCount,
      checkedAt: new Date(lastSuccess.time).toISOString()
    };
  }

  async function getReviews() {
    const at = now();
    if (lastSuccess && at - lastSuccess.time < FRESH_FOR) return state(at);
    if (pending) return pending;
    if (at - lastAttemptAt < RETRY_AFTER) return state(at);

    lastAttemptAt = at;
    pending = (async () => {
      try {
        const result = await fetchReviews();
        if (!validReviews(result)) throw new Error('Invalid Google review values');
        lastSuccess = { ...result, time: now() };
      } catch {
        // A failed lookup does not advance the last successful timestamp.
      }
      return state(now());
    })();

    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  return { getReviews };
}

module.exports = {
  fetchGoogleReviews, createReviewsService, validReviews,
  FRESH_FOR, KEEP_STALE_FOR, RETRY_AFTER
};
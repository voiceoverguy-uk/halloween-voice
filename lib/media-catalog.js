const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://halloweenvoice.co.uk';
const demos = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/demos.json'), 'utf8'));
const showcase = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/videos.json'), 'utf8'));

// Rounded from ffprobe measurements of the original local MP3s (seconds).
const audioDetails = {
  '/audio/dracula-voice-showreel-26-guy-harris.mp3': ['dracula', 'PT30.041S'],
  '/audio/darker-halloween-evil-showreel-26-guy-harris.mp3': ['sinister', 'PT62.949S'],
  '/audio/pleasurewood-chills-spooky-voiceover.mp3': ['pleasurewood', 'PT30.224S'],
  '/audio/york-dungeons-dark-voice.mp3': ['york-dungeons', 'PT30.067S'],
  '/audio/ghost-face-showreel-guy-harris.mp3': ['ghost-face', 'PT77.456S'],
  '/audio/halloween-laughs-guy-harris.mp3': ['halloween-laughs', 'PT72.927S'],
  '/audio/kiss-voxi-mobil-scary-child-voice-arabella-harris.mp3': ['arabella', 'PT26.593S']
};

const licensing = [
  { title: 'Screams, Shrieks and Shouts', url: 'https://www.youtube.com/watch?v=0IhG9vy8G1Q' },
  { title: 'Spooky Halloween Laughs', url: 'https://www.youtube.com/watch?v=Ff6EB6Mrkys' }
];
const videoDescriptions = {
  '0IhG9vy8G1Q': 'Halloween screams, shrieks and shouts for licence.',
  'Ff6EB6Mrkys': 'Spooky Halloween laughs for licence.',
  'OMlBk5QBnyM': 'Joker-style Halloween character voiceover.',
  'E9YxOpjqeq8': 'Scary voice performance for a Psycho Circus escape showreel.',
  'Qnr7JE3WeI8': 'Venom-style character voice performance.',
  'bmMpk16zuSs': 'Spooky Halloween voiceover demo showreel.'
};
const videos = [...licensing, ...showcase];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function videoId(video) {
  const id = new URL(video.url).searchParams.get('v');
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id) || !videoDescriptions[id]) {
    throw new Error(`Unexpected showcase video URL: ${video.url}`);
  }
  return id;
}

function demoTitle(demo, age) {
  return demo.placement === 'arabella'
    ? `Arabella ${age} years – Spooky child voice`
    : demo.title;
}

function audioCard(demo, age) {
  const title = escapeHtml(demoTitle(demo, age));
  const file = escapeHtml(demo.file);
  return `<div class="demo-card" data-audio-src="${file}">
    <h3>${title}</h3>
    <p class="demo-desc">${escapeHtml(demo.description)}</p>
    <div class="audio-player">
      <button type="button" class="audio-play-btn" aria-label="Play ${title}"><svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg></button>
      <div class="audio-progress-wrap">
        <div class="audio-progress"><div class="audio-progress-bar"></div></div>
        <span class="audio-time">0:00</span>
      </div>
    </div>
    <a class="media-fallback-link" href="${file}">Listen to ${title}</a>
  </div>`;
}

function showcaseCard(video) {
  const id = videoId(video);
  const title = escapeHtml(video.title);
  return `<div class="video-card">
    <div class="lite-youtube" data-id="${id}" data-title="${title}">
      <img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="${title}" loading="lazy">
      <button type="button" class="video-trigger" aria-label="Play ${title} video">
        <span class="play-overlay" aria-hidden="true"><svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg></span>
      </button>
    </div>
    <div class="video-card-title">${title}</div>
    <a class="media-fallback-link" href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
  </div>`;
}

function mediaEntities(age) {
  const audio = demos.map((demo) => {
    const details = audioDetails[demo.file];
    if (!details) throw new Error(`Missing measured duration for ${demo.file}`);
    return {
      '@context': 'https://schema.org',
      '@type': 'AudioObject',
      '@id': `${SITE}/#audio-${details[0]}`,
      name: demoTitle(demo, age),
      description: demo.description,
      contentUrl: SITE + demo.file,
      encodingFormat: 'audio/mpeg',
      duration: details[1]
    };
  });
  const video = videos.map((item) => {
    const id = videoId(item);
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      '@id': `${SITE}/#video-${id}`,
      name: item.title,
      description: videoDescriptions[id],
      url: item.url,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  });
  const list = (name, items) => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: { '@id': item['@id'] }
    }))
  });
  return [
    ...audio, ...video,
    list('Featured Halloween Voice Demos', audio),
    list('Halloween Voice YouTube Showcase', video)
  ];
}

function renderMedia(template, age) {
  const values = {
    '{{MEDIA_JSON_LD}}': ',' + mediaEntities(age).map((entity) => JSON.stringify(entity)).join(','),
    '{{AUDIO_CARDS}}': demos.filter((demo) => demo.placement !== 'arabella')
      .map((demo) => audioCard(demo, age)).join('\n'),
    '{{ARABELLA_AUDIO_CARD}}': demos.filter((demo) => demo.placement === 'arabella')
      .map((demo) => audioCard(demo, age)).join('\n'),
    '{{VIDEO_CARDS}}': showcase.map(showcaseCard).join('\n')
  };
  if (demos.length !== 7 || demos.filter((demo) => demo.placement === 'arabella').length !== 1 ||
      new Set(videos.map(videoId)).size !== 6) {
    throw new Error('Media catalog does not match the seven audio/six video inventory');
  }
  for (const [token, markup] of Object.entries(values)) {
    if (!template.includes(token)) throw new Error(`Homepage template missing ${token}`);
    template = template.replace(token, markup);
  }
  return template;
}

module.exports = { renderMedia, mediaEntities };
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { renderHome, getSiteFacts } = require('../lib/site-facts');
const { renderMedia } = require('../lib/media-catalog');
const app = require('../server');

const template = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const demos = require('../data/demos.json');
const videos = require('../data/videos.json');
const ids = ['0IhG9vy8G1Q', 'Ff6EB6Mrkys', 'OMlBk5QBnyM', 'E9YxOpjqeq8', 'Qnr7JE3WeI8', 'bmMpk16zuSs'];
const evidencedUploadDates = {
  '0IhG9vy8G1Q': '2022-09-30',
  'Ff6EB6Mrkys': '2022-09-29',
  'OMlBk5QBnyM': '2014-09-17',
  'E9YxOpjqeq8': '2019-12-23',
  'Qnr7JE3WeI8': '2025-07-02',
  'bmMpk16zuSs': '2015-10-22'
};
const durations = [
  'PT30.041S', 'PT62.949S', 'PT30.224S', 'PT30.067S',
  'PT77.456S', 'PT72.927S', 'PT26.593S'
];

function page(at) {
  return renderMedia(renderHome(template, at), getSiteFacts(at).arabellaAge);
}

function markupAndGraph(at) {
  const html = page(at);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  return { html, graph };
}

test('initial HTML exposes seven audio and six video choices without JavaScript or duplicate cards', () => {
  const { html } = markupAndGraph(new Date('2027-06-03T23:00:00Z'));
  assert.equal(demos.length, 7);
  assert.equal(videos.length, 4);
  assert.equal((html.match(/class="demo-card"/g) || []).length, 7);
  assert.equal((html.match(/class="video-card"/g) || []).length, 4);
  assert.equal((html.match(/class="video-trigger"/g) || []).length, 6);
  assert.equal((html.match(/class="media-fallback-link"/g) || []).length, 13);
  assert.match(html, /Arabella 11 years – Spooky child voice/);
  assert.match(html, /Creepy child character – VOXI \/ KISS style/);
  assert.doesNotMatch(html, /Arabella 9 years|2016-06-04|spooky-showreel-26-guy-harris\.mp3/);
  assert.doesNotMatch(html, /2024-10-01|Purchase Now|\{\{(?:MEDIA|AUDIO|VIDEO|ARABELLA_AUDIO)/);
  for (const demo of demos) {
    assert.ok(html.includes(`href="${demo.file}"`), `No-JS link to ${demo.file}`);
    assert.ok(html.includes(`data-audio-src="${demo.file}"`), `Existing card for ${demo.file}`);
  }
  for (const id of ids) {
    assert.equal((html.match(new RegExp(`data-id="${id}"`, 'g')) || []).length, 1);
    assert.ok(html.includes(`href="https://www.youtube.com/watch?v=${id}"`));
  }
  assert.equal((html.match(/<iframe\b/g) || []).length, 0);
  const script = fs.readFileSync(path.join(__dirname, '../public/script.js'), 'utf8');
  assert.doesNotMatch(script, /appendChild\(createAudioCard|appendChild\(createVideoCard|fetch\('\/data\/(?:demos|videos)\.json'/);
  assert.match(script, /audio\.preload = 'metadata'/);
  assert.match(script, /autoplay=1/);
});

test('seven AudioObjects match visible recordings and measured local durations', () => {
  const { graph } = markupAndGraph(new Date('2026-09-30T12:00:00Z'));
  const audio = graph.filter((node) => node['@type'] === 'AudioObject');
  assert.equal(audio.length, 7);
  assert.deepEqual(audio.map((node) => node.duration), durations);
  assert.deepEqual(audio.map((node) => node.name), demos.map((item) =>
    item.placement === 'arabella' ? 'Arabella 10 years – Spooky child voice' : item.title));
  assert.deepEqual(audio.map((node) => node.description), demos.map((item) => item.description));
  assert.deepEqual(audio.map((node) => node.contentUrl),
    demos.map((item) => 'https://halloweenvoice.co.uk' + item.file));
  const list = graph.find((node) => node['@type'] === 'ItemList' && node.name.includes('Demos'));
  assert.deepEqual(list.itemListElement.map((item) => item.item['@id']),
    audio.map((node) => node['@id']));
  assert.equal(new Set(audio.map((node) => node['@id'])).size, 7);
  for (const node of audio) {
    const filename = node.contentUrl.split('/').at(-1);
    const file = path.join(__dirname, '../public/audio', filename);
    assert.ok(fs.statSync(file).size > 10000);
    const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, filename);
    const measured = Number(result.stdout.trim());
    assert.ok(Math.abs(measured - Number(node.duration.slice(2, -1))) < 0.001, filename);
    assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-'],
      { encoding: 'utf8' }).status, 0, filename);
    for (const property of ['creator', 'publisher', 'uploadDate', 'copyrightHolder', 'license']) {
      assert.equal(node[property], undefined);
    }
  }
  assert.ok(!audio.some((node) => node.contentUrl.includes('/spooky-showreel-26-guy-harris.mp3')));
});

test('six VideoObjects reference each unique ID once with evidenced date-only uploads and no unsupported ownership', () => {
  const { graph, html } = markupAndGraph(new Date('2026-09-30T12:00:00Z'));
  const video = graph.filter((node) => node['@type'] === 'VideoObject');
  assert.equal(video.length, 6);
  assert.deepEqual(video.map((node) => node.url),
    ids.map((id) => `https://www.youtube.com/watch?v=${id}`));
  assert.equal(new Set(video.map((node) => node['@id'])).size, 6);
  for (const [i, node] of video.entries()) {
    assert.equal(node.embedUrl, `https://www.youtube.com/embed/${ids[i]}`);
    assert.equal(node.thumbnailUrl, `https://img.youtube.com/vi/${ids[i]}/hqdefault.jpg`);
    assert.equal(node.uploadDate, evidencedUploadDates[ids[i]]);
    assert.match(node.uploadDate, /^\d{4}-\d{2}-\d{2}$/, 'No fabricated time or timezone');
    assert.ok(node.name && node.description);
    for (const property of ['creator', 'publisher', 'contentUrl', 'license']) {
      assert.equal(node[property], undefined);
    }
  }
  const list = graph.find((node) => node['@type'] === 'ItemList' && node.name.includes('YouTube'));
  assert.deepEqual(list.itemListElement.map((item) => item.item['@id']),
    video.map((node) => node['@id']));
  assert.deepEqual(graph.slice(0, 4).map((node) => node['@type']),
    ['Brand', 'WebSite', 'WebPage', 'Person']);
  assert.equal(graph.find((node) => node['@type'] === 'Person').worksFor, undefined);
  assert.equal(graph.some((node) => ['Review', 'AggregateRating', 'Organization'].includes(node['@type'])), false);
  assert.doesNotMatch(html, /2024-10-01|www\.halloweenvoice\.co\.uk/);
});

test('server delivers media-rich HTML and retains Pass 1 route behavior without sending email', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  assert.equal(home.headers.get('cache-control'), 'no-store');
  const html = await home.text();
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const audio = graph.filter((node) => node['@type'] === 'AudioObject');
  const video = graph.filter((node) => node['@type'] === 'VideoObject');
  assert.equal(audio.length, 7);
  assert.equal(video.length, 6);
  assert.equal(new Set(video.map((node) => node['@id'])).size, 6);
  assert.deepEqual(Object.fromEntries(video.map((node) => [
    new URL(node.url).searchParams.get('v'), node.uploadDate
  ])), evidencedUploadDates);
  assert.doesNotMatch(html, /2024-10-01/);
  assert.equal((html.match(/class="demo-card"/g) || []).length, 7);
  assert.equal((html.match(/class="video-trigger"/g) || []).length, 6);
  assert.match(html, /rel="canonical" href="https:\/\/halloweenvoice\.co\.uk\/"/);
  for (const item of demos) {
    assert.equal((await fetch(origin + item.file, { method: 'HEAD' })).status, 200);
  }
  for (const route of ['/data/demos.json', '/data/videos.json', '/styles.css', '/script.js',
    '/images/thumb-screams.jpg', '/images/thumb-laughs.jpg', '/api/reviews']) {
    assert.equal((await fetch(origin + route, { method: 'HEAD' })).status, 200, route);
  }
  assert.equal((await fetch(origin + '/nonexistent')).status, 404);
  assert.equal((await fetch(origin + '/api/contact')).status, 405);
});
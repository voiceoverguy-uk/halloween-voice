(function () {
  'use strict';

  let currentAudio = null;
  let currentPlayBtn = null;

  const playSVG = '<svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg>';
  const pauseSVG = '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="4" height="18"/><rect x="15" y="3" width="4" height="18"/></svg>';

  function formatTime(s) {
    if (isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function createAudioCard(demo) {
    const card = document.createElement('div');
    card.className = 'demo-card';

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = demo.file;

    card.innerHTML =
      '<h3>' + demo.title + '</h3>' +
      '<p class="demo-desc">' + demo.description + '</p>' +
      '<div class="audio-player">' +
        '<button class="audio-play-btn" aria-label="Play ' + demo.title + '">' + playSVG + '</button>' +
        '<div class="audio-progress-wrap">' +
          '<div class="audio-progress"><div class="audio-progress-bar"></div></div>' +
          '<span class="audio-time">0:00</span>' +
        '</div>' +
      '</div>';

    const playBtn = card.querySelector('.audio-play-btn');
    const progressBar = card.querySelector('.audio-progress-bar');
    const progressWrap = card.querySelector('.audio-progress');
    const timeDisplay = card.querySelector('.audio-time');

    playBtn.addEventListener('click', function () {
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        if (currentPlayBtn) currentPlayBtn.innerHTML = playSVG;
      }

      if (audio.paused) {
        audio.play().then(function () {
          playBtn.innerHTML = pauseSVG;
          currentAudio = audio;
          currentPlayBtn = playBtn;
        }).catch(function (err) {
          console.warn('Playback failed:', err.message);
        });
      } else {
        audio.pause();
        playBtn.innerHTML = playSVG;
      }
    });

    audio.addEventListener('timeupdate', function () {
      if (audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        progressBar.style.width = pct + '%';
        timeDisplay.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
      }
    });

    audio.addEventListener('loadedmetadata', function () {
      timeDisplay.textContent = '0:00 / ' + formatTime(audio.duration);
    });

    audio.addEventListener('ended', function () {
      playBtn.innerHTML = playSVG;
      progressBar.style.width = '0%';
      currentAudio = null;
      currentPlayBtn = null;
    });

    progressWrap.addEventListener('click', function (e) {
      if (audio.duration) {
        const rect = progressWrap.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pct * audio.duration;
      }
    });

    return card;
  }

  function loadDemos() {
    fetch('/data/demos.json')
      .then(function (res) { return res.json(); })
      .then(function (demos) {
        var grid = document.getElementById('demosGrid');
        demos.forEach(function (demo) {
          grid.appendChild(createAudioCard(demo));
        });

        var arabellaCard = document.getElementById('arabellaDemoCard');
        if (arabellaCard) {
          arabellaCard.appendChild(createAudioCard({
            title: 'Arabella – Creepy Child Voice',
            description: 'Unsettling, atmospheric child character',
            file: '/audio/spooky-showreel-26-guy-harris.mp3'
          }));
        }
      })
      .catch(function (err) {
        console.error('Failed to load demos:', err);
      });
  }

  function getYouTubeId(url) {
    var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  function createVideoCard(video) {
    var card = document.createElement('div');
    card.className = 'video-card';

    var id = getYouTubeId(video.url);
    var thumbUrl = 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg';

    card.innerHTML =
      '<div class="lite-youtube" data-id="' + id + '">' +
        '<img src="' + thumbUrl + '" alt="' + (video.title || 'Video') + '" loading="lazy">' +
        '<div class="play-overlay"><svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21"/></svg></div>' +
      '</div>' +
      (video.title ? '<div class="video-card-title">' + video.title + '</div>' : '');

    var liteYt = card.querySelector('.lite-youtube');
    liteYt.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = video.title || 'YouTube video';
      liteYt.innerHTML = '';
      liteYt.appendChild(iframe);
    });

    return card;
  }

  function loadVideos() {
    fetch('/data/videos.json')
      .then(function (res) { return res.json(); })
      .then(function (videos) {
        var grid = document.getElementById('videosGrid');
        videos.forEach(function (video) {
          grid.appendChild(createVideoCard(video));
        });
      })
      .catch(function (err) {
        console.error('Failed to load videos:', err);
      });
  }

  function initNav() {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');

    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });

    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
      }
    });
  }

  function initContactForm() {
    var form = document.getElementById('contactForm');
    var status = document.getElementById('formStatus');
    var submitBtn = document.getElementById('contactSubmit');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      status.className = 'form-status';
      status.textContent = '';

      var data = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        company: form.company.value.trim(),
        message: form.message.value.trim(),
        website: form.website.value
      };

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (res) { return res.json(); })
        .then(function (result) {
          if (result.success) {
            status.className = 'form-status success';
            status.textContent = result.message;
            form.reset();
          } else {
            status.className = 'form-status error';
            status.textContent = result.error || 'Something went wrong.';
          }
        })
        .catch(function () {
          status.className = 'form-status error';
          status.textContent = 'Network error. Please try again.';
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Enquiry';
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    loadDemos();
    loadVideos();
    initContactForm();
  });
})();

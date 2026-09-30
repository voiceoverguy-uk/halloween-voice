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

  function initAudioCard(card) {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = card.dataset.audioSrc;

    const playBtn = card.querySelector('.audio-play-btn');
    const progressBar = card.querySelector('.audio-progress-bar');
    const progressWrap = card.querySelector('.audio-progress');
    const timeDisplay = card.querySelector('.audio-time');

    playBtn.addEventListener('click', function () {
      if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        if (currentPlayBtn) currentPlayBtn.innerHTML = playSVG;
      }
      if (activeVideoEl) {
        resetVideo(activeVideoEl);
        activeVideoEl = null;
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

    card.classList.add('media-ready');
  }

  function initDemos() {
    document.querySelectorAll('.demo-card[data-audio-src]').forEach(initAudioCard);
  }

  function getYouTubeId(url) {
    var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  var activeVideoEl = null;
  var posterMarkup = new WeakMap();

  function resetVideo(liteYt) {
    liteYt.innerHTML = posterMarkup.get(liteYt);
  }

  function initVideoCard(liteYt) {
    var id = liteYt.dataset.id;
    liteYt.addEventListener('click', function (event) {
      if (!event.target.closest('.video-trigger')) return;
      if (activeVideoEl && activeVideoEl !== liteYt) {
        resetVideo(activeVideoEl);
      }
      if (activeVideoEl === liteYt) return;
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        if (currentPlayBtn) currentPlayBtn.innerHTML = playSVG;
        currentAudio = null;
        currentPlayBtn = null;
      }
      posterMarkup.set(liteYt, liteYt.innerHTML);
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      iframe.title = liteYt.dataset.title || 'YouTube video';
      liteYt.innerHTML = '';
      liteYt.appendChild(iframe);
      activeVideoEl = liteYt;
    });

    liteYt.closest('.video-card').classList.add('video-ready');
  }

  function initVideos() {
    document.querySelectorAll('#videosGrid .lite-youtube').forEach(initVideoCard);
  }

  function initNav() {
    var toggle = document.getElementById('navToggle');
    var links = document.getElementById('navLinks');

    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(links.classList.contains('open')));
    });

    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    var navAnchors = links.querySelectorAll('a[href^="#"]');
    var sections = [];
    navAnchors.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      var el = document.getElementById(id);
      if (el) sections.push({ link: a, el: el });
    });

    var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;

    function setActive() {
      var scrollY = window.scrollY + navH + 40;
      var current = null;
      sections.forEach(function (s) {
        if (s.el.offsetTop <= scrollY) current = s;
      });
      navAnchors.forEach(function (a) { a.classList.remove('active'); });
      if (current) current.link.classList.add('active');
    }

    window.addEventListener('scroll', setActive, { passive: true });
    setActive();
  }

  function initContactForm() {
    var form = document.getElementById('contactForm');
    var status = document.getElementById('formStatus');
    var submitBtn = document.getElementById('contactSubmit');
    var messageEl = document.getElementById('contactMessage');
    var charNum = document.getElementById('charNum');
    var charCount = document.getElementById('charCount');
    var minChars = 40;

    submitBtn.disabled = true;

    messageEl.addEventListener('input', function () {
      var len = messageEl.value.length;
      charNum.textContent = len;
      if (len >= minChars) {
        charCount.classList.add('met');
        submitBtn.disabled = false;
      } else {
        charCount.classList.remove('met');
        submitBtn.disabled = true;
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var hp = form.website ? form.website.value : '';
      if (hp) return;

      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var company = form.company.value.trim();
      var message = form.message.value.trim();

      if (!name || !email || !message || message.length < 40) {
        status.className = 'form-status error';
        status.textContent = 'Please fill in all required fields (message must be at least 40 characters).';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      status.className = 'form-status';
      status.textContent = '';

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, company: company, message: message, website: hp })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.ok) {
            var now = new Date();
            var hour = now.getHours();
            var day = now.getDay();
            var greeting;
            if (day === 5 && hour >= 18) {
              greeting = 'Have a spooky evening and weekend';
            } else if (hour >= 0 && hour < 12) {
              greeting = 'Have a spooky morning';
            } else if (hour >= 12 && hour < 18) {
              greeting = 'Have a spooky afternoon';
            } else {
              greeting = 'Have a spooky evening';
            }
            status.className = 'form-status success';
            status.innerHTML = 'Thank you, Guy will respond, usually within a few hours.<br><span class="form-greeting">' + greeting + '</span>';
            form.reset();
            charNum.textContent = '0';
            charCount.classList.remove('met');
          } else {
            status.className = 'form-status error';
            status.textContent = data.error || 'Something went wrong. Please try again.';
          }
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Enquiry';
        })
        .catch(function () {
          status.className = 'form-status error';
          status.textContent = 'Network error. Please check your connection and try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Enquiry';
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initNav();
    initDemos();
    initVideos();
    initContactForm();
    function initStandaloneVideo(el) {
      if (!el) return;
      el.addEventListener('click', function (event) {
        if (!event.target.closest('.video-trigger')) return;
        if (activeVideoEl && activeVideoEl !== el) {
          resetVideo(activeVideoEl);
        }
        if (activeVideoEl === el) return;
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          if (currentPlayBtn) currentPlayBtn.innerHTML = playSVG;
          currentAudio = null;
          currentPlayBtn = null;
        }
        posterMarkup.set(el, el.innerHTML);
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.youtube.com/embed/' + el.dataset.id + '?autoplay=1';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.allowFullscreen = true;
        iframe.style.cssText = 'width:100%;height:100%;border:none;position:absolute;top:0;left:0;';
        iframe.title = el.dataset.title || 'Video';
        el.style.position = 'relative';
        el.innerHTML = '';
        el.appendChild(iframe);
        activeVideoEl = el;
      });
      el.closest('.laughs-video-item').classList.add('video-ready');
    }
    initStandaloneVideo(document.querySelector('.laughs-yt'));
    initStandaloneVideo(document.querySelector('.laughs-yt2'));
    var reviewsText = document.getElementById('reviewsText');
    var reviewStars = document.getElementById('reviewStars');
    function strongNumber(value) {
      var strong = document.createElement('strong');
      strong.textContent = value;
      return strong;
    }
    function renderReviews(data) {
      if (!reviewsText || !reviewStars) return;
      reviewStars.hidden = true;
      reviewsText.textContent = 'VoiceoverGuy client reviews on Google are temporarily unavailable.';
      if (!data || (data.status !== 'fresh' && data.status !== 'stale') ||
          typeof data.rating !== 'number' || data.rating <= 0 || data.rating > 5 ||
          !Number.isSafeInteger(data.reviewCount) || data.reviewCount < 1) return;

      var parts = [];
      if (data.status === 'stale') {
        var checked = new Date(data.checkedAt);
        if (isNaN(checked.getTime())) return;
        var date = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London', day: 'numeric', month: 'long', year: 'numeric'
        }).format(checked);
        parts.push('Last verified ' + date + ': rated ');
      } else {
        parts.push('Rated ');
      }
      parts.push(strongNumber(data.rating.toFixed(1)), ' on Google by ',
        strongNumber(data.reviewCount), ' VoiceoverGuy clients');
      if (data.status === 'stale') parts.push(' (current Google data temporarily unavailable).');
      reviewsText.replaceChildren.apply(reviewsText, parts);
      reviewStars.hidden = data.rating !== 5;
    }
    fetch('/api/reviews')
      .then(function (res) { return res.json(); })
      .then(renderReviews)
      .catch(function () { renderReviews({ status: 'unavailable' }); });
  });
})();

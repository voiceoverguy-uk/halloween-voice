# HalloweenVoice.co.uk

## Overview
A modern, premium 1-page microsite for HalloweenVoice.co.uk — a professional Halloween voiceover service. Built with Node.js + Express, serving a static front-end with a server-side contact form powered by Resend.

## Project Architecture
- **Backend:** Node.js + Express (server.js) — serves static files + POST /api/contact endpoint
- **Frontend:** Static HTML/CSS/JS served from /public
- **Data:** JSON files in /data/ for demos and videos (data-driven content)
- **Contact:** Server-side email via Resend API with honeypot + rate limiting

## Folder Structure
```
/server.js              - Express server (static files + contact API)
/public/index.html      - Single-page site with anchored sections
/public/styles.css      - Full styling (dark theme, responsive)
/public/script.js       - Audio player, lite YouTube, contact form (fetch)
/public/audio/          - MP3 demo files
/public/images/         - Background images and brand assets
/public/sitemap.xml     - SEO sitemap
/public/robots.txt      - Crawler rules
/data/demos.json        - Demo card data (title, description, file)
/data/videos.json       - YouTube video data (title, url)
```

## Key Features
- Sticky nav with anchor links to 7 sections
- Audio demo cards loaded from demos.json (one-at-a-time playback)
- Lite YouTube embeds loaded from videos.json (one-at-a-time, iframe on click)
- Voice styles grid, Arabella feature section (with faint pumpkin background), credits/testimonials
- Contact form: server-side email via Resend, honeypot spam trap, rate limiting (5 req/15 min per IP), 40-char minimum message
- Full SEO meta tags, Open Graph, Twitter cards
- Mobile-first responsive design

## Environment Variables
- **RESEND_API_KEY** (secret, required) — Resend API key for sending contact emails
- **RESEND_FROM** (env var) — Sender address. Set to `VoiceoverGuy <noreply@voiceoverguy.co.uk>` (verified domain). Defaults to same if not set.

## Adding Content
- **New demo:** Upload MP3 to /public/audio/, add object to /data/demos.json
- **New video:** Add object with title and YouTube URL to /data/videos.json

## Branding
- Background: #0b0b10 (near-black)
- Primary accent: #d42027 (red)
- Secondary accent: #7c3aed (purple, used sparingly for glows)
- Text: off-white/light grey
- Font: Inter (Google Fonts)

## Recent Changes
- 2026-03-04: Switched contact form back to server-side Resend API (POST /api/contact) with rate limiting, honeypot, validation
- 2026-02-18: Moved Guy Harris credit between H1 and subtext, dynamic year count from 2000
- 2026-02-18: Added purple tapered divider between credit and description
- 2026-02-18: YouTube one-at-a-time playback + mutual exclusion with audio demos
- 2026-02-18: Updated Arabella demo to kiss-voxi-mobil-scary-child-voice-arabella-harris.mp3
- 2026-02-17: Initial build — all sections, styling, JS, server, data files

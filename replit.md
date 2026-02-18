# HalloweenVoice.co.uk

## Overview
A modern, premium 1-page microsite for HalloweenVoice.co.uk — a professional Halloween voiceover service. Built with Node.js + Express, serving a static front-end with an obfuscated mailto contact form.

## Project Architecture
- **Backend:** Node.js + Express (server.js) — serves static files only
- **Frontend:** Static HTML/CSS/JS served from /public
- **Data:** JSON files in /data/ for demos and videos (data-driven content)
- **Contact:** Obfuscated mailto: link (email assembled in JS to hide from scrapers)

## Folder Structure
```
/server.js              - Express server (static file serving)
/public/index.html      - Single-page site with anchored sections
/public/styles.css      - Full styling (dark theme, responsive)
/public/script.js       - Audio player, lite YouTube, contact form (mailto)
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
- Lite YouTube embeds loaded from videos.json (iframe on click)
- Voice styles grid, Arabella feature section (with faint pumpkin background), credits/testimonials
- Contact form with honeypot spam trap, obfuscated mailto (halloween@voiceoverguy.co.uk)
- Full SEO meta tags, Open Graph, Twitter cards
- Mobile-first responsive design

## Environment Variables Needed
- None required (mailto-based contact form)

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
- 2026-02-18: Switched contact form from server-side Resend/SMTP to obfuscated mailto
- 2026-02-18: Updated Arabella demo to kiss-voxi-mobil-scary-child-voice-arabella-harris.mp3
- 2026-02-18: Simplified server.js (removed contact API endpoint, rate limiting, email deps)
- 2026-02-17: Initial build — all sections, styling, JS, server, data files

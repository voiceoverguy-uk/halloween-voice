---
name: Google Maps mobile review verification
description: Distinguishing mobile browser test-harness limitations from actual Google reviews destination behavior.
---

When testing a Places API (New) `googleMapsLinks.reviewsUri`, do not interpret a mobile-emulated headless Chromium tap failing to create a `_blank` tab as either a broken link or a successful click test. Check the rendered href on the actual site and follow that href in a fresh signed-out mobile browser context; report the click limitation separately.

**Why:** Simulated mouse and touch inputs on a mobile-emulated headless Chromium page did not open a new tab, while navigating to that same rendered href in a clean mobile context displayed the business's existing reviews. Google Maps presented a limited mobile web view and an optional "Open app" prompt.

**How to apply:** For future Google Maps link checks, verify business identity and destination content independently of simulated mobile popup behavior. Do not claim native-device app handoff was tested when only headless emulation was available.
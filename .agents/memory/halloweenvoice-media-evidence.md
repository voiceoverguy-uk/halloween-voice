---
name: HalloweenVoice media evidence
description: Owner-approved interpretation of deferred video playback and acceptable publication-date evidence.
---

Keep the existing one-click video experience: no iframe or playback before deliberate poster activation, but playback may begin immediately after click or keyboard activation.

**Why:** The owner clarified that “no autoplay” prohibits pre-activation loading/playback, not user-initiated playback. Requiring a second click would unnecessarily change the approved experience.

**How to apply:** For future changes to the video poster or embedded player, preserve deferred loading and start playback only after intentional activation.

Never convert a provider-displayed calendar publication date into a fabricated exact upload time or timezone. An upload timestamp in structured data needs authoritative provider evidence; if a date-only value cannot pass the intended validation, omit it and disclose the eligibility limitation.

**Why:** The owner explicitly prefers missing optional discoverability over unsupported date claims; the original shared placeholder date had no per-video evidence.

**How to apply:** Recheck each video's own provider metadata before emitting `uploadDate`; retain evidence per value and do not derive times from file dates, site history, snippets or invented midnight.
# BollyHits Radio Network — Enhanced Player

A standalone, mobile-friendly, installable player with four AzuraCast stations, now-playing album art, Media Session metadata, listener count, track progress and optional bass/clarity EQ.

## Deploy
Upload all files together to a HTTPS web host, e.g. GitHub Pages. `index.html` is the entry point. No build step required. Keep the relative paths intact. This is a new standalone implementation, not a patch of the existing GitHub repository.

## Metadata
Media Session `title` = song title, `artist` = artist, `album` = `Station Name | N Listeners`, `artwork` = AzuraCast album art. Refresh every 15 seconds. Media Session next/previous switch stations. Actual CarPlay/Android Auto rendering depends on OS/browser; PWA alone does not install a native dashboard app.

## Progress
AzuraCast `now_playing.played_at` and `duration` drive the webpage progress bar and an optional `MediaSession.setPositionState` call. Radio is a live stream; vehicle displays may not show a progress bar. Progress is an estimate based on server timestamps and may differ from buffered audio latency. It does not make live audio seekable.

## Audio EQ / important CORS caveat
The optional Web Audio EQ is OFF by default to protect playback compatibility. It applies a low shelf at 95 Hz, presence at 2.8 kHz, and light dynamics compression. It cannot increase actual source bitrate or recover missing fidelity. **Critical:** MediaElementAudioSourceNode can produce silence for cross-origin audio without permissive CORS response headers. To use EQ reliably, configure every streaming server to return `Access-Control-Allow-Origin` for the website origin (or `*` where appropriate). For cross-origin EQ, add `audio.crossOrigin='anonymous'` **before** setting `audio.src` in app.js once your stream servers are configured for CORS. Without server CORS, leave enhancement unchecked; for safest compatibility you may also remove Web Audio setup entirely. Because a Web Audio source node persists once created, unchecking EQ only sets its gains to zero and does not bypass CORS restrictions.

## Known constraints
Station streams are discovered from the AzuraCast API's `station.listen_url`. If API CORS is blocked, stream URL discovery and metadata cannot work; the stream can be hard-coded from verified URLs in `STATIONS` if needed. Actual station names should be confirmed against the station API. The first station may be a third-party AzuraCast instance. The listener count is a current snapshot, not a fixed number. CarPlay and Android Auto may truncate the album field and may not display progress for a live stream.

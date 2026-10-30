# BollyHits + DesiZone Player v7

Includes four BollyHits stations and all three stations documented by DesiZone's API:
- DesiZone Radio (radio=1)
- Desi Hits 2000s (radio=2)
- Nostalgic Bollywood 90s (radio=3)

## Metadata
DesiZone uses GET https://desizoneradio.com/api/v1/playing?radio=1|2|3 with headers `x-api-key` and `x-device-platform`. This package uses a Node.js proxy so the API key is not exposed in frontend JavaScript. Song title, artist, album, art, duration and played timestamp are normalized to the BollyHits player format. The rotating third metadata line changes every 10 seconds. BollyHits: Album → Custom Field (only when non-empty) → Listeners → Station. The loop is 40 seconds when a custom field exists, otherwise 30 seconds. DesiZone: Album → Station (20-second loop). The fourth BollyHits station is displayed as Nadeem Shravan Melodies. Missing or blank custom fields are skipped entirely. DesiZone listener counts are not included.

## Setup (Ubuntu VPS)
1. Install Node.js 20+ (Node.js 22 recommended).
2. Extract ZIP to a new directory.
3. Configure your key as an environment variable: `export DESIZONE_API_KEY='YOUR_KEY_HERE'` (do not put it in HTML or commit it to Git).
4. Run `node server.js`. Reverse-proxy with nginx to HTTPS in production.
5. Add authorized **direct HTTPS audio stream URLs** to `DESIZONE_STREAMS` in `app.js`. The metadata endpoint does NOT provide audio stream URLs. Until configured, DesiZone metadata can display but its audio cannot play. Contact DesiZone for authorized URLs if needed.

## GitHub Pages
GitHub Pages is static hosting: it cannot execute `server.js` or keep a secret API key. To use GitHub Pages, deploy the proxy separately and change `./api/desizone-playing` in `app.js` to your proxy's HTTPS URL, with appropriate CORS controls. Do not publish your key in GitHub.

## Notes
CarPlay/Android Auto browser Media Session metadata and progress are best effort; vehicle UI may not rotate fields. Resume after calls is best effort. The earlier bass/voice UI is removed. The app still has four working BollyHits metadata endpoints; playback depends on the stations' stream availability.

Documentation: https://desizone-network-api.docs.buildwithfern.com/desi-zone-network-api-beta-documentation/playing/get-information-about-the-currently-playing-song

## v8 stream resilience
Automatic reconnect on audio errors, stream ending, and prolonged buffering (18 seconds); retries at 2, 4, 8, 15 and 30 seconds (capped). Stops retries when the user pauses or switches stations. iOS may still require a user tap after a call or browser suspension. Test on your own devices and confirm the stream server is healthy if dropouts continue.

## v9 station skip on CarPlay / Android Auto
- Previous-track and next-track Media Session actions change radio stations, wrapping around the list.
- Removed seek backward/forward actions where supported; the website buttons show ⏮ and ⏭.
- iOS/Android vehicle UIs choose their own controls and may still display 10-second seek buttons or not expose skip controls for web streams. This cannot be forced from a website. A native CarPlay/Android Auto app is needed for predictable vehicle UI.
- Cache version bumped to v9 to prevent old JavaScript persisting after deployment.

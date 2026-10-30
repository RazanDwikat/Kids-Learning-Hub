# Optional demo

The narrated app walkthrough is available at:
https://drive.google.com/file/d/1i21QSDuVHp4lJEj1QpC_zUCvFuciONcm/view?usp=sharing

A clean checkout shows that link. The historical locally generated recording is
not distributed with this repository; no upload, download, or permission change
on the Drive file is performed by this app.

To embed a recording you have the rights to distribute, provide a directly
playable HTTPS URL as `VITE_DEMO_VIDEO_URL` at build time (for example in this
package's `.env.local`). Google Drive sharing links are not direct media URLs.
The HTML video element supplies play/pause, seeking, volume and fullscreen
controls. Playback errors leave the Drive link available. No host message bridge
or iframe parent is needed.

Run `pnpm --filter @workspace/little-sprout-demo dev` and open
http://localhost:5173/little-sprout-demo/. Its build is served at
`/little-sprout-demo/` by the production Node server. The earlier animated scene
sources and product images remain available for editing, but are not the
recorded walkthrough and are not mounted by the demo.

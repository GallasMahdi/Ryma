# Digital Clinic / kiné walkthrough

- `kine-walkthrough.mp4`: 54 seconds, 1920×1080, 30 fps, H.264, no audio. English captions are burned in.
- `preview.html`: local review player with chapter navigation, frame stepping, scrubbing, playback speed, and timestamped feedback saved in browser storage. Export or copy notes to share them in Codex.
- `chapters.json`: section timings, captions, callouts and source screen mapping.
- `captions.srt`: editable English headline captions with section timings.
- `screens/`: screenshots captured from the existing app's English interface.
- `render.py`: reproducible Pillow/FFmpeg animation renderer. FFmpeg is provided by the workspace-local `tools/imageio_ffmpeg` package.

## Open the review player

Run `node serve.cjs` from this folder, then open http://127.0.0.1:4173. You can also open `preview.html` directly in a browser alongside the MP4.

## Render again

Use Python with Pillow installed: `python render.py --stills` to create preview frames, then `python render.py` for the MP4. This Windows renderer uses Segoe UI fonts from `C:/Windows/Fonts`.

## Capture provenance

Screens were captured from the local app on 18 September 2026 at a 1600×900 viewport. Existing app branding is Digital Clinic. The story follows the public service catalog, Global Postural Reeducation, date selection, time selection, patient information, and confirmation.

Booking availability and the booking POST response were intercepted in the isolated capture browser. Patient details are fictional. No appointment was submitted to the backend and no email was sent. Confirmation text is the app's own UI and is marked as a simulated demo in the video. These are animated screen captures with cursor and highlight overlays, not an unedited real-time screen recording.

No application source files were edited for the video.

# How to Record the Demo Video — Step by Step

Simple English guide. Follow the steps in order. Total time needed: about 20–30 minutes.

**Goal:** a short video (45–50 seconds) showing the app working, especially the
AUTHENTIC vs TAMPERED moment — that is the most important part.

---

## Step 0 — Before you touch the record button

Do these once, so the recording goes smoothly and you don't need to redo it:

1. **Close everything you don't need.** Close other browser tabs, chat apps, notifications — anything
   that could pop up on screen while recording.
2. **Make your browser window big and text readable.** Press `Ctrl` and `+` in the browser a few
   times to zoom in to about **110–125%**, so text is readable on a projector.
3. **Reset the blockchain to a clean state**, so the demo isn't cluttered with old test data:
   ```powershell
   cd evidencechain
   # stop the old node (Ctrl+C in its terminal, or close that terminal window)
   npm run node        # start it fresh, in its own terminal — leave this running
   npm run deploy       # in a second terminal
   npm run seed          # same terminal, right after deploy
   npm run frontend      # in a third terminal — leave this running
   ```
4. Open **http://localhost:8080** and click through the tabs once *without recording*, just to
   make sure everything loads and nothing is broken.
5. Decide who is doing the clicking (doesn't have to be the same person narrating in the final
   presentation — you can record silently and narrate live during the actual talk).

---

## Step 1 — Choose your recording tool

Pick **one** of these (all are free and already on Windows, except OBS):

| Tool | How to start it | Best for |
|---|---|---|
| **Xbox Game Bar** (built into Windows) | Press `Win + G` to open it, then `Win + Alt + R` to start/stop recording | Easiest, fastest, good enough for this |
| **PowerPoint's own recorder** | In PowerPoint: `Insert → Screen Recording` | Convenient if you're building slides at the same time |
| **OBS Studio** (free download) | Install it, then click "Start Recording" | Best quality, but takes longer to set up |

**Recommendation: use Xbox Game Bar.** It's already on your computer and takes 30 seconds to learn.

---

## Step 2 — Do a practice run first (don't record yet)

Walk through the exact 7 actions below **once without recording**, so you know the timing and
nothing surprises you:

1. Act as **Det. Perera** → Register tab → pick `suspect_chat_log.txt` → Case ID `CASE-2026-021` →
   click **Register**.
2. Still as Det. Perera → Transfer tab → pick evidence **#2** → choose **Magistrate Court** as
   recipient → note "Submitted for hearing" → click **Request Transfer**.
3. Switch "Act as" to **Magistrate Court** → Dashboard tab → find the Incoming Transfer → click
   **Accept**.
4. Switch "Act as" to **Public / Outsider** → Verify tab → Evidence ID `2` → pick the *original*
   `suspect_chat_log.txt` → click **Verify** → confirm it shows green **AUTHENTIC**.
5. Same tab → pick `suspect_chat_log_TAMPERED.txt` instead → click **Verify** again → confirm it
   shows red **TAMPERED**.
6. Switch "Act as" back to **Magistrate Court** → Verify tab → Evidence ID `2` → original file →
   click **Verify**, then click **Admit as Evidence**.
7. History tab → Evidence ID `2` → show the full timeline.

If anything goes wrong (a button doesn't work, a wrong file was picked), **reset the chain again**
(Step 0.3) and try the practice run once more before recording for real.

---

## Step 3 — Record the real take

1. Start your recording tool (Step 1).
2. Move your mouse **slowly and deliberately** — fast, jittery mouse movement is hard to follow on
   a projector.
3. Perform the same 7 actions from Step 2, in the same order.
4. Pause your mouse for about 1 second on the **AUTHENTIC** and **TAMPERED** panels — this is the
   single most important moment of the whole video, give it room to be seen clearly.
5. Stop the recording once Step 7 (History tab) is fully visible.
6. **No audio narration is needed in the video** — during the real presentation, a team member
   talks over the muted video instead. This makes it much easier to re-record just the audio
   later if you make a mistake speaking, without re-recording the whole screen.

**Aim for about 90 seconds of raw footage.** It's much easier to trim a slightly-too-long video
than to pad a too-short one.

---

## Step 4 — Trim it down to 45–50 seconds

Your raw recording is probably around 90 seconds. Use **Clipchamp** (already built into Windows —
search "Clipchamp" in the Start menu):

1. Open Clipchamp → **Create a new video** → import your recording.
2. Drag the clip onto the timeline.
3. Cut out any dead time: long pauses, mistakes, or slow parts (right-click → Split, then delete
   the slow section).
4. If it's still too long after cutting, select the clip and **speed it up slightly** (1.1x–1.3x)
   using the speed control — this is a normal trick and looks fine at this speed.
5. Export/download the result as an `.mp4` file, at **1080p** if possible.

---

## Step 5 — Save it in the right place

Save the final file as exactly:

```
presentation/demo_video.mp4
```

(This exact name and location is what the presentation guide and the .pptx expect.)

---

## Step 6 — Take backup screenshots too

Videos sometimes fail to play on an unfamiliar computer or projector at the venue. As a safety
net, take these 7 screenshots too (press `Win + Shift + S` to snip your screen), and save them
with **these exact file names** in `presentation/screenshots/`:

| File name | What to capture |
|---|---|
| `01_dashboard.png` | Dashboard tab showing both evidence rows |
| `02_register.png` | Register tab with the computed hash visible |
| `03_incoming_transfer.png` | Court's incoming transfer, with Accept/Reject buttons visible |
| `04_verify_authentic.png` | The green AUTHENTIC result panel |
| `05_verify_tampered.png` | The red TAMPERED result panel, with both hashes visible |
| `06_timeline.png` | The custody timeline for evidence #2 |
| `07_tests_passing.png` | A terminal window showing `25 passing` after `npm test` |

---

## Quick checklist before you consider this done

- [ ] `demo_video.mp4` is 45–50 seconds long
- [ ] It clearly shows the green AUTHENTIC and red TAMPERED moments
- [ ] It's saved at `presentation/demo_video.mp4`
- [ ] All 7 screenshots exist with the exact file names above
- [ ] You tested that the video actually plays (double-click it) before moving on

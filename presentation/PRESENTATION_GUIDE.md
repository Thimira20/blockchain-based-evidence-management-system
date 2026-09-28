# How to Build and Deliver the Presentation — Step by Step

Simple English guide for making `GP_XX_EvidenceChain.pptx` and presenting it well.

---

## Part A — What you already have

A **starter PowerPoint file** has been generated for you (or is being generated) with:
- All 6 slides + 1 hidden backup slide, already laid out
- The dark navy / teal colour theme
- The architecture and flow diagrams already drawn
- Speaker notes on every slide (copied from `speaker_script.md`)
- Placeholder boxes where your screenshots and video will go, clearly labelled like `[04_verify_authentic.png]`

**Your job is to finish it, not build it from scratch.** Here's what's left to do.

---

## Part B — Fill in your team's details (5 minutes)

Open the `.pptx` file in PowerPoint and:

1. On **Slide 1**, replace:
   - `[Group XX]` with your real group number (from the Google Sheet the coordinator shared)
   - `[Member 1 Name]`, `[Reg No]`, etc. with your team's real names and registration numbers
2. Rename the file itself from `GP_XX_EvidenceChain.pptx` to your real group number, e.g.
   `GP_14_EvidenceChain.pptx`.
3. Check the footer on every slide says the right group number too (`EC8204 · Group XX · EvidenceChain`).

---

## Part C — Add your screenshots (5 minutes)

Once you've followed `RECORDING_GUIDE.md` and have your 7 screenshots saved in
`presentation/screenshots/`:

1. Go to each placeholder box in the slides (Slide 5's hidden backup slide uses
   `04_verify_authentic.png` and `05_verify_tampered.png` side by side).
2. Delete the placeholder box.
3. `Insert → Pictures → This Device` and pick the matching screenshot.
4. Resize/position it to roughly fill the space the placeholder used.

---

## Part D — Embed the demo video (5 minutes)

This step must be done **manually in PowerPoint** — it's more reliable than anything auto-generated:

1. Go to **Slide 5 (Live Demo)**.
2. `Insert → Video → This Device` → pick `presentation/demo_video.mp4`.
3. Click the video once it's inserted → a **Playback** tab appears in the ribbon.
4. Set **Start: Automatically** (so it plays the moment you reach this slide — no clicking needed
   mid-presentation).
5. Resize it to fill most of the slide width.
6. Click Slide Show (`F5`) and jump to Slide 5 to test that it actually plays.

---

## Part E — Rehearse (this matters more than the slides)

1. **Time yourselves out loud, at least 3 times**, with a phone timer running. Target **2:50**,
   because going past 3:00 loses marks.
2. Practice the **hand-offs** between speakers — who talks after whom should feel smooth, not
   awkward. See the bridge-line tip in `speaker_script.md`.
3. Test the file on a **different computer** if you can (a friend's laptop, a lab PC) — fonts and
   video playback sometimes behave differently on another machine. Fix any issues *before* the
   real presentation, not during it.
4. Prepare for likely questions — they're already listed at the bottom of `speaker_script.md`'s
   companion section below.

---

## Part F — How to explain the project if someone asks a question

Keep answers **short, honest, and confident**. Here are simple-English answers to the questions
examiners usually ask:

**"Why not just store the whole file on the blockchain?"**
> "Files can be large and blockchains are expensive to store data on. A fingerprint — the hash —
> is tiny and does the exact same job: proving the file hasn't changed."

**"What if the investigator registers a fake file from the start?"**
> "That's a real limitation we're honest about. Blockchain only proves a file hasn't changed
> *after* it's registered — it can't prove the very first copy was genuine. In real life, that
> gap is closed with strict collection rules, like two officers present when evidence is first
> collected."

**"Why use Ethereum and not a private company blockchain?"**
> "For this demo we used a free local Ethereum network to keep it simple and cost-free. In a real
> deployment, we'd use a permissioned network — like Hyperledger Besu — built specifically so
> police, labs, and courts can share one trusted system."

**"How do you stop someone pretending to be an investigator?"**
> "Only the Admin can add new people to the system, and every action is signed using that
> person's own private key — like a password only they know. Nobody can act as someone else."

**"Why SHA-256 specifically?"**
> "It's the same hashing standard used by real forensic tools like FTK and EnCase, and by the
> `sha256sum` command built into most operating systems. It's proven, fast, and free."

---

## Part G — Final submission checklist

- [ ] All tests pass (`npm test` → 25 passing) and the coverage number is on Slide 6
- [ ] `README.md` lets a teammate run the project from scratch
- [ ] `demo_video.mp4` is 45–50 seconds and clearly shows AUTHENTIC vs TAMPERED
- [ ] All 7 screenshots exist with the exact required names
- [ ] The `.pptx` has your real group number, real names, screenshots, and the embedded video
- [ ] You've rehearsed at least 3 times and are comfortably under 3:00
- [ ] Upload `GP_XX_EvidenceChain.pptx` to ELMS by **29/09/2026**

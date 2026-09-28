# EvidenceChain — Speaker Script (3 minutes, 4 speakers)

**Simple English version.** Read it out loud a few times before you try to memorise it — it's fine to
say it in your own words once you understand it. The goal is to sound natural, not to recite.

**Total target time: 2 minutes 50 seconds** (leave 10 seconds of safety before the 3:00 limit).

**Who says what:**
| Speaker | Slides | Time |
|---|---|---|
| **Member 1** | Slide 1 (Title) + Slide 2 (Problem) | 40 s |
| **Member 2** | Slide 3 (Our Solution) | 40 s |
| **Member 3** | Slide 4 (How it Works) + Slide 5 (Live Demo) | 75 s |
| **Member 4** | Slide 6 (Benefits & Conclusion) + Questions | 25 s + Q&A |

Replace `[Member 1 Name]`, `[Reg No]`, `[Group XX]` with your real details before you submit.

---

## SLIDE 1 — Title (10 seconds) — Member 1

> "Good morning / good afternoon everyone. We are Group [XX]. My name is [Member 1 Name], and with me are [Member 2 Name], [Member 3 Name], and [Member 4 Name]. Today we will present our project: **EvidenceChain** — using blockchain to protect digital evidence."

*(~35 words. Speak slowly and clearly here — this is the first impression.)*

---

## SLIDE 2 — The Problem (30 seconds) — Member 1

> "Let's start with a real problem. When police collect digital evidence — like a chat log or a server log — it passes through many hands: the investigator, the lab, the evidence room, and finally the court.
>
> Each handover today is written on paper, or saved in a normal database. And that is the problem — paper can be lost. A database can be quietly edited by one single person, and nobody would know.
>
> If a lawyer can prove the evidence *might* have been changed, the court may reject it completely — even if it is real. We built EvidenceChain to close this gap."

*(~85 words, ~35 seconds — slightly over, trim if needed by cutting the last sentence.)*

---

## SLIDE 3 — Our Solution & Architecture (40 seconds) — Member 2

> "Our idea is simple: **put the fingerprint on the blockchain, keep the file at home.**
>
> When evidence is collected, we calculate a SHA-256 hash — think of it as a unique fingerprint for that exact file. Only this fingerprint goes onto the blockchain. The real file never leaves the investigator's computer, so it stays private and the system stays fast.
>
> Every single handover needs **two steps**: the holder *requests* a transfer, and the receiver must *accept* it. This means nobody can fake a handover, and nobody can be forced to accept evidence they never agreed to receive.
>
> Only people added by the Admin — Investigators, Analysts, Custodians, and the Court — can act in the system. And anyone at all — even the public — can check if a file is genuine.
>
> We built this using Solidity, Hardhat, and Ethers.js, running on a local Ethereum network."

*(~150 words — this is longer than the 95-word guide; trim to the highlighted core sentences if you're going over time. Priority sentences: fingerprint on-chain, two-step transfer, role-based access, anyone can verify.)*

---

## SLIDE 4 — How It Works (25 seconds) — Member 3

> "Here is the full journey of one piece of evidence, in five steps.
>
> First, the Investigator **collects and registers** it — this creates the fingerprint. Second, the holder **requests a transfer** to the next person. Third, that person must **accept** it — now it's officially theirs. Fourth, **anyone** can verify the file at any time, just by comparing hashes. And fifth, the Court gives the final **admit** — the evidence is now locked in as proof.
>
> One small change in the file, even one letter, gives a completely different fingerprint. That's what makes tampering impossible to hide."

*(~90 words — trim the last sentence if you're running long; it also appears again on Slide 5.)*

---

## SLIDE 5 — Live Demo (50 seconds) — Member 3

*(Play the demo video / walk through the live app while saying this.)*

> "Now let's see it in action. Det. Perera, our investigator, registers a suspect's chat log. Watch — the hash is calculated right there in the browser, instantly.
>
> He sends it to the Magistrate Court for the hearing. Notice the status says 'pending' — the transfer isn't done yet. The Court now accepts it — only then does the handover complete.
>
> Now anyone — even someone with no special role — can check this file. We verify it with the original chat log... and it shows **green, AUTHENTIC**.
>
> Now watch what happens if we check the *tampered* copy instead — the one where we secretly changed one timestamp. It shows **red, TAMPERED** — instantly caught.
>
> Finally, the Court confirms it's genuine and clicks **Admit**. And on the History tab, we can see the complete, permanent timeline of everything that just happened."

*(~150 words — this is a guide; adjust pacing live to match what's actually happening on screen. If the video runs shorter, slow down slightly; if longer, speak a little faster or trim the last sentence.)*

---

## SLIDE 6 — Security Benefits, Limitations & Conclusion (25 seconds) — Member 4

> "So what does EvidenceChain actually give us? Four things: **integrity** — we can always detect tampering. **Proof of who did what** — every action is signed and permanent. **Access control** — only approved people can act. And **privacy** — the file itself never touches the blockchain.
>
> But we're honest about the limits too: blockchain only protects a file *after* it is registered — it cannot prove the very first version was genuine. For a real deployment, we would use a permissioned network like Hyperledger Besu, built for police, labs, and courts to share.
>
> Our tests: 25 out of 25 passing, with 100% code coverage. Thank you — we're happy to take your questions."

*(~110 words — trim the limitations sentence if you're short on time; keep the "thank you" line, it's your closing cue.)*

---

## Tips for delivering this well (simple advice)

1. **Don't read word-for-word from paper.** Learn the *idea* of each sentence, then say it in your own natural words. It sounds much more confident.
2. **Practice out loud, not just in your head**, at least 3 times, with a timer running.
3. **Look at the audience, not the screen.** Glance at the slide only to remind yourself what's next.
4. **Speak slower than feels natural.** Nervous speakers speed up without noticing — a timer will keep you honest.
5. **If you forget a word, keep going.** Don't stop and restart — the audience won't notice a small skip, but they will notice a long pause.
6. **Hand-offs between speakers:** end your part with a short bridge line, e.g. *"...and now [Next Member] will show you exactly how it works."* This makes the whole team look coordinated.

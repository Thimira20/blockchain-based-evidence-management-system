# Learn EvidenceChain — A Simple Guide for Beginners

This file explains the whole project in **simple English**. No blockchain knowledge needed.
Read it top to bottom, in order. Each part builds on the one before it.

---

## 1. What is this project, in one sentence?

**EvidenceChain is a website that keeps a permanent, tamper-proof diary of who touched a piece of digital evidence (a file), and when — using blockchain.**

Think of it like a **security camera that records every time someone picks up a piece of evidence**, but instead of video, it records: *who*, *what*, *when*, and it can **never be edited or deleted** by anyone — not even by the police, the admin, or us.

---

## 2. The real-world problem we are solving

Imagine the police collect a suspect's chat log as evidence for a court case.

- The chat log gets saved on a police laptop.
- It is copied to a USB drive and given to a forensic analyst.
- The analyst copies it again and gives it to the court.

At every step, two bad things could happen:
1. **Someone changes the file** (deletes a message, edits a timestamp) — and nobody can prove it happened.
2. **Someone lies about a handover** — "I gave it to him on Monday" / "No you didn't, I never got it" — and there's no proof either way.

Normally, this is tracked with **paper forms** or a **database**. Both can be edited or lost. If a defence lawyer in court can show *"we cannot fully trust this evidence's history,"* the evidence might get thrown out — even if it's real.

**EvidenceChain fixes this** by recording every handover on a blockchain, which nobody can secretly edit.

---

## 3. What is a "blockchain"? (in plain words)

A blockchain is a **shared notebook** that:
- Anyone can **write a new line into** (if they're allowed to).
- **Nobody can erase or edit** an old line, ever — not even the person who wrote it.
- Everyone with access can **read every line**, including the full history.

That's it. That's the whole idea. It's called a "chain" because every new entry is cryptographically locked to the one before it — like a padlock chained to the previous padlock — so if you tried to sneak in and change an old line, every lock after it would visibly break.

For this project, we use a **private practice blockchain** running on your own laptop (called "Hardhat"), not the real public Ethereum network. It behaves exactly like real Ethereum, but:
- It's free (no real money involved).
- It's instant (no waiting for confirmations).
- Only your computer can see it (perfect and safe for a student project/demo).

---

## 4. What is a "smart contract"? (in plain words)

A **smart contract** is a small program that lives *inside* the blockchain notebook. It's not just data — it's **data + rules**, and the rules **cannot be broken**, not even by the person who wrote the contract.

Example rules in our contract:
- "Only the Admin can add new investigators." No exceptions, enforced by code.
- "Evidence can only move to a new holder if that holder *agrees to accept it*." No exceptions.
- "The exact same file can never be registered twice." No exceptions.

Our smart contract is written in a language called **Solidity**, and it lives in one file:
[`evidencechain/contracts/EvidenceChain.sol`](evidencechain/contracts/EvidenceChain.sol)

Think of the smart contract as **the rulebook + the notebook, combined, that nobody can cheat.**

---

## 5. What is "hashing" — and why is it the heart of this project?

A **hash** is like a **fingerprint for a file**. You feed a file into a hashing formula (we use one called **SHA-256**), and it spits out a fixed-length code, like:

```
0x9d9078e6b102fcda53309abca3d616f4513c4470d209f4c5e7e32b96a0a41c13
```

Three important facts about hashes:
1. **The same file always produces the exact same hash.** Every time, on every computer.
2. **Changing even ONE character** in the file produces a **completely different** hash. Not a "similar" hash — a totally different one.
3. **You cannot reverse a hash back into the file.** It only works one way (file → hash), which is why it's safe to share the hash publicly.

**This is the trick that makes the whole project work:**
- When evidence is collected, we compute its hash and store **only the hash** on the blockchain — never the actual file (files can be huge and private; hashes are tiny and safe to share).
- Later, anyone can take the file, compute its hash again, and **compare it to the hash stored on the blockchain.**
  - Hashes match → the file is **exactly** the same as when it was collected → ✅ **AUTHENTIC**.
  - Hashes don't match, even by one letter → the file was changed → ❌ **TAMPERED**.

This is why the presentation likes to say: *"one changed character gives a completely different hash."* Try it yourself: [`sample-evidence/suspect_chat_log.txt`](evidencechain/sample-evidence/suspect_chat_log.txt) and [`sample-evidence/suspect_chat_log_TAMPERED.txt`](evidencechain/sample-evidence/suspect_chat_log_TAMPERED.txt) are identical except one timestamp (`23:14` → `21:14`) — their hashes are completely different.

---

## 6. The five kinds of people (roles) in this system

| Role | Real-life example | What they're allowed to do |
|---|---|---|
| **Admin** | IT manager at the police department | Add new people to the system, or remove (deactivate) them |
| **Investigator** | Det. Perera | Register new evidence for the very first time; hand it off; accept handovers |
| **Analyst** | Forensic Analyst Silva | Accept evidence; hand it off to someone else |
| **Custodian** | Evidence Room Officer | Accept evidence; hand it off to someone else |
| **Court** | Magistrate Court | Accept evidence; hand it off; and the special power — **admit evidence** (the final "this is proven genuine" stamp) |
| *(no role)* | A random member of the public, or a defence lawyer | Cannot register or hold evidence, but **can always check if a file is authentic** and **read the full history** — this is on purpose, so anyone can double-check the system is honest |

**Important:** the Admin is *not* automatically an investigator or any other role. The Admin's only power is managing who's allowed in the system — like a security guard who checks ID badges but doesn't do the police work themselves. This is a security best-practice called **separation of duties**.

---

## 7. The life story of one piece of evidence — step by step

Let's follow one file from start to finish, exactly how our smart contract enforces it:

```
1. Det. Perera collects a suspect's chat log.
   → He opens the website, picks the file. The BROWSER computes its hash
     (the file itself never leaves his computer or gets uploaded anywhere).
   → He clicks "Register." Now the hash is permanently on the blockchain.
   → Status: IN CUSTODY (holder = Det. Perera)

2. Det. Perera wants to send it to the Magistrate Court for a hearing.
   → He clicks "Request Transfer" and picks the Court.
   → Status changes to: TRANSFER PENDING
   → IMPORTANT: the evidence has NOT actually moved yet. It's just a request.

3. The Court must actively "Accept" the transfer.
   → Only the Court can do this — nobody can force it, and nobody can fake it.
   → Status changes back to: IN CUSTODY (holder = Court)
   → This is called a "two-step transfer" — request + accept. It stops anyone
     from lying about a handover, because BOTH sides had to sign an action.

4. Anyone (the public, a lawyer, an auditor) can now verify the file.
   → They pick the same file on the Verify tab.
   → The website re-computes the hash and compares it to what's on the
     blockchain. If it matches → AUTHENTIC. If not → TAMPERED.

5. The Court checks the file is authentic, then clicks "Admit as Evidence."
   → Status changes to: ADMITTED. This is the final step — the evidence
     is now formally accepted into the case, and it can never be
     transferred again (it's "closed").

6. Anyone can view the full History tab and see EVERY step above,
   with the exact time and the wallet address of who did it — forever.
```

---

## 8. The three moving parts of this project

The project has three separate "layers" that talk to each other:

```
┌─────────────────────────────────────────────────────┐
│  1. THE WEBSITE (frontend/)                          │
│     What you see and click in the browser.           │
│     Plain HTML + CSS + JavaScript. No fancy framework.│
└───────────────────┬───────────────────────────────────┘
                     │ "Hey blockchain, please do this"
                     ▼
┌─────────────────────────────────────────────────────┐
│  2. THE SMART CONTRACT (contracts/EvidenceChain.sol) │
│     The rulebook + permanent notebook.                │
│     Runs on the blockchain, enforces every rule.       │
└───────────────────┬───────────────────────────────────┘
                     │ runs on
                     ▼
┌─────────────────────────────────────────────────────┐
│  3. THE BLOCKCHAIN (Hardhat local network)             │
│     A private practice-Ethereum running on your laptop.│
│     Where the data actually lives, permanently.        │
└─────────────────────────────────────────────────────┘
```

There's also a **helper layer**: `scripts/deploy.js` and `scripts/seed.js`. These are one-time setup helpers — `deploy.js` puts the rulebook onto the blockchain, and `seed.js` adds our 4 demo people and one starter piece of evidence, so the app isn't empty when you open it.

---

## 9. A tour of the website — what each tab does

Open http://localhost:8080 after running the project (see the README for exact steps). You'll see:

- **Header (top bar):** shows who you're "acting as" right now (there's no real login — you just pick a person from a dropdown, since this is a demo), whether you're connected to the blockchain, and the contract's address.

- **Tab 1 — Dashboard:** a table of every piece of evidence ever registered: its ID, case number, filename, who currently holds it, and its status (green = In Custody, amber = Transfer Pending, blue = Admitted). If someone is trying to hand *you* evidence, you'll see an "Incoming Transfers" box here with Accept/Reject buttons.

- **Tab 2 — Register Evidence:** only works if you're "acting as" an Investigator. Pick a file — the browser instantly shows its SHA-256 hash. Click Register to write it to the blockchain forever.

- **Tab 3 — Transfer Custody:** if you're currently holding a piece of evidence, request it be sent to someone else. You can also cancel a request you sent, as long as the other person hasn't accepted yet.

- **Tab 4 — Verify Integrity:** the "truth machine." Pick any file and an Evidence ID — it tells you AUTHENTIC or TAMPERED. There's also a "Find on blockchain" mode: pick a random file and it tells you if that file was *ever* registered at all, without needing to know its ID.

- **Tab 5 — Custody History:** pick an Evidence ID and see its entire life story as a timeline — every single action, who did it, and exactly when.

- **Tab 6 — Admin:** only visible if you're "acting as" the Admin. Add new people to the system or deactivate existing ones.

---

## 10. A tour of the project's files

```
evidencechain/
├── contracts/EvidenceChain.sol   ← the rulebook (Solidity smart contract)
├── test/EvidenceChain.test.js    ← 25 automated tests that prove the rules work
├── scripts/deploy.js             ← one-time: puts the contract on the blockchain
├── scripts/seed.js               ← one-time: adds demo people + 1 evidence record
├── sample-evidence/              ← fake files to play with during the demo
└── frontend/                     ← the website (what you see in the browser)
    ├── index.html                ← the page structure (tabs, forms, tables)
    ├── style.css                 ← the colours, fonts, spacing (the look)
    └── app.js                    ← the logic (talks to the blockchain, updates the page)
```

**Rule of thumb:** if you want to understand *what the system is allowed to do*, read `EvidenceChain.sol`. If you want to understand *what a user sees and clicks*, read `index.html` and `app.js`.

---

## 11. Common words explained (glossary)

| Word | Simple meaning |
|---|---|
| **Blockchain** | A shared notebook that can be written to but never secretly edited |
| **Smart contract** | A program living on the blockchain, whose rules can't be broken |
| **Node** | A running copy of the blockchain (here: your own laptop, via Hardhat) |
| **Wallet address** | Like an account number/username on the blockchain, e.g. `0x1234…abcd`. Each person in our demo has one |
| **Transaction (tx)** | One action recorded onto the blockchain, e.g. "register evidence" |
| **Hash / SHA-256** | A file's unique digital fingerprint (see Section 5) |
| **Gas** | The "cost" to do something on a real blockchain (irrelevant here — our local network is free) |
| **Revert** | When the smart contract *refuses* an action because a rule was broken, e.g. "Only admin" |
| **ABI** | A "menu" describing what functions a smart contract has, so the website knows how to talk to it |
| **RPC** | The address the website uses to talk to the blockchain node (`http://127.0.0.1:8545`) |
| **Deploy** | The act of putting a smart contract onto the blockchain for the first time |
| **Ethers.js** | The JavaScript library our website uses to talk to the blockchain |

---

## 12. Likely questions, answered simply

**Q: Is this using real money or the real internet?**
No. Everything runs on your own laptop, on a fake practice version of Ethereum. Zero cost, zero risk.

**Q: Why not just store the whole file on the blockchain?**
Files can be huge (megabytes/gigabytes) and blockchains are expensive and slow to store big data on. A hash is tiny (32 bytes) no matter how big the file is, and it does the job perfectly — proving the file hasn't changed.

**Q: What if someone registers a fake file to begin with?**
The blockchain can only prove a file **hasn't changed since registration** — it can't prove the file was genuine on day one. That's a real limitation, and it's honestly one of the best points to make in the presentation. In real life, this is handled by having strict collection procedures (two officers present, signed forms) *before* the file ever touches the system.

**Q: What stops someone from pretending to be an Investigator?**
Only the Admin can add people to the system, and every action on the blockchain is signed by that person's private key (like a password only they know). Nobody can act as someone else.

**Q: Why does a transfer need two steps (request + accept) instead of one?**
So nobody can be forced into "receiving" evidence they never agreed to, and so nobody can fake a handover that never really happened. Both sides leave a permanent, signed trace.

---

## 13. What to read next

Once this makes sense, you're ready for:
- [`evidencechain/README.md`](evidencechain/README.md) — how to actually run the project on your computer
- [`presentation/speaker_script.md`](presentation/speaker_script.md) — the words to say for your 3-minute presentation
- [`presentation/RECORDING_GUIDE.md`](presentation/RECORDING_GUIDE.md) — how to record the demo video
- [`presentation/PRESENTATION_GUIDE.md`](presentation/PRESENTATION_GUIDE.md) — how to build and deliver the slides

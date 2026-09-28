# EvidenceChain — Implementation Plan

**Module:** EC8204 Blockchain and Cyber Security, University of Ruhuna
**Project:** EvidenceChain – Blockchain-Based Digital Forensic Evidence Integrity & Chain-of-Custody System
**Deliverable:** A working DApp and a 3-minute presentation named `GP_XX_EvidenceChain.pptx`. Replace `XX` with the group number from the Google Sheet.
**Deadline:** The brief says 31/09/2026, but September has only 30 days. Plan to submit on **29/09/2026** and treat 30/09 as the last possible day.

> **One-line description (use this everywhere):**
> A blockchain-based evidence management system where investigators record digital evidence (files, logs, images) as tamper-proof hash records on Ethereum. Custody transfers must be logged by the current holder and confirmed by the receiving party, which prevents undetected tampering and disputes over who handled the evidence and when. Courts and auditors can instantly verify that evidence is unaltered and review its complete custody history before it's admitted as proof.

---

## 0. Rules for the executing agent (read first)

1. **Work phase by phase.** Do not start a phase until the previous phase's **Exit criteria** all pass. Report results after each phase.
2. **Never run interactive commands.** Do not run `npx hardhat init`, and do not run any command that waits for a prompt. Create config files by hand.
3. **Pin versions exactly as written.** Use **Hardhat 2** (`hardhat@^2.22.0`) with `@nomicfoundation/hardhat-toolbox@^5.0.0` (ethers v6). Do **not** use Hardhat 3, because its ESM config and init flow differ from this plan.
4. **Environment:** Windows 10, PowerShell 5.1, Node v22.13.0, npm 10.9.2, 8 GB RAM. The project path contains spaces (`D:\8th sem\...`), so always quote paths.
5. **Long-running processes** (`npx hardhat node`, `http-server`) must run in the **background**. The Hardhat node must be running before `deploy`, `seed`, or frontend use.
6. Keep the design exactly as specified: contract API, roles, and file layout. If something in this plan turns out to be wrong, stop and report it. Do not silently redesign.
7. No real money, no public testnet, no private keys other than Hardhat's well-known local test accounts.

---

## 1. System overview

### 1.1 Problem → solution mapping

| Problem in traditional evidence handling | EvidenceChain mechanism |
|---|---|
| A file can be altered after collection without detection | A SHA-256 hash is stored on-chain at collection time; anyone can re-hash the file later and compare |
| Paper and database custody logs can be edited, lost or forged | Every custody action is an immutable on-chain record with timestamp and wallet address |
| One side can claim a handover that the other disputes | **Two-step transfer:** the current holder requests, and the receiver must accept (mutual acknowledgement) |
| Anyone could claim to be an investigator | **Role-based access:** only an admin can authorise handlers, and each role has specific powers |
| The same file registered twice under different cases | The contract rejects duplicate hashes |
| Evidence is sensitive and too large for a blockchain | **Only the hash is stored on-chain.** The file never leaves the investigator's machine. |

### 1.2 Actors (roles)

| Role | Who (demo persona) | Can do |
|---|---|---|
| **Admin** (contract deployer) | Evidence Registry Admin | Add or deactivate handlers |
| **Investigator** | Det. Perera | Register new evidence; transfer; accept |
| **Analyst** | Forensic Analyst Silva | Transfer; accept |
| **Custodian** | Evidence Room – Officer Fernando | Transfer; accept |
| **Court** | Magistrate Court – Galle | Transfer; accept; **admit evidence** (final step, on-chain hash check) |

Anyone, including people without a role, can **verify** a file and **view** custody history.

### 1.3 Evidence lifecycle

```
Investigator registers file hash ──► IN_CUSTODY (holder = investigator)
        │
        ▼ requestTransfer(to)
TRANSFER_PENDING ──acceptTransfer (by receiver)──► IN_CUSTODY (holder = receiver)
        │ rejectTransfer (by receiver) / cancelTransfer (by holder)
        └──────────────────────────────────────► IN_CUSTODY (holder unchanged)

Court holder calls admitEvidence(fileHash) ─ hash matches ─► ADMITTED (final, no further transfers)
                                            └ mismatch ─► revert "Hash mismatch: evidence tampered"
```

### 1.4 Architecture

```
┌──────────────────────────── Browser (http://localhost:8080) ───────────────────────────┐
│ index.html + app.js + ethers v6                                                          │
│  • File picker → SHA-256 computed LOCALLY (crypto.subtle) → file never uploaded          │
│  • "Act as" account dropdown (Hardhat unlocked accounts)  [+ optional MetaMask]          │
└───────────────────────────────┬─────────────────────────────────────────────────────────┘
                                │ JSON-RPC (http://127.0.0.1:8545)
┌───────────────────────────────▼─────────────────────────────────────────────────────────┐
│ Hardhat Network (local Ethereum, chainId 31337, instant mining)                          │
│   EvidenceChain.sol: handlers · evidence records (hash, holder, status) · custody logs    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.5 Final folder structure

```
project/
├── EC8204_Aug26_Project Description (1).pdf
├── IMPLEMENTATION_PLAN.md                 ← this file
├── evidencechain/
│   ├── package.json
│   ├── hardhat.config.js
│   ├── README.md                          (Phase 3)
│   ├── contracts/EvidenceChain.sol
│   ├── test/EvidenceChain.test.js
│   ├── scripts/deploy.js
│   ├── scripts/seed.js
│   ├── sample-evidence/
│   │   ├── server_access_log.txt
│   │   ├── suspect_chat_log.txt
│   │   └── suspect_chat_log_TAMPERED.txt
│   └── frontend/
│       ├── index.html
│       ├── style.css
│       ├── app.js
│       ├── contract-config.js             (generated by deploy.js — do not hand-edit)
│       └── lib/ethers.umd.min.js          (copied by deploy.js from node_modules)
└── presentation/
    ├── screenshots/                       (Phase 3, taken by the team)
    ├── demo_video.mp4                     (Phase 3, recorded by the team)
    ├── speaker_script.md
    └── GP_XX_EvidenceChain.pptx
```

---

## PHASE 1 — Environment setup and smart contract (Day 1: 27/09)

**Goal:** A compiled, fully tested `EvidenceChain.sol` running on a local Hardhat network.

### Step 1.1 — Initialise the project

In PowerShell, from the `project` folder:

```powershell
New-Item -ItemType Directory -Force "evidencechain"
cd evidencechain
npm init -y
npm install --save-dev hardhat@^2.22.0 @nomicfoundation/hardhat-toolbox@^5.0.0 http-server@^14.1.1
New-Item -ItemType Directory -Force contracts, test, scripts, sample-evidence, frontend, frontend/lib
```

### Step 1.2 — `hardhat.config.js`

```js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    localhost: { url: "http://127.0.0.1:8545" },
  },
};
```

### Step 1.3 — `package.json` scripts

Replace the `"scripts"` block with:

```json
"scripts": {
  "compile": "hardhat compile",
  "test": "hardhat test",
  "node": "hardhat node",
  "deploy": "hardhat run scripts/deploy.js --network localhost",
  "seed": "hardhat run scripts/seed.js --network localhost",
  "frontend": "http-server frontend -p 8080 -c-1"
}
```

### Step 1.4 — Write `contracts/EvidenceChain.sol` (exact specification)

`// SPDX-License-Identifier: MIT`, `pragma solidity ^0.8.24;`, contract name `EvidenceChain`. Use `require` with **the exact revert strings below**, because the frontend and tests depend on them. Do not use OpenZeppelin; keep the contract self-contained.

**Enums**
```solidity
enum Role   { None, Investigator, Analyst, Custodian, Court }
enum Status { InCustody, TransferPending, Admitted }
enum Action { Registered, TransferRequested, TransferAccepted, TransferRejected, TransferCancelled, Admitted }
```

**Structs**
```solidity
struct Handler {
    string  name;
    Role    role;
    bool    active;
}

struct Evidence {
    uint256 id;
    string  caseId;          // e.g. "CASE-2026-014"
    string  description;     // e.g. "Web server access log from compromised host"
    string  fileName;        // original file name (for display only)
    bytes32 fileHash;        // SHA-256 of the file bytes
    address collectedBy;
    address currentHolder;
    address pendingHolder;   // address(0) when no transfer pending
    uint256 registeredAt;    // block.timestamp
    Status  status;
}

struct CustodyRecord {
    Action  action;
    address from;
    address to;
    uint256 timestamp;
    string  note;
}
```

**State**
```solidity
address public admin;
uint256 public evidenceCount;                       // ids start at 1
mapping(address => Handler) public handlers;
address[] private handlerList;                      // every address ever added
mapping(uint256 => Evidence) private evidences;
mapping(uint256 => CustodyRecord[]) private custodyLogs;
mapping(bytes32 => uint256) public hashToEvidenceId; // 0 = not registered
```

**Events**
```solidity
event HandlerAdded(address indexed account, string name, Role role);
event HandlerDeactivated(address indexed account);
event EvidenceRegistered(uint256 indexed id, string caseId, bytes32 fileHash, address indexed collectedBy);
event TransferRequested(uint256 indexed id, address indexed from, address indexed to);
event TransferAccepted(uint256 indexed id, address indexed from, address indexed to);
event TransferRejected(uint256 indexed id, address indexed from, address indexed to);
event TransferCancelled(uint256 indexed id, address indexed from, address indexed to);
event EvidenceAdmitted(uint256 indexed id, address indexed court);
```

**Modifiers and revert strings**
- `onlyAdmin` → `"Only admin"`
- `onlyActiveHandler` → `"Not an authorised handler"`
- `evidenceExists(id)` → `id >= 1 && id <= evidenceCount`, else `"Evidence does not exist"`

**Functions** (implement exactly these signatures)

| Function | Access | Rules (checked in this order) → effects |
|---|---|---|
| `constructor()` | — | `admin = msg.sender` |
| `addHandler(address account, string calldata name, Role role)` | onlyAdmin | `account != address(0)` → `"Invalid address"`; `role != Role.None` → `"Invalid role"`; `!handlers[account].active` → `"Handler already active"`. If the account's name is empty (never added before), push it to `handlerList`. Set `handlers[account] = Handler(name, role, true)`. Emit `HandlerAdded`. |
| `deactivateHandler(address account)` | onlyAdmin | `handlers[account].active` → `"Handler not active"`. Set `active=false`. Emit `HandlerDeactivated`. |
| `registerEvidence(string calldata caseId, string calldata description, string calldata fileName, bytes32 fileHash) returns (uint256)` | onlyActiveHandler | `handlers[msg.sender].role == Role.Investigator` → `"Only investigators can register evidence"`; `fileHash != bytes32(0)` → `"Invalid hash"`; `bytes(caseId).length > 0` → `"Case ID required"`; `hashToEvidenceId[fileHash] == 0` → `"Evidence already registered"`. `id = ++evidenceCount`; store Evidence (holder = collector = msg.sender, pending = 0, status InCustody); `hashToEvidenceId[fileHash] = id`; push log `(Registered, address(0), msg.sender, now, "Evidence collected and registered")`. Emit `EvidenceRegistered`. Return id. |
| `requestTransfer(uint256 id, address to, string calldata note)` | onlyActiveHandler, evidenceExists | `msg.sender == currentHolder` → `"Only current holder"`; `status == InCustody` → `"Evidence not available for transfer"`; `handlers[to].active` → `"Recipient not an authorised handler"`; `to != msg.sender` → `"Cannot transfer to self"`. Set `pendingHolder = to`, `status = TransferPending`; push log `(TransferRequested, msg.sender, to, now, note)`. Emit. |
| `acceptTransfer(uint256 id, string calldata note)` | onlyActiveHandler, evidenceExists | `status == TransferPending` → `"No pending transfer"`; `msg.sender == pendingHolder` → `"Only pending recipient"`. `from = currentHolder`; `currentHolder = msg.sender`; `pendingHolder = 0`; `status = InCustody`; push log `(TransferAccepted, from, msg.sender, now, note)`. Emit. |
| `rejectTransfer(uint256 id, string calldata note)` | onlyActiveHandler, evidenceExists | Same two checks as accept. `pendingHolder = 0`; `status = InCustody`; push log `(TransferRejected, currentHolder, msg.sender, now, note)`. Emit. |
| `cancelTransfer(uint256 id)` | onlyActiveHandler, evidenceExists | `status == TransferPending` → `"No pending transfer"`; `msg.sender == currentHolder` → `"Only current holder"`. Save `to = pendingHolder`; clear pending; `status = InCustody`; push log `(TransferCancelled, msg.sender, to, now, "Transfer cancelled by holder")`. Emit. |
| `admitEvidence(uint256 id, bytes32 fileHash)` | onlyActiveHandler, evidenceExists | `role == Court` → `"Only court can admit evidence"`; `msg.sender == currentHolder` → `"Only current holder"`; `status == InCustody` → `"Evidence not available for admission"`; `fileHash == evidences[id].fileHash` → `"Hash mismatch: evidence tampered"`. `status = Admitted`; push log `(Admitted, msg.sender, msg.sender, now, "Integrity verified and admitted by court")`. Emit. |
| `verifyEvidence(uint256 id, bytes32 fileHash) view returns (bool)` | public, evidenceExists | `return evidences[id].fileHash == fileHash;` |
| `findByHash(bytes32 fileHash) view returns (uint256)` | public | `return hashToEvidenceId[fileHash];` |
| `getEvidence(uint256 id) view returns (Evidence memory)` | public, evidenceExists | |
| `getCustodyHistory(uint256 id) view returns (CustodyRecord[] memory)` | public, evidenceExists | |
| `getHandlers() view returns (address[] memory)` | public | returns `handlerList` |

> The admin is **not** automatically a handler. Admin's only job is managing handlers, which is separation of duties and a good point to mention in the presentation.

### Step 1.5 — Write `test/EvidenceChain.test.js`

Use `const { expect } = require("chai"); const { ethers } = require("hardhat");` and `loadFixture` from `@nomicfoundation/hardhat-toolbox/network-helpers`.

**Fixture:** deploy; signers `[admin, investigator, analyst, custodian, court, outsider]`; admin adds investigator (1), analyst (2), custodian (3), court (4). Define `HASH_A = ethers.sha256(ethers.toUtf8Bytes("original evidence"))` and `HASH_B = ethers.sha256(ethers.toUtf8Bytes("tampered evidence"))`.

Required test cases (each one `it(...)`):

**Handlers**
1. Admin is the deployer.
2. Admin can add a handler, and it emits `HandlerAdded`.
3. A non-admin cannot add a handler (`"Only admin"`).
4. Adding with `Role.None` reverts (`"Invalid role"`).
5. `getHandlers()` returns the 4 handler addresses.
6. A deactivated handler cannot register or transfer (`"Not an authorised handler"`).

**Registration**
7. An investigator registers evidence: id 1, holder = investigator, status InCustody, history length 1 with action Registered, and it emits `EvidenceRegistered`.
8. An analyst cannot register (`"Only investigators can register evidence"`).
9. An outsider cannot register (`"Not an authorised handler"`).
10. A duplicate hash reverts (`"Evidence already registered"`).
11. A zero hash reverts (`"Invalid hash"`).

**Transfers**
12. Full transfer investigator → analyst: after the request the status is TransferPending; after the accept the holder = analyst, status InCustody, and history has 3 records.
13. A non-holder cannot request a transfer (`"Only current holder"`).
14. A transfer to an outsider reverts (`"Recipient not an authorised handler"`).
15. Only the pending recipient can accept (`"Only pending recipient"`).
16. Reject keeps the original holder and logs TransferRejected.
17. Cancel by the holder clears the pending state and logs TransferCancelled.
18. A second request while one is pending reverts (`"Evidence not available for transfer"`).

**Verification and admission**
19. `verifyEvidence(1, HASH_A)` is true and `verifyEvidence(1, HASH_B)` is false.
20. `findByHash(HASH_A) == 1` and `findByHash(HASH_B) == 0`.
21. A court holding the evidence admits it with the correct hash: status Admitted, and it emits `EvidenceAdmitted`.
22. A court admitting with the wrong hash reverts (`"Hash mismatch: evidence tampered"`).
23. A non-court holder cannot admit (`"Only court can admit evidence"`).
24. After admission, `requestTransfer` reverts (`"Evidence not available for transfer"`).
25. `getEvidence(99)` reverts (`"Evidence does not exist"`).

### Step 1.6 — Compile and test

```powershell
npx hardhat compile
npx hardhat test
```

### ✅ Phase 1 exit criteria
- [ ] `npx hardhat compile` succeeds with no errors.
- [ ] `npx hardhat test` shows **25 passing, 0 failing**.
- [ ] Revert strings in the contract match this plan exactly.

---

## PHASE 2 — Deployment scripts, sample data, and web frontend (Day 2: 28/09)

**Goal:** A browser DApp where the team can act as any role, register evidence by picking a file, transfer custody, verify authenticity, detect tampering, and view the full custody timeline.

### Step 2.1 — Sample evidence files (`sample-evidence/`)

Create these as plain UTF-8 text:

- `server_access_log.txt`: about 15 lines of realistic Apache-style access log lines from a brute-force attack (for example, repeated `POST /login` from `203.0.113.45` returning 401, then one 200).
- `suspect_chat_log.txt`: about 10 lines of a fictional chat transcript with timestamps (for example, two users discussing moving "the files" to a USB drive at 23:14). Keep it fictional and neutral.
- `suspect_chat_log_TAMPERED.txt`: an **exact copy** of `suspect_chat_log.txt` with **one detail changed** (for example, `23:14` → `21:14`). This file demonstrates tamper detection.

### Step 2.2 — `scripts/deploy.js`

1. Deploy `EvidenceChain` with `ethers.getContractFactory` and `waitForDeployment()`.
2. Read the ABI from `artifacts/contracts/EvidenceChain.sol/EvidenceChain.json`.
3. Write `frontend/contract-config.js` containing:
   ```js
   window.EVIDENCE_CONFIG = {
     address: "0x...",
     chainId: 31337,
     rpcUrl: "http://127.0.0.1:8545",
     abi: [ /* full ABI */ ]
   };
   ```
4. Copy `node_modules/ethers/dist/ethers.umd.min.js` to `frontend/lib/ethers.umd.min.js` with `fs.copyFileSync`. This makes the frontend work offline with no CDN dependency.
5. Log the deployed address and admin address.

### Step 2.3 — `scripts/seed.js`

This script prepares a realistic starting state for the demo. It must be **idempotent enough** to run once right after `deploy`.

1. Read the address from `frontend/contract-config.js`. Parse it with a regex, or have `deploy.js` also write `deployment.json` with `{ address }` and read that instead. Prefer `deployment.json` because it is simpler.
2. Signers `[admin, inv, analyst, custodian, court]` = Hardhat accounts #0–#4.
3. Admin adds handlers:
   - #1 `"Det. Perera"` Investigator
   - #2 `"Forensic Analyst Silva"` Analyst
   - #3 `"Evidence Room - Officer Fernando"` Custodian
   - #4 `"Magistrate Court - Galle"` Court
4. The investigator registers `server_access_log.txt` as `CASE-2026-014` / `"Web server access log from compromised host"`. Compute the hash with Node: `"0x" + crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex")`. It must match the browser's SHA-256.
5. The investigator requests a transfer to the analyst (`"Sent for log analysis"`), and the analyst accepts (`"Received at forensic lab"`).
6. **Do not** register `suspect_chat_log.txt`. It is reserved for the live demo.
7. Print a summary table of addresses and roles.

### Step 2.4 — Frontend (`frontend/index.html`, `style.css`, `app.js`)

**Tech:** plain HTML, CSS and JavaScript (no framework, no build step). Load scripts in this order: `lib/ethers.umd.min.js`, `contract-config.js`, `app.js`. This gives a global `ethers` (v6).

**Connection (primary mode — no MetaMask needed):**
```js
const provider = new ethers.JsonRpcProvider(EVIDENCE_CONFIG.rpcUrl);
const accounts = await provider.listAccounts();           // JsonRpcSigner[] (Hardhat unlocked accounts)
// "Act as" <select>: show first 6 accounts, labelled with handler name/role from contract, or "Admin", or "Public / Outsider"
const signer = accounts[selectedIndex];
const contract = new ethers.Contract(EVIDENCE_CONFIG.address, EVIDENCE_CONFIG.abi, signer);
```
Changing the dropdown re-creates `contract` with the new signer and refreshes every panel.

**File hashing (runs in the browser, and the file is never uploaded):**
```js
async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}
```
`crypto.subtle` only works in a secure context, so open the app at **`http://localhost:8080`** (not a LAN IP).

**Layout:** header plus a tab bar with 5 tabs. Use a clean, professional look: dark navy header, white cards, one accent colour. Show the name **"EvidenceChain"** with the subtitle "Digital Forensic Evidence Integrity & Chain-of-Custody".

**Header (always visible):**
- "Act as" dropdown, current address (shortened `0x1234…abcd`), and a role badge (colour per role).
- Network status: `Connected to Hardhat Local (31337)` or an error banner if the node is not running.
- Contract address (shortened).

**Tab 1 — Dashboard / All Evidence**
- Table: ID · Case ID · File name · Current holder (name) · Status badge (`IN CUSTODY` green, `TRANSFER PENDING` amber, `ADMITTED` blue) · "View history" button.
- An **Incoming transfers** card appears if the selected account is the `pendingHolder` of any evidence. Each item has **Accept** and **Reject** buttons and a note input.
- Load everything by looping `1..evidenceCount` with `getEvidence(i)`. The data set is small, so this is fine.

**Tab 2 — Register Evidence** (enabled only for the Investigator role; otherwise show "Only investigators can register evidence")
- Inputs: Case ID, Description, File picker.
- On file pick, show the file name, size, and the computed **SHA-256 hash** in monospace, with the note "Computed locally — file is NOT uploaded".
- A **Register on Blockchain** button calls `registerEvidence(caseId, description, file.name, hash)`. On success, show the evidence ID, tx hash and block number.

**Tab 3 — Transfer Custody**
- A dropdown of evidence **currently held by the selected account** with status InCustody.
- A recipient dropdown of active handlers except self, labelled `Name (Role)`.
- A note input and a **Request Transfer** button.
- A list of **outgoing pending transfers** (held by me, status TransferPending) with a **Cancel** button.

**Tab 4 — Verify Integrity** (works for any account, including Public)
- Mode A: enter an Evidence ID, pick a file, then **Verify**. Call `verifyEvidence(id, hash)`.
  - Match: a large green panel **"✔ AUTHENTIC — file matches the blockchain record"**.
  - Mismatch: a large red panel **"✘ TAMPERED — file does NOT match the blockchain record"**.
  - Always show both hashes (on-chain and computed) one above the other in monospace so the difference is visible.
- Mode B: pick a file and click **Find on blockchain**. Call `findByHash(hash)` and show the matching evidence ID and details, or "No record — this file was never registered".
- If the selected account is a Court handler holding this evidence with status InCustody, show an **Admit as Evidence** button that calls `admitEvidence(id, hash)`.

**Tab 5 — Custody History**
- An Evidence ID input (the "View history" button on Tab 1 jumps here pre-filled).
- An evidence summary card showing case, description, file name, full hash, collected by, registered time, and status.
- A **vertical timeline** of `getCustodyHistory(id)`. Each entry shows an icon/colour per action, `from → to` as names (fall back to the short address), a human-readable local date and time from `timestamp`, and the note.

**Tab 6 (small) — Admin** (shown only when the Admin account is selected)
- A form to add a handler (address, name, role dropdown), a handler table (address, name, role, active), and a **Deactivate** button.

**Error handling:**
- Wrap every transaction in try/catch. Show `err.reason || err.shortMessage || err.message` in a red toast. The contract's revert strings, such as "Only current holder", should appear verbatim.
- On success, show a green toast with the shortened tx hash, then refresh all panels.
- Disable the button and show "Waiting for confirmation…" while a tx is pending.

### Step 2.5 — Run everything (the standard run sequence)

Open three terminals, or run the first and last in the background:

```powershell
# Terminal 1 (keep running)
cd evidencechain; npx hardhat node
# Terminal 2
cd evidencechain; npm run deploy; npm run seed
# Terminal 3 (keep running)
cd evidencechain; npm run frontend
# Browser → http://localhost:8080
```

> ⚠ Restarting `hardhat node` wipes the chain. You must run `deploy` and `seed` again every time.

### Step 2.6 (OPTIONAL — only if Phase 2 is done early) — MetaMask mode

- Add a **Connect MetaMask** button. If `window.ethereum` exists, use `new ethers.BrowserProvider(window.ethereum)` and `await provider.getSigner()`.
- Team setup: add a MetaMask network with RPC `http://127.0.0.1:8545` and chain ID `31337` (currency ETH). Import Hardhat test account private keys #1–#4 printed by `npx hardhat node`. These are local test keys only and must never be used on a real network.
- Gotcha: after restarting the node, MetaMask shows nonce errors. Fix this with MetaMask → Settings → Advanced → **Clear activity tab data**.
- The local-account dropdown stays the default because it is faster and more reliable for the demo.

### ✅ Phase 2 exit criteria (verify manually in the browser)
- [ ] After `deploy` and `seed`, the Dashboard shows evidence #1 held by Forensic Analyst Silva with a history of 3 entries.
- [ ] As Det. Perera, registering `suspect_chat_log.txt` succeeds and shows the same hash as `Get-FileHash .\sample-evidence\suspect_chat_log.txt -Algorithm SHA256` (case-insensitive).
- [ ] Registering the same file again shows the toast "Evidence already registered".
- [ ] Transfer Perera → Court: pending shows in Court's incoming list, Court accepts, and the holder updates.
- [ ] Verify evidence #2 with the original file shows AUTHENTIC; with `_TAMPERED` it shows TAMPERED and both hashes are visibly different.
- [ ] Court clicks Admit with the original file: status becomes ADMITTED, and a further transfer attempt shows the revert message.
- [ ] Acting as an Analyst on the Register tab shows the "Only investigators…" message.
- [ ] Stopping the Hardhat node shows the "not connected" banner and no uncaught exceptions.

---

## PHASE 3 — Testing, documentation, demo recording, and presentation (Day 3: 29/09)

**Goal:** A polished, rehearsed 3-minute presentation with a reliable demo, submitted to ELMS.

### Step 3.1 — Final quality pass (agent)
1. `npx hardhat test` shows all passing. Also run `npx hardhat coverage` (included in the toolbox) and note the statement-coverage percentage for the slides.
2. Do a full fresh run: stop the node, then restart it, deploy, seed, run the frontend, and repeat every Phase 2 exit check.
3. Write `evidencechain/README.md`: project description (the one-liner), prerequisites (Node 20+), install (`npm install`), the run sequence from Step 2.5, test command, demo walkthrough, and folder layout.

### Step 3.2 — Demo script (the team performs this and records it)

Before recording: do a fresh restart, deploy and seed; set the browser zoom to 110–125% so text is readable on a projector; close other tabs.

| # | Act as | Action | What to point out |
|---|---|---|---|
| 1 | Det. Perera | Register tab → pick `suspect_chat_log.txt`, Case `CASE-2026-021` → Register | Hash computed locally; only the hash goes on-chain |
| 2 | Det. Perera | Transfer tab → evidence #2 → Magistrate Court → "Submitted for hearing" | Transfer is only *requested*, not yet complete |
| 3 | Magistrate Court | Dashboard → Incoming → Accept | Mutual acknowledgement means the handover can't be disputed |
| 4 | Public / Outsider | Verify tab → ID 2 + original file | ✔ AUTHENTIC |
| 5 | Public / Outsider | Verify tab → ID 2 + `_TAMPERED` file | ✘ TAMPERED; one changed character gives a completely different hash |
| 6 | Magistrate Court | Verify tab → ID 2 + original → Admit | Admission itself is recorded on-chain |
| 7 | Anyone | History tab → ID 2 | Full immutable timeline: Registered → Requested → Accepted → Admitted |

**Recording:** use the Windows **Xbox Game Bar** (`Win + Alt + R` starts and stops), OBS Studio, or PowerPoint **Insert → Screen Recording**. Target a raw length of about 90 s, then trim or speed up to **45–50 s** (Clipchamp, which is built into Windows, works). Save it as `presentation/demo_video.mp4` (1080p, no audio needed, because the speaker narrates live).

**Screenshots** (`Win + Shift + S`), saved in `presentation/screenshots/` with these exact names:
- `01_dashboard.png`: Dashboard with both evidence rows
- `02_register.png`: Register tab showing the computed hash
- `03_incoming_transfer.png`: Court's incoming transfer with Accept/Reject
- `04_verify_authentic.png`: green AUTHENTIC result
- `05_verify_tampered.png`: red TAMPERED result with both hashes
- `06_timeline.png`: custody timeline for evidence #2
- `07_tests_passing.png`: terminal showing `25 passing`

Screenshots are a **backup** in case the video fails to play in the venue.

### Step 3.3 — Presentation structure (3 minutes = 6 slides)

**File name:** `GP_XX_EvidenceChain.pptx`, with `XX` = group number. The brief says `.ppt`. If the coordinator strictly needs `.ppt`, use PowerPoint → File → Save As → *PowerPoint 97-2003 Presentation*, then check the video still plays.

**Design rules:**
- 16:9, one consistent theme: dark navy (`#0B1F3A`) title bars, white background, and one accent (teal `#14B8A6`). Red and green are reserved for tampered/authentic only.
- Titles are 32–40 pt and body text is at least 20 pt. **No more than 5 bullets per slide and 8 words per bullet.** The speaker says the detail; the slide shows keywords.
- Build the architecture and flow diagrams with **native PowerPoint shapes** (boxes and arrows) so they stay sharp and editable.
- Put slide numbers and a small footer: `EC8204 · Group XX · EvidenceChain`.

**Speaking pace:** about 140 words per minute, so about **420 words in total**. Timings below add up to 180 s.

---

**Slide 1 — Title (10 s)**
- Title: **EvidenceChain**
- Subtitle: Blockchain-Based Digital Forensic Evidence Integrity & Chain-of-Custody System
- Group XX · member names and registration numbers · EC8204 Blockchain and Cyber Security · University of Ruhuna
- Visual: a simple chain-link or shield icon.
- *Say (~25 words):* "Good morning. We are Group XX, and our project is EvidenceChain — using blockchain to protect the integrity of digital forensic evidence."

**Slide 2 — The Problem (30 s)**
- Heading: *Can we trust digital evidence in court?*
- Bullets:
  - Digital evidence is easy to alter
  - Custody logs are paper or central databases
  - Insiders can edit or delete records
  - Broken chain of custody → evidence rejected
- Visual: a file icon with a question mark, and a handover arrow between two people with "?".
- *Say (~70 words):* Explain that CCTV, logs and disk images pass through investigators, labs and evidence rooms before reaching court. Each handover is recorded on paper or in a central database that a single insider or attacker can modify without trace. If the defence can question the chain of custody, the evidence can be thrown out, and if someone tampers with a file, nobody can prove it.

**Slide 3 — Our Solution & Architecture (40 s)**
- Heading: *EvidenceChain: hash on-chain, file off-chain*
- Left side, 4 short bullets:
  - SHA-256 fingerprint stored on Ethereum
  - Every handover = immutable transaction
  - Two-step transfer: request + accept
  - Role-based access (Investigator → Court)
- Right side: the architecture diagram from section 1.4 drawn with shapes (Browser/DApp → Smart Contract on Ethereum; a "File stays local 🔒" label on the browser box).
- Stack line at the bottom (small): *Solidity 0.8.24 · Hardhat · Ethers.js v6 · HTML/JS*
- *Say (~95 words):* Paste the one-line project description in your own words. Emphasise: (1) only the hash goes on the blockchain, which protects privacy and cost; (2) the receiver must accept a transfer, so a handover can't be faked or disputed; (3) only admin-authorised handlers can act; (4) anyone can verify.

**Slide 4 — How It Works (25 s)**
- Heading: *Evidence lifecycle*
- A horizontal flow diagram of 5 boxes with arrows:
  `Collect & Register` → `Request Transfer` → `Accept Transfer` → `Verify Hash` → `Admit in Court`
- Under each box, one tiny label for who does it (Investigator / Holder / Receiver / Anyone / Court).
- A small callout: *"1 changed character ⇒ completely different hash"*.
- *Say (~55 words):* Walk through the arrows quickly, using the Investigator → Court example that the demo will show.

**Slide 5 — Live Demo (50 s)**
- Heading: *Demo*
- Embed `demo_video.mp4` (Insert → Video → This Device), set to **Start: Automatically** and full-width. Keep `04_verify_authentic.png` and `05_verify_tampered.png` side by side on a **hidden backup slide** directly after it.
- *Say (~110 words):* Narrate along with the video, following steps 1–7 of the demo script. Pause on the AUTHENTIC vs TAMPERED moment, because that is the key moment of the presentation.

**Slide 6 — Security Benefits, Limitations & Conclusion (25 s)**
- Two columns.
  - **Security achieved:** Integrity (hash) · Non-repudiation (signed transactions) · Accountability (full audit trail) · Access control (roles) · Privacy (no file on-chain)
  - **Limitations / Future work:** Garbage in, garbage out — protects *after* registration · Use a permissioned chain (Hyperledger Besu) for real deployment · IPFS with encryption for file storage · Key management for officers
- A bottom line in the accent colour: *"Tests: 25/25 passing · Coverage: NN %"*, filled in from Step 3.1.
- Final line: **Thank you — Questions?**
- *Say (~65 words):* Summarise the security properties and name the limitations honestly. Examiners reward awareness that blockchain proves integrity *after* registration but can't prove the file was genuine *before* it.

---

### Step 3.4 — `presentation/speaker_script.md`
The agent writes the full word-for-word script (about 420 words total) using the per-slide guidance above. Each slide's section is headed with its time budget. The team then personalises the wording and splits the slides between speakers. With 4 members, a suggested split is: Member 1 → Slides 1–2, Member 2 → Slide 3, Member 3 → Slides 4–5, Member 4 → Slide 6 plus questions.

### Step 3.5 — Building the `.pptx` (agent)
- Use the **`anthropic-skills:pptx`** skill in Claude Code to generate `presentation/GP_XX_EvidenceChain.pptx`, following Step 3.3 exactly (theme colours, native-shape diagrams, slide text, speaker notes = the script from Step 3.4 pasted into each slide's notes).
- Insert the screenshots from `presentation/screenshots/`. If they don't exist yet, leave clearly labelled placeholder boxes named after the target file (e.g. "[04_verify_authentic.png]").
- The team embeds `demo_video.mp4` into Slide 5 manually in PowerPoint (Insert → Video → This Device). This is more reliable than generating the embed.

### Step 3.6 — Rehearsal and submission (team)
- [ ] Rehearse with a timer at least 3 times. The target is **2:50**, because going over 3:00 loses marks.
- [ ] Test the `.pptx` on another computer. Confirm the video plays and the fonts render.
- [ ] Prepare answers to likely questions:
  - *Why not store the file on-chain?* Size, gas cost and privacy; the hash is enough to prove integrity.
  - *What if the investigator registers a fake file?* Blockchain guarantees integrity only from registration onward. Mitigate with collection SOPs, dual-officer registration, and signing at the capture device.
  - *Why a public-style Ethereum and not a private chain?* The demo uses a local Ethereum. Production would use a permissioned consortium chain (police, labs, courts) such as Hyperledger Besu or Fabric.
  - *What stops someone faking a role?* Only the admin can add handlers, and every action is signed by the handler's private key.
  - *Why SHA-256?* It is the forensic industry standard (FTK, EnCase, `sha256sum`), collision-resistant, and verifiable with built-in OS tools.
- [ ] Upload `GP_XX_EvidenceChain.pptx` to ELMS by **29/09/2026** (one submission per group).
- [ ] Optional: zip the `evidencechain/` folder **without `node_modules`, `artifacts`, `cache`** in case the coordinator asks for the code.

### ✅ Phase 3 exit criteria
- [ ] All tests pass, and the coverage number is on Slide 6.
- [ ] README lets a teammate run the project from a fresh clone.
- [ ] `demo_video.mp4` is 45–50 s and shows AUTHENTIC vs TAMPERED clearly.
- [ ] 7 screenshots are saved with the exact names.
- [ ] `GP_XX_EvidenceChain.pptx`: 6 slides plus 1 hidden backup, with speaker notes, and rehearsed under 3:00.
- [ ] Submitted on ELMS.

---

## Appendix A — Hardware and software requirements

| Item | Minimum | This machine |
|---|---|---|
| CPU | Any dual-core from the last 8 years | ✔ |
| RAM | 4 GB (8 GB comfortable) | ✔ ~8 GB |
| Disk | ~500 MB free (mostly `node_modules`) | — |
| GPU | Not needed (no mining; local chain) | — |
| OS | Windows 10/11, macOS, or Linux | ✔ Windows 10 |
| Node.js | v18+ (v20/22 LTS recommended) | ✔ v22.13.0 |
| npm | v9+ | ✔ 10.9.2 |
| Browser | Chrome or Edge (plus MetaMask if using optional mode) | — |
| Internet | Only for `npm install`; the demo runs fully offline | — |

## Appendix B — Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend: "not connected" banner | Start `npx hardhat node`, then run `npm run deploy` and `npm run seed` again |
| `could not decode result data` / contract calls fail | The node was restarted after deploy. Run deploy and seed again, then hard-refresh the browser (`Ctrl+F5`) |
| `crypto.subtle is undefined` | Open the app via `http://localhost:8080`, not `file://` or a LAN IP |
| Browser hash ≠ `Get-FileHash` | The file was edited or re-saved (line endings changed). Use the same file and never open and save sample files |
| `Evidence already registered` in the demo | The chain still has it from rehearsal. Restart the node, deploy and seed again |
| MetaMask nonce error (optional mode) | MetaMask → Settings → Advanced → Clear activity tab data |
| Port 8545 or 8080 in use | `Get-NetTCPConnection -LocalPort 8545` → stop that process, or change the port |

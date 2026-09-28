/* EvidenceChain frontend — plain JS, ethers v6, no build step. */

const ROLE_NAMES = ["None", "Investigator", "Analyst", "Custodian", "Court"];
const ROLE_BADGE_CLASS = ["badge-none", "badge-investigator", "badge-analyst", "badge-custodian", "badge-court"];
const STATUS_NAMES = ["IN CUSTODY", "TRANSFER PENDING", "ADMITTED"];
const STATUS_CLASS = ["status-custody", "status-pending", "status-admitted"];
const ACTION_NAMES = [
  "Registered",
  "Transfer Requested",
  "Transfer Accepted",
  "Transfer Rejected",
  "Transfer Cancelled",
  "Admitted",
];
const ACTION_ICONS = ["📋", "↗", "✅", "✖", "⊘", "⚖"];

let provider = null;
let readContract = null; // contract bound to provider (view calls)
let signers = []; // JsonRpcSigner[]
let selectedIndex = 0;
let adminAddress = null;
let handlersInfo = {}; // lowercase address -> { name, role, active }
let evidenceCache = []; // array of evidence objects (1-indexed, index 0 unused)
let historyPrefillId = null;

// ---------- Utilities ----------

function shortAddr(addr) {
  if (!addr) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function shortHash(h) {
  if (!h) return "—";
  return h.slice(0, 10) + "…" + h.slice(-8);
}

function addressLabel(addr) {
  const lower = addr.toLowerCase();
  if (adminAddress && lower === adminAddress.toLowerCase()) {
    return "Admin";
  }
  const info = handlersInfo[lower];
  if (info) {
    return info.active ? `${info.name} (${ROLE_NAMES[info.role]})` : `${info.name} (Inactive)`;
  }
  return "Public / Outsider";
}

function currentAddress() {
  return signers[selectedIndex] ? signers[selectedIndex].address : null;
}

async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return "0x" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function formatTimestamp(ts) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString();
}

function toast(message, type) {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function errMessage(err) {
  return err.reason || err.shortMessage || err.message || String(err);
}

/** Runs an async tx-sending function, disabling the button and showing toasts. */
async function sendTx(button, fn, successPrefix) {
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Waiting for confirmation…";
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    toast(`${successPrefix} — tx ${shortHash(receipt.hash)}`, "success");
    await refreshAll();
    return receipt;
  } catch (err) {
    console.error(err);
    toast(errMessage(err), "error");
    return null;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function getSignerContract() {
  const signer = signers[selectedIndex];
  return new ethers.Contract(EVIDENCE_CONFIG.address, EVIDENCE_CONFIG.abi, signer);
}

// ---------- Connection ----------

async function connect() {
  try {
    provider = new ethers.JsonRpcProvider(EVIDENCE_CONFIG.rpcUrl);
    await provider.getBlockNumber();
    signers = await provider.listAccounts();
    readContract = new ethers.Contract(EVIDENCE_CONFIG.address, EVIDENCE_CONFIG.abi, provider);
    adminAddress = await readContract.admin();

    setNetworkStatus(true);
    document.getElementById("contractAddress").textContent = shortAddr(EVIDENCE_CONFIG.address);

    await loadHandlers();
    buildAccountDropdown();
    selectAccount(0);
  } catch (err) {
    console.error(err);
    setNetworkStatus(false);
  }
}

function setNetworkStatus(connected) {
  const statusEl = document.getElementById("networkStatus");
  const banner = document.getElementById("connectionBanner");
  if (connected) {
    statusEl.textContent = `Connected to Hardhat Local (${EVIDENCE_CONFIG.chainId})`;
    statusEl.className = "network-status connected";
    banner.classList.add("hidden");
  } else {
    statusEl.textContent = "Not connected";
    statusEl.className = "network-status disconnected";
    banner.classList.remove("hidden");
  }
}

async function loadHandlers() {
  handlersInfo = {};
  const addresses = await readContract.getHandlers();
  for (const addr of addresses) {
    const h = await readContract.handlers(addr);
    handlersInfo[addr.toLowerCase()] = { name: h.name, role: Number(h.role), active: h.active };
  }
}

function buildAccountDropdown() {
  const select = document.getElementById("accountSelect");
  select.innerHTML = "";
  const count = Math.min(6, signers.length);
  for (let i = 0; i < count; i++) {
    const addr = signers[i].address;
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${addressLabel(addr)} — ${shortAddr(addr)}`;
    select.appendChild(opt);
  }
}

function updateHeaderForSelectedAccount() {
  const addr = currentAddress();
  document.getElementById("accountAddress").textContent = shortAddr(addr);

  const badge = document.getElementById("accountRoleBadge");
  const lower = addr.toLowerCase();
  if (adminAddress && lower === adminAddress.toLowerCase()) {
    badge.textContent = "Admin";
    badge.className = "badge badge-admin";
  } else if (handlersInfo[lower] && handlersInfo[lower].active) {
    const role = handlersInfo[lower].role;
    badge.textContent = ROLE_NAMES[role];
    badge.className = `badge ${ROLE_BADGE_CLASS[role]}`;
  } else {
    badge.textContent = "Public";
    badge.className = "badge badge-none";
  }

  const isAdmin = adminAddress && lower === adminAddress.toLowerCase();
  document.getElementById("adminTabBtn").classList.toggle("hidden", !isAdmin);
  if (!isAdmin && document.getElementById("tab-admin").classList.contains("active")) {
    switchTab("dashboard");
  }
}

function selectAccount(idx) {
  selectedIndex = idx;
  document.getElementById("accountSelect").value = idx;
  updateHeaderForSelectedAccount();
  refreshAll();
}

// ---------- Tabs ----------

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.id === `tab-${tab}`));
  if (tab === "history" && historyPrefillId !== null) {
    document.getElementById("historyId").value = historyPrefillId;
    loadHistory(historyPrefillId);
    historyPrefillId = null;
  }
}

function jumpToHistory(id) {
  historyPrefillId = id;
  switchTab("history");
}

// ---------- Refresh everything ----------

async function refreshAll() {
  if (!readContract) return;
  await loadHandlers();
  buildAccountDropdown();
  document.getElementById("accountSelect").value = selectedIndex;
  updateHeaderForSelectedAccount();
  await loadEvidenceCache();
  renderDashboard();
  renderRegisterTab();
  renderTransferTab();
  renderAdminTab();
}

async function loadEvidenceCache() {
  evidenceCache = [null];
  const count = Number(await readContract.evidenceCount());
  for (let i = 1; i <= count; i++) {
    const ev = await readContract.getEvidence(i);
    evidenceCache.push(ev);
  }
}

// ---------- Tab 1: Dashboard ----------

function renderDashboard() {
  const tbody = document.getElementById("dashboardTableBody");
  tbody.innerHTML = "";
  const items = evidenceCache.slice(1);
  document.getElementById("dashboardEmpty").classList.toggle("hidden", items.length > 0);

  for (const ev of items) {
    const tr = document.createElement("tr");
    const statusIdx = Number(ev.status);
    tr.innerHTML = `
      <td>${ev.id}</td>
      <td>${escapeHtml(ev.caseId)}</td>
      <td>${escapeHtml(ev.fileName)}</td>
      <td>${escapeHtml(addressLabel(ev.currentHolder))}</td>
      <td><span class="status-pill ${STATUS_CLASS[statusIdx]}">${STATUS_NAMES[statusIdx]}</span></td>
      <td><button class="secondary view-history-btn" data-id="${ev.id}">View history</button></td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".view-history-btn").forEach((btn) => {
    btn.addEventListener("click", () => jumpToHistory(Number(btn.dataset.id)));
  });

  // Incoming transfers card
  const me = currentAddress().toLowerCase();
  const incoming = evidenceCache
    .slice(1)
    .filter((ev) => Number(ev.status) === 1 && ev.pendingHolder.toLowerCase() === me);

  const card = document.getElementById("incomingTransfersCard");
  const list = document.getElementById("incomingTransfersList");
  list.innerHTML = "";
  if (incoming.length === 0) {
    card.classList.add("hidden");
  } else {
    card.classList.remove("hidden");
    for (const ev of incoming) {
      const row = document.createElement("div");
      row.className = "card";
      row.style.marginBottom = "10px";
      row.innerHTML = `
        <div><strong>#${ev.id} — ${escapeHtml(ev.caseId)}</strong> (${escapeHtml(ev.fileName)})</div>
        <div class="hint">From: ${escapeHtml(addressLabel(ev.currentHolder))}</div>
        <label>Note</label>
        <input type="text" class="incoming-note" placeholder="optional note" />
        <button class="accept-btn">Accept</button>
        <button class="danger reject-btn">Reject</button>
      `;
      const noteInput = row.querySelector(".incoming-note");
      row.querySelector(".accept-btn").addEventListener("click", (e) => {
        sendTx(
          e.target,
          () => getSignerContract().acceptTransfer(ev.id, noteInput.value || ""),
          `Evidence #${ev.id} accepted`
        );
      });
      row.querySelector(".reject-btn").addEventListener("click", (e) => {
        sendTx(
          e.target,
          () => getSignerContract().rejectTransfer(ev.id, noteInput.value || ""),
          `Evidence #${ev.id} rejected`
        );
      });
      list.appendChild(row);
    }
  }
}

function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Tab 2: Register Evidence ----------

let pendingRegisterHash = null;

function renderRegisterTab() {
  const me = currentAddress().toLowerCase();
  const info = handlersInfo[me];
  const isInvestigator = info && info.active && info.role === 1;

  document.getElementById("registerDenied").classList.toggle("hidden", isInvestigator);
  document.getElementById("registerForm").classList.toggle("hidden", !isInvestigator);
}

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("regFile");
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    const infoBox = document.getElementById("regFileInfo");
    const registerBtn = document.getElementById("registerBtn");
    if (!file) {
      infoBox.classList.add("hidden");
      registerBtn.disabled = true;
      pendingRegisterHash = null;
      return;
    }
    const hash = await sha256File(file);
    pendingRegisterHash = hash;
    document.getElementById("regFileName").textContent = file.name;
    document.getElementById("regFileSize").textContent = formatSize(file.size);
    document.getElementById("regFileHash").textContent = hash;
    infoBox.classList.remove("hidden");
    registerBtn.disabled = false;
  });

  document.getElementById("registerBtn").addEventListener("click", async (e) => {
    const caseId = document.getElementById("regCaseId").value.trim();
    const description = document.getElementById("regDescription").value.trim();
    const file = fileInput.files[0];
    if (!caseId || !file || !pendingRegisterHash) {
      toast("Case ID and a file are required.", "error");
      return;
    }
    const resultBox = document.getElementById("registerResult");
    resultBox.classList.add("hidden");

    const receipt = await sendTx(
      e.target,
      () => getSignerContract().registerEvidence(caseId, description, file.name, pendingRegisterHash),
      "Evidence registered"
    );
    if (receipt) {
      const iface = new ethers.Interface(EVIDENCE_CONFIG.abi);
      let evidenceId = "?";
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === "EvidenceRegistered") {
            evidenceId = parsed.args.id.toString();
            break;
          }
        } catch (_) {
          /* not our event, ignore */
        }
      }
      resultBox.innerHTML = `
        <div><strong>Evidence ID:</strong> ${evidenceId}</div>
        <div><strong>Tx hash:</strong> <span class="mono">${receipt.hash}</span></div>
        <div><strong>Block number:</strong> ${receipt.blockNumber}</div>
      `;
      resultBox.classList.remove("hidden");
    }
  });

  document.getElementById("retryConnectionBtn").addEventListener("click", connect);

  setupTabs();
  connect();
});

// ---------- Tab 3: Transfer Custody ----------

function renderTransferTab() {
  const me = currentAddress().toLowerCase();

  // Evidence held by me, InCustody
  const evidenceSelect = document.getElementById("transferEvidenceSelect");
  evidenceSelect.innerHTML = "";
  const myEvidence = evidenceCache
    .slice(1)
    .filter((ev) => ev.currentHolder.toLowerCase() === me && Number(ev.status) === 0);
  for (const ev of myEvidence) {
    const opt = document.createElement("option");
    opt.value = ev.id;
    opt.textContent = `#${ev.id} — ${ev.caseId} (${ev.fileName})`;
    evidenceSelect.appendChild(opt);
  }

  // Recipients: active handlers except self
  const recipientSelect = document.getElementById("transferRecipientSelect");
  recipientSelect.innerHTML = "";
  for (const [addr, info] of Object.entries(handlersInfo)) {
    if (!info.active || addr === me) continue;
    const opt = document.createElement("option");
    opt.value = addr;
    opt.textContent = `${info.name} (${ROLE_NAMES[info.role]})`;
    recipientSelect.appendChild(opt);
  }

  document.getElementById("requestTransferBtn").onclick = (e) => {
    const evId = evidenceSelect.value;
    const to = recipientSelect.value;
    const note = document.getElementById("transferNote").value || "";
    if (!evId || !to) {
      toast("Select evidence and a recipient.", "error");
      return;
    }
    sendTx(
      e.target,
      () => getSignerContract().requestTransfer(evId, to, note),
      `Transfer requested for #${evId}`
    );
  };

  // Outgoing pending transfers
  const outgoing = evidenceCache
    .slice(1)
    .filter((ev) => ev.currentHolder.toLowerCase() === me && Number(ev.status) === 1);
  const list = document.getElementById("outgoingTransfersList");
  list.innerHTML = "";
  document.getElementById("outgoingEmpty").classList.toggle("hidden", outgoing.length > 0);
  for (const ev of outgoing) {
    const row = document.createElement("div");
    row.className = "card";
    row.style.marginBottom = "10px";
    row.innerHTML = `
      <div><strong>#${ev.id} — ${escapeHtml(ev.caseId)}</strong> (${escapeHtml(ev.fileName)})</div>
      <div class="hint">Pending recipient: ${escapeHtml(addressLabel(ev.pendingHolder))}</div>
      <button class="danger cancel-btn">Cancel</button>
    `;
    row.querySelector(".cancel-btn").addEventListener("click", (e) => {
      sendTx(e.target, () => getSignerContract().cancelTransfer(ev.id), `Transfer #${ev.id} cancelled`);
    });
    list.appendChild(row);
  }
}

// ---------- Tab 4: Verify Integrity ----------

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("verifyBtn").addEventListener("click", async () => {
    const idInput = document.getElementById("verifyId");
    const fileInput = document.getElementById("verifyFile");
    const id = Number(idInput.value);
    const file = fileInput.files[0];
    if (!id || !file) {
      toast("Enter an Evidence ID and choose a file.", "error");
      return;
    }
    try {
      const ev = await readContract.getEvidence(id);
      const computedHash = await sha256File(file);
      const matches = await readContract.verifyEvidence(id, computedHash);

      const panel = document.getElementById("verifyResultPanel");
      const textEl = document.getElementById("verifyResultText");
      panel.classList.remove("hidden");
      document.getElementById("verifyOnChainHash").textContent = ev.fileHash;
      document.getElementById("verifyComputedHash").textContent = computedHash;

      if (matches) {
        panel.className = "verify-panel authentic";
        textEl.textContent = "✔ AUTHENTIC — file matches the blockchain record";
      } else {
        panel.className = "verify-panel tampered";
        textEl.textContent = "✘ TAMPERED — file does NOT match the blockchain record";
      }

      // Admit as Evidence button
      const admitBtn = document.getElementById("admitBtn");
      const me = currentAddress().toLowerCase();
      const info = handlersInfo[me];
      const canAdmit =
        matches &&
        info &&
        info.active &&
        info.role === 4 &&
        ev.currentHolder.toLowerCase() === me &&
        Number(ev.status) === 0;

      admitBtn.classList.toggle("hidden", !canAdmit);
      admitBtn.onclick = (e) => {
        sendTx(e.target, () => getSignerContract().admitEvidence(id, computedHash), `Evidence #${id} admitted`);
      };
    } catch (err) {
      toast(errMessage(err), "error");
    }
  });

  document.getElementById("findBtn").addEventListener("click", async () => {
    const fileInput = document.getElementById("findFile");
    const file = fileInput.files[0];
    if (!file) {
      toast("Choose a file first.", "error");
      return;
    }
    const hash = await sha256File(file);
    const id = Number(await readContract.findByHash(hash));
    const resultBox = document.getElementById("findResult");
    resultBox.classList.remove("hidden");
    if (id === 0) {
      resultBox.innerHTML = "No record — this file was never registered.";
    } else {
      const ev = await readContract.getEvidence(id);
      resultBox.innerHTML = `
        <div><strong>Evidence ID:</strong> ${id}</div>
        <div><strong>Case ID:</strong> ${escapeHtml(ev.caseId)}</div>
        <div><strong>Description:</strong> ${escapeHtml(ev.description)}</div>
        <div><strong>File name:</strong> ${escapeHtml(ev.fileName)}</div>
        <div><strong>Current holder:</strong> ${escapeHtml(addressLabel(ev.currentHolder))}</div>
        <div><strong>Status:</strong> ${STATUS_NAMES[Number(ev.status)]}</div>
      `;
    }
  });

  document.getElementById("loadHistoryBtn").addEventListener("click", () => {
    const id = Number(document.getElementById("historyId").value);
    if (id) loadHistory(id);
  });
});

// ---------- Tab 5: Custody History ----------

async function loadHistory(id) {
  try {
    const ev = await readContract.getEvidence(id);
    const history = await readContract.getCustodyHistory(id);

    document.getElementById("historySummaryCard").classList.remove("hidden");
    document.getElementById("historySummaryBody").innerHTML = `
      <tr><td>Case ID</td><td>${escapeHtml(ev.caseId)}</td></tr>
      <tr><td>Description</td><td>${escapeHtml(ev.description)}</td></tr>
      <tr><td>File name</td><td>${escapeHtml(ev.fileName)}</td></tr>
      <tr><td>Full hash</td><td class="mono">${ev.fileHash}</td></tr>
      <tr><td>Collected by</td><td>${escapeHtml(addressLabel(ev.collectedBy))}</td></tr>
      <tr><td>Registered at</td><td>${formatTimestamp(ev.registeredAt)}</td></tr>
      <tr><td>Status</td><td><span class="status-pill ${STATUS_CLASS[Number(ev.status)]}">${STATUS_NAMES[Number(ev.status)]}</span></td></tr>
    `;

    const timelineCard = document.getElementById("historyTimelineCard");
    const timeline = document.getElementById("historyTimeline");
    timeline.innerHTML = "";
    timelineCard.classList.remove("hidden");

    for (const record of history) {
      const actionIdx = Number(record.action);
      const item = document.createElement("div");
      item.className = "timeline-item";
      const fromLabel = record.from === ethers.ZeroAddress ? "—" : addressLabel(record.from);
      const toLabel = addressLabel(record.to);
      item.innerHTML = `
        <div class="timeline-icon">${ACTION_ICONS[actionIdx]}</div>
        <div class="timeline-title">${ACTION_NAMES[actionIdx]}</div>
        <div class="timeline-meta">${escapeHtml(fromLabel)} → ${escapeHtml(toLabel)} · ${formatTimestamp(record.timestamp)}</div>
        <div class="timeline-note">${escapeHtml(record.note)}</div>
      `;
      timeline.appendChild(item);
    }
  } catch (err) {
    toast(errMessage(err), "error");
  }
}

// ---------- Tab 6: Admin ----------

function renderAdminTab() {
  const tbody = document.getElementById("adminHandlersTableBody");
  tbody.innerHTML = "";
  for (const [addr, info] of Object.entries(handlersInfo)) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${shortAddr(addr)}</td>
      <td>${escapeHtml(info.name)}</td>
      <td>${ROLE_NAMES[info.role]}</td>
      <td>${info.active ? "Yes" : "No"}</td>
      <td>${info.active ? `<button class="danger deactivate-btn" data-addr="${addr}">Deactivate</button>` : ""}</td>
    `;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll(".deactivate-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      sendTx(
        e.target,
        () => getSignerContract().deactivateHandler(btn.dataset.addr),
        "Handler deactivated"
      );
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("accountSelect").addEventListener("change", (e) => {
    selectAccount(Number(e.target.value));
  });

  document.getElementById("addHandlerBtn").addEventListener("click", async (e) => {
    const address = document.getElementById("adminAddress").value.trim();
    const name = document.getElementById("adminName").value.trim();
    const role = Number(document.getElementById("adminRole").value);
    if (!ethers.isAddress(address) || !name) {
      toast("Enter a valid address and name.", "error");
      return;
    }
    const resultBox = document.getElementById("adminResult");
    resultBox.classList.add("hidden");
    // sendTx() already reloads handlers and refreshes every panel on success.
    const receipt = await sendTx(
      e.target,
      () => getSignerContract().addHandler(address, name, role),
      "Handler added"
    );
    if (receipt) {
      document.getElementById("adminAddress").value = "";
      document.getElementById("adminName").value = "";
    }
  });
});

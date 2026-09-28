const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("hardhat");

const Role = { None: 0, Investigator: 1, Analyst: 2, Custodian: 3, Court: 4 };

function hashFile(filePath) {
  return "0x" + crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function main() {
  const deploymentPath = path.join(__dirname, "..", "deployment.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("deployment.json not found. Run `npm run deploy` first.");
  }
  const { address } = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const contract = await ethers.getContractAt("EvidenceChain", address);

  const [admin, inv, analyst, custodian, court] = await ethers.getSigners();

  console.log("Adding handlers...");
  await (await contract.connect(admin).addHandler(inv.address, "Det. Perera", Role.Investigator)).wait();
  await (
    await contract.connect(admin).addHandler(analyst.address, "Forensic Analyst Silva", Role.Analyst)
  ).wait();
  await (
    await contract
      .connect(admin)
      .addHandler(custodian.address, "Evidence Room - Officer Fernando", Role.Custodian)
  ).wait();
  await (
    await contract.connect(admin).addHandler(court.address, "Magistrate Court - Galle", Role.Court)
  ).wait();

  console.log("Registering evidence #1 (server_access_log.txt)...");
  const logPath = path.join(__dirname, "..", "sample-evidence", "server_access_log.txt");
  const logHash = hashFile(logPath);

  const tx = await contract
    .connect(inv)
    .registerEvidence(
      "CASE-2026-014",
      "Web server access log from compromised host",
      "server_access_log.txt",
      logHash
    );
  await tx.wait();

  console.log("Requesting transfer to Forensic Analyst Silva...");
  await (
    await contract.connect(inv).requestTransfer(1, analyst.address, "Sent for log analysis")
  ).wait();

  console.log("Analyst accepting transfer...");
  await (await contract.connect(analyst).acceptTransfer(1, "Received at forensic lab")).wait();

  // Note: suspect_chat_log.txt is intentionally NOT registered here — it is
  // reserved for the live demo (Phase 3 demo script).

  console.log("\nSeed complete. Summary:");
  console.log("-----------------------------------------------------------");
  console.log(`Admin                              | ${admin.address}`);
  console.log(`Det. Perera (Investigator)         | ${inv.address}`);
  console.log(`Forensic Analyst Silva (Analyst)   | ${analyst.address}`);
  console.log(`Evidence Room - Fernando (Custodian)| ${custodian.address}`);
  console.log(`Magistrate Court - Galle (Court)   | ${court.address}`);
  console.log("-----------------------------------------------------------");
  console.log("Evidence #1: CASE-2026-014, held by Forensic Analyst Silva, 3 custody records.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const EvidenceChain = await ethers.getContractFactory("EvidenceChain");
  const contract = await EvidenceChain.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  // Read the ABI from the compiled artifact.
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "EvidenceChain.sol",
    "EvidenceChain.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const frontendDir = path.join(__dirname, "..", "frontend");
  const libDir = path.join(frontendDir, "lib");
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  // Write frontend/contract-config.js — consumed directly by the browser.
  const configContent =
    `window.EVIDENCE_CONFIG = ${JSON.stringify(
      {
        address: address,
        chainId: 31337,
        rpcUrl: "http://127.0.0.1:8545",
        abi: artifact.abi,
      },
      null,
      2
    )};\n`;
  fs.writeFileSync(path.join(frontendDir, "contract-config.js"), configContent);

  // Write deployment.json — a simpler source of truth for other scripts (e.g. seed.js).
  fs.writeFileSync(
    path.join(__dirname, "..", "deployment.json"),
    JSON.stringify({ address: address, admin: deployer.address }, null, 2) + "\n"
  );

  // Copy the ethers UMD bundle so the frontend works fully offline (no CDN).
  const ethersSrc = path.join(__dirname, "..", "node_modules", "ethers", "dist", "ethers.umd.min.js");
  const ethersDest = path.join(libDir, "ethers.umd.min.js");
  fs.copyFileSync(ethersSrc, ethersDest);

  console.log("EvidenceChain deployed to:", address);
  console.log("Admin (deployer) address:", deployer.address);
  console.log("frontend/contract-config.js written.");
  console.log("frontend/lib/ethers.umd.min.js copied.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

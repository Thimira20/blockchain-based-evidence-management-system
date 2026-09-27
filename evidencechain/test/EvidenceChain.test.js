const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const Role = { None: 0, Investigator: 1, Analyst: 2, Custodian: 3, Court: 4 };
const Status = { InCustody: 0, TransferPending: 1, Admitted: 2 };
const Action = {
  Registered: 0,
  TransferRequested: 1,
  TransferAccepted: 2,
  TransferRejected: 3,
  TransferCancelled: 4,
  Admitted: 5,
};

const HASH_A = ethers.sha256(ethers.toUtf8Bytes("original evidence"));
const HASH_B = ethers.sha256(ethers.toUtf8Bytes("tampered evidence"));

describe("EvidenceChain", function () {
  async function deployFixture() {
    const [admin, investigator, analyst, custodian, court, outsider] = await ethers.getSigners();

    const EvidenceChain = await ethers.getContractFactory("EvidenceChain");
    const contract = await EvidenceChain.deploy();
    await contract.waitForDeployment();

    await contract.connect(admin).addHandler(investigator.address, "Det. Perera", Role.Investigator);
    await contract.connect(admin).addHandler(analyst.address, "Forensic Analyst Silva", Role.Analyst);
    await contract.connect(admin).addHandler(custodian.address, "Evidence Room - Officer Fernando", Role.Custodian);
    await contract.connect(admin).addHandler(court.address, "Magistrate Court - Galle", Role.Court);

    return { contract, admin, investigator, analyst, custodian, court, outsider };
  }

  describe("Handlers", function () {
    it("1. Admin is the deployer", async function () {
      const { contract, admin } = await loadFixture(deployFixture);
      expect(await contract.admin()).to.equal(admin.address);
    });

    it("2. Admin can add a handler, and it emits HandlerAdded", async function () {
      const { contract, admin, outsider } = await loadFixture(deployFixture);
      await expect(contract.connect(admin).addHandler(outsider.address, "New Handler", Role.Investigator))
        .to.emit(contract, "HandlerAdded")
        .withArgs(outsider.address, "New Handler", Role.Investigator);
    });

    it("3. A non-admin cannot add a handler", async function () {
      const { contract, investigator, outsider } = await loadFixture(deployFixture);
      await expect(
        contract.connect(investigator).addHandler(outsider.address, "Someone", Role.Analyst)
      ).to.be.revertedWith("Only admin");
    });

    it("4. Adding with Role.None reverts", async function () {
      const { contract, admin, outsider } = await loadFixture(deployFixture);
      await expect(
        contract.connect(admin).addHandler(outsider.address, "No Role", Role.None)
      ).to.be.revertedWith("Invalid role");
    });

    it("5. getHandlers() returns the 4 handler addresses", async function () {
      const { contract, investigator, analyst, custodian, court } = await loadFixture(deployFixture);
      const handlers = await contract.getHandlers();
      expect(handlers).to.deep.equal([
        investigator.address,
        analyst.address,
        custodian.address,
        court.address,
      ]);
    });

    it("6. A deactivated handler cannot register or transfer", async function () {
      const { contract, admin, investigator, analyst } = await loadFixture(deployFixture);
      await contract.connect(admin).deactivateHandler(investigator.address);
      await expect(
        contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A)
      ).to.be.revertedWith("Not an authorised handler");

      await contract.connect(admin).deactivateHandler(analyst.address);
      await expect(
        contract.connect(analyst).requestTransfer(1, investigator.address, "note")
      ).to.be.revertedWith("Not an authorised handler");
    });
  });

  describe("Registration", function () {
    it("7. An investigator registers evidence", async function () {
      const { contract, investigator } = await loadFixture(deployFixture);
      await expect(
        contract.connect(investigator).registerEvidence("CASE-2026-014", "desc", "file.txt", HASH_A)
      )
        .to.emit(contract, "EvidenceRegistered")
        .withArgs(1, "CASE-2026-014", HASH_A, investigator.address);

      const ev = await contract.getEvidence(1);
      expect(ev.id).to.equal(1);
      expect(ev.currentHolder).to.equal(investigator.address);
      expect(ev.status).to.equal(Status.InCustody);

      const history = await contract.getCustodyHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].action).to.equal(Action.Registered);
    });

    it("8. An analyst cannot register", async function () {
      const { contract, analyst } = await loadFixture(deployFixture);
      await expect(
        contract.connect(analyst).registerEvidence("CASE-1", "desc", "file.txt", HASH_A)
      ).to.be.revertedWith("Only investigators can register evidence");
    });

    it("9. An outsider cannot register", async function () {
      const { contract, outsider } = await loadFixture(deployFixture);
      await expect(
        contract.connect(outsider).registerEvidence("CASE-1", "desc", "file.txt", HASH_A)
      ).to.be.revertedWith("Not an authorised handler");
    });

    it("10. A duplicate hash reverts", async function () {
      const { contract, investigator } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await expect(
        contract.connect(investigator).registerEvidence("CASE-2", "desc2", "file2.txt", HASH_A)
      ).to.be.revertedWith("Evidence already registered");
    });

    it("11. A zero hash reverts", async function () {
      const { contract, investigator } = await loadFixture(deployFixture);
      await expect(
        contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", ethers.ZeroHash)
      ).to.be.revertedWith("Invalid hash");
    });
  });

  describe("Transfers", function () {
    it("12. Full transfer investigator -> analyst", async function () {
      const { contract, investigator, analyst } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);

      await contract.connect(investigator).requestTransfer(1, analyst.address, "Sent for analysis");
      let ev = await contract.getEvidence(1);
      expect(ev.status).to.equal(Status.TransferPending);

      await contract.connect(analyst).acceptTransfer(1, "Received");
      ev = await contract.getEvidence(1);
      expect(ev.currentHolder).to.equal(analyst.address);
      expect(ev.status).to.equal(Status.InCustody);

      const history = await contract.getCustodyHistory(1);
      expect(history.length).to.equal(3);
    });

    it("13. A non-holder cannot request a transfer", async function () {
      const { contract, investigator, analyst, custodian } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await expect(
        contract.connect(analyst).requestTransfer(1, custodian.address, "note")
      ).to.be.revertedWith("Only current holder");
    });

    it("14. A transfer to an outsider reverts", async function () {
      const { contract, investigator, outsider } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await expect(
        contract.connect(investigator).requestTransfer(1, outsider.address, "note")
      ).to.be.revertedWith("Recipient not an authorised handler");
    });

    it("15. Only the pending recipient can accept", async function () {
      const { contract, investigator, analyst, custodian } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, analyst.address, "note");
      await expect(
        contract.connect(custodian).acceptTransfer(1, "note")
      ).to.be.revertedWith("Only pending recipient");
    });

    it("16. Reject keeps the original holder and logs TransferRejected", async function () {
      const { contract, investigator, analyst } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, analyst.address, "note");
      await contract.connect(analyst).rejectTransfer(1, "Not my case");

      const ev = await contract.getEvidence(1);
      expect(ev.currentHolder).to.equal(investigator.address);
      expect(ev.status).to.equal(Status.InCustody);

      const history = await contract.getCustodyHistory(1);
      expect(history[history.length - 1].action).to.equal(Action.TransferRejected);
    });

    it("17. Cancel by the holder clears the pending state and logs TransferCancelled", async function () {
      const { contract, investigator, analyst } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, analyst.address, "note");
      await contract.connect(investigator).cancelTransfer(1);

      const ev = await contract.getEvidence(1);
      expect(ev.pendingHolder).to.equal(ethers.ZeroAddress);
      expect(ev.status).to.equal(Status.InCustody);

      const history = await contract.getCustodyHistory(1);
      expect(history[history.length - 1].action).to.equal(Action.TransferCancelled);
    });

    it("18. A second request while one is pending reverts", async function () {
      const { contract, investigator, analyst, custodian } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, analyst.address, "note");
      await expect(
        contract.connect(investigator).requestTransfer(1, custodian.address, "note2")
      ).to.be.revertedWith("Evidence not available for transfer");
    });
  });

  describe("Verification and admission", function () {
    it("19. verifyEvidence matches/mismatches correctly", async function () {
      const { contract, investigator } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      expect(await contract.verifyEvidence(1, HASH_A)).to.equal(true);
      expect(await contract.verifyEvidence(1, HASH_B)).to.equal(false);
    });

    it("20. findByHash returns correct id / 0", async function () {
      const { contract, investigator } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      expect(await contract.findByHash(HASH_A)).to.equal(1);
      expect(await contract.findByHash(HASH_B)).to.equal(0);
    });

    it("21. A court holding the evidence admits it with the correct hash", async function () {
      const { contract, investigator, court } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, court.address, "For hearing");
      await contract.connect(court).acceptTransfer(1, "Received");

      await expect(contract.connect(court).admitEvidence(1, HASH_A))
        .to.emit(contract, "EvidenceAdmitted")
        .withArgs(1, court.address);

      const ev = await contract.getEvidence(1);
      expect(ev.status).to.equal(Status.Admitted);
    });

    it("22. A court admitting with the wrong hash reverts", async function () {
      const { contract, investigator, court } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, court.address, "For hearing");
      await contract.connect(court).acceptTransfer(1, "Received");

      await expect(
        contract.connect(court).admitEvidence(1, HASH_B)
      ).to.be.revertedWith("Hash mismatch: evidence tampered");
    });

    it("23. A non-court holder cannot admit", async function () {
      const { contract, investigator } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await expect(
        contract.connect(investigator).admitEvidence(1, HASH_A)
      ).to.be.revertedWith("Only court can admit evidence");
    });

    it("24. After admission, requestTransfer reverts", async function () {
      const { contract, investigator, analyst, court } = await loadFixture(deployFixture);
      await contract.connect(investigator).registerEvidence("CASE-1", "desc", "file.txt", HASH_A);
      await contract.connect(investigator).requestTransfer(1, court.address, "For hearing");
      await contract.connect(court).acceptTransfer(1, "Received");
      await contract.connect(court).admitEvidence(1, HASH_A);

      await expect(
        contract.connect(court).requestTransfer(1, analyst.address, "note")
      ).to.be.revertedWith("Evidence not available for transfer");
    });

    it("25. getEvidence(99) reverts", async function () {
      const { contract } = await loadFixture(deployFixture);
      await expect(contract.getEvidence(99)).to.be.revertedWith("Evidence does not exist");
    });
  });
});

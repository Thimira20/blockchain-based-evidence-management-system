// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EvidenceChain {
    enum Role   { None, Investigator, Analyst, Custodian, Court }
    enum Status { InCustody, TransferPending, Admitted }
    enum Action { Registered, TransferRequested, TransferAccepted, TransferRejected, TransferCancelled, Admitted }

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

    address public admin;
    uint256 public evidenceCount;                       // ids start at 1
    mapping(address => Handler) public handlers;
    address[] private handlerList;                      // every address ever added
    mapping(uint256 => Evidence) private evidences;
    mapping(uint256 => CustodyRecord[]) private custodyLogs;
    mapping(bytes32 => uint256) public hashToEvidenceId; // 0 = not registered

    event HandlerAdded(address indexed account, string name, Role role);
    event HandlerDeactivated(address indexed account);
    event EvidenceRegistered(uint256 indexed id, string caseId, bytes32 fileHash, address indexed collectedBy);
    event TransferRequested(uint256 indexed id, address indexed from, address indexed to);
    event TransferAccepted(uint256 indexed id, address indexed from, address indexed to);
    event TransferRejected(uint256 indexed id, address indexed from, address indexed to);
    event TransferCancelled(uint256 indexed id, address indexed from, address indexed to);
    event EvidenceAdmitted(uint256 indexed id, address indexed court);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    modifier onlyActiveHandler() {
        require(handlers[msg.sender].active, "Not an authorised handler");
        _;
    }

    modifier evidenceExists(uint256 id) {
        require(id >= 1 && id <= evidenceCount, "Evidence does not exist");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function addHandler(address account, string calldata name, Role role) external onlyAdmin {
        require(account != address(0), "Invalid address");
        require(role != Role.None, "Invalid role");
        require(!handlers[account].active, "Handler already active");

        if (bytes(handlers[account].name).length == 0) {
            handlerList.push(account);
        }

        handlers[account] = Handler(name, role, true);
        emit HandlerAdded(account, name, role);
    }

    function deactivateHandler(address account) external onlyAdmin {
        require(handlers[account].active, "Handler not active");
        handlers[account].active = false;
        emit HandlerDeactivated(account);
    }

    function registerEvidence(
        string calldata caseId,
        string calldata description,
        string calldata fileName,
        bytes32 fileHash
    ) external onlyActiveHandler returns (uint256) {
        require(handlers[msg.sender].role == Role.Investigator, "Only investigators can register evidence");
        require(fileHash != bytes32(0), "Invalid hash");
        require(bytes(caseId).length > 0, "Case ID required");
        require(hashToEvidenceId[fileHash] == 0, "Evidence already registered");

        uint256 id = ++evidenceCount;

        evidences[id] = Evidence({
            id: id,
            caseId: caseId,
            description: description,
            fileName: fileName,
            fileHash: fileHash,
            collectedBy: msg.sender,
            currentHolder: msg.sender,
            pendingHolder: address(0),
            registeredAt: block.timestamp,
            status: Status.InCustody
        });

        hashToEvidenceId[fileHash] = id;

        custodyLogs[id].push(CustodyRecord({
            action: Action.Registered,
            from: address(0),
            to: msg.sender,
            timestamp: block.timestamp,
            note: "Evidence collected and registered"
        }));

        emit EvidenceRegistered(id, caseId, fileHash, msg.sender);
        return id;
    }

    function requestTransfer(uint256 id, address to, string calldata note)
        external
        onlyActiveHandler
        evidenceExists(id)
    {
        Evidence storage ev = evidences[id];
        require(msg.sender == ev.currentHolder, "Only current holder");
        require(ev.status == Status.InCustody, "Evidence not available for transfer");
        require(handlers[to].active, "Recipient not an authorised handler");
        require(to != msg.sender, "Cannot transfer to self");

        ev.pendingHolder = to;
        ev.status = Status.TransferPending;

        custodyLogs[id].push(CustodyRecord({
            action: Action.TransferRequested,
            from: msg.sender,
            to: to,
            timestamp: block.timestamp,
            note: note
        }));

        emit TransferRequested(id, msg.sender, to);
    }

    function acceptTransfer(uint256 id, string calldata note)
        external
        onlyActiveHandler
        evidenceExists(id)
    {
        Evidence storage ev = evidences[id];
        require(ev.status == Status.TransferPending, "No pending transfer");
        require(msg.sender == ev.pendingHolder, "Only pending recipient");

        address from = ev.currentHolder;
        ev.currentHolder = msg.sender;
        ev.pendingHolder = address(0);
        ev.status = Status.InCustody;

        custodyLogs[id].push(CustodyRecord({
            action: Action.TransferAccepted,
            from: from,
            to: msg.sender,
            timestamp: block.timestamp,
            note: note
        }));

        emit TransferAccepted(id, from, msg.sender);
    }

    function rejectTransfer(uint256 id, string calldata note)
        external
        onlyActiveHandler
        evidenceExists(id)
    {
        Evidence storage ev = evidences[id];
        require(ev.status == Status.TransferPending, "No pending transfer");
        require(msg.sender == ev.pendingHolder, "Only pending recipient");

        ev.pendingHolder = address(0);
        ev.status = Status.InCustody;

        custodyLogs[id].push(CustodyRecord({
            action: Action.TransferRejected,
            from: ev.currentHolder,
            to: msg.sender,
            timestamp: block.timestamp,
            note: note
        }));

        emit TransferRejected(id, ev.currentHolder, msg.sender);
    }

    function cancelTransfer(uint256 id)
        external
        onlyActiveHandler
        evidenceExists(id)
    {
        Evidence storage ev = evidences[id];
        require(ev.status == Status.TransferPending, "No pending transfer");
        require(msg.sender == ev.currentHolder, "Only current holder");

        address to = ev.pendingHolder;
        ev.pendingHolder = address(0);
        ev.status = Status.InCustody;

        custodyLogs[id].push(CustodyRecord({
            action: Action.TransferCancelled,
            from: msg.sender,
            to: to,
            timestamp: block.timestamp,
            note: "Transfer cancelled by holder"
        }));

        emit TransferCancelled(id, msg.sender, to);
    }

    function admitEvidence(uint256 id, bytes32 fileHash)
        external
        onlyActiveHandler
        evidenceExists(id)
    {
        Evidence storage ev = evidences[id];
        require(handlers[msg.sender].role == Role.Court, "Only court can admit evidence");
        require(msg.sender == ev.currentHolder, "Only current holder");
        require(ev.status == Status.InCustody, "Evidence not available for admission");
        require(fileHash == ev.fileHash, "Hash mismatch: evidence tampered");

        ev.status = Status.Admitted;

        custodyLogs[id].push(CustodyRecord({
            action: Action.Admitted,
            from: msg.sender,
            to: msg.sender,
            timestamp: block.timestamp,
            note: "Integrity verified and admitted by court"
        }));

        emit EvidenceAdmitted(id, msg.sender);
    }

    function verifyEvidence(uint256 id, bytes32 fileHash)
        external
        view
        evidenceExists(id)
        returns (bool)
    {
        return evidences[id].fileHash == fileHash;
    }

    function findByHash(bytes32 fileHash) external view returns (uint256) {
        return hashToEvidenceId[fileHash];
    }

    function getEvidence(uint256 id)
        external
        view
        evidenceExists(id)
        returns (Evidence memory)
    {
        return evidences[id];
    }

    function getCustodyHistory(uint256 id)
        external
        view
        evidenceExists(id)
        returns (CustodyRecord[] memory)
    {
        return custodyLogs[id];
    }

    function getHandlers() external view returns (address[] memory) {
        return handlerList;
    }
}

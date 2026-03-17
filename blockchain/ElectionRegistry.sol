// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ElectionRegistry {
    address public owner;

    struct Election {
        uint256 id;
        string name;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        bytes32 tallyHash;
    }

    uint256 public nextElectionId;
    mapping(uint256 => Election) public elections;

    // electionId => voterNullifier => used
    mapping(uint256 => mapping(bytes32 => bool)) public nullifierUsed;

    // electionId => commitment hashes
    mapping(uint256 => bytes32[]) private voteCommitments;

    event ElectionCreated(uint256 indexed electionId, string name, uint256 startTime, uint256 endTime);
    event VoteCommitted(uint256 indexed electionId, bytes32 indexed commitment, bytes32 indexed voterNullifier);
    event ElectionFinalized(uint256 indexed electionId, bytes32 tallyHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createElection(
        string calldata name,
        uint256 startTime,
        uint256 endTime
    ) external onlyOwner returns (uint256 electionId) {
        require(startTime < endTime, "Invalid time window");

        electionId = nextElectionId++;
        elections[electionId] = Election({
            id: electionId,
            name: name,
            startTime: startTime,
            endTime: endTime,
            finalized: false,
            tallyHash: bytes32(0)
        });

        emit ElectionCreated(electionId, name, startTime, endTime);
    }

    function commitVote(
        uint256 electionId,
        bytes32 commitment,
        bytes32 voterNullifier
    ) external {
        Election storage e = elections[electionId];
        require(e.endTime != 0 || e.startTime != 0, "Election not found");
        require(block.timestamp >= e.startTime, "Election not started");
        require(block.timestamp <= e.endTime, "Election ended");
        require(!e.finalized, "Election finalized");
        require(!nullifierUsed[electionId][voterNullifier], "Already voted");

        nullifierUsed[electionId][voterNullifier] = true;
        voteCommitments[electionId].push(commitment);

        emit VoteCommitted(electionId, commitment, voterNullifier);
    }

    function finalizeElection(uint256 electionId, bytes32 tallyHash) external onlyOwner {
        Election storage e = elections[electionId];
        require(e.endTime != 0 || e.startTime != 0, "Election not found");
        require(block.timestamp > e.endTime, "Election still active");
        require(!e.finalized, "Already finalized");

        e.finalized = true;
        e.tallyHash = tallyHash;

        emit ElectionFinalized(electionId, tallyHash);
    }

    function getCommitments(uint256 electionId) external view returns (bytes32[] memory) {
        return voteCommitments[electionId];
    }
}

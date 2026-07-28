// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArgoEscrow
 * @dev Escrow registry contract for Argo autonomous agent missions.
 * Dispatched on Ethereum Sepolia for WTF Hackathon.
 */
contract ArgoEscrow {
    struct Mission {
        address sender;
        string agentId;
        bytes32 promptHash;
        uint256 amount;
        bool exists;
        bytes encryptedPayload; // Optional: iExec encrypted data (e.g. secure prompt or API credentials)
    }

    // Maps missionId to details
    mapping(string => Mission) public missions;

    event MissionCreated(
        string indexed missionId, 
        address indexed sender, 
        string agentId, 
        bytes32 promptHash,
        uint256 amount
    );

    event MissionSettled(
        string indexed missionId,
        bytes32 poeHash,
        uint256 amountReleased
    );

    /**
     * @notice Create a new mission and lock payment in escrow.
     * @param missionId Unique identifier for this mission.
     * @param agentId The target agent ID hired.
     * @param promptHash SHA-256 hash of the prompt.
     * @param encryptedPayload Encrypted prompt details or secrets.
     */
    function createMission(
        string calldata missionId,
        string calldata agentId,
        bytes32 promptHash,
        bytes calldata encryptedPayload
    ) external payable {
        require(!missions[missionId].exists, "Mission already exists");
        require(msg.value > 0, "Payment must be greater than zero");

        missions[missionId] = Mission({
            sender: msg.sender,
            agentId: agentId,
            promptHash: promptHash,
            amount: msg.value,
            exists: true,
            encryptedPayload: encryptedPayload
        });

        emit MissionCreated(missionId, msg.sender, agentId, promptHash, msg.value);
    }

    /**
     * @notice Releases escrowed funds (Mock function representing oracle/TEE settlement).
     */
    function settleMission(string calldata missionId, bytes32 poeHash) external {
        require(missions[missionId].exists, "Mission does not exist");
        uint256 amt = missions[missionId].amount;
        require(amt > 0, "Mission already settled or no balance");
        
        missions[missionId].amount = 0;
        emit MissionSettled(missionId, poeHash, amt);
        
        // In a full production contract, the locked funds are transferred to the executor/runner here.
        // For the hackathon demonstration, we keep it simple.
        payable(msg.sender).transfer(amt);
    }
}

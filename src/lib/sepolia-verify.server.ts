// Server-side Sepolia/EVM payment transaction verifier.
// Queries the deployed ArgoEscrow contract state on Ethereum Sepolia.

const ESCROW_CONTRACT_ADDRESS = "0xBA82d9bDDAEc31747d97d4c59d2D4F0085f5DE1d"; // Deployed demo contract
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

const ETHERS_CDNS = [
  "https://esm.sh/ethers@6.13.1",
  "https://cdn.jsdelivr.net/npm/ethers@6.13.1/+esm"
];

let ethersPromise: Promise<any> | null = null;
async function loadEthers(): Promise<any> {
  if (!ethersPromise) {
    ethersPromise = (async () => {
      for (const url of ETHERS_CDNS) {
        try {
          const mod = await import(/* @vite-ignore */ url);
          if (mod) {
            return mod.ethers || mod.BrowserProvider ? mod : (mod.default || mod);
          }
        } catch (e) {
          // try next
        }
      }
      try {
        const local = await import("ethers");
        return local;
      } catch {}
      throw new Error("Could not load Ethers on the server.");
    })();
  }
  return ethersPromise;
}

export type VerifySepoliaOutcome = {
  ok: boolean;
  amountEth?: string;
  sender?: string;
  promptHash?: string;
  encryptedPayload?: string;
  reason?: string;
};

export async function verifySepoliaMission(args: {
  missionId: string;
  agentId: string;
}): Promise<VerifySepoliaOutcome> {
  try {
    const Ethers = await loadEthers();
    const Contract = Ethers.Contract || Ethers.ethers?.Contract;
    const JsonRpcProvider = Ethers.JsonRpcProvider || Ethers.ethers?.JsonRpcProvider;
    const formatEther = Ethers.formatEther || Ethers.ethers?.formatEther;

    if (!Contract || !JsonRpcProvider) {
      return { ok: false, reason: "Ethers library loading issue on server." };
    }

    const provider = new JsonRpcProvider(RPC_URL);
    const contract = new Contract(
      ESCROW_CONTRACT_ADDRESS,
      [
        "function missions(string calldata missionId) view returns (address sender, string memory agentId, bytes32 promptHash, uint256 amount, bool exists, bytes memory encryptedPayload)"
      ],
      provider
    );

    const m = await contract.missions(args.missionId);

    if (!m || !m.exists) {
      return { ok: false, reason: `Mission ID ${args.missionId} not found on Sepolia escrow contract.` };
    }

    if (m.agentId !== args.agentId) {
      return {
        ok: false,
        reason: `Agent ID mismatch on Sepolia escrow. Expected: "${args.agentId}", Found: "${m.agentId}"`
      };
    }

    return {
      ok: true,
      amountEth: formatEther(m.amount),
      sender: m.sender,
      promptHash: m.promptHash,
      encryptedPayload: m.encryptedPayload
    };
  } catch (e) {
    console.error("verifySepoliaMission error:", e);
    return { ok: false, reason: `Sepolia RPC verification query failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}

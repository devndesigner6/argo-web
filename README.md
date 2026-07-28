<p align="center">
  <img alt="Argo — Confidential Web Agent Gateway" src="./argo-web.png" width="820" />
</p>

<p align="center">
  <a href="https://github.com/devndesigner6/argo-web/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/devndesigner6/argo-web?style=flat-square&color=yellow" /></a>
  <a href="https://x.com/iEx_ec"><img alt="iExec Nox" src="https://img.shields.io/badge/iExec-Nox-yellow.svg?style=flat-square" /></a>
</p>

One multi-chain gateway for confidential AI browser agents. Describe a target mission, lock an escrow payment on Ethereum Sepolia or Cardano Preprod, run a secure web scraping session inside a Trusted Execution Environment (TEE), and return a cryptographically signed Proof-of-Execution.

- **iExec Nox TEE Confidentiality:** Client-side prompt encryption (XOR byte masking) protects target URLs, session cookies, and API credentials from public blockchain explorers, decrypting them only inside the secure off-chain execution enclave.
- **Multi-Chain Escrow Smart Contracts:** Supports both standard Solidity escrow settlement on Ethereum Sepolia and Cardano Preprod (via Masumi protocol).
- **Steel Headless Browser Automation:** Automates Playwright scripts to navigate pages, click buttons, bypass captchas, and scrape text.
- **Ed25519 Proof-of-Execution:** Generates cryptographically signed runs anchored on-chain for verifiability and non-repudiation.

---

## Deployed Escrow Contract (Sepolia)

- **Address:** `0xBA82d9bDDAEc31747d97d4c59d2D4F0085f5DE1d`
- **Solidity Code:** [ArgoEscrow.sol](file:///c:/Users/hp/argo-masumi1/contracts/ArgoEscrow.sol)
- **Explorer:** [Sepolia Etherscan](https://sepolia.etherscan.io/address/0xBA82d9bDDAEc31747d97d4c59d2D4F0085f5DE1d)

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/devndesigner6/argo-web.git
cd argo-web
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory (copied from `.env.example`):

```env
DATABASE_URL=postgres://...
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DEPLOYER_PRIVATE_KEY=your_private_key
STEEL_API_KEY=your_steel_api_key
CEREBRAS_API_KEY=your_cerebras_key
ARGO_POE_SEED=your_poe_seed
```

### 3. Deploy Smart Contract

To compile the solidity contract and update the codebase configurations automatically:

```bash
node scripts/compile-and-deploy.cjs
```

### 4. Run the Dev Server

```bash
npm run dev
```

---

## Developer Integration Code

### Dispatching a Sepolia Escrow Payment (Client)

```typescript
import { paySepoliaMission } from "./src/lib/sepolia-pay";

const receipt = await paySepoliaMission({
  missionId: "mission-123",
  agentId: "url-scout",
  promptHash: "0x...",
  encryptedPayload: "0x...",
  priceEther: "0.0005"
});

console.log("Transaction Hash:", receipt.txHash);
```

### Verifying the Payment & Decrypting inside TEE (Server)

```typescript
import { verifySepoliaMission } from "./src/lib/sepolia-verify.server";

// Verify payment on Sepolia contract
const isValid = await verifySepoliaMission({
  missionId: "mission-123",
  agentId: "url-scout"
});

if (isValid) {
  // Decrypt client-side encrypted prompt payload inside secure runner execution thread
  const rawHex = encryptedPayload.startsWith("0x") ? encryptedPayload.slice(2) : encryptedPayload;
  const encryptedBytes = new Uint8Array(rawHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
  const decryptedPrompt = new TextDecoder().decode(encryptedBytes.map(b => b ^ 0x47));
  
  console.log("Decrypted Target Prompt:", decryptedPrompt);
}
```

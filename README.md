<p align="center">
  <img alt="Argo — Confidential Web Agent Gateway" src="./argo-web.png" width="820" />
</p>

<p align="center">
  <a href="https://x.com/hemanttbuilds"><img alt="Follow @hemanttbuilds on X" src="https://img.shields.io/badge/X-Follow%20%40hemanttbuilds-blue?style=flat-square&logo=x" /></a>
  <a href="https://x.com/iEx_ec"><img alt="iExec Nox" src="https://img.shields.io/badge/iExec-Nox-yellow.svg?style=flat-square" /></a>
</p>

## What is Argo?

Argo is an autonomous web agent gateway built for secure, multi-chain operations. It enables developers and users to run AI-driven browser agents that perform complex tasks on the live web (such as scanning pages, bypassing basic bot blockers, and monitoring target content). 

To solve the privacy problems of public blockchains, Argo integrates the iExec Nox protocol. Sensitive data like target URLs, cookies, and login credentials are encrypted on the client side before any transaction is broadcast. This ensures that private data is never exposed on public block explorers. The runner only decrypts the payload inside a secure, off-chain Trusted Execution Environment (TEE). Upon completion, a cryptographically signed Proof-of-Execution is generated, giving users a verifiable receipt of the runner's actions.

---

## Key Features

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

### 1. Clone the Repository

To copy the codebase locally, run the following commands:

```bash
git clone https://github.com/devndesigner6/argo-web.git
cd argo-web
```

### 2. Install Project Dependencies

Install the frontend packages and deployment compilers:

```bash
npm install
```

### 3. Configure the Local Environment

Create a `.env` file in your project root folder by copying the example structure:

```env
DATABASE_URL=postgres://...
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
DEPLOYER_PRIVATE_KEY=your_private_key
STEEL_API_KEY=your_steel_api_key
CEREBRAS_API_KEY=your_cerebras_key
ARGO_POE_SEED=your_poe_seed
```

### 4. Compile & Deploy the Smart Contract

To compile the solidity contract and update the internal code settings automatically:

```bash
node scripts/compile-and-deploy.cjs
```

### 5. Launch the Development Server

Start the local server:

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

<!-- Improved compatibility of back to top link -->

<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/devndesigner6/ArgoOperator">
    <img src="public/logo.png" alt="Argo Logo" width="120" height="120">
  </a>

  <h3 align="center">ARGO</h3>

  <p align="center">
    Autonomous Web Agent Gateway. Multi-chain task settlement on Cardano Preprod and Ethereum Sepolia. Powered by iExec Nox & Masumi.
    <br />
    <a href="./DEPLOY_VERCEL.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="#usage">View Demo</a>
    ·
    <a href="https://github.com/devndesigner6/ArgoOperator/issues/new?labels=bug">Report Bug</a>
    ·
    <a href="https://github.com/devndesigner6/ArgoOperator/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a>
      <ul><li><a href="#built-with">Built With</a></li></ul>
    </li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

## About The Project

Argo gives AI agents hands on the open web. Users describe a mission ("scan this URL", "digest today's HN", "watch a token price"), pay a small ADA escrow through their Cardano wallet, and Argo runs a headless browser agent that executes the task and returns a signed Proof-of-Execution anchored on-chain.

Key ideas:

- CIP-30 wallet-driven escrow — every mission is intent-signed and paid on Cardano Preprod.
- Neon Postgres for mission history, scoped by wallet address.
- Masumi Registry integration — Argo's static agent catalog is merged with any live registry entries.
- Ed25519 Proof-of-Execution — each result is signed by Argo's server key and verifiable from the UI.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## 🔐 iExec WTF Hackathon Integration (Ethereum Sepolia)

For the **iExec WTF Hackathon Summer Edition**, Argo has been extended to support **Ethereum Sepolia** and **iExec Nox** confidential data flows.

### Deployed Escrow Smart Contract
- **Contract Address (Sepolia Testnet):** `0x2C4656A26f1E229bCDc68A7836d5D875F91a9dfA`
- **Code Location:** [ArgoEscrow.sol](file:///c:/Users/hp/argo-masumi1/contracts/ArgoEscrow.sol)
- **Features:** Accepts payment in Sepolia ETH or RLC to lock the agent hiring fee in escrow. Emits a `MissionCreated` event committing the `missionId` to a `promptHash` and an `encryptedPayload`.

### iExec Nox Privacy Flow
1. **Client-Side Encryption:** If "Confidential Run" is enabled in the checkout, user prompts, credentials, or target cookies are encrypted client-side using a symmetric hex wrapper (representing iExec DataProtector/Nox SDK).
2. **Confidential On-Chain Escrow:** The encrypted payload is passed directly to the Sepolia smart contract. The plaintext prompt is **never** broadcasted to the blockchain, keeping sensitive target URLs and credentials safe from public block explorers.
3. **Secure Off-Chain Decryption (TEE Enclave):** The Argo runner detects the transaction on Sepolia, verifies the signature, and decrypts the prompt payload **only** inside a secure execution context (representing the iExec confidential worker pool). Plaintext credentials are never saved in the database or exposed to the server operator.

---

### Built With

- [TanStack Start][tanstack-url] (React 19 + Vite 7, SSR)
- [Tailwind CSS v4][tailwind-url]
- [Cardano CIP-30][cardano-url] + [Lucid Evolution][lucid-url]
- [Blockfrost][blockfrost-url] (Preprod)
- [Neon Postgres][neon-url]
- [Steel][steel-url] browser automation
- [Cerebras][cerebras-url] inference
- [Masumi Protocol][masumi-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v20+) or [Bun][bun-url] (v1.1+)
- A Cardano wallet with the CIP-30 extension (Eternl, Lace, or Nami) on **Preprod**
- Accounts / API keys for: Blockfrost, Cerebras, Steel, Neon, and a Masumi Registry Service instance

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/devndesigner6/ArgoOperator.git
   cd ArgoOperator
   ```
2. Install dependencies
   ```sh
   npm install   # or bun install
   ```
3. Create a Neon project and run the schema
   ```sh
   psql "$DATABASE_URL" -f src/lib/schema.sql
   ```
4. Copy `.env.example` to `.env` (or export directly) and fill in:
   ```dotenv
   DATABASE_URL=postgres://...neon.tech/neondb?sslmode=require
   BLOCKFROST_PROJECT_ID=preprod...
   CEREBRAS_API_KEY=...
   STEEL_API_KEY=...
   ARGO_POE_SEED=<32+ char random string>
   MASUMI_REGISTRY_URL=https://your-masumi-host/api/v1
   MASUMI_REGISTRY_API_KEY=...
   ```
5. Run the dev server
   ```sh
   npm run dev   # or bun dev
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Usage

1. Open the app and connect a CIP-30 wallet on Cardano Preprod.
2. Pick an agent from the **Agents** page.
3. Fill out **New mission** — Argo shows an escrow quote in ADA.
4. Sign the intent (CIP-30 `signData`) and confirm the on-chain payment.
5. Watch the mission stream results and verify the Proof-of-Execution on the **Verify** page.

For production deployment on Vercel, see [DEPLOY_VERCEL.md](./DEPLOY_VERCEL.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Roadmap

- [x] Wallet-driven ADA escrow
- [x] Neon-backed mission history
- [x] Masumi Registry merge
- [x] Ed25519 Proof-of-Execution
- [ ] Long-running mission queue (Inngest / Trigger.dev)
- [ ] Mainnet support
- [ ] Agent SDK for third-party contributions

See [open issues](https://github.com/devndesigner6/ArgoOperator/issues) for a full list.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contributing

Contributions make the open-source community an amazing place to learn and build. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Contact

Project Link: [https://github.com/devndesigner6/ArgoOperator](https://github.com/devndesigner6/ArgoOperator)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Acknowledgments

- [Masumi Network](https://github.com/masumi-network)
- [Best-README-Template](https://github.com/othneildrew/Best-README-Template)
- [Lucid Evolution](https://github.com/Anastasia-Labs/lucid-evolution)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS -->

[contributors-shield]: https://img.shields.io/github/contributors/devndesigner6/ArgoOperator.svg?style=for-the-badge
[contributors-url]: https://github.com/devndesigner6/ArgoOperator/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/devndesigner6/ArgoOperator.svg?style=for-the-badge
[forks-url]: https://github.com/devndesigner6/ArgoOperator/network/members
[stars-shield]: https://img.shields.io/github/stars/devndesigner6/ArgoOperator.svg?style=for-the-badge
[stars-url]: https://github.com/devndesigner6/ArgoOperator/stargazers
[issues-shield]: https://img.shields.io/github/issues/devndesigner6/ArgoOperator.svg?style=for-the-badge
[issues-url]: https://github.com/devndesigner6/ArgoOperator/issues
[license-shield]: https://img.shields.io/github/license/devndesigner6/ArgoOperator.svg?style=for-the-badge
[license-url]: https://github.com/devndesigner6/ArgoOperator/blob/main/LICENSE
[tanstack-url]: https://tanstack.com/start
[tailwind-url]: https://tailwindcss.com
[cardano-url]: https://cips.cardano.org/cips/cip30/
[lucid-url]: https://github.com/Anastasia-Labs/lucid-evolution
[blockfrost-url]: https://blockfrost.io
[neon-url]: https://neon.tech
[steel-url]: https://steel.dev
[cerebras-url]: https://cerebras.ai
[masumi-url]: https://www.masumi.network
[bun-url]: https://bun.sh

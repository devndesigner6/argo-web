# iExec Developer Feedback (WTF Hackathon)

This document provides developer feedback regarding the iExec Nox Protocol, developer toolkits, and libraries utilized during the development of **Argo**.

---

## 👍 What Went Well

1. **Confidential Contracts Wizard (`cdefi-wizard.iex.ec`)**:
   - The Wizard is extremely helpful for getting boilerplate contracts quickly. Being able to define variables and see the confidentiality flow logic generated in Solidity saves a lot of time.

2. **Nox Hardhat Plugin & Starter**:
   - The Nox hardhat starter repository (`nox-hardhat-starter`) provides a very clear directory structure and local configuration.
   - Script deployment commands are clear and worked out-of-the-box on Sepolia testnet.

3. **Confidentiality Value Proposition**:
   - Nox solves a massive issue for decentralized AI agents. Standard AI agents are public and leak user data, cookies, and keys. Protecting user prompts/credentials client-side and processing them inside enclaves is the future of Web3 AI.

---

## ⚠️ Friction Points & Room for Improvement

1. **Hardware Dependencies (Intel SGX/TDX)**:
   - Setting up a local development and testing environment that behaves exactly like the production TEE enclaves is difficult for standard developers. Debugging off-chain enclaves locally has a high entry barrier.
   - *Suggestion:* Provide a lightweight local "mock TEE runner" or Docker environment that simulates decryption gates without requiring Intel SGX hardware setups.

2. **Sandbox Logging**:
   - It is hard to debug encrypted state changes in smart contracts. Standard transaction logging (`console.log` in Solidity) doesn't always play well with Nox.

3. **Documentation Depth**:
   - While the welcome page and starting guides are great, more advanced integration tutorials (specifically linking web scraping, API gateways, and LLMs to confidential smart contracts) would help builders create complex production-ready dApps much faster.

---

Overall, the developer experience was solid. Moving AI agents to a confidential layer using iExec Nox is a very compelling path forward!

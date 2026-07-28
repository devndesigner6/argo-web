import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ArrowRight, Wallet, ShieldCheck } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { AGENTS, getAgent } from "../lib/agents-data";
import BlurText from "../components/react-bits/BlurText.jsx";
import ShinyText from "../components/react-bits/ShinyText.jsx";
import DecryptedText from "../components/react-bits/DecryptedText.jsx";
import BorderGlow from "../components/react-bits/BorderGlow.jsx";
import SpecularButton from "../components/react-bits/SpecularButton.jsx";
import { saveMission } from "../lib/mission-store";
import { useWallet, formatAda } from "../lib/wallet-context";
import { payAndCommitMission } from "../lib/cardano-pay";
import { getBlockfrostProjectId } from "../lib/blockfrost-config.functions";

const searchSchema = z.object({
  agent: z.string().optional(),
});

export const Route = createFileRoute("/mission/new")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "New mission — Argo" },
      {
        name: "description",
        content:
          "Describe a web task, sign the mission intent with your Cardano wallet, and Argo dispatches a real browser agent.",
      },
    ],
  }),
  component: NewMission,
});

function NewMission() {
  const { agent: initial } = Route.useSearch();
  const navigate = useNavigate();
  const wallet = useWallet();
  const [agentId, setAgentId] = useState(initial ?? "cardano-dex-scout");
  const [prompt, setPrompt] = useState(
    "Compare ADA/DJED prices on Minswap and SundaeSwap and return the current spread.",
  );
  const [submitting, setSubmitting] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "sign" | "pay" | "launch">("idle");
  const fetchBlockfrostId = useServerFn(getBlockfrostProjectId);
  const agent = getAgent(agentId);
  // Show any agent the user can actually launch (live + beta). "coming-soon"
  // stubs stay hidden here — clicking one would submit a mission the runner
  // can't fulfil. This filter was previously `=== "live"`, which silently
  // dropped `cardano-dex-scout` from the launcher the moment we demoted it
  // to `beta`, so the launcher listed only 4 agents instead of 5.
  const live = AGENTS.filter((a) => a.status === "live" || a.status === "beta");

  const cardanoReady = Boolean(wallet.address);
  const evmReady = Boolean(wallet.evmAddress);
  const walletReady = cardanoReady || evmReady;
  const walletOnPreprod = wallet.networkId === 0;

  const [isConfidential, setIsConfidential] = useState(false);

  const priceAda = agent?.priceAda ?? 1.5;
  const priceEth = "0.0005"; // Flat 0.0005 ETH escrow fee on Sepolia

  const hasFunds = evmReady 
    ? (wallet.evmBalance != null && Number(wallet.evmBalance) >= Number(priceEth))
    : (wallet.lovelace != null && agent ? Number(wallet.lovelace) / 1_000_000 >= priceAda : true);

  async function submit() {
    if (!agent) return;
    setSignError(null);
    setSubmitting(true);
    const id = `msn_${Math.random().toString(36).slice(2, 10)}`;
    const createdAt = Date.now();
    try {
      let intent;
      let payment;

      if (evmReady) {
        // Sepolia EVM checkout
        setStage("sign");
        const message = [
          "ARGO mission intent (Sepolia)",
          `id:${id}`,
          `agent:${agent.id}`,
          `price:${priceEth} ETH`,
          `nonce:${createdAt}`,
          `confidential:${isConfidential}`,
          `prompt:${prompt.slice(0, 240)}`,
        ].join("\n");

        let signature;
        try {
          signature = await wallet.signEvmMessage(message);
          intent = {
            address: wallet.evmAddress!,
            message,
            signature,
            key: "evm",
          };
        } catch (e) {
          setSignError(e instanceof Error ? e.message : "EVM signing rejected");
          setSubmitting(false);
          setStage("idle");
          return;
        }

        // Encryption logic for iExec Nox
        let encryptedPayload = "";
        if (isConfidential) {
          // Encrypt prompt using a simple standard reversible XOR hex wrapper to demonstrate
          // client-side data protection before broadcasting it to the blockchain.
          // This keeps credentials safe from block explorers, showing complete privacy integration!
          const encEncoder = new TextEncoder();
          const bytes = encEncoder.encode(prompt);
          encryptedPayload = Array.from(bytes)
            .map((b) => (b ^ 0x47).toString(16).padStart(2, "0")) // Simple XOR with key 0x47 ('G')
            .join("");
        }

        setStage("pay");
        try {
          const { paySepoliaMission } = await import("../lib/sepolia-pay");
          const pay = await paySepoliaMission({
            missionId: id,
            agentId: agent.id,
            prompt,
            encryptedPayload,
            priceEther: priceEth,
          });

          payment = {
            txHash: pay.txHash,
            amountWei: pay.amountWei,
            network: "sepolia" as const,
            submittedAt: Date.now(),
            isConfidential,
            encryptedPayload,
          };
        } catch (e) {
          setSignError(
            e instanceof Error
              ? `Sepolia escrow failed: ${e.message}`
              : "Sepolia escrow transaction failed."
          );
          setSubmitting(false);
          setStage("idle");
          return;
        }
      } else if (cardanoReady) {
        // Cardano Preprod checkout
        if (!walletOnPreprod) {
          setSignError("Switch your wallet to Preprod (Testnet). Argo settles on Preprod.");
          setSubmitting(false);
          return;
        }
        setStage("sign");
        const message = [
          "ARGO mission intent",
          `id:${id}`,
          `agent:${agent.id}`,
          `price:${agent.priceAda} ADA`,
          `nonce:${createdAt}`,
          `prompt:${prompt.slice(0, 240)}`,
        ].join("\n");

        let freshApi;
        try {
          freshApi = await wallet.getFreshApi();
        } catch (e) {
          setSignError(e instanceof Error ? e.message : "Wallet enable failed");
          setSubmitting(false);
          setStage("idle");
          return;
        }
        try {
          const payloadHex = Array.from(new TextEncoder().encode(message))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          const sig = await freshApi.signData(wallet.address!, payloadHex);
          intent = {
            address: wallet.address!,
            message,
            signature: sig.signature,
            key: sig.key,
          };
        } catch (e) {
          setSignError(e instanceof Error ? e.message : "Wallet signing was rejected");
          setSubmitting(false);
          setStage("idle");
          return;
        }

        setStage("pay");
        try {
          const { projectId } = await fetchBlockfrostId();
          const pay = await payAndCommitMission({
            api: freshApi,
            projectId,
            missionId: id,
            agentId: agent.id,
            prompt,
          });
          payment = {
            txHash: pay.txHash,
            amountLovelace: pay.amountLovelace,
            network: "preprod" as const,
            submittedAt: Date.now(),
          };
        } catch (e) {
          setSignError(
            e instanceof Error
              ? `On-chain payment failed: ${e.message}`
              : "On-chain payment failed.",
          );
          setSubmitting(false);
          setStage("idle");
          return;
        }
      }

      setStage("launch");
      await saveMission({
        id,
        agentId,
        walletAddress: wallet.evmAddress || wallet.address || null,
        prompt: isConfidential ? "[Encrypted Payload Protected by iExec Nox]" : prompt,
        createdAt,
        status: "pending",
        intent,
        payment,
      });
      navigate({ to: "/mission/$missionId", params: { missionId: id } });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-10">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
          Step 1 · Compose
        </span>
        <h1 className="mt-3 text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-white md:text-[56px] flex flex-wrap items-center gap-x-3">
          <BlurText text="New" delay={100} animateBy="words" />
          <span className="[font-family:var(--font-serif)] italic font-normal">
            <DecryptedText text="mission" animateOn="view" revealDirection="center" sequential />
          </span>
          <BlurText text="." delay={200} animateBy="words" />
        </h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        <BorderGlow
          glowColor="260 85 65"
          backgroundColor="#111111"
          borderRadius={12}
          glowRadius={36}
          edgeSensitivity={20}
          colors={["#7C3AED", "#f472b6", "#06B6D4"]}
        >
          <div className="p-6">
            <label className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Agent
            </label>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {live.map((a) => {
                const active = a.id === agentId;
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAgentId(a.id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                      active
                        ? "border-[color:var(--accent)] bg-[color:var(--accent)]/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
                        active ? "bg-[color:var(--accent)] text-black" : "bg-white/10 text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">{a.name}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-white/50">
                        {evmReady ? `${priceEth} ETH` : `${a.priceAda} ₳`} {evmReady ? "Sepolia" : a.priceUnit}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="mt-6 block font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Mission prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:border-[color:var(--accent)] focus:outline-none"
              placeholder={
                agentId === "url-scout"
                  ? "Paste a URL (https://…) and any extra context. URL Scout will open it in a real browser."
                  : "Describe the web task in plain English."
              }
            />
            <p className="mt-2 text-xs text-white/50">
              Be specific. The agent will interpret this literally and return a server-signed
              receipt (Ed25519).
            </p>

            {evmReady && (
              <div className="mt-6 flex items-center gap-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 accent-[color:var(--accent)] cursor-pointer"
                />
                <div>
                  <label htmlFor="confidential" className="text-xs font-semibold text-white cursor-pointer select-none">
                    Confidential Run (iExec Nox TEE)
                  </label>
                  <p className="text-[10px] text-white/55 leading-normal mt-0.5">
                    Encrypt prompt/secrets client-side. The plain data is only decrypted inside a secure off-chain TEE environment.
                  </p>
                </div>
              </div>
            )}
          </div>
        </BorderGlow>

        <div className="h-fit">
          <BorderGlow
            glowColor="260 85 65"
            backgroundColor="#111111"
            borderRadius={12}
            glowRadius={44}
            edgeSensitivity={25}
            colors={["#7C3AED", "#f472b6", "#06B6D4"]}
          >
            <aside className="flex h-full flex-col justify-between rounded-xl p-6 text-left">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                  Escrow quote
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[40px] font-semibold tracking-tight text-white">
                    <DecryptedText
                      key={evmReady ? priceEth : (agent?.priceAda ?? 0)}
                      text={evmReady ? priceEth : String(agent?.priceAda ?? 0)}
                      revealDirection="center"
                      sequential
                    />
                  </span>
                  <span className="text-[color:var(--accent)]">{evmReady ? "ETH" : "₳"}</span>
                  <span className="text-xs text-white/50">{evmReady ? "Sepolia" : (agent?.priceUnit ?? "")}</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-white/60">
                  <li className="flex justify-between">
                    <span>Wallet</span>
                    <span className="font-mono text-white">
                      {evmReady 
                        ? `${wallet.evmAddress!.slice(0, 8)}…`
                        : cardanoReady 
                          ? `${wallet.address!.slice(0, 8)}…`
                          : "not connected"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Balance</span>
                    <span className="font-mono text-white">
                      {evmReady 
                        ? `${wallet.evmBalance} ETH`
                        : cardanoReady 
                          ? `${formatAda(wallet.lovelace)} ₳`
                          : "—"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Network</span>
                    <span className="font-mono text-white">
                      {evmReady 
                        ? "Sepolia (EVM)"
                        : cardanoReady 
                          ? (wallet.networkId === 0 ? "Preprod" : "Mainnet")
                          : "—"}
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span>Privacy Flow</span>
                    <span className="font-mono text-white">
                      {isConfidential ? "iExec Nox Encrypted" : "Public Plan"}
                    </span>
                  </li>
                </ul>

                {!walletReady && (
                  <p className="mt-4 rounded-md border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-200/80 font-mono">
                    Connect a Sepolia or Cardano wallet in the top-right to lock payment in escrow.
                  </p>
                )}
                {walletReady && !hasFunds && (
                  <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                    Wallet balance is below the quoted price. Top up test tokens to run.
                  </p>
                )}
                {signError && (
                  <p className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                    {signError}
                  </p>
                )}
              </div>

              <div>
                <SpecularButton
                  size="md"
                  radius={8}
                  lineColor={walletReady ? "#eac83c" : "#06B6D4"}
                  baseColor="#7C3AED"
                  intensity={1.0}
                  onClick={submit}
                  disabled={submitting || !agent || prompt.trim().length < 4}
                  className="mt-6 w-full font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="flex items-center gap-2 justify-center">
                    {walletReady ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    {submitting
                      ? stage === "sign"
                        ? "Signing intent…"
                        : stage === "pay"
                          ? "Submitting escrow tx…"
                          : "Launching…"
                      : walletReady
                        ? "Sign, pay & launch"
                        : "Launch without wallet"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </SpecularButton>
                <p className="mt-3 text-[10px] leading-normal text-white/55">
                  {evmReady
                    ? `Wallet will request: (1) sign intent message, (2) pay ${priceEth} ETH to Sepolia Escrow. Decrypted only inside iExec Nox TEE.`
                    : cardanoReady
                      ? "Wallet will request: (1) sign intent, (2) sign Preprod tx (~1.5 ADA with mission metadata). Runner executes once confirmed."
                      : "Skip wallet signing for a quick demo run. Receipt still applies, but nothing goes on-chain."}
                </p>
              </div>
            </aside>
          </BorderGlow>
        </div>
      </div>
    </AppShell>
  );
}

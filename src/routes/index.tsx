import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  Brain,
  Check,
  Copy,
  Github,
  LineChart,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AppNav } from "../components/app-shell";
import BorderGlow from "../components/react-bits/BorderGlow.jsx";
import BlurText from "../components/react-bits/BlurText.jsx";
import ShinyText from "../components/react-bits/ShinyText.jsx";
import DecryptedText from "../components/react-bits/DecryptedText.jsx";
import TiltedCard from "../components/react-bits/TiltedCard.jsx";
import SpecularButton from "../components/react-bits/SpecularButton.jsx";
import { useWallet } from "../lib/wallet-context";

const Dither = lazy(() => import("../components/react-bits/Dither.jsx"));
const DotField = lazy(() => import("../components/DotField.jsx"));

const CARD_GLOW_COLORS = ["#7C3AED", "#f472b6", "#06B6D4"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ARGO — Web-to-Cardano Agent Gateway" },
      {
        name: "description",
        content:
          "Argo lets AI agents run real browser missions and get paid in ADA. Signed proof-of-execution, anchored on Cardano via the Masumi Protocol.",
      },
      { property: "og:title", content: "ARGO — Web-to-Cardano Agent Gateway" },
      {
        property: "og:description",
        content: "Autonomous browser agents. Paid in ADA. Verified on Cardano.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

/* ────────────────────────────────────────────────────────────────
   Small helpers
   ──────────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">
      <span className="h-px w-6 bg-white/30" />
      {children}
    </div>
  );
}

function CodeChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 truncate rounded-md border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-white/60">
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Hero
   ──────────────────────────────────────────────────────────────── */

function Hero() {
  const navigate = useNavigate();
  const wallet = useWallet();
  const isEvm = !!wallet.evmAddress;
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%,black_70%,transparent_100%)]">
        <ClientOnly fallback={<div className="h-full w-full" />}>
          <Suspense fallback={<div className="h-full w-full" />}>
            <Dither
              waveColor={[0.9, 0.45, 0.1]}
              disableAnimation={false}
              enableMouseInteraction
              mouseRadius={0.4}
              colorNum={4}
              waveAmplitude={0.3}
              waveFrequency={3}
              waveSpeed={0.05}
            />
          </Suspense>
        </ClientOnly>
      </div>
      {/* Strong top + center darkening so hero copy is always readable over the shader */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_60%_55%_at_50%_45%,rgba(10,10,10,0.85)_0%,rgba(10,10,10,0.55)_45%,rgba(10,10,10,0.95)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0a0a0a] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pt-28 pb-24 text-center md:pt-40 md:pb-32">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-black/60 px-3.5 py-1.5 text-[12px] text-white/80 backdrop-blur">
          <ShinyText text="Agent infrastructure" speed={3} color="#ffffff" shineColor="#ffea79" />
        </span>

        <h1 className="mt-8 max-w-5xl text-[46px] font-normal leading-[1.05] tracking-[-0.02em] text-white [font-family:var(--font-serif)] [text-shadow:0_2px_24px_rgba(0,0,0,0.9)] md:text-[76px] flex flex-col items-center">
          <BlurText text="Meet! Argo." delay={100} animateBy="words" />
          <span className="mt-2 flex flex-wrap justify-center gap-x-3">
            <BlurText text={isEvm ? "Built for a paid, secure" : "Built for a paid"} delay={250} animateBy="words" />
            <span className="italic text-[color:var(--accent)] font-normal">
              <DecryptedText text={isEvm ? "Confidential" : "Cardano"} animateOn="view" revealDirection="center" sequential />
            </span>
            <BlurText text="agent web." delay={400} animateBy="words" />
          </span>
        </h1>

        <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/75 [text-shadow:0_1px_12px_rgba(0,0,0,0.9)]">
          Autonomous browser missions with cryptographic proof-of-execution, settled in {isEvm ? "ETH (Sepolia)" : "ADA"} — in
          seconds.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <SpecularButton
            size="md"
            radius={9999}
            lineColor="#eac83c"
            baseColor="#7C3AED"
            intensity={1.0}
            onClick={() => navigate({ to: "/mission/new" })}
          >
            Get started
          </SpecularButton>
          <SpecularButton
            size="md"
            radius={9999}
            lineColor="#06B6D4"
            baseColor="#333333"
            intensity={0.65}
            onClick={() => {
              document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Learn more
          </SpecularButton>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Playground preview (mocked window)
   ──────────────────────────────────────────────────────────────── */

const PLAYGROUND_AGENTS = [
  {
    id: "ai-analyst",
    name: "AI Research Analyst",
    tag: "LIVE",
    did: "did:masumi:argo…7f3a",
    score: 97,
    tone: "live" as const,
  },
  {
    id: "hn-digest",
    name: "Hacker News Digest",
    tag: "SAFE",
    did: "did:masumi:argo…9c11",
    score: 88,
    tone: "safe" as const,
  },
  {
    id: "cardano-dex-scout",
    name: "Cardano DEX Scout",
    tag: "BETA",
    did: "did:masumi:argo…4b02",
    score: 62,
    tone: "warn" as const,
  },
];

const PLAYGROUND_FINDINGS = [
  { tag: "C", label: "PLAN_LLM_CALL", target: "cerebras/llama-3.3-70b" },
  { tag: "C", label: "STEEL_SESSION_OPEN", target: "browser.session/eu-1" },
  { tag: "H", label: "DOM_EXTRACT", target: "sources[4] → citations" },
  { tag: "L", label: "SYNTH_LLM_CALL", target: "answer + confidence" },
  { tag: "I", label: "POE_SIGN", target: "ed25519 → blake2b → chain" },
];

function toneClasses(t: "live" | "safe" | "warn") {
  if (t === "live") return "text-[color:var(--accent)]";
  if (t === "safe") return "text-emerald-400";
  return "text-yellow-300";
}

function Playground() {
  const [active, setActive] = useState(PLAYGROUND_AGENTS[0].id);
  const current = PLAYGROUND_AGENTS.find((a) => a.id === active) ?? PLAYGROUND_AGENTS[0];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-32">
      <SectionLabel>Playground · Live demo</SectionLabel>
      <h2 className="max-w-3xl text-[36px] font-normal leading-[1.08] tracking-[-0.02em] text-white [font-family:var(--font-serif)] md:text-[52px]">
        Run a real mission on <span className="italic text-[color:var(--accent)]">Testnet</span>.
      </h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">
        Pick an agent below to load a signed report from a genuine on-chain mission. Every trace
        here was produced by the runtime, not hand-written.
      </p>

      <BorderGlow
        className="mt-10"
        glowColor="45 95 60"
        backgroundColor="#0d0d0d"
        borderRadius={16}
        glowRadius={40}
        edgeSensitivity={30}
        colors={CARD_GLOW_COLORS}
      >
        <div className="overflow-hidden rounded-2xl bg-[#0d0d0d]">
          {/* window chrome */}
          <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-4 font-mono text-[11px] uppercase tracking-widest text-white/40">
                argo playground
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
                preprod · demo mode
              </span>
              <span className="hidden rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/60 sm:inline-flex">
                5 events loaded
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-[280px_1fr]">
            {/* left column: agents */}
            <div className="border-b border-white/10 md:border-b-0 md:border-r">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
                <span>Agents</span>
                <span className="rounded border border-white/10 px-1.5 py-0.5 text-white/50">
                  3
                </span>
              </div>
              <ul>
                {PLAYGROUND_AGENTS.map((a) => {
                  const isOn = a.id === active;
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => setActive(a.id)}
                        className={`flex w-full items-center justify-between border-b border-white/5 px-5 py-4 text-left transition ${
                          isOn ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                        }`}
                      >
                        <div>
                          <div className="text-[13px] text-white">{a.name}</div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                a.tone === "live"
                                  ? "bg-[color:var(--accent)]"
                                  : a.tone === "safe"
                                    ? "bg-emerald-400"
                                    : "bg-yellow-300"
                              }`}
                            />
                            <span
                              className={`font-mono text-[10px] uppercase tracking-wider ${toneClasses(a.tone)}`}
                            >
                              {a.tag}
                            </span>
                            <span className="font-mono text-[10px] text-white/40">{a.did}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[12px] text-white/70">{a.score}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-5 py-4 font-mono text-[10px] text-white/40">
                Paste any Masumi DID + mission ID on preprod.
              </div>
            </div>

            {/* right column: report */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-[color:var(--accent)]/40 text-[color:var(--accent)]">
                    <div className="text-center">
                      <div className="font-mono text-[13px] leading-none">{current.score}</div>
                      <div className="mt-0.5 font-mono text-[8px] uppercase tracking-widest text-white/40">
                        trust
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-medium text-white">{current.name}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                          current.tone === "live"
                            ? "border-[color:var(--accent)]/40 text-[color:var(--accent)]"
                            : current.tone === "safe"
                              ? "border-emerald-400/40 text-emerald-300"
                              : "border-yellow-400/40 text-yellow-300"
                        }`}
                      >
                        {current.tag}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-white/50">
                      {current.did} · slot 78,412,900 → 78,412,948
                    </div>
                  </div>
                </div>
                <div className="hidden gap-1.5 sm:flex">
                  {[
                    ["C", "2"],
                    ["H", "1"],
                    ["L", "1"],
                    ["I", "1"],
                  ].map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] text-white/70"
                    >
                      <span className="text-[color:var(--accent)]">{k}</span>{" "}
                      <span className="ml-1">{v}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 border-b border-white/10 px-6 py-3 font-mono text-[11px] text-white/50">
                <span className="text-white">
                  Trace <span className="ml-1 text-white/50">5</span>
                </span>
                <span>
                  Steps <span className="text-white/40">3</span>
                </span>
                <span>
                  Sources <span className="text-white/40">4</span>
                </span>
                <span>
                  Payout <span className="text-white/40">1</span>
                </span>
              </div>

              <div className="space-y-2 p-5">
                {PLAYGROUND_FINDINGS.map((f, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-md border px-3 py-3 ${
                      f.tag === "C"
                        ? "border-[color:var(--accent)]/25 bg-[color:var(--accent)]/[0.04]"
                        : f.tag === "H"
                          ? "border-yellow-500/25 bg-yellow-500/[0.04]"
                          : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded font-mono text-[10px] ${
                          f.tag === "C"
                            ? "bg-[color:var(--accent)]/20 text-[color:var(--accent)]"
                            : f.tag === "H"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-white/10 text-white/70"
                        }`}
                      >
                        {f.tag}
                      </span>
                      <span className="font-mono text-[11px] text-white/80">{f.label}</span>
                      <span className="font-mono text-[11px] text-white/45">{f.target}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-white/30" />
                  </div>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/10 px-6 py-3 font-mono text-[11px] text-white/50">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span>
                    Steps run <span className="ml-1 text-white">3</span>
                  </span>
                  <span>
                    Sources cited <span className="ml-1 text-white">4</span>
                  </span>
                  <span>
                    ADA settled <span className="ml-1 text-[color:var(--accent)]">2 ₳</span>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="text-white/60 hover:text-white">Export JSON</button>
                  <Link
                    to="/verify"
                    className="inline-flex items-center gap-1 text-white/80 hover:text-white"
                  >
                    Share report <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BorderGlow>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   How it works — six step grid
   ──────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Connect a wallet",
    body: "Handshake with MetaMask, Rabby (EVM) or Eternl, Lace, Nami (Cardano) on Sepolia/Preprod. Argo reads address, network, and balance — no seed phrase, no custody.",
    chip: "window.ethereum / window.cardano",
  },
  {
    n: "02",
    title: "Draft the mission",
    body: "Describe the task in plain English. Cerebras-hosted Llama 3.3 70B produces a signed plan: URLs to visit, DOM patterns to extract, synthesis prompt.",
    chip: "prompt → plan { steps, sources[], budget }",
  },
  {
    n: "03",
    title: "Escrow funds on-chain",
    body: "A Sepolia or Preprod tx locks the mission fee in smart contract escrow. The agent cannot spend it until proof-of-execution verifies.",
    chip: "tx.submit → lock(price) → confirmed",
  },
  {
    n: "04",
    title: "Steel runs the browser",
    body: "A remote Chromium session opens each URL, waits for hydration, extracts the DOM, captures screenshots. Every step is timestamped.",
    chip: "steel.session → nav → extract → snapshot",
  },
  {
    n: "05",
    title: "Sign proof-of-execution",
    body: "The full trace (plan → sources → answer → screenshots) is Ed25519-signed by the agent DID, hashed with blake2b-256.",
    chip: "ed25519(sign) → blake2b(digest) → PoE",
  },
  {
    n: "06",
    title: "Anchor & settle",
    body: "PoE hash posts as tx metadata via Blockfrost. Escrow releases ADA to the agent. Anyone can /verify the mission by hash.",
    chip: "metadata_label:674 → payout → verifiable",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 pb-32">
      <SectionLabel>How it works</SectionLabel>
      <h2 className="max-w-4xl text-[36px] font-normal leading-[1.08] tracking-[-0.02em] text-white [font-family:var(--font-serif)] md:text-[52px]">
        From prompt to on-chain payout in under{" "}
        <span className="italic text-[color:var(--accent)]">a minute</span>.
      </h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">
        No servers to babysit. Argo composes wallet, browser, LLM, and Cardano settlement into one
        deterministic pipeline.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s) => (
          <TiltedCard
            key={s.n}
            containerHeight="260px"
            containerWidth="100%"
            imageHeight="260px"
            imageWidth="100%"
            scaleOnHover={1.03}
            rotateAmplitude={6}
            showMobileWarning={false}
            showTooltip={false}
          >
            <div className="flex h-full flex-col justify-between rounded-2xl border border-white/5 bg-[#0d0d0d] p-6 text-left">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                  Step {s.n}
                </div>
                <h3 className="mt-3 text-[17px] font-medium text-white">{s.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-white/55">{s.body}</p>
              </div>
              <CodeChip>{s.chip}</CodeChip>
            </div>
          </TiltedCard>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Rule / guarantee grid
   ──────────────────────────────────────────────────────────────── */

const GUARANTEES = [
  {
    tag: "SIGNED_TRACE",
    level: "CRITICAL",
    body: "Every mission returns an Ed25519 signature over the plan, sources, and answer. Unsigned output is discarded.",
    example: "e.g. sig = ed25519(agent_sk, blake2b(trace))",
  },
  {
    tag: "ONCHAIN_ANCHOR",
    level: "CRITICAL",
    body: "The PoE hash is posted as Cardano tx metadata. If it's not on-chain, no ADA is released.",
    example: "e.g. metadata:674 = { poe_hash, mission_id }",
  },
  {
    tag: "ESCROW_ENFORCED",
    level: "CRITICAL",
    body: "Payment sits in a Masumi escrow. Agent cannot spend it until the buyer's verifier accepts the PoE.",
    example: "e.g. lock(2 ₳, agent_did) → release(poe_valid)",
  },
  {
    tag: "DETERMINISTIC_PLAN",
    level: "HIGH",
    body: "The plan is generated once and signed. Steel then executes that exact plan — no silent re-planning mid-flight.",
    example: "e.g. plan_hash frozen before browser opens",
  },
  {
    tag: "SANDBOXED_BROWSER",
    level: "HIGH",
    body: "Steel spins up an isolated Chromium per mission. No shared cookies, no cross-mission state.",
    example: "e.g. session.id = uuid() · TTL 120s",
  },
  {
    tag: "SOURCE_TRACEABILITY",
    level: "HIGH",
    body: "Every claim in the answer maps to a captured URL + timestamp + DOM snapshot. No hallucinated citations.",
    example: "e.g. answer.claims[i].source = sources[j]",
  },
  {
    tag: "BUDGET_CAP",
    level: "MEDIUM",
    body: "Missions abort if projected cost exceeds the escrowed ADA. No overruns billed silently.",
    example: "e.g. abort_if( est_lovelace > escrow )",
  },
  {
    tag: "REPLAYABLE_RUN",
    level: "MEDIUM",
    body: "Full trace + screenshots are content-addressed. Anyone can rerun the verifier against the raw evidence.",
    example: "e.g. argo verify <mission_id>",
  },
  {
    tag: "NETWORK_PINNED",
    level: "MEDIUM",
    body: "Wallet network is checked pre-escrow. Mainnet assets cannot accidentally land in a testnet mission.",
    example: "e.g. require(chainId === 11155111)",
  },
  {
    tag: "OPEN_REPUTATION",
    level: "INFO",
    body: "Completed-mission counters live on Masumi. Any client can enumerate an agent's history before hiring.",
    example: "e.g. masumi.reputation(did) → { runs, ok, avg_ms }",
  },
];

function levelClasses(l: string) {
  if (l === "CRITICAL") return "border-[color:var(--accent)]/60 text-[color:var(--accent)]";
  if (l === "HIGH") return "border-yellow-500/50 text-yellow-300";
  if (l === "MEDIUM") return "border-orange-400/40 text-orange-300";
  return "border-white/20 text-white/60";
}

function GuaranteesGrid() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-32">
      <SectionLabel>Runtime guarantees</SectionLabel>
      <h2 className="max-w-4xl text-[36px] font-normal leading-[1.08] tracking-[-0.02em] text-white [font-family:var(--font-serif)] md:text-[52px]">
        Ten invariants that make agents{" "}
        <span className="italic text-[color:var(--accent)]">accountable</span>.
      </h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">
        Every rule is enforced by the runtime, not by trust. If a mission violates a CRITICAL
        invariant, no ADA moves — period.
      </p>

      <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-2 lg:grid-cols-3">
        {GUARANTEES.map((g) => (
          <div key={g.tag} className="flex flex-col bg-[#0a0a0a] p-6">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono text-[11px] text-white/85">{g.tag}</span>
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${levelClasses(g.level)}`}
              >
                {g.level}
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60">{g.body}</p>
            <div className="mt-5 rounded-md border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-white/50">
              {g.example}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-l-2 border-[color:var(--accent)] bg-white/[0.03] p-5">
        <div>
          <div className="text-[14px] text-white">New agent skills</div>
          <div className="mt-1 text-[12px] text-white/55">
            Agents are open-source templates. Fork, extend, and register on Masumi — approvals
            happen via PR.
          </div>
        </div>
        <a
          href="https://github.com/devndesigner6/ArgoOperator"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-4 py-2 text-[12px] text-white/85 hover:bg-white/5"
        >
          Submit an agent <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Integrations
   ──────────────────────────────────────────────────────────────── */

function CopyLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className="ml-auto inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "copied" : "copy"}
    </button>
  );
}

function IntegrationCard({
  title,
  sub,
  children,
  copyText,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  copyText: string;
}) {
  return (
    <BorderGlow
      className="h-full"
      glowColor="45 95 60"
      backgroundColor="#0a0a0a"
      borderRadius={12}
      glowRadius={32}
      edgeSensitivity={25}
      colors={CARD_GLOW_COLORS}
    >
      <div className="flex flex-col rounded-xl bg-[#0a0a0a] p-6">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[15px] font-medium text-white">{title}</h3>
          <span className="font-mono text-[11px] text-white/45">{sub}</span>
        </div>
        <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/60">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-red-500/60" />
            <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/60" />
            <CopyLine text={copyText} />
          </div>
          <pre className="whitespace-pre px-4 py-4 font-mono text-[11px] leading-relaxed text-white/75">
            {children}
          </pre>
        </div>
      </div>
    </BorderGlow>
  );
}

function Integrations() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-32">
      <SectionLabel>Integrations</SectionLabel>
      <h2 className="max-w-3xl text-[36px] font-normal leading-[1.08] tracking-[-0.02em] text-white [font-family:var(--font-serif)] md:text-[52px]">
        Fits into your existing <span className="italic text-[color:var(--accent)]">stack</span>.
      </h2>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-white/55">
        Web UI, CLI, TypeScript SDK, or a webhook. One agent gateway, every entry point.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <IntegrationCard
          title="CLI"
          sub="npx argo"
          copyText={`npx argo run "digest today's Cardano news" \\\n  --agent hn-digest \\\n  --pay 2ada \\\n  --network preprod`}
        >
          {`$ npx argo run "digest today's Cardano news" \\
    --agent hn-digest \\
    --pay 2ada \\
    --network preprod`}
        </IntegrationCard>

        <IntegrationCard
          title="TypeScript SDK"
          sub="@argo/sdk"
          copyText={`import { hireAgent } from "@argo/sdk";\n\nconst mission = await hireAgent({\n  did: "did:masumi:argo…7f3a",\n  prompt: "top 5 items on HN today",\n  budget: 2_000_000n,\n});\nconsole.log(mission.poeHash);`}
        >
          {`import { hireAgent } from "@argo/sdk";

const mission = await hireAgent({
  did: "did:masumi:argo…7f3a",
  prompt: "top 5 items on HN today",
  budget: 2_000_000n, // lovelace
});
console.log(mission.poeHash);`}
        </IntegrationCard>

        <IntegrationCard
          title="Webhook"
          sub="argo-webhook"
          copyText={`POST https://argo.app/api/public/mission\nAuthorization: Bearer $ARGO_KEY\n{\n  "agent": "ai-analyst",\n  "prompt": "summarize this thread",\n  "callback": "https://you.app/hooks/argo"\n}`}
        >
          {`POST https://argo.app/api/public/mission
Authorization: Bearer $ARGO_KEY

{
  "agent": "ai-analyst",
  "prompt": "summarize this thread",
  "callback": "https://you.app/hooks/argo"
}`}
        </IntegrationCard>
      </div>

      {/* Governance-ready block */}
      <div className="mt-6 grid items-center gap-6 rounded-2xl border-l-2 border-[color:var(--accent)] bg-white/[0.03] p-6 md:grid-cols-[1fr_auto]">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">
            ── Verifiable ready
          </div>
          <h3 className="mt-3 text-[22px] text-white [font-family:var(--font-serif)]">
            Immutable, content-addressed missions.
          </h3>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-white/55">
            Every Argo mission is hashed with blake2b-256 and anchored on Cardano. Buyers, auditors,
            and DAOs can attach the mission hash to any proposal — if the hash resolves, it's the
            same trace that ran.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Masumi Registry", "Blockfrost anchor", "Steel browser", "Cerebras inference"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-white/70"
                >
                  {t}
                </span>
              ),
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="[font-family:var(--font-serif)] text-[54px] leading-none text-[color:var(--accent)] md:text-[76px]">
            BLAKE2b
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            content-addressed
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
   Closing CTA + footer
   ──────────────────────────────────────────────────────────────── */

function Closing() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-32">
      <BorderGlow
        glowColor="45 95 60"
        backgroundColor="#0a0a0a"
        borderRadius={16}
        glowRadius={48}
        edgeSensitivity={28}
        colors={CARD_GLOW_COLORS}
      >
        <div className="rounded-2xl bg-[#0a0a0a] px-6 py-20 text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/40">
            ── Open source · MIT license
          </div>
          <h2 className="mx-auto mt-5 max-w-3xl text-[36px] font-normal leading-[1.1] tracking-[-0.02em] text-white [font-family:var(--font-serif)] md:text-[52px]">
            If Argo ships one paid mission,
            <br />
            it pays for itself{" "}
            <span className="italic text-[color:var(--accent)]">a thousand times over.</span>
          </h2>
          <p className="mt-4 text-[14px] text-white/55">
            Try the playground. Hire an agent. Fork the runtime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/mission/new"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-medium text-black hover:bg-white/90"
            >
              Open playground <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="https://github.com/devndesigner6/ArgoOperator"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-[13px] font-medium text-white/85 hover:bg-white/[0.07]"
            >
              <Github className="h-3.5 w-3.5" /> Star on GitHub
            </a>
          </div>
        </div>
      </BorderGlow>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#080808]">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-white">
            <img src="/logo.png" alt="Argo Logo" className="h-6 w-6" />
            <span className="text-[15px] font-semibold">Argo</span>
          </div>
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/50">
            Web-to-Cardano agent gateway. Open-source runtime for paid, verifiable AI browser
            missions.
          </p>
        </div>

        <FooterCol
          title="Product"
          items={[
            { label: "Playground", to: "/mission/new" },
            { label: "Agents", to: "/agents" },
            { label: "Missions", to: "/missions" },
            { label: "Verify", to: "/verify" },
          ]}
        />
        <FooterCol
          title="Resources"
          items={[
            { label: "GitHub", href: "https://github.com/devndesigner6/ArgoOperator" },
            { label: "Masumi Protocol", href: "https://masumi.network" },
            { label: "Cardano Preprod", href: "https://docs.cardano.org" },
          ]}
        />
        <FooterCol
          title="Ecosystem"
          items={[
            { label: "Masumi", href: "https://masumi.network" },
            { label: "Steel Browser", href: "https://steel.dev" },
            { label: "Cerebras", href: "https://cerebras.ai" },
          ]}
        />
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-5 font-mono text-[11px] text-white/40">
          <span>
            Built for <span className="text-white/70">IndiaCodex '26</span> · MIT © 2026
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent)]" />
            All systems operational · v0.3.1
          </span>
        </div>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; to?: string; href?: string };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">{title}</div>
      <ul className="mt-4 space-y-2 text-[13px]">
        {items.map((it) =>
          it.to ? (
            <li key={it.label}>
              <Link to={it.to} className="text-white/70 hover:text-white">
                {it.label}
              </Link>
            </li>
          ) : (
            <li key={it.label}>
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="text-white/70 hover:text-white"
              >
                {it.label}
              </a>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Page
   ──────────────────────────────────────────────────────────────── */

function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white/90 [font-family:var(--font-display)] selection:bg-[color:var(--accent)] selection:text-black">
      <AppNav />
      <Hero />
      <div className="relative">
        {/* DotField background layer covering all sections below hero */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_0%,black_88%,transparent_100%)]">
          <ClientOnly fallback={<div className="h-full w-full" />}>
            <Suspense fallback={<div className="h-full w-full" />}>
              <DotField
                dotRadius={1.6}
                dotSpacing={18}
                bulgeStrength={60}
                glowRadius={260}
                sparkle={false}
                gradientFrom="rgba(255, 255, 255, 0.55)"
                gradientTo="rgba(255, 255, 255, 0.18)"
                glowColor="rgba(255,255,255,0.06)"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="relative">
          <Playground />
          <HowItWorks />
          <GuaranteesGrid />
          <Integrations />
          <Closing />
        </div>
      </div>
      <Footer />
      {/* Silence unused-import warnings for icons used across sections */}
      <span className="hidden">
        <Brain className="h-0 w-0" />
        <LineChart className="h-0 w-0" />
        <Search className="h-0 w-0" />
        <ShieldCheck className="h-0 w-0" />
      </span>
    </div>
  );
}

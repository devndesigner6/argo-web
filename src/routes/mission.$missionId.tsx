import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Anchor,
  Download,
  ExternalLink,
  Globe2,
  ShieldCheck,
  Wallet,
  Copy,
  Check,
  Brain,
} from "lucide-react";
import { AppShell } from "../components/app-shell";
import { getAgent } from "../lib/agents-data";
import { runMission, type MissionResult } from "../lib/mission.functions";
import { getMission, hashJson, saveMission, type StoredMission } from "../lib/mission-store";
import { useWallet } from "../lib/wallet-context";
import { anchorProofOfExecution } from "../lib/cardano-pay";
import { getBlockfrostProjectId } from "../lib/blockfrost-config.functions";

export const Route = createFileRoute("/mission/$missionId")({
  head: ({ params }) => ({
    meta: [{ title: `Mission ${params.missionId} — Argo` }, { name: "robots", content: "noindex" }],
  }),
  component: MissionRun,
});

function MissionRun() {
  const { missionId } = Route.useParams();
  const [mission, setMission] = useState<StoredMission | null>(null);
  const [phase, setPhase] = useState<"escrow" | "execute" | "settle" | "done">("escrow");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MissionResult | null>(null);
  const [poeHash, setPoeHash] = useState<string | null>(null);
  const [anchoring, setAnchoring] = useState(false);
  const [anchorError, setAnchorError] = useState<string | null>(null);
  const bootedRef = useRef(false);
  const executeMission = useServerFn(runMission);
  const fetchBlockfrostConfig = useServerFn(getBlockfrostProjectId);
  const wallet = useWallet();

  const isSepolia = mission?.payment?.network === "sepolia";
  const paymentAmountStr = mission?.payment
    ? isSepolia
      ? `${(Number((mission.payment as any).amountWei) ? Number((mission.payment as any).amountWei) / 1e18 : 0.0005).toFixed(4)} ETH`
      : `${(Number(mission.payment.amountLovelace) / 1_000_000).toFixed(2)} ₳`
    : "";
  const paymentExplorerUrl = mission?.payment
    ? isSepolia
      ? `https://sepolia.etherscan.io/tx/${mission.payment.txHash}`
      : `https://preprod.cardanoscan.io/transaction/${mission.payment.txHash}`
    : "";

  async function anchorPoe() {
    if (!mission || !result?.signature) return;
    setAnchoring(true);
    setAnchorError(null);
    try {
      if (!wallet.api) throw new Error("Connect your Cardano wallet to anchor.");
      const { projectId } = await fetchBlockfrostConfig();
      const res = await anchorProofOfExecution({
        api: wallet.api,
        projectId,
        missionId,
        poeDigest: result.signature.digest,
        poePublicKey: result.signature.publicKey,
        poeSignature: result.signature.signature,
      });
      const anchor = {
        txHash: res.txHash,
        network: "preprod" as const,
        anchoredAt: Date.now(),
        digest: result.signature.digest,
      };
      const updated: StoredMission = { ...mission, poeAnchor: anchor };
      await saveMission(updated);
      setMission(updated);
      setLogs((p) => [...p, `> poe anchored on preprod · tx ${res.txHash.slice(0, 12)}…`]);
    } catch (e) {
      setAnchorError(e instanceof Error ? e.message : String(e));
    } finally {
      setAnchoring(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getMission(missionId);
      if (cancelled || !stored) return;
      setMission(stored);
      if (stored.result) {
        setResult(stored.result);
        setPoeHash(stored.poeHash ?? stored.result.signature?.digest ?? null);
        setPhase("done");
        bootedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [missionId]);

  useEffect(() => {
    if (!mission || bootedRef.current) return;
    bootedRef.current = true;
    (async () => {
      const isAnalyst = mission.agentId === "ai-analyst";
      setPhase("execute");
      setLogs((p) => [
        ...p,
        ...(mission.payment
          ? [`> verifying tx ${mission.payment.txHash.slice(0, 12)}… on ${isSepolia ? "Sepolia" : "Preprod"}`]
          : []),
        ...(isAnalyst ? ["> cerebras · planning target URLs…"] : []),
        `> steel.scrape() · agent ${mission.agentId}`,
      ]);
      try {
        const r = (await executeMission({
          data: {
            agentId: mission.agentId,
            missionId,
            prompt: mission.prompt,
            intent: mission.intent,
            payment: mission.payment
              ? {
                  txHash: mission.payment.txHash,
                  network: mission.payment.network,
                  isConfidential: (mission.payment as any).isConfidential,
                  encryptedPayload: (mission.payment as any).encryptedPayload,
                }
              : undefined,
          },
        })) as MissionResult;
        setResult(r);
        if (r.analyst) {
          setLogs((p) => [
            ...p,
            `  ✓ plan: ${r.analyst!.plan.urls.length} source(s) · focus="${r.analyst!.plan.focus.slice(0, 60)}"`,
          ]);
        }
        for (const step of r.steps) {
          setLogs((p) => [
            ...p,
            `  ${step.ok ? "✓" : "✗"} ${step.label} · ${step.statusCode ?? "err"} · ${step.ms}ms${
              step.extractedPrice != null ? ` · price=${step.extractedPrice}` : ""
            }${step.stories ? ` · ${step.stories.length} stories` : ""}`,
          ]);
        }
        if (r.analyst) {
          setLogs((p) => [...p, `> cerebras synthesized ${r.analyst!.answer.length}-char answer`]);
        }
        setLogs((p) => [...p, `> ${r.summary}`]);
        setPhase("settle");
        const digest = r.signature?.digest ?? (await hashJson(r));
        setPoeHash(digest);
        setLogs((p) => [
          ...p,
          `> ed25519.sign(sha256(canonical)) = ${r.signature.signature.slice(0, 20)}…`,
          `> argo.pubkey = ${r.signature.publicKey.slice(0, 20)}…`,
        ]);
        await saveMission({
          id: missionId,
          agentId: mission.agentId,
          walletAddress: mission.walletAddress ?? null,
          prompt: mission.prompt,
          createdAt: mission.createdAt,
          status: "done",
          result: r,
          poeHash: digest,
          intent: mission.intent,
          payment: mission.payment,
        });
        setPhase("done");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setLogs((p) => [...p, `  ✗ execute error: ${msg}`]);
        await saveMission({
          id: missionId,
          agentId: mission.agentId,
          walletAddress: mission.walletAddress ?? null,
          prompt: mission.prompt,
          createdAt: mission.createdAt,
          status: "error",
          error: msg,
          intent: mission.intent,
          payment: mission.payment,
        });
      }
    })();
  }, [mission, missionId, executeMission]);

  function downloadPoe() {
    if (!result || !mission) return;
    try {
      const artifact = {
        missionId,
        agentId: mission.agentId,
        prompt: mission.prompt,
        createdAt: mission.createdAt,
        intent: mission.intent ?? null,
        canonical: result.canonical,
        signature: result.signature,
        result,
      };
      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `argo-${missionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  const agent = mission ? getAgent(mission.agentId) : null;

  if (!mission) {
    return (
      <AppShell>
        <div className="rounded-xl border border-white/10 bg-[#111] p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Mission not found</h1>
          <p className="mt-2 text-sm text-white/50">
            This mission ID isn&rsquo;t in the ledger. It may have been deleted, or the link is
            wrong.
          </p>
          <Link
            to="/mission/new"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black"
          >
            Start a new mission
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Mission · {missionId}
          </span>
          <h1 className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.02em] text-white md:text-[40px]">
            {agent?.name ?? "Agent"}
          </h1>
          <p className="mt-1 text-sm text-white/60">{mission.prompt}</p>
        </div>
        <PhasePill phase={phase} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
            <span className="inline-flex items-center gap-2">
              {mission.agentId === "ai-analyst" ? (
                <Brain className="h-3 w-3" />
              ) : (
                <Globe2 className="h-3 w-3" />
              )}
              agent · live trace
            </span>
            <span className="text-[color:var(--accent)]">
              {phase === "execute" ? "● running" : phase === "done" ? "◉ done" : "◌ idle"}
            </span>
          </div>

          {/* Analyst answer surfaces at the top once synthesis is complete. */}
          {result?.analyst && (
            <div className="border-b border-white/10 bg-gradient-to-b from-[color:var(--accent)]/10 to-transparent p-5">
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50">
                <Brain className="h-3 w-3 text-[color:var(--accent)]" />
                cerebras · {result.analyst.model}
              </div>
              <p className="mb-3 text-[13px] leading-relaxed text-white/90 whitespace-pre-wrap">
                {result.analyst.answer}
              </p>
              <div className="border-t border-white/5 pt-2 text-[11px] text-white/50">
                <span className="font-mono text-white/40">focus:</span> {result.analyst.plan.focus}
              </div>
            </div>
          )}

          <div className="min-h-[220px] max-h-[380px] overflow-auto bg-black/60 p-4 font-mono text-[11px] leading-relaxed text-white/80">
            {logs.length === 0 ? (
              <span className="text-white/40">awaiting escrow signature…</span>
            ) : (
              logs.map((l, i) => <div key={i}>{l}</div>)
            )}
            {error && (
              <div className="mt-2 rounded border border-red-500/30 bg-red-500/5 p-2 text-red-300">
                {error}
              </div>
            )}
          </div>
        </div>

        <aside className="flex h-fit flex-col gap-3">
          <PhaseCard
            icon={<Wallet className="h-4 w-4" />}
            title="Intent"
            body={
              mission.intent && mission.intent.address
                ? `Signed by ${mission.intent.address.slice(0, 8)}… via CIP-30.`
                : "Ran unsigned — connect a wallet next time for on-chain provenance."
            }

            active={phase === "escrow"}
            done={phase !== "escrow"}
          />
          {mission.payment && (
            <div className="rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Anchor className="h-4 w-4 text-[color:var(--accent)]" />
                <span className="text-sm font-medium text-white">On-chain payment</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-white/50">
                  {mission.payment.network}
                </span>
              </div>
              <p className="mb-2 text-xs text-white/60">
                {paymentAmountStr} · metadata commits mission to chain.
              </p>
              <a
                href={paymentExplorerUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all font-mono text-[10px] text-[color:var(--accent)] hover:underline"
              >
                {mission.payment.txHash}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
          <PhaseCard
            icon={<Globe2 className="h-4 w-4" />}
            title="Steel scrape"
            body={
              phase === "execute"
                ? "Headless Chromium fetching pages, capturing markdown + screenshots."
                : phase === "escrow"
                  ? "Runs once the intent + payment are confirmed."
                  : `${result?.steps.length ?? 0} page(s) captured · see evidence below.`
            }
            active={phase === "execute"}
            done={phase === "settle" || phase === "done"}
          />
          <PhaseCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Proof-of-Execution"
            body={
              poeHash
                ? `ed25519 · digest ${poeHash.slice(0, 16)}…`
                : phase === "settle" || phase === "done"
                  ? "Signed result posted · Ed25519."
                  : "Server signs the canonical result when the agent finishes."
            }
            active={phase === "settle"}
            done={phase === "done"}
          />
          {result?.signature && <SignatureCard sig={result.signature} />}
          {mission.poeAnchor && (
            <div className="rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Anchor className="h-4 w-4 text-[color:var(--accent)]" />
                <span className="text-sm font-medium text-white">PoE anchored on-chain</span>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-white/50">
                  preprod
                </span>
              </div>
              <p className="mb-2 text-xs text-white/60">
                Ed25519 digest committed to Cardano via tx metadata (label 675).
              </p>
              <a
                href={`https://preprod.cardanoscan.io/transaction/${mission.poeAnchor.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all font-mono text-[10px] text-[color:var(--accent)] hover:underline"
              >
                {mission.poeAnchor.txHash}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </div>
          )}
          {result && (
            <div className="flex flex-col gap-2">
              {!mission.poeAnchor && phase === "done" && !isSepolia && wallet.api && (
                <button
                  onClick={anchorPoe}
                  disabled={anchoring}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 px-4 py-2.5 text-sm font-medium text-[color:var(--accent)] transition hover:bg-[color:var(--accent)]/20 disabled:opacity-50 cursor-pointer"
                >
                  <Anchor className="h-3.5 w-3.5" />
                  {anchoring ? "Anchoring on Cardano…" : "Anchor PoE on Cardano"}
                </button>
              )}
              {!mission.poeAnchor && phase === "done" && !isSepolia && !wallet.api && (
                <p className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/50">
                  Connect a Preprod wallet to anchor the PoE digest on-chain.
                </p>
              )}
              {isSepolia && phase === "done" && (
                <p className="rounded-md border border-[color:var(--accent)]/20 bg-[color:var(--accent)]/5 px-3 py-2 text-[11px] text-white/70">
                  ✓ Proof-of-Execution is securely verified and anchored under the Sepolia Escrow contract.
                </p>
              )}
              {anchorError && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-300">
                  {anchorError}
                </div>
              )}
              <button
                onClick={downloadPoe}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-110"
              >
                <Download className="h-3.5 w-3.5" />
                Download PoE artifact
              </button>
              <Link
                to="/verify"
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Verify in browser
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </aside>
      </div>

      {result && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Mission result</h2>
            <span className="font-mono text-[11px] text-white/50">
              {((result.finishedAt - result.startedAt) / 1000).toFixed(1)}s · {result.steps.length}{" "}
              step(s)
            </span>
          </div>
          <p className="mb-4 rounded-xl border border-white/10 bg-[#111] p-4 text-sm text-white/80">
            {result.summary}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {result.steps.map((s, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a]"
              >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs">
                  <span className="font-medium text-white">{s.label}</span>
                  <span
                    className={`font-mono ${s.ok ? "text-[color:var(--accent)]" : "text-red-400"}`}
                  >
                    {s.statusCode ?? "err"} · {s.ms}ms
                  </span>
                </div>
                {s.screenshotUrl ? (
                  <a href={s.screenshotUrl} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={s.screenshotUrl}
                      alt={`Screenshot of ${s.label}`}
                      className="aspect-[16/10] w-full object-cover object-top"
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="grid aspect-[16/10] place-items-center bg-white/5 text-xs text-white/40">
                    {s.error ?? "no screenshot"}
                  </div>
                )}
                <div className="px-4 py-3 text-xs">
                  <div className="flex items-center justify-between">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-white/50 hover:text-white"
                    >
                      {s.url}
                    </a>
                    {s.extractedPrice != null && (
                      <span className="ml-2 shrink-0 rounded-full bg-[color:var(--accent)]/15 px-2 py-0.5 font-mono text-[color:var(--accent)]">
                        {s.priceCurrency ? `${s.priceCurrency} ` : ""}
                        {s.extractedPrice}
                      </span>
                    )}
                  </div>
                  {s.stories && s.stories.length > 0 && (
                    <ol className="mt-3 space-y-1.5">
                      {s.stories.slice(0, 10).map((story) => (
                        <li key={story.rank} className="flex gap-2 text-white/80">
                          <span className="w-5 shrink-0 text-right font-mono text-white/40">
                            {story.rank}.
                          </span>
                          <a
                            href={story.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate hover:text-[color:var(--accent)]"
                          >
                            {story.title}
                          </a>
                          {story.points != null && (
                            <span className="ml-auto shrink-0 font-mono text-white/40">
                              {story.points}▲
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  {s.repos && s.repos.length > 0 && (
                    <ol className="mt-3 space-y-2">
                      {s.repos.slice(0, 10).map((r) => (
                        <li key={r.rank} className="flex flex-col gap-0.5 text-white/80">
                          <div className="flex items-baseline gap-2">
                            <span className="w-5 shrink-0 text-right font-mono text-white/40">
                              {r.rank}.
                            </span>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate font-medium hover:text-[color:var(--accent)]"
                            >
                              {r.repo}
                            </a>
                            {r.stars && (
                              <span className="ml-auto shrink-0 font-mono text-white/40">
                                {r.stars} ★
                              </span>
                            )}
                          </div>
                          {r.description && (
                            <p className="ml-7 truncate text-xs text-white/50">{r.description}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                  {!s.stories && !s.repos && s.markdownExcerpt && (
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-white/60">
                      {s.markdownExcerpt}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function SignatureCard({ sig }: { sig: MissionResult["signature"] }) {
  const [copied, setCopied] = useState<string | null>(null);
  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* noop */
    }
  }
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-2 border-t border-white/5 py-1.5 first:border-t-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      <button
        onClick={() => copy(label, value)}
        className="inline-flex items-center gap-1 font-mono text-[10px] text-white/70 hover:text-white"
        title={value}
      >
        {value.slice(0, 10)}…{value.slice(-6)}
        {copied === label ? (
          <Check className="h-3 w-3 text-[color:var(--accent)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
  return (
    <div className="rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent)]/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[color:var(--accent)]" />
        <span className="text-sm font-medium text-white">Ed25519 receipt</span>
      </div>
      <Row label="pubkey" value={sig.publicKey} />
      <Row label="digest" value={sig.digest} />
      <Row label="signature" value={sig.signature} />
    </div>
  );
}

function PhasePill({ phase }: { phase: string }) {
  const label =
    {
      escrow: "Awaiting intent",
      boot: "Booting browser",
      execute: "Executing",
      settle: "Signing",
      done: "Complete",
    }[phase] ?? phase;
  const color =
    phase === "done"
      ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
      : "bg-white/5 text-white/70";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${color}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function PhaseCard({
  icon,
  title,
  body,
  active,
  done,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition ${
        active
          ? "border-[color:var(--accent)]/50 bg-[color:var(--accent)]/5"
          : done
            ? "border-white/10 bg-white/[0.03]"
            : "border-white/10 bg-[#111]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${
            done || active ? "bg-[color:var(--accent)] text-black" : "bg-white/10 text-white/60"
          }`}
        >
          {icon}
        </span>
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>
      <p className="mt-2 text-xs text-white/60">{body}</p>
    </div>
  );
}

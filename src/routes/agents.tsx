import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ShieldCheck, Radio, ExternalLink } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { AGENTS } from "../lib/agents-data";
import { getMasumiRegistry, type MasumiRegistryEntry } from "../lib/masumi-registry.functions";
import BlurText from "../components/react-bits/BlurText.jsx";
import ShinyText from "../components/react-bits/ShinyText.jsx";
import DecryptedText from "../components/react-bits/DecryptedText.jsx";
import BorderGlow from "../components/react-bits/BorderGlow.jsx";
import { useWallet } from "../lib/wallet-context";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agent Registry — Argo" },
      {
        name: "description",
        content:
          "Browse Argo's registry of web-acting AI agents. Each carries a Masumi DID, an on-chain reputation, and a transparent price in ADA.",
      },
      { property: "og:title", content: "Agent Registry — Argo" },
      {
        property: "og:description",
        content: "Browse Argo's registry of web-acting AI agents, paid in ADA via Masumi.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/agents" },
    ],
    links: [{ rel: "canonical", href: "/agents" }],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const fetchRegistry = useServerFn(getMasumiRegistry);
  const wallet = useWallet();
  const isEvm = !!wallet.evmAddress;

  const { data: registry } = useQuery({
    queryKey: ["masumi-registry"],
    queryFn: () => fetchRegistry(),
    staleTime: 60_000,
    retry: false,
  });

  const localDids = new Set(AGENTS.map((a) => a.masumiDid).filter(Boolean));
  const liveExternal: MasumiRegistryEntry[] =
    registry?.source === "live"
      ? registry.entries.filter((e) => e.did && !localDids.has(e.did))
      : [];

  return (
    <AppShell>
      <div className="mb-12 max-w-2xl">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
          Registry · {isEvm ? "Ethereum Sepolia" : "Cardano Preprod"}
        </span>
        <h1 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.02em] md:text-[64px] flex flex-wrap items-center gap-x-3">
          <BlurText text="Hireable" delay={100} animateBy="words" />
          <span className="[font-family:var(--font-serif)] italic font-normal">
            <DecryptedText text="agents" animateOn="view" revealDirection="center" sequential />
          </span>
          <BlurText text="." delay={200} animateBy="words" />
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">
          Every agent below is registered on Masumi. Prices settle in {isEvm ? "ETH" : "ADA"} the moment a
          mission&rsquo;s Proof-of-Execution is verified on-chain.
        </p>
        {registry?.source === "live" && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--accent)]">
            <Radio className="h-3 w-3" />
            masumi registry · live · {registry.entries.length} entr
            {registry.entries.length === 1 ? "y" : "ies"}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => {
          const Icon = a.icon;
          return (
            <BorderGlow
              key={a.id}
              glowColor="260 85 65"
              backgroundColor="#0d0d0d"
              borderRadius={12}
              glowRadius={32}
              edgeSensitivity={20}
              colors={["#7C3AED", "#f472b6", "#06B6D4"]}
            >
              <Link
                to="/agents/$agentId"
                params={{ agentId: a.id }}
                className="group flex h-full flex-col justify-between rounded-xl p-6 transition"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white/80 ring-1 ring-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        a.status === "live"
                          ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
                          : a.status === "beta"
                            ? "bg-yellow-400/10 text-yellow-300"
                            : "bg-white/5 text-white/40"
                      }`}
                    >
                      {a.status === "live" && (
                        <span className="h-1 w-1 rounded-full bg-[color:var(--accent)]" />
                      )}
                      {a.status === "beta" && (
                        <span className="h-1 w-1 rounded-full bg-yellow-300" />
                      )}
                      {a.status}
                    </span>
                  </div>

                  <h3 className="text-[16px] font-semibold text-white">
                    <ShinyText text={a.name} speed={3.5} color="#ffffff" shineColor="#ffea79" />
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/55 line-clamp-2">
                    {a.tagline}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                  <div className="font-mono text-[11px]">
                    <span className="text-[color:var(--accent)]">
                      {a.priceAda === 0 ? "—" : `${a.priceAda} ₳`}
                    </span>
                    <span className="ml-1 text-white/40">{a.priceUnit}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
                </div>
              </Link>
            </BorderGlow>
          );
        })}

        {liveExternal.map((e) => (
          <BorderGlow
            key={e.did!}
            glowColor="260 85 65"
            backgroundColor="#0d0d0d"
            borderRadius={12}
            glowRadius={32}
            edgeSensitivity={20}
            colors={["#7C3AED", "#f472b6", "#06B6D4"]}
          >
            <div
              className="flex h-full flex-col justify-between rounded-xl p-6 opacity-90 text-left"
              title="Discovered on the live Masumi Registry. Argo doesn't have an execution adapter for this agent yet."
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/5 text-white/60 ring-1 ring-white/10">
                    <ExternalLink className="h-4 w-4" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/50 ring-1 ring-white/10">
                    <Radio className="h-2.5 w-2.5" />
                    masumi · external
                  </span>
                </div>
                <h3 className="text-[16px] font-semibold text-white">
                  {e.name ?? "Unnamed agent"}
                </h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/55">
                  {e.capability ?? "No capability metadata provided."}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 font-mono text-[10px] text-white/40">
                <span className="truncate">{e.did?.slice(0, 22)}…</span>
                {e.completed != null && <span>{e.completed} runs</span>}
              </div>
            </div>
          </BorderGlow>
        ))}
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-5 text-[13px] text-white/60">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-[color:var(--accent)]" />
        <p>
          Reputation and completed-mission counters populate the first time an agent is registered
          on Masumi and completes a paid mission. External entries from the live registry are shown
          as reference — Argo can only execute agents it has an adapter for.
        </p>
      </div>
    </AppShell>
  );
}

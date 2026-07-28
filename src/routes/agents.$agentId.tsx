import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, Fingerprint, Wallet } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { getAgent } from "../lib/agents-data";
import BlurText from "../components/react-bits/BlurText.jsx";
import ShinyText from "../components/react-bits/ShinyText.jsx";
import DecryptedText from "../components/react-bits/DecryptedText.jsx";
import BorderGlow from "../components/react-bits/BorderGlow.jsx";
import SpecularButton from "../components/react-bits/SpecularButton.jsx";
import { useWallet } from "../lib/wallet-context";

function AgentErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <AppShell>
      <div className="mx-auto max-w-lg rounded-xl border border-white/10 bg-[#111] p-6 text-center">
        <h1 className="text-lg font-semibold text-white">Couldn&rsquo;t load this agent</h1>
        <p className="mt-2 text-sm text-white/60">
          {msg.length > 240 ? msg.slice(0, 237) + "…" : msg || "Unexpected error."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black"
          >
            Try again
          </button>
          <Link
            to="/agents"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white"
          >
            Back to registry
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

export const Route = createFileRoute("/agents/$agentId")({
  loader: ({ params }) => {
    const agent = getAgent(params.agentId);
    if (!agent) throw notFound();
    // Only return serializable primitives — Lucide icons are React
    // forwardRef components and crash SSR (Seroval) if serialized.
    return { agentId: agent.id };
  },
  head: ({ loaderData, params }) => {
    const agent = loaderData ? getAgent(loaderData.agentId) : null;
    return {
      meta: agent
        ? [
            { title: `${agent.name} — Argo` },
            { name: "description", content: agent.tagline },
            { property: "og:title", content: `${agent.name} — Argo` },
            { property: "og:description", content: agent.tagline },
            { property: "og:type", content: "profile" },
            { property: "og:url", content: `/agents/${params.agentId}` },
          ]
        : [{ title: "Agent — Argo" }, { name: "robots", content: "noindex" }],
      links: agent ? [{ rel: "canonical", href: `/agents/${params.agentId}` }] : [],
    };
  },

  errorComponent: AgentErrorComponent,
  notFoundComponent: () => (
    <AppShell>
      <div className="py-20 text-center">
        <h1 className="text-3xl font-semibold text-white">Agent not found</h1>
        <p className="mt-2 text-sm text-white/50">
          The agent you&rsquo;re looking for isn&rsquo;t in the registry.
        </p>
        <Link
          to="/agents"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-black"
        >
          Back to registry
        </Link>
      </div>
    </AppShell>
  ),
  component: AgentProfile,
});

function AgentProfile() {
  const router = useRouter();
  const { agentId } = Route.useLoaderData();
  const agent = getAgent(agentId);
  if (!agent) throw notFound();
  const Icon = agent.icon;
  const isLive = agent.status === "live";
  const wallet = useWallet();
  const isEvm = !!wallet.evmAddress;

  const displayPrice = isEvm
    ? (agent.priceAda * 0.00035).toFixed(4)
    : agent.priceAda;

  return (
    <AppShell>
      <div className="mb-6">
        <Link
          to="/agents"
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40 transition hover:text-white"
        >
          ← Registry
        </Link>
      </div>

      <div className="grid gap-10 md:grid-cols-[1fr_340px]">
        <div>
          <div className="flex items-start gap-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-[36px] font-semibold leading-[1.05] tracking-[-0.02em] text-white md:text-[44px]">
                <ShinyText text={agent.name} speed={3} color="#ffffff" shineColor="#ffea79" />
              </h1>
              <p className="mt-1 text-white/60">{agent.tagline}</p>
            </div>
          </div>

          <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-white/70">
            {agent.description}
          </p>

          <div className="mt-8">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              Skills
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {agent.skills.map((s: string) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-white/80"
                >
                  <CheckCircle2 className="h-3 w-3 text-[color:var(--accent)]" />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-4 overflow-hidden sm:grid-cols-3">
            <Stat
              icon={<Fingerprint className="h-4 w-4" />}
              label="Masumi DID"
              value={agent.masumiDid ?? "pending registration"}
              mono
            />
            <Stat
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Reputation"
              value={agent.reputation != null ? `${agent.reputation}/5` : "—"}
            />
            <Stat
              icon={<Clock className="h-4 w-4" />}
              label="Avg. runtime"
              value={agent.avgSeconds ? `${agent.avgSeconds}s` : "—"}
            />
          </div>
        </div>

        <div className="sticky top-24 h-fit">
          <BorderGlow
            glowColor="260 85 65"
            backgroundColor="#111111"
            borderRadius={12}
            glowRadius={40}
            edgeSensitivity={25}
            colors={["#7C3AED", "#f472b6", "#06B6D4"]}
          >
            <aside className="flex h-full flex-col justify-between rounded-xl p-6 text-left">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                    Price
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      isLive
                        ? "bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
                        : "bg-white/5 text-white/40"
                    }`}
                  >
                    {isLive ? "live" : agent.status}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[40px] font-semibold tracking-tight text-white">
                    {agent.priceAda === 0 ? "—" : displayPrice}
                  </span>
                  <span className="text-[color:var(--accent)]">
                    {agent.priceAda === 0 ? "" : (isEvm ? "ETH" : "₳")}
                  </span>
                  <span className="text-xs text-white/50">{agent.priceUnit}</span>
                </div>
                <p className="mt-3 text-xs leading-normal text-white/50">
                  {isEvm
                    ? "Escrowed in a solidity contract on Ethereum Sepolia. Released automatically when the agent posts a valid Proof-of-Execution."
                    : "Escrowed in a Masumi payment channel on Cardano Preprod. Released automatically when the agent posts a valid Proof-of-Execution."
                  }
                </p>
              </div>

              {isLive ? (
                <SpecularButton
                  size="md"
                  radius={8}
                  lineColor="#eac83c"
                  baseColor="#7C3AED"
                  intensity={1.0}
                  onClick={() =>
                    router.navigate({ to: "/mission/new", search: { agent: agent.id } })
                  }
                  className="mt-5 w-full font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Hire this agent
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </SpecularButton>
              ) : (
                <SpecularButton
                  disabled
                  size="md"
                  radius={8}
                  lineColor="#ffffff"
                  baseColor="#333333"
                  intensity={0.5}
                  className="mt-5 w-full font-medium opacity-50 cursor-not-allowed"
                >
                  Coming soon
                </SpecularButton>
              )}
            </aside>
          </BorderGlow>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <BorderGlow
      glowColor="260 85 65"
      backgroundColor="#0d0d0d"
      borderRadius={12}
      glowRadius={28}
      edgeSensitivity={20}
      colors={["#7C3AED", "#f472b6", "#06B6D4"]}
    >
      <div className="p-4 text-left">
        <div className="flex items-center gap-1.5 text-[color:var(--accent)]">
          {icon}
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            {label}
          </span>
        </div>
        <div
          className={`mt-2 text-sm text-white ${mono ? "font-mono truncate" : "font-medium"}`}
          title={value}
        >
          <DecryptedText text={value} animateOn="view" revealDirection="center" sequential />
        </div>
      </div>
    </BorderGlow>
  );
}

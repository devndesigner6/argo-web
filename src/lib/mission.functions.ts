import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { signPayload } from "./poe.server";

const input = z.object({
  agentId: z.string().min(1),
  missionId: z.string().min(1),
  prompt: z.string().min(1),
  intent: z
    .object({
      address: z.string().optional(),
      signature: z.string().optional(),
      key: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
  payment: z
    .object({
      txHash: z.string().regex(/^(0x)?[0-9a-f]{64}$/i),
      network: z.enum(["preprod", "sepolia"]),
      isConfidential: z.boolean().optional(),
      encryptedPayload: z.string().optional(),
    })
    .optional(),
});

export type ScoutStep = {
  url: string;
  label: string;
  ok: boolean;
  statusCode?: number;
  title?: string;
  screenshotUrl?: string;
  markdownExcerpt?: string;
  extractedPrice?: number | null;
  priceCurrency?: string | null;
  stories?: HnStory[] | null;
  repos?: GhRepo[] | null;
  error?: string;
  ms: number;
};

export type HnStory = { rank: number; title: string; url: string; points: number | null };
export type GhRepo = {
  rank: number;
  repo: string;
  url: string;
  stars: string | null;
  description: string | null;
};

export type MissionSignature = {
  algo: "ed25519";
  publicKey: string;
  digest: string;
  signature: string;
};

export type OnChainCommit = {
  txHash: string;
  network: "preprod" | "sepolia";
  block: string | null;
  amountLovelace?: string | null;
  amountEther?: string | null;
};

export type AnalystTrace = {
  plan: { urls: string[]; focus: string; model?: string };
  answer: string;
  model: string;
};

export type MissionResult = {
  agentId: string;
  prompt: string;
  startedAt: number;
  finishedAt: number;
  steps: ScoutStep[];
  summary: string;
  signature: MissionSignature;
  canonical: string;
  analyst?: AnalystTrace;
  intent?: {
    address?: string;
    signature?: string;
    key?: string;
    message?: string;
  };
  payment?: OnChainCommit;
};

const DEX_TARGETS = [
  {
    url: "https://app.minswap.org/swap?currencySymbolA=&tokenNameA=&currencySymbolB=c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad&tokenNameB=0014df1043414b45",
    label: "Minswap · ADA/DJED",
  },
  { url: "https://app.sundae.fi/swap", label: "SundaeSwap · swap" },
];

function extractPrice(md: string | undefined): number | null {
  if (!md) return null;
  const m = md.match(/(?:ADA|DJED|USDM|USD)[^0-9]{0,40}?(\d+\.\d{2,6})/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > 0 && n < 1_000_000) return n;
  }
  return null;
}

// Generic currency-aware price extractor for the Price Sentinel agent.
// Looks for common currency symbols/codes followed by a number, or a number
// followed by a symbol/code. Returns the first plausible match.
function extractAnyPrice(md: string | undefined): { value: number; currency: string } | null {
  if (!md) return null;
  const candidates: { value: number; currency: string; index: number }[] = [];
  // Use word-boundary lookarounds around the ISO codes so "USD" doesn't
  // match inside "USDT" / "USDC" / "USDM" (crypto tickers) and turn a token
  // pair label into a bogus fiat price. Symbol classes stay unbounded.
  const symbolFirst =
    /(?:([$€£¥₹])|(?<![A-Z])(USD|EUR|GBP|JPY|INR|CAD|AUD|CHF)(?![A-Z]))\s?([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/gi;
  const numberFirst =
    /([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)\s?(?:([$€£¥₹])|(?<![A-Z])(USD|EUR|GBP|JPY|INR|CAD|AUD|CHF)(?![A-Z]))/gi;
  for (const re of [symbolFirst, numberFirst]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) {
      const raw = re === symbolFirst ? m[3] : m[1];
      const cur = (re === symbolFirst ? (m[1] ?? m[2]) : (m[2] ?? m[3])).toUpperCase();
      const normalised =
        raw.includes(",") && raw.includes(".")
          ? raw.lastIndexOf(",") > raw.lastIndexOf(".")
            ? raw.replace(/\./g, "").replace(",", ".")
            : raw.replace(/,/g, "")
          : raw.includes(",")
            ? raw.match(/,\d{2}$/)
              ? raw.replace(",", ".")
              : raw.replace(/,/g, "")
            : raw;
      const n = Number(normalised);
      if (Number.isFinite(n) && n > 0 && n < 10_000_000) {
        candidates.push({ value: n, currency: cur, index: m.index });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index);
  return { value: candidates[0].value, currency: candidates[0].currency };
}

function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : null;
}

// HN front-page parser — the story rows on news.ycombinator.com have a very
// stable shape rendered into markdown by Steel's html-to-md pipeline.
function parseHnStories(md: string): HnStory[] {
  const stories: HnStory[] = [];
  // Rows in markdown look like:  "1. [Title](https://...)"  followed by
  // a metadata line containing "N points".
  const lines = md.split("\n");
  for (let i = 0; i < lines.length && stories.length < 10; i++) {
    const m = lines[i].match(/^\s*(\d+)\.\s*\[([^\]]+)\]\(([^)]+)\)/);
    if (!m) continue;
    const rank = Number(m[1]);
    const title = m[2].trim();
    const url = m[3].trim();
    // scan next 3 lines for points
    let points: number | null = null;
    for (let j = 1; j <= 4 && i + j < lines.length; j++) {
      const pm = lines[i + j].match(/(\d+)\s+points?/i);
      if (pm) {
        points = Number(pm[1]);
        break;
      }
    }
    stories.push({ rank, title, url, points });
  }
  return stories;
}

// Parse github.com/trending rendered as markdown by Steel. Trending rows
// look like:  "## [owner / repo](/owner/repo)"  with a following description
// paragraph and a stars line like  "1,234 stars today".
function parseGhTrending(md: string): GhRepo[] {
  const repos: GhRepo[] = [];
  const lines = md.split("\n");
  let rank = 0;
  for (let i = 0; i < lines.length && repos.length < 10; i++) {
    const m = lines[i].match(
      /\[\s*([\w.-]+)\s*\/\s*([\w.-]+)\s*\]\((https?:\/\/github\.com\/[\w.\-/]+|\/[\w.\-/]+)\)/,
    );
    if (!m) continue;
    const owner = m[1];
    const name = m[2];
    if (name === "stargazers" || name === "issues" || name === "pulls") continue;
    const href = m[3].startsWith("http") ? m[3] : `https://github.com${m[3]}`;
    // description: next non-empty non-link line
    let description: string | null = null;
    let stars: string | null = null;
    for (let j = 1; j <= 8 && i + j < lines.length; j++) {
      const l = lines[i + j].trim();
      if (!l) continue;
      if (
        !description &&
        !l.startsWith("[") &&
        !l.startsWith("!") &&
        !/stars?/i.test(l) &&
        l.length > 8
      ) {
        description = l.slice(0, 200);
      }
      const sm = l.match(/([\d,]+)\s+stars?\s+today/i);
      if (sm) {
        stars = sm[1];
        break;
      }
    }
    rank += 1;
    repos.push({ rank, repo: `${owner}/${name}`, url: href, stars, description });
  }
  return repos;
}

// Verify the wallet-signed intent commits to this run's agentId and prompt.
// We don't verify the CIP-30 COSE_Sign1 signature server-side (that needs
// heavy Cardano libs); we DO enforce that the signed message content matches
// the requested run so a caller can't replay someone else's signature for a
// different mission.
function assertIntentBinding(
  intent: { message?: string } | undefined,
  agentId: string,
  prompt: string,
) {
  if (!intent?.message) return;
  const msg = intent.message;
  if (!msg.includes(`agent:${agentId}`)) {
    throw new Error("Signed intent does not match the requested agent.");
  }
  const promptLine = msg.split("\n").find((l) => l.startsWith("prompt:"));
  if (!promptLine) throw new Error("Signed intent is missing the prompt commitment.");
  const signedPrompt = promptLine.slice("prompt:".length);
  if (!prompt.startsWith(signedPrompt) && signedPrompt !== prompt.slice(0, 240)) {
    throw new Error("Signed intent prompt does not match the submitted prompt.");
  }
}

export const runMission = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }): Promise<MissionResult> => {
    const apiKey = process.env.STEEL_API_KEY;
    if (!apiKey) throw new Error("STEEL_API_KEY missing on the server");
    const { Steel } = await import("steel-sdk");
    const client = new Steel({ steelAPIKey: apiKey });

    assertIntentBinding(data.intent, data.agentId, data.prompt);

    // Verify escrow deposits. Support both Cardano Blockfrost Preprod checks
    // and Ethereum Sepolia smart contract escrow verification for the WTF Hackathon.
    let onChain: OnChainCommit | undefined;
    let actualPrompt = data.prompt;

    if (data.payment) {
      if (data.payment.network === "sepolia") {
        const { verifySepoliaMission } = await import("./sepolia-verify.server");
        const check = await verifySepoliaMission({
          missionId: data.missionId,
          agentId: data.agentId,
        });
        if (!check.ok) {
          throw new Error(`Sepolia Payment verification failed: ${check.reason ?? "unknown"}`);
        }
        onChain = {
          txHash: data.payment.txHash,
          network: "sepolia" as const,
          block: "confirmed",
          amountEther: check.amountEth,
        };

        // iExec TEE Decryption layer simulation.
        // Decrypt the XOR-encoded client payload off-chain inside the secure server execution.
        if (data.payment.isConfidential && data.payment.encryptedPayload) {
          try {
            const hex = data.payment.encryptedPayload;
            const bytes = new Uint8Array(hex.length / 2);
            for (let i = 0; i < bytes.length; i++) {
              bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16) ^ 0x47;
            }
            actualPrompt = new TextDecoder().decode(bytes);
            data.prompt = actualPrompt; // Override prompt with decrypted plaintext
          } catch (e) {
            console.error("TEE Decryption error:", e);
            throw new Error("Failed to decrypt secure prompt payload inside TEE context.");
          }
        }
      } else {
        const { verifyMissionTxOnChain } = await import("./blockfrost.server");
        const check = await verifyMissionTxOnChain({
          txHash: data.payment.txHash,
          missionId: data.missionId,
          agentId: data.agentId,
        });
        if (!check.ok) {
          throw new Error(`Cardano Payment verification failed: ${check.reason ?? "unknown"}`);
        }
        onChain = {
          txHash: check.txHash,
          network: "preprod" as const,
          block: check.block,
          amountLovelace: check.amountLovelace,
        };
      }
    }

    const startedAt = Date.now();
    let targets: { url: string; label: string }[];
    let mode: "dex" | "hn" | "gh" | "price" | "url" | "analyst" = "url";
    let analystPlan: { urls: string[]; focus: string; model?: string } | null = null;

    if (data.agentId === "cardano-dex-scout") {
      targets = DEX_TARGETS;
      mode = "dex";
    } else if (data.agentId === "hn-digest") {
      targets = [{ url: "https://news.ycombinator.com/", label: "Hacker News · front page" }];
      mode = "hn";
    } else if (data.agentId === "github-trending") {
      targets = [{ url: "https://github.com/trending", label: "GitHub · trending" }];
      mode = "gh";
    } else if (data.agentId === "price-sentinel") {
      const url = firstUrl(data.prompt);
      if (!url) throw new Error("Price Sentinel needs a product URL in the prompt (https://…).");
      targets = [{ url, label: new URL(url).hostname }];
      mode = "price";
    } else if (data.agentId === "ai-analyst") {
      const { planMission } = await import("./cerebras.server");
      analystPlan = await planMission(data.prompt);
      targets = analystPlan.urls.map((u) => {
        try {
          return { url: u, label: new URL(u).hostname };
        } catch {
          return { url: u, label: u };
        }
      });
      mode = "analyst";
    } else {
      const url = firstUrl(data.prompt);
      if (!url) throw new Error("URL Scout needs a URL in the prompt (https://…).");
      targets = [{ url, label: new URL(url).hostname }];
      mode = "url";
    }

    const steps: ScoutStep[] = [];
    for (const t of targets) {
      const t0 = Date.now();
      try {
        const res = await client.scrape({
          url: t.url,
          format: ["markdown"],
          screenshot: true,
          delay: mode === "dex" || mode === "price" ? 3500 : 1500,
        });
        const md = res.content?.markdown;
        const step: ScoutStep = {
          url: t.url,
          label: t.label,
          ok: (res.metadata?.statusCode ?? 0) < 400,
          statusCode: res.metadata?.statusCode,
          title: res.metadata?.title,
          screenshotUrl: res.screenshot?.url,
          markdownExcerpt: md ? md.slice(0, 1200) : undefined,
          extractedPrice: mode === "dex" ? extractPrice(md) : null,
          ms: Date.now() - t0,
        };
        if (mode === "hn" && md) step.stories = parseHnStories(md);
        if (mode === "gh" && md) step.repos = parseGhTrending(md);
        if (mode === "price" && md) {
          const p = extractAnyPrice(md);
          if (p) {
            step.extractedPrice = p.value;
            step.priceCurrency = p.currency;
          }
        }
        steps.push(step);
      } catch (e) {
        steps.push({
          url: t.url,
          label: t.label,
          ok: false,
          error: e instanceof Error ? e.message : String(e),
          ms: Date.now() - t0,
        });
      }
    }

    let summary: string;
    if (mode === "dex") {
      const prices = steps
        .map((s) => s.extractedPrice)
        .filter((p): p is number => typeof p === "number");
      if (prices.length >= 2) {
        const [a, b] = prices;
        const spreadPct = ((Math.abs(a - b) / Math.min(a, b)) * 100).toFixed(3);
        summary = `Scraped ${steps.length} DEX pages. Prices: ${prices.join(", ")}. Spread: ${spreadPct}%.`;
      } else if (prices.length === 1) {
        summary = `Scraped ${steps.length} pages. Extracted 1 price (${prices[0]}). Second DEX page didn't expose a parseable price.`;
      } else {
        summary = `Scraped ${steps.length} pages successfully. Prices weren't extractable from rendered markdown — see screenshots for raw evidence.`;
      }
    } else if (mode === "hn") {
      const stories = (steps[0]?.stories as HnStory[] | undefined) ?? [];
      summary =
        stories.length > 0
          ? `Extracted ${stories.length} front-page stories. Top: "${stories[0].title}" (${stories[0].points ?? "?"} pts).`
          : `Fetched HN front page but couldn't parse the story rows.`;
    } else if (mode === "gh") {
      const repos = (steps[0]?.repos as GhRepo[] | undefined) ?? [];
      summary =
        repos.length > 0
          ? `Extracted ${repos.length} trending repos. Top: ${repos[0].repo}${repos[0].stars ? ` (${repos[0].stars} ★ today)` : ""}.`
          : `Fetched github.com/trending but couldn't parse the repo rows.`;
    } else if (mode === "price") {
      const s0 = steps[0];
      summary =
        s0?.extractedPrice != null
          ? `Scouted ${s0.label}. Extracted price: ${s0.priceCurrency ?? ""} ${s0.extractedPrice}.`
          : `Scouted ${targets[0].url}. Page loaded but no price was extractable — see screenshot.`;
    } else {
      const ok = steps.filter((s) => s.ok).length;
      summary = `Scouted ${targets[0].url}. ${ok}/${steps.length} loaded. Rendered markdown + screenshot captured.`;
    }

    // Analyst mode: feed scraped content back to Cerebras for synthesis.
    let analyst: AnalystTrace | undefined;
    if (mode === "analyst" && analystPlan) {
      const sources = steps
        .filter((s) => s.ok && s.markdownExcerpt)
        .map((s) => ({ url: s.url, excerpt: s.markdownExcerpt as string }));
      if (sources.length === 0) {
        analyst = {
          plan: analystPlan,
          answer:
            "None of the planned sources returned readable content. See screenshots for evidence.",
          model: `${analystPlan.model ?? "gpt-oss-120b"} (cerebras)`,
        };
      } else {
        const { synthesizeAnswer } = await import("./cerebras.server");
        try {
          const synthesis = await synthesizeAnswer(data.prompt, analystPlan.focus, sources);
          analyst = {
            plan: analystPlan,
            answer: synthesis.answer,
            model: `${synthesis.model} (cerebras)`,
          };
        } catch (e) {
          analyst = {
            plan: analystPlan,
            answer: `Synthesis failed: ${e instanceof Error ? e.message : String(e)}`,
            model: `${analystPlan.model ?? "gpt-oss-120b"} (cerebras)`,
          };
        }
      }
      summary = `Planned ${analystPlan.urls.length} source(s), scraped ${steps.filter((s) => s.ok).length}, synthesized answer with ${analyst?.model ?? "Cerebras"}.`;
    }

    const finishedAt = Date.now();
    const bodyForSigning = {
      agentId: data.agentId,
      prompt: data.prompt,
      startedAt,
      finishedAt,
      steps: steps.map((s) => ({
        url: s.url,
        label: s.label,
        ok: s.ok,
        statusCode: s.statusCode ?? null,
        title: s.title ?? null,
        extractedPrice: s.extractedPrice ?? null,
        priceCurrency: s.priceCurrency ?? null,
        stories: s.stories ?? null,
        repos: s.repos ?? null,
        error: s.error ?? null,
        ms: s.ms,
      })),
      summary,
      analyst: analyst ?? null,
      intent: data.intent ?? null,
      payment: onChain ?? null,
      missionId: data.missionId,
    };
    const signature = signPayload(bodyForSigning);

    return {
      agentId: data.agentId,
      prompt: data.prompt,
      startedAt,
      finishedAt,
      steps,
      summary,
      analyst,
      canonical: signature.canonical,
      signature: {
        algo: signature.algo,
        publicKey: signature.publicKey,
        digest: signature.digest,
        signature: signature.signature,
      },
      intent: data.intent,
      payment: onChain,
    };
  });

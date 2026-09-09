const OpenAI = require("openai");

// Gemini exposes an OpenAI-compatible endpoint, so the official openai SDK works
// against it unchanged.
const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// gemini-3.6-flash's free tier is a crippling 20 requests/DAY (not /minute) —
// confirmed by reading the quotaId off a live 429, since published docs were
// already stale. The "-lite" variants get a real per-minute quota (15 RPM,
// also confirmed live) and handled the largest real review payload (~14K
// prompt tokens, Cyberpunk 2077) in ~2.5s with equivalent output quality.
const MODEL = "gemini-3.5-flash-lite";
const FREE_TIER_RPM = 15;

// Google's 429 body carries a suggested retryDelay, but it's wrapped in a top
// level JSON array ("[{...}]") that the openai SDK's OpenAI-shaped error
// parser can't read — e.error comes back undefined even on a real 429 — so a
// fixed backoff is used instead of trusting a parsed value.
const RATE_LIMIT_BACKOFF_MS = 12000;
const MAX_ATTEMPTS = 3;

const DEFAULT_PROMPT =
  "Summarize the text into pros and cons, give this response as json with pros and cons as array, pros and cons key should all lowercase  ";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Proactively paces calls to stay under the RPM quota instead of only reacting
// to 429s after the fact — reactive-only retries just cascade, since one
// throttled game pushes the next one straight past the limit too.
const MIN_INTERVAL_MS = Math.ceil(60000 / FREE_TIER_RPM) + 200;
let nextAvailableAt = 0;

const waitForRateLimitSlot = async () => {
  const now = Date.now();
  const waitMs = Math.max(0, nextAvailableAt - now);
  nextAvailableAt = Math.max(now, nextAvailableAt) + MIN_INTERVAL_MS;
  if (waitMs > 0) await sleep(waitMs);
};

// Shared paced-and-retried completion call. `isRetriableParseError` lets a
// caller-specific parse step (e.g. JSON parsing) count as retriable without
// this function knowing anything about the output shape.
const createChatCompletion = async (messages, { responseFormat, maxTokens, parse } = {}) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await waitForRateLimitSlot();
    try {
      const completion = await gemini.chat.completions.create({
        model: MODEL,
        messages,
        ...(responseFormat ? { response_format: responseFormat } : {}),
        temperature: 1,
        max_tokens: maxTokens ?? 1024,
      });
      const content = completion?.choices?.[0]?.message?.content;
      return parse ? parse(content) : content;
    } catch (e) {
      lastError = e;
      // Free-tier capacity is genuinely flaky; a transient 503/429 should not
      // cost the caller its result. A 429 here means the proactive pacing
      // above wasn't enough (e.g. a concurrent process sharing the same key),
      // so give the window a full reset rather than the ordinary spacing.
      const retriable = e?.status === 503 || e?.status === 429 || e instanceof SyntaxError;
      if (!retriable || attempt === MAX_ATTEMPTS) break;
      if (e?.status === 429) nextAvailableAt = Date.now() + RATE_LIMIT_BACKOFF_MS;
      else await sleep(RATE_LIMIT_BACKOFF_MS);
    }
  }

  throw new Error(`Gemini request failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
};

// Even with JSON mode the model occasionally wraps output in a markdown fence.
const parseSummary = (content) => {
  const cleaned = String(content || "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const summary = JSON.parse(cleaned);
  return {
    pros: Array.isArray(summary?.pros) ? summary.pros : [],
    cons: Array.isArray(summary?.cons) ? summary.cons : [],
  };
};

// Throws when a summary can't be produced, so callers log a real failure rather
// than silently persisting empty pros/cons.
const getSummaryResponse = (reviews, prompt) =>
  createChatCompletion(
    [
      { role: "user", content: reviews.join(", ") },
      { role: "user", content: prompt || DEFAULT_PROMPT },
    ],
    { responseFormat: { type: "json_object" }, maxTokens: 1536, parse: parseSummary },
  );

// Plain-text completion — e.g. summarizing a video's title/description into a
// short blurb. No JSON mode, no transcript input; content is whatever the
// caller passes in (metadata, never scraped video speech).
const getTextSummary = (content, prompt) =>
  createChatCompletion([
    { role: "user", content },
    { role: "user", content: prompt },
  ]);

module.exports = {
  getSummaryResponse,
  getTextSummary,
};

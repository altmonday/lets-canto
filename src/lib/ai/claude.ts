import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

/**
 * Server-side Claude access. The API key is read from the server environment only
 * and never reaches browser code.
 */

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Organization-level keys (not scoped to a workspace) must name the workspace on every request.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  client ??= new Anthropic({ maxRetries: 1, ...(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {}) });
  return client;
}

export class AiGenerationError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "truncated" | "invalid_output" | "api_error" | "not_configured" | "timeout",
  ) {
    super(message);
  }
}

export type StructuredResult<T> = { data: T; model: string; usage: Anthropic.Beta.BetaUsage };

/** A short, safe explanation of a Claude API failure for the person setting the app up. */
export function describeAiError(error: unknown): string {
  if (error instanceof AiGenerationError) return error.message;
  if (error instanceof Anthropic.AuthenticationError) return "The Claude API key was rejected. Check ANTHROPIC_API_KEY in Vercel.";
  if (error instanceof Anthropic.PermissionDeniedError) return `This API key can't use ${MODEL}. Check the key's workspace permissions.`;
  if (error instanceof Anthropic.NotFoundError) return `The model ${MODEL} wasn't found for this API key.`;
  if (error instanceof Anthropic.RateLimitError) return "The Claude API rate limit was reached. Try again in a minute.";
  if (error instanceof Anthropic.APIError && error.message.includes("anthropic-workspace-id")) {
    return "This API key isn't scoped to a workspace. Create the key inside a workspace in Claude Platform, or set ANTHROPIC_WORKSPACE_ID in Vercel.";
  }
  if (error instanceof Anthropic.APIError) {
    const detail = error.message.toLowerCase().includes("credit")
      ? "The Claude Platform account is out of credit. Add credit under Billing."
      : error.message;
    return `Claude API error ${error.status ?? ""}: ${detail}`.trim();
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * One structured-output request. Streams (lesson JSON can be long) and returns the
 * schema-parsed result. Server-side refusal fallbacks are on by default, so a
 * classifier false positive on a children's story re-runs on a fallback model
 * instead of failing the learner's lesson.
 */
export async function generateStructured<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  effort?: Effort;
  maxTokens?: number;
  /** Give up after this long so the calling request finishes within the hosting time limit. */
  timeoutMs: number;
}): Promise<StructuredResult<z.infer<S>>> {
  if (!aiConfigured()) throw new AiGenerationError("ANTHROPIC_API_KEY is not set", "not_configured");
  const deadline = Date.now() + opts.timeoutMs;

  const request = (withFallbacks: boolean) =>
    getClient()
      .beta.messages.stream(
        {
          model: MODEL,
          max_tokens: opts.maxTokens ?? 32000,
          ...(withFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
          thinking: { type: "adaptive" },
          output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
          // Stable instructions first so repeated requests hit the prompt cache.
          system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: opts.prompt }],
        },
        { signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())) },
      )
      .finalMessage();

  const useFallbacks = process.env.ANTHROPIC_DISABLE_FALLBACKS !== "1";
  let message;
  try {
    try {
      message = await request(useFallbacks);
    } catch (error) {
      // If this account or model doesn't accept the fallback beta, retry once without it.
      if (useFallbacks && error instanceof Anthropic.BadRequestError) message = await request(false);
      else throw error;
    }
  } catch (error) {
    console.error("Claude request failed:", error);
    if (Date.now() >= deadline) throw new AiGenerationError("Claude took too long to respond", "timeout");
    const reason = error instanceof Anthropic.APIError ? "api_error" : "invalid_output";
    throw new AiGenerationError(describeAiError(error), reason);
  }

  if (message.stop_reason === "refusal") {
    throw new AiGenerationError("The model declined this request", "refusal");
  }
  if (message.stop_reason === "max_tokens") {
    throw new AiGenerationError("Output was truncated", "truncated");
  }
  if (message.parsed_output == null) {
    throw new AiGenerationError("Output did not match the schema", "invalid_output");
  }
  return { data: message.parsed_output as z.infer<S>, model: message.model, usage: message.usage };
}

/** Minimal live check that the configured key and model work. */
export async function checkAi(): Promise<{ ok: true; model: string } | { ok: false; error: string }> {
  if (!aiConfigured()) return { ok: false, error: "ANTHROPIC_API_KEY is not set in this deployment." };
  try {
    const res = await getClient().messages.create({
      model: MODEL,
      max_tokens: 256,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with the single word OK." }],
    });
    return { ok: true, model: res.model };
  } catch (error) {
    return { ok: false, error: describeAiError(error) };
  }
}

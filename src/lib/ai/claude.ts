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
  client ??= new Anthropic({ maxRetries: 2 });
  return client;
}

export class AiGenerationError extends Error {
  constructor(
    message: string,
    readonly reason: "refusal" | "truncated" | "invalid_output" | "api_error" | "not_configured",
  ) {
    super(message);
  }
}

export type StructuredResult<T> = { data: T; model: string; usage: Anthropic.Beta.BetaUsage };

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
}): Promise<StructuredResult<z.infer<S>>> {
  if (!aiConfigured()) throw new AiGenerationError("ANTHROPIC_API_KEY is not set", "not_configured");

  const useFallbacks = process.env.ANTHROPIC_DISABLE_FALLBACKS !== "1";
  let message;
  try {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 32000,
      ...(useFallbacks ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      thinking: { type: "adaptive" },
      output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
      // Stable instructions first so repeated requests hit the prompt cache.
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.prompt }],
    });
    message = await stream.finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new AiGenerationError(`Claude API error ${error.status}: ${error.message}`, "api_error");
    }
    if (error instanceof Error) throw new AiGenerationError(error.message, "invalid_output");
    throw error;
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

import { authed } from "@/lib/api/handler";
import { checkAi, MODEL } from "@/lib/ai/claude";

export const maxDuration = 60;

/** Signed-in setup check: does the Claude API key work in this deployment? */
export const GET = authed(undefined, async () => ({ model: MODEL, ...(await checkAi()) }));

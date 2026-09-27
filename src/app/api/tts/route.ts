import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/lessons/service";
import { ttsConfigured } from "@/lib/tts";

/**
 * Hong Kong Cantonese neural text-to-speech (Azure zh-HK voices). Signed-in users only.
 * Responses are cacheable, so repeated lines cost nothing. When not configured the
 * client falls back to an on-device zh-HK voice, if one exists.
 */
export async function GET(request: Request) {
  const db = await createClient();
  try {
    await requireUserId(db);
  } catch {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!ttsConfigured()) return NextResponse.json({ error: "tts_not_configured" }, { status: 404 });

  const url = new URL(request.url);
  const text = (url.searchParams.get("text") ?? "").slice(0, 400);
  const slow = url.searchParams.get("rate") === "slow";
  if (!text.trim()) return NextResponse.json({ error: "Missing text" }, { status: 400 });

  const voice = process.env.AZURE_SPEECH_VOICE || "zh-HK-HiuMaanNeural";
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const ssml = `<speak version="1.0" xml:lang="zh-HK"><voice name="${voice}"><prosody rate="${slow ? "-35%" : "-5%"}">${escaped}</prosody></voice></speak>`;

  const res = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "lets-canto",
    },
    body: ssml,
  });
  if (!res.ok) return NextResponse.json({ error: `TTS failed (${res.status})` }, { status: 502 });

  const audio = await res.arrayBuffer();
  const etag = createHash("sha256").update(`${voice}|${slow}|${text}`).digest("hex").slice(0, 32);
  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      ETag: `"${etag}"`,
    },
  });
}

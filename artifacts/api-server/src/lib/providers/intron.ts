import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const INTRON_SYNC_URL = "https://infer.voice.intron.io/file/v1/upload/sync";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 125_000;
const execFileAsync = promisify(execFile);

export const SUPPORTED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

const LANGUAGE_CODES: Record<string, string> = {
  "Nigerian Pidgin": "pcm",
  Yoruba: "yo",
  Igbo: "ig",
  Hausa: "ha",
  Amharic: "am",
  Swahili: "sw",
  Kinyarwanda: "rw",
  Luganda: "lg",
  Twi: "tw",
  Wolof: "wo",
  Zulu: "zu",
  Xhosa: "xh",
};
const SUPPORTED_LANGUAGE_PAIRS = new Set(
  Object.keys(LANGUAGE_CODES).map((language) => `English + ${language}`),
);

export type SpeechInput = {
  bytes: Buffer;
  mimeType: string;
  fileName: string;
  languagePair: string;
  durationMs: number;
};

export type SpeechResult = {
  transcript: string;
  provider: "Intron";
  model: "Sahara";
  languagePair: string;
  providerLanguage: string;
  latencyMs: number;
  audioDurationMs: number;
  live: true;
  provenance: string;
};

export class SpeechProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function inspectAudio(input: SpeechInput): Promise<number> {
  const suffix = extname(input.fileName).replace(/[^a-z0-9.]/gi, "").slice(0, 8) || ".audio";
  const filePath = join(tmpdir(), `mama-audio-${randomUUID()}${suffix}`);
  try {
    await writeFile(filePath, input.bytes);
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration,format_name",
      "-of", "json",
      filePath,
    ], { timeout: 10_000, maxBuffer: 64 * 1024 });
    const format = JSON.parse(stdout) as { format?: { duration?: string; format_name?: string } };
    const seconds = Number(format.format?.duration);
    const detected = format.format?.format_name ?? "";
    if (!Number.isFinite(seconds) || seconds <= 0) throw new SpeechProviderError("Audio duration could not be verified.", 400);
    if (seconds > 120) throw new SpeechProviderError("Audio duration must not exceed 120 seconds.", 400);
    const expectedFormats: Record<string, string[]> = {
      "audio/webm": ["webm", "matroska"],
      "audio/ogg": ["ogg"],
      "audio/mp4": ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"],
      "audio/mpeg": ["mp3"],
      "audio/wav": ["wav"],
      "audio/x-wav": ["wav"],
    };
    if (!expectedFormats[input.mimeType]?.some((name) => detected.split(",").includes(name))) {
      throw new SpeechProviderError("Declared audio type does not match the recorded file.", 400);
    }
    return Math.round(seconds * 1000);
  } catch (error) {
    if (error instanceof SpeechProviderError) throw error;
    throw new SpeechProviderError("Audio file is invalid or unreadable.", 400);
  } finally {
    await unlink(filePath).catch(() => undefined);
  }
}

function languageCode(languagePair: string): string {
  const language = languagePair.replace(/^English\s*[+·]\s*/, "").trim();
  return LANGUAGE_CODES[language] ?? "en";
}

function parseTranscript(payload: unknown): { transcript: string; durationMs?: number; fileId?: string; complete: boolean } {
  if (!payload || typeof payload !== "object") throw new SpeechProviderError("Intron returned an invalid response.", 502);
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") throw new SpeechProviderError("Intron returned no transcription data.", 502);
  const record = data as Record<string, unknown>;
  const transcript = typeof record.audio_transcript === "string" ? record.audio_transcript.trim() : "";
  const seconds = typeof record.processed_audio_duration_in_seconds === "number"
    ? record.processed_audio_duration_in_seconds
    : undefined;
  return {
    transcript,
    durationMs: seconds ? Math.round(seconds * 1000) : undefined,
    fileId: typeof record.file_id === "string" ? record.file_id : undefined,
    complete: record.processing_status === "FILE_TRANSCRIBED",
  };
}

async function pollTranscript(fileId: string, apiKey: string): Promise<ReturnType<typeof parseTranscript>> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000 + attempt * 250));
    const response = await fetch(`https://infer.voice.intron.io/file/v1/status/${encodeURIComponent(fileId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new SpeechProviderError("Intron status lookup failed.", response.status >= 500 ? 503 : 400);
    const parsed = parseTranscript(payload);
    if (parsed.transcript || parsed.complete) return parsed;
  }
  throw new SpeechProviderError("Intron transcription is still processing. Please try again.", 503);
}

export async function transcribeWithIntron(input: SpeechInput): Promise<SpeechResult> {
  const apiKey = process.env.INTRON_API_KEY;
  if (!apiKey) throw new SpeechProviderError("Live Intron transcription is not configured.", 503);
  if (!SUPPORTED_AUDIO_TYPES.has(input.mimeType)) throw new SpeechProviderError("Unsupported audio format.", 400);
  if (!SUPPORTED_LANGUAGE_PAIRS.has(input.languagePair)) throw new SpeechProviderError("Unsupported Intron language pair.", 400);
  if (input.bytes.length === 0 || input.bytes.length > MAX_AUDIO_BYTES) {
    throw new SpeechProviderError("Audio must be between 1 byte and 8 MB.", 400);
  }
  const verifiedDurationMs = await inspectAudio(input);

  const providerLanguage = languageCode(input.languagePair);
  const form = new FormData();
  const audioBytes = new Uint8Array(input.bytes);
  form.append("audio_file_name", input.fileName);
  form.append("audio_file_blob", new Blob([audioBytes], { type: input.mimeType }), input.fileName);
  form.append("use_language_asr_input", providerLanguage);

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(process.env.INTRON_API_URL ?? INTRON_SYNC_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Intron transcription timed out."
      : "Intron transcription could not be reached.";
    throw new SpeechProviderError(message, 503);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message: unknown }).message)
      : "Intron rejected the audio.";
    throw new SpeechProviderError(providerMessage, response.status >= 500 ? 503 : 400);
  }

  let parsed = parseTranscript(payload);
  if (!parsed.transcript && parsed.fileId) parsed = await pollTranscript(parsed.fileId, apiKey);
  if (!parsed.transcript) throw new SpeechProviderError("Intron returned an empty transcript.", 502);
  return {
    transcript: parsed.transcript,
    provider: "Intron",
    model: "Sahara",
    languagePair: input.languagePair,
    providerLanguage,
    latencyMs: Date.now() - startedAt,
    audioDurationMs: parsed.durationMs ?? verifiedDurationMs,
    live: true,
    provenance: "LIVE INTRON SAHARA TRANSCRIPTION",
  };
}

export function decodeAudioBase64(value: string): Buffer {
  const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new SpeechProviderError("Audio payload is not valid base64.", 400);
  }
  return Buffer.from(normalized, "base64");
}
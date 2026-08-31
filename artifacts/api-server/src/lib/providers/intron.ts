const INTRON_SYNC_URL = "https://infer.voice.intron.io/file/v1/upload/sync";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 125_000;

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

function languageCode(languagePair: string): string {
  const language = languagePair.replace(/^English\s*[+·]\s*/, "").trim();
  return LANGUAGE_CODES[language] ?? "en";
}

function parseTranscript(payload: unknown): { transcript: string; durationMs?: number } {
  if (!payload || typeof payload !== "object") throw new SpeechProviderError("Intron returned an invalid response.", 502);
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") throw new SpeechProviderError("Intron returned no transcription data.", 502);
  const record = data as Record<string, unknown>;
  if (record.processing_status !== "FILE_TRANSCRIBED") {
    throw new SpeechProviderError("Intron did not complete the transcription.", 502);
  }
  const transcript = typeof record.audio_transcript === "string" ? record.audio_transcript.trim() : "";
  if (!transcript) throw new SpeechProviderError("Intron returned an empty transcript.", 502);
  const seconds = typeof record.processed_audio_duration_in_seconds === "number"
    ? record.processed_audio_duration_in_seconds
    : undefined;
  return { transcript, durationMs: seconds ? Math.round(seconds * 1000) : undefined };
}

export async function transcribeWithIntron(input: SpeechInput): Promise<SpeechResult> {
  const apiKey = process.env.INTRON_API_KEY;
  if (!apiKey) throw new SpeechProviderError("Live Intron transcription is not configured.", 503);
  if (!SUPPORTED_AUDIO_TYPES.has(input.mimeType)) throw new SpeechProviderError("Unsupported audio format.", 400);
  if (input.bytes.length === 0 || input.bytes.length > MAX_AUDIO_BYTES) {
    throw new SpeechProviderError("Audio must be between 1 byte and 8 MB.", 400);
  }
  if (input.durationMs <= 0 || input.durationMs > 120_000) {
    throw new SpeechProviderError("Audio duration must not exceed 120 seconds.", 400);
  }

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

  const parsed = parseTranscript(payload);
  return {
    transcript: parsed.transcript,
    provider: "Intron",
    model: "Sahara",
    languagePair: input.languagePair,
    providerLanguage,
    latencyMs: Date.now() - startedAt,
    audioDurationMs: parsed.durationMs ?? input.durationMs,
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
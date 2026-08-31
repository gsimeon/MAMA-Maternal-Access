import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  SpeechProviderError,
  transcribeWithIntron,
  type SpeechInput,
} from "./intron";
import { listBenchmarks, runBenchmark } from "../mama";

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const originalFetch = globalThis.fetch;
const originalApiKey = process.env.INTRON_API_KEY;
const originalApiUrl = process.env.INTRON_API_URL;

function wavBytes(durationSeconds: number): Buffer {
  const sampleRate = 8_000;
  const bytesPerSample = 2;
  const dataSize = sampleRate * bytesPerSample * durationSeconds;
  const bytes = Buffer.alloc(44 + dataSize);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + dataSize, 4);
  bytes.write("WAVE", 8);
  bytes.write("fmt ", 12);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * bytesPerSample, 28);
  bytes.writeUInt16LE(bytesPerSample, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(dataSize, 40);
  return bytes;
}

function input(overrides: Partial<SpeechInput> = {}): SpeechInput {
  return {
    bytes: wavBytes(1),
    mimeType: "audio/wav",
    fileName: "fixture.wav",
    languagePair: "English + Nigerian Pidgin",
    durationMs: 1_000,
    ...overrides,
  };
}

function response(
  transcript: string,
  processingStatus = "FILE_TRANSCRIBED",
  durationSeconds = 1.234,
): Response {
  return new Response(JSON.stringify({
    data: {
      audio_transcript: transcript,
      processed_audio_duration_in_seconds: durationSeconds,
      processing_status: processingStatus,
      file_id: "fixture-file-001",
    },
  }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function installFetch(
  implementation: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
): { calls: Array<{ input: string | URL | Request; init?: RequestInit }> } {
  const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
  globalThis.fetch = (async (requestInput, init) => {
    calls.push({ input: requestInput, init });
    return implementation(requestInput, init);
  }) as typeof fetch;
  return { calls };
}

function providerError(error: unknown, status: number, message: string): void {
  assert.ok(error instanceof SpeechProviderError);
  assert.equal(error.status, status);
  assert.equal(error.message, message);
}

describe("Intron response contract fixtures", () => {
  beforeEach(() => {
    process.env.INTRON_API_KEY = "fixture-key";
    process.env.INTRON_API_URL = "https://fixture.intron.test/upload";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.INTRON_API_KEY;
    else process.env.INTRON_API_KEY = originalApiKey;
    if (originalApiUrl === undefined) delete process.env.INTRON_API_URL;
    else process.env.INTRON_API_URL = originalApiUrl;
  });

  test("normalizes a completed FILE_TRANSCRIBED response", async () => {
    const { calls } = installFetch(async () => response("Abeg, my wife dey bleed.", "FILE_TRANSCRIBED"));

    const result = await transcribeWithIntron(input());

    assert.equal(result.transcript, "Abeg, my wife dey bleed.");
    assert.equal(result.provider, "Intron");
    assert.equal(result.model, "Sahara");
    assert.equal(result.providerLanguage, "pcm");
    assert.equal(result.audioDurationMs, 1_234);
    assert.equal(result.live, true);
    assert.equal(result.provenance, "LIVE INTRON SAHARA TRANSCRIPTION");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.input, "https://fixture.intron.test/upload");
    assert.equal(calls[0]?.init?.method, "POST");
    assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, "Bearer fixture-key");
  });

  test("uses a non-empty transcript immediately when Sahara reports FILE_QUEUED", async () => {
    const { calls } = installFetch(async () => response(
      "The transcript is ready even though the file is queued.",
      "FILE_QUEUED",
    ));

    const result = await transcribeWithIntron(input());

    assert.equal(result.transcript, "The transcript is ready even though the file is queued.");
    assert.equal(result.audioDurationMs, 1_234);
    assert.equal(calls.length, 1, "a usable queued response must not trigger status polling");
  });

  test("returns a 503 when the provider request times out", async () => {
    const { calls } = installFetch(async () => {
      const error = new Error("request timed out");
      error.name = "TimeoutError";
      throw error;
    });

    await assert.rejects(
      transcribeWithIntron(input()),
      (error: unknown) => {
        providerError(error, 503, "Intron transcription timed out.");
        return true;
      },
    );
    assert.equal(calls.length, 1);
  });

  test("normalizes provider HTTP errors without retrying or fabricating a transcript", async () => {
    const { calls } = installFetch(async () => new Response(
      JSON.stringify({ message: "Provider rejected this fixture." }),
      { status: 429, headers: { "content-type": "application/json" } },
    ));

    await assert.rejects(
      transcribeWithIntron(input()),
      (error: unknown) => {
        providerError(error, 400, "Provider rejected this fixture.");
        return true;
      },
    );
    assert.equal(calls.length, 1);
  });

  test("rejects malformed provider response as an upstream contract failure", async () => {
    const { calls } = installFetch(async () => new Response(
      JSON.stringify({ data: { processing_status: "FILE_TRANSCRIBED" } }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));

    await assert.rejects(
      transcribeWithIntron(input()),
      (error: unknown) => {
        providerError(error, 502, "Intron returned an empty transcript.");
        return true;
      },
    );
    assert.equal(calls.length, 1);
  });

  test("rejects unsupported and mismatched audio types before contacting Intron", async () => {
    const { calls } = installFetch(async () => response("should not be requested"));

    await assert.rejects(
      transcribeWithIntron(input({ mimeType: "audio/flac" })),
      (error: unknown) => {
        providerError(error, 400, "Unsupported audio format.");
        return true;
      },
    );
    await assert.rejects(
      transcribeWithIntron(input({ mimeType: "audio/mpeg", fileName: "fixture.mp3" })),
      (error: unknown) => {
        providerError(error, 400, "Declared audio type does not match the recorded file.");
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });

  test("rejects audio above the 8 MB request limit before probing or contacting Intron", async () => {
    const { calls } = installFetch(async () => response("should not be requested"));

    await assert.rejects(
      transcribeWithIntron(input({ bytes: Buffer.alloc(MAX_AUDIO_BYTES + 1) })),
      (error: unknown) => {
        providerError(error, 400, "Audio must be between 1 byte and 8 MB.");
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });

  test("rejects audio longer than 120 seconds before contacting Intron", async () => {
    const { calls } = installFetch(async () => response("should not be requested"));

    await assert.rejects(
      transcribeWithIntron(input({ bytes: wavBytes(121), durationMs: 121_000 })),
      (error: unknown) => {
        providerError(error, 400, "Audio duration must not exceed 120 seconds.");
        return true;
      },
    );
    assert.equal(calls.length, 0);
  });
});

describe("benchmark scoring safety contract", () => {
  beforeEach(() => {
    process.env.INTRON_API_KEY = "fixture-key";
    process.env.INTRON_API_URL = "https://fixture.intron.test/upload";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.INTRON_API_KEY;
    else process.env.INTRON_API_KEY = originalApiKey;
    if (originalApiUrl === undefined) delete process.env.INTRON_API_URL;
    else process.env.INTRON_API_URL = originalApiUrl;
  });

  test("keeps pending scenarios visibly unscored", () => {
    const pending = listBenchmarks().filter((scenario) => scenario.dataLabel.includes("PENDING"));

    assert.equal(pending.length, 10);
    assert.ok(pending.every((scenario) => scenario.results.length === 0));
    assert.ok(pending.every((scenario) => scenario.expectedAction === "pending Intron evaluation"));
  });

  test("refuses to score a pending scenario before spending live provider quota", async () => {
    const pending = listBenchmarks().find((scenario) => scenario.dataLabel.includes("PENDING"));
    assert.ok(pending);
    const { calls } = installFetch(async () => response("should not be requested"));

    await assert.rejects(
      runBenchmark(pending.id, {
        audioBase64: wavBytes(1).toString("base64"),
        mimeType: "audio/wav",
        fileName: "pending-fixture.wav",
        durationMs: 1_000,
      }),
      (error: unknown) => {
        providerError(error, 400, "This scenario has no verified server-owned reference and cannot be scored yet.");
        return true;
      },
    );
    assert.equal(calls.length, 0, "pending benchmark validation must happen before the live adapter");
  });

  test("requires the exact urgent safety action for the bleeding-and-dizziness benchmark", async () => {
    const { calls } = installFetch(async () => response(
      "Pregnancy, bleeding and dizziness at seven months.",
    ));

    const result = await runBenchmark("mama-cs-001", {
      audioBase64: wavBytes(1).toString("base64"),
      mimeType: "audio/wav",
      fileName: "urgent-fixture.wav",
      durationMs: 1_000,
    });

    assert.ok(result);
    const metrics = result.results[0]?.metrics;
    assert.ok(metrics);
    assert.equal(metrics.actionAccuracy, 1);
    assert.equal(metrics.criticalFactAccuracy, 1);
    assert.equal(metrics.intentAccuracy, 1);
    assert.equal(metrics.vasr, 1);
    assert.equal(calls.length, 1);
  });

  test("does not award an urgent action score when the transcript lacks the safety signal", async () => {
    installFetch(async () => response("I am pregnant and feel okay."));

    const result = await runBenchmark("mama-cs-001", {
      audioBase64: wavBytes(1).toString("base64"),
      mimeType: "audio/wav",
      fileName: "routine-fixture.wav",
      durationMs: 1_000,
    });

    assert.ok(result);
    const metrics = result.results[0]?.metrics;
    assert.ok(metrics);
    assert.equal(metrics.actionAccuracy, 0);
    assert.equal(metrics.vasr, 0);
  });
});
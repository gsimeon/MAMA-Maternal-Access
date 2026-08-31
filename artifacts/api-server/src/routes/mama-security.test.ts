import assert from "node:assert/strict";
import { type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import app from "../app";
import { createSession, deleteSession } from "../lib/auth";
import { createConversation } from "../lib/mama";

let server: Server;
let baseUrl: string;

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

function transcriptionRequest(
  conversationId: string,
  headers: Record<string, string> = {},
) {
  return fetch(`${baseUrl}/api/conversations/${conversationId}/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({
      audioBase64: "AA==",
      mimeType: "audio/wav",
      fileName: "test.wav",
      languagePair: "English + Nigerian Pidgin",
      durationMs: 1_000,
    }),
  });
}

describe("MAMA live provider access", () => {
  test("rejects an unauthenticated live transcription request", async () => {
    const conversation = createConversation(true, "English + Nigerian Pidgin");
    const response = await transcriptionRequest(conversation.id, {
      Origin: "http://localhost:19230",
    });
    assert.equal(response.status, 401);
    assert.match((await response.json() as { error: string }).error, /sign in/i);
  });

  test("rejects a signed-in request without a trusted browser origin", async () => {
    const conversation = createConversation(true, "English + Nigerian Pidgin");
    const sid = await createSession({
      user: {
        id: `test-${randomUUID()}`,
        email: null,
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      },
      access_token: "test-only",
    });
    try {
      const response = await transcriptionRequest(conversation.id, {
        Cookie: `sid=${sid}`,
      });
      assert.equal(response.status, 403);
      assert.match((await response.json() as { error: string }).error, /MAMA app/i);
    } finally {
      await deleteSession(sid);
    }
  });
});
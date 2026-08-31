import { expect, test } from "@playwright/test";

const redFlagTranscript =
  "Abeg, my wife dey bleed since afternoon and she dey feel dizzy. She dey about seven months pregnant.";

const emptyStructuredState = {
  intent: null,
  pregnancyStatus: null,
  gestationalAge: null,
  symptoms: [],
  duration: null,
  severity: null,
  redFlags: [],
  relevantContext: [],
  missingCriticalInformation: [],
  riskLevel: null,
  recommendedAction: null,
  consentStatus: "pending",
  referralStatus: null,
};

const emptyConversation = {
  id: "conversation-live",
  createdAt: "2026-08-31T10:00:00.000Z",
  state: "LISTEN",
  voiceState: "IDLE",
  demoMode: true,
  languageMix: ["English + Nigerian Pidgin"],
  transcript: [],
  structuredState: emptyStructuredState,
};

const urgentConversation = {
  ...emptyConversation,
  state: "SAFETY_CHECK",
  voiceState: "RESPONDING",
  transcript: [
    {
      id: "conversation-live-message-1",
      speaker: "user",
      text: redFlagTranscript,
      createdAt: "2026-08-31T10:00:01.000Z",
      source: "voice",
    },
    {
      id: "conversation-live-mama-2",
      speaker: "mama",
      text: "I hear you. This may require urgent medical attention. Please seek professional help now. Before I prepare a handoff, I need your consent to share this summary.",
      createdAt: "2026-08-31T10:00:01.100Z",
      source: "system",
    },
  ],
  structuredState: {
    ...emptyStructuredState,
    intent: "maternal_health_concern",
    pregnancyStatus: "pregnant",
    gestationalAge: "approximately 7 months",
    symptoms: ["Bleeding", "Dizziness"],
    duration: "Since afternoon",
    redFlags: ["Bleeding", "Dizziness"],
    missingCriticalInformation: ["Severity of bleeding", "Proximity to care"],
    riskLevel: "urgent",
    recommendedAction: "ESCALATE",
  },
};

test("routes a mocked live red-flag transcript to urgent safety guidance", async ({ page }) => {
  let transcriptionRequests = 0;
  let messageRequests = 0;
  let messagePayload: unknown;

  await page.addInitScript(() => {
    class TestMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      start() {
        this.state = "recording";
        this.ondataavailable?.({ data: new Blob(["offline test audio"], { type: this.mimeType }) });
      }

      stop() {
        this.state = "inactive";
        this.onstop?.();
      }
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: TestMediaRecorder,
    });
  });

  await page.route("**/api/auth/user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "offline-test-user",
          email: "offline-test@example.com",
          firstName: "Offline",
          lastName: "Test",
          profileImageUrl: null,
        },
      }),
    });
  });

  await page.route("**/api/healthz", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "operational" }),
    });
  });

  await page.route("**/api/conversations", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(emptyConversation),
    });
  });

  await page.route("**/api/conversations/conversation-live/transcribe", async (route) => {
    transcriptionRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        transcript: redFlagTranscript,
        provider: "Intron",
        model: "Sahara",
        languagePair: "English + Nigerian Pidgin",
        providerLanguage: "pcm",
        latencyMs: 42,
        audioDurationMs: 1_000,
        live: true,
        provenance: "LIVE INTRON SAHARA TRANSCRIPTION",
        riskLevel: "urgent",
      }),
    });
  });

  await page.route("**/api/conversations/conversation-live/message", async (route) => {
    messagePayload = route.request().postDataJSON();
    if (
      JSON.stringify(messagePayload) !==
      JSON.stringify({ text: redFlagTranscript, source: "voice" })
    ) {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({ error: "The live transcript was not forwarded as a voice message." }),
      });
      return;
    }

    messageRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        conversation: urgentConversation,
        response: urgentConversation.transcript[1].text,
        detectedLanguage: "English + Nigerian Pidgin",
        nextQuestion: "Can you tell me about severity of bleeding?",
        safety: {
          riskLevel: "urgent",
          routingLabel: "URGENT · professional attention now",
          explanation: "The structured information includes a potential pregnancy safety red flag.",
          immediateGuidance: "Please seek urgent medical attention now. MAMA cannot diagnose or dispatch emergency services.",
          requiresHuman: true,
        },
      }),
    });
  });

  await page.goto("/");
  await page.getByTestId("button-start-intake").click();
  await expect(page).toHaveURL(/\/conversation\?id=conversation-live$/);
  await expect(page.getByTestId("button-voice")).toBeVisible();

  await page.getByTestId("button-voice").click();
  await expect(page.getByTestId("button-voice")).toHaveAttribute("aria-label", "Stop listening");
  await page.getByTestId("button-voice").click();

  await expect(page.getByTestId("message-transcript-conversation-live-message-1")).toContainText(redFlagTranscript);
  await expect(page.getByTestId("message-transcript-conversation-live-mama-2")).toContainText(
    "Please seek professional help now",
  );
  await expect(page.getByRole("heading", { name: "Urgent" })).toBeVisible();
  await expect(page.getByTestId("text-structure-red-flags")).toContainText("Bleeding, Dizziness");
  await expect(page.getByTestId("status-conversation-notice")).toContainText("Live Intron Sahara transcript");
  expect(transcriptionRequests).toBe(1);
  expect(messageRequests).toBe(1);
  expect(messagePayload).toEqual({ text: redFlagTranscript, source: "voice" });
});

test("shows recovery guidance when the mocked transcript message request fails", async ({ page }) => {
  let transcriptionRequests = 0;
  let messageRequests = 0;
  let escalationRequests = 0;
  const analyticsEvents: Array<{ name: string; data?: Record<string, string | number | boolean> }> = [];

  await page.exposeFunction(
    "captureAnalyticsEvent",
    (name: string, data?: Record<string, string | number | boolean>) => {
      analyticsEvents.push({ name, data });
    },
  );

  await page.addInitScript(() => {
    Object.defineProperty(window, "umami", {
      configurable: true,
      value: {
        track: (name: string, data?: Record<string, string | number | boolean>) => {
          void (window as typeof window & {
            captureAnalyticsEvent: (
              eventName: string,
              eventData?: Record<string, string | number | boolean>,
            ) => Promise<void>;
          }).captureAnalyticsEvent(name, data);
        },
      },
    });

    class TestMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;

      start() {
        this.state = "recording";
        this.ondataavailable?.({ data: new Blob(["offline failure test audio"], { type: this.mimeType }) });
      }

      stop() {
        this.state = "inactive";
        this.onstop?.();
      }
    }

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    });
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: TestMediaRecorder,
    });
  });

  await page.route("**/api/auth/user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "offline-failure-test-user",
          email: "offline-failure-test@example.com",
          firstName: "Offline",
          lastName: "Failure",
          profileImageUrl: null,
        },
      }),
    });
  });

  await page.route("**/api/healthz", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ status: "operational" }),
    });
  });

  await page.route("**/api/conversations", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(emptyConversation),
    });
  });

  await page.route("**/api/conversations/conversation-live/transcribe", async (route) => {
    transcriptionRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        transcript: redFlagTranscript,
        provider: "Intron",
        model: "Sahara",
        languagePair: "English + Nigerian Pidgin",
        providerLanguage: "pcm",
        latencyMs: 42,
        audioDurationMs: 1_000,
        live: true,
        provenance: "LIVE INTRON SAHARA TRANSCRIPTION",
        riskLevel: "urgent",
      }),
    });
  });

  await page.route("**/api/conversations/conversation-live/message", async (route) => {
    messageRequests += 1;
    if (messageRequests <= 2) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Safety guidance is temporarily unavailable." }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        conversation: {
          ...emptyConversation,
          transcript: [{
            id: "conversation-live-message-1",
            speaker: "user",
            text: redFlagTranscript,
            createdAt: "2026-08-31T10:00:02.000Z",
            source: "text",
          }],
        },
        response: "Your message is ready for the next safety check.",
        detectedLanguage: "English + Nigerian Pidgin",
        nextQuestion: null,
        safety: null,
      }),
    });
  });

  await page.route("**/api/conversations/conversation-live/action", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        action: "REQUEST_HUMAN",
        message: "A human-help request is ready for the demo workflow.",
        conversation: emptyConversation,
        referral: null,
      }),
    });
  });

  await page.route("**/api/escalations", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    escalationRequests += 1;
    if (escalationRequests === 2) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Human support is temporarily unavailable." }),
      });
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        id: "escalation-live-1",
        conversationId: emptyConversation.id,
        status: "queued",
        message: "Human support request confirmed for the demo workflow.",
        createdAt: "2026-08-31T10:00:03.000Z",
        dataLabel: "SIMULATED ESCALATION · DEMO DATA",
      }),
    });
  });

  await page.goto("/");
  await page.getByTestId("button-start-intake").click();
  await expect(page).toHaveURL(/\/conversation\?id=conversation-live$/);
  await expect(page.getByTestId("button-voice")).toBeVisible();

  await page.getByTestId("button-voice").click();
  await expect(page.getByTestId("button-voice")).toHaveAttribute("aria-label", "Stop listening");
  await page.getByTestId("button-voice").click();

  await expect(page.getByTestId("status-conversation-notice")).toContainText(
    "MAMA could not deliver the safety guidance",
  );
  await expect(page.getByTestId("status-conversation-notice")).toContainText(
    "send again",
  );
  await expect(page.getByTestId("input-message")).toHaveValue(redFlagTranscript);
  await expect(page.getByTestId("message-transcript-conversation-live-message-1")).toHaveCount(0);
  await expect(page.getByTestId("message-transcript-conversation-live-mama-2")).toHaveCount(0);
  await expect(page.getByTestId("button-request-human")).toBeVisible();
  expect(transcriptionRequests).toBe(1);
  expect(messageRequests).toBe(1);
  await expect.poll(() => analyticsEvents).toEqual([{
    name: "urgent_handoff_failed",
    data: { input_source: "voice", route: "/conversation" },
  }]);

  await page.getByTestId("button-send-message").click();
  await expect(page.getByTestId("status-conversation-notice")).toContainText(
    "Your words are still safe here",
  );
  expect(messageRequests).toBe(2);
  expect(analyticsEvents).toHaveLength(1);

  await page.goto("/conversation");
  await page.reload();

  await expect(page.getByTestId("status-conversation-notice")).toContainText(
    "Your words are still safe here",
  );
  await expect(page.getByTestId("input-message")).toHaveValue(redFlagTranscript);
  await expect(page.getByTestId("button-send-message")).toBeEnabled();
  await expect(page.getByTestId("button-request-human")).toBeVisible();

  await page.getByTestId("button-send-message").click();
  await expect(page.getByTestId("message-transcript-conversation-live-message-1")).toContainText(
    redFlagTranscript,
  );
  await expect(page.getByTestId("input-message")).toHaveValue("");
  expect(messageRequests).toBe(3);
  await expect.poll(() => analyticsEvents).toEqual([
    {
      name: "urgent_handoff_failed",
      data: { input_source: "voice", route: "/conversation" },
    },
    {
      name: "urgent_handoff_recovered",
      data: { recovery_action: "retry", route: "/conversation" },
    },
  ]);

  await page.evaluate((recovery) => {
    localStorage.setItem("mama-conversation-recovery:conversation-live", JSON.stringify(recovery));
  }, {
    conversationId: emptyConversation.id,
    text: redFlagTranscript,
    notice: "Your message was transcribed, but MAMA could not deliver the safety guidance.",
    urgency: "urgent",
  });
  await page.reload();

  await expect(page.getByTestId("button-request-human")).toBeVisible();
  await page.getByTestId("button-request-human").click();
  await expect(page.getByTestId("status-conversation-notice")).toContainText(
    "Human support request confirmed for the demo workflow.",
  );
  expect(escalationRequests).toBe(1);
  await expect.poll(() => analyticsEvents).toEqual([
    {
      name: "urgent_handoff_failed",
      data: { input_source: "voice", route: "/conversation" },
    },
    {
      name: "urgent_handoff_recovered",
      data: { recovery_action: "retry", route: "/conversation" },
    },
    {
      name: "urgent_handoff_recovered",
      data: { recovery_action: "human_support", route: "/conversation" },
    },
  ]);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mama-conversation-recovery:conversation-live"))).toBeNull();

  await page.evaluate((recovery) => {
    localStorage.setItem("mama-conversation-recovery:conversation-live", JSON.stringify(recovery));
  }, {
    conversationId: emptyConversation.id,
    text: redFlagTranscript,
    notice: "Your message was transcribed, but MAMA could not deliver the safety guidance.",
    urgency: "urgent",
  });
  await page.reload();

  await expect(page.getByTestId("button-request-human")).toBeVisible();
  await page.getByTestId("button-request-human").click();
  await expect(page.getByTestId("status-conversation-notice")).toContainText(
    "Human support could not be reached right now. Please try again.",
  );
  expect(escalationRequests).toBe(2);
  await expect.poll(() => analyticsEvents).toHaveLength(3);
  await expect(page.getByTestId("button-request-human")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mama-conversation-recovery:conversation-live"))).not.toBeNull();
  expect(JSON.stringify(analyticsEvents)).not.toContain(redFlagTranscript);
  expect(JSON.stringify(analyticsEvents)).not.toContain(emptyConversation.id);
});

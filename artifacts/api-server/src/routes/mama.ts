import { Router, type IRouter, type Request, type Response } from "express";
import {
  ActionResult,
  AddConversationMessageBody,
  AddConversationMessageParams,
  AddConversationMessageResponse,
  AnalyzeConversationParams,
  AnalyzeConversationResponse,
  CreateConversationBody,
  CreateConversationResponse,
  CreateEscalationBody,
  CreateEscalationResponse,
  CreateReferralBody,
  CreateReferralResponse,
  ExecuteConversationActionBody,
  ExecuteConversationActionParams,
  ExecuteConversationActionResponse,
  GetAnalyticsSummaryResponse,
  GetBenchmarkParams,
  GetBenchmarkResponse,
  GetReferralParams,
  GetReferralResponse,
  ListBenchmarksQueryParams,
  ListBenchmarksResponse,
  ListReferralsQueryParams,
  ListReferralsResponse,
  RecordReferralConsentBody,
  RecordReferralConsentParams,
  RecordReferralConsentResponse,
  RunBenchmarkBody,
  RunBenchmarkResponse,
  TranscribeConversationAudioBody,
  TranscribeConversationAudioParams,
  TranscribeConversationAudioResponse,
} from "@workspace/api-zod";
import {
  action,
  addMessage,
  analytics,
  analyzeConversation,
  createConversation,
  createEscalation,
  getBenchmark,
  getReferral,
  hasConversation,
  listBenchmarks,
  listReferrals,
  recordConsent,
  runBenchmark,
} from "../lib/mama";
import {
  decodeAudioBase64,
  SpeechProviderError,
  transcribeWithIntron,
} from "../lib/providers/intron";

const router: IRouter = Router();
const liveRequests = new Map<string, { count: number; resetAt: number }>();
let globalLiveWindow = { count: 0, resetAt: Date.now() + 60 * 60_000 };

function configuredOrigins(): Set<string> {
  const origins = new Set(
    (process.env.REPLIT_DOMAINS ?? "").split(",").map((domain) => domain.trim()).filter(Boolean).map((domain) => `https://${domain}`),
  );
  if (process.env.REPLIT_DEV_DOMAIN) origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:19230");
    origins.add("http://127.0.0.1:19230");
  }
  return origins;
}

function allowLiveProvider(req: Request, res: Response): boolean {
  const origin = req.get("origin");
  if (!origin || !configuredOrigins().has(origin)) {
    res.status(403).json({ error: "Live transcription is only available from the MAMA app." });
    return false;
  }
  const timestamp = Date.now();
  if (globalLiveWindow.resetAt <= timestamp) globalLiveWindow = { count: 0, resetAt: timestamp + 60 * 60_000 };
  globalLiveWindow.count += 1;
  if (globalLiveWindow.count > 60) {
    res.setHeader("Retry-After", String(Math.ceil((globalLiveWindow.resetAt - timestamp) / 1000)));
    res.status(429).json({ error: "The live transcription budget is temporarily exhausted." });
    return false;
  }
  const key = req.ip || "unknown";
  const current = liveRequests.get(key);
  const window = current && current.resetAt > timestamp ? current : { count: 0, resetAt: timestamp + 60_000 };
  window.count += 1;
  liveRequests.set(key, window);
  if (window.count > 12) {
    res.setHeader("Retry-After", String(Math.ceil((window.resetAt - timestamp) / 1000)));
    res.status(429).json({ error: "Too many live transcription requests. Please wait a moment." });
    return false;
  }
  return true;
}
const bad = (res: Parameters<Parameters<IRouter["post"]>[1]>[1], message: string) => {
  res.status(400).json({ error: message });
};

router.post("/conversations", (req, res): void => {
  const parsed = CreateConversationBody.safeParse(req.body ?? {});
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  res.status(201).json(CreateConversationResponse.parse(createConversation(parsed.data.demoMode, parsed.data.languagePair)));
});

router.post("/conversations/:conversationId/message", (req, res): void => {
  const params = AddConversationMessageParams.safeParse(req.params);
  const body = AddConversationMessageBody.safeParse(req.body);
  if (!params.success || !body.success) { bad(res, "Invalid conversation message."); return; }
  const result = addMessage(params.data.conversationId, body.data.text, body.data.source, body.data.audioDurationMs);
  if (!result) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(AddConversationMessageResponse.parse(result));
});

router.post("/conversations/:conversationId/transcribe", async (req, res): Promise<void> => {
  if (!allowLiveProvider(req, res)) return;
  const params = TranscribeConversationAudioParams.safeParse(req.params);
  const body = TranscribeConversationAudioBody.safeParse(req.body);
  if (!params.success || !body.success) { bad(res, "Invalid audio transcription request."); return; }
  if (!hasConversation(params.data.conversationId)) { res.status(404).json({ error: "Conversation not found" }); return; }
  try {
    const result = await transcribeWithIntron({
      bytes: decodeAudioBase64(body.data.audioBase64),
      mimeType: body.data.mimeType,
      fileName: body.data.fileName,
      languagePair: body.data.languagePair,
      durationMs: body.data.durationMs,
    });
    res.json(TranscribeConversationAudioResponse.parse(result));
  } catch (error) {
    const providerError = error instanceof SpeechProviderError
      ? error
      : new SpeechProviderError("Live transcription failed.", 503);
    req.log.warn({ status: providerError.status }, "Intron transcription request failed");
    res.status(providerError.status).json({ error: providerError.message });
  }
});

router.post("/conversations/:conversationId/analyze", (req, res): void => {
  const params = AnalyzeConversationParams.safeParse(req.params);
  if (!params.success) { bad(res, params.error.message); return; }
  const result = analyzeConversation(params.data.conversationId);
  if (!result) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(AnalyzeConversationResponse.parse(result));
});

router.post("/conversations/:conversationId/action", (req, res): void => {
  const params = ExecuteConversationActionParams.safeParse(req.params);
  const body = ExecuteConversationActionBody.safeParse(req.body);
  if (!params.success || !body.success) { bad(res, "Invalid action request."); return; }
  const result = action(params.data.conversationId, body.data.action, body.data.consent);
  if (!result) { res.status(404).json({ error: "Conversation not found" }); return; }
  res.json(ExecuteConversationActionResponse.parse(result));
});

router.get("/referrals", (req, res): void => {
  const parsed = ListReferralsQueryParams.safeParse(req.query);
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  res.json(ListReferralsResponse.parse(listReferrals(parsed.data.status, parsed.data.priority)));
});

router.post("/referrals", (req, res): void => {
  const parsed = CreateReferralBody.safeParse(req.body);
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  const result = action(parsed.data.conversationId, "CREATE_REFERRAL", parsed.data.consent);
  if (!result?.referral) { bad(res, "Referral consent is required."); return; }
  res.status(201).json(CreateReferralResponse.parse(result.referral));
});

router.get("/referrals/:referralId", (req, res): void => {
  const params = GetReferralParams.safeParse(req.params);
  if (!params.success) { bad(res, params.error.message); return; }
  const referral = getReferral(params.data.referralId);
  if (!referral) { res.status(404).json({ error: "Referral not found" }); return; }
  res.json(GetReferralResponse.parse(referral));
});

router.post("/referrals/:referralId/consent", (req, res): void => {
  const params = RecordReferralConsentParams.safeParse(req.params);
  const body = RecordReferralConsentBody.safeParse(req.body);
  if (!params.success || !body.success) { bad(res, "Invalid consent request."); return; }
  const referral = recordConsent(params.data.referralId, body.data.granted);
  if (!referral) { res.status(404).json({ error: "Referral not found" }); return; }
  res.json(RecordReferralConsentResponse.parse(referral));
});

router.post("/escalations", (req, res): void => {
  const parsed = CreateEscalationBody.safeParse(req.body);
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  res.status(201).json(CreateEscalationResponse.parse(createEscalation(parsed.data.conversationId, parsed.data.reason)));
});

router.get("/benchmarks", (req, res): void => {
  const parsed = ListBenchmarksQueryParams.safeParse(req.query);
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  res.json(ListBenchmarksResponse.parse(listBenchmarks(parsed.data.languagePair, parsed.data.noiseCondition, parsed.data.model)));
});

router.get("/benchmarks/:benchmarkId", (req, res): void => {
  const params = GetBenchmarkParams.safeParse(req.params);
  if (!params.success) { bad(res, params.error.message); return; }
  const benchmark = getBenchmark(params.data.benchmarkId);
  if (!benchmark) { res.status(404).json({ error: "Benchmark not found" }); return; }
  res.json(GetBenchmarkResponse.parse(benchmark));
});

router.post("/benchmarks/run", async (req, res): Promise<void> => {
  const parsed = RunBenchmarkBody.safeParse(req.body);
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  if (parsed.data.audioBase64 && !allowLiveProvider(req, res)) return;
  try {
    const result = await runBenchmark(parsed.data.benchmarkId, parsed.data);
    if (!result) { res.status(404).json({ error: "Benchmark not found" }); return; }
    res.json(RunBenchmarkResponse.parse(result));
  } catch (error) {
    const providerError = error instanceof SpeechProviderError
      ? error
      : new SpeechProviderError("Live benchmark failed.", 503);
    req.log.warn({ status: providerError.status }, "Intron benchmark request failed");
    res.status(providerError.status).json({ error: providerError.message });
  }
});

router.get("/analytics/summary", (_req, res): void => {
  res.json(GetAnalyticsSummaryResponse.parse(analytics()));
});

export default router;
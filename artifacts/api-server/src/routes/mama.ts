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
  classifyConversationMessage,
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
import {
  reserveIntronQuota,
  IntronQuotaUnavailableError,
} from "../lib/intron-quota";
import { configuredOrigins } from "../lib/origins";

const router: IRouter = Router();

function allowLiveProvider(
  req: Request,
  res: Response,
): req is Request & Express.AuthedRequest {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Sign in to use live transcription." });
    return false;
  }
  const origin = req.get("origin");
  if (!origin || !configuredOrigins().has(origin)) {
    res.status(403).json({ error: "Live transcription is only available from the MAMA app." });
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
  const params = TranscribeConversationAudioParams.safeParse(req.params);
  const body = TranscribeConversationAudioBody.safeParse(req.body);
  if (!params.success || !body.success) { bad(res, "Invalid audio transcription request."); return; }
  if (!hasConversation(params.data.conversationId)) { res.status(404).json({ error: "Conversation not found" }); return; }
  if (!allowLiveProvider(req, res)) return;
  try {
    const quota = await reserveIntronQuota(req.user.id);
    if (!quota.allowed) {
      res.setHeader("Retry-After", String(quota.retryAfterSeconds));
      res.status(429).json({
        error: `Live transcription is temporarily at capacity. Please try again in ${quota.retryAfterSeconds} seconds.`,
      });
      return;
    }
  } catch (error) {
    if (error instanceof IntronQuotaUnavailableError) {
      req.log.error("Shared Intron quota storage unavailable");
      res.status(503).json({ error: "Live transcription is temporarily unavailable. Please try again shortly." });
      return;
    }
    throw error;
  }
  try {
    const result = await transcribeWithIntron({
      bytes: decodeAudioBase64(body.data.audioBase64),
      mimeType: body.data.mimeType,
      fileName: body.data.fileName,
      languagePair: body.data.languagePair,
      durationMs: body.data.durationMs,
    });
    const riskLevel = classifyConversationMessage(params.data.conversationId, result.transcript);
    if (!riskLevel) { res.status(404).json({ error: "Conversation not found" }); return; }
    res.json(TranscribeConversationAudioResponse.parse({ ...result, riskLevel }));
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
  if (parsed.data.audioBase64) {
    if (!allowLiveProvider(req, res)) return;
    try {
      const quota = await reserveIntronQuota(req.user.id);
      if (!quota.allowed) {
        res.setHeader("Retry-After", String(quota.retryAfterSeconds));
        res.status(429).json({
          error: `Live transcription is temporarily at capacity. Please try again in ${quota.retryAfterSeconds} seconds.`,
        });
        return;
      }
    } catch (error) {
      if (error instanceof IntronQuotaUnavailableError) {
        req.log.error("Shared Intron quota storage unavailable");
        res.status(503).json({ error: "Live transcription is temporarily unavailable. Please try again shortly." });
        return;
      }
      throw error;
    }
  }
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
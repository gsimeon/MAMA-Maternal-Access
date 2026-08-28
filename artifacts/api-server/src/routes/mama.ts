import { Router, type IRouter } from "express";
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
  listBenchmarks,
  listReferrals,
  recordConsent,
  runBenchmark,
} from "../lib/mama";

const router: IRouter = Router();
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

router.post("/benchmarks/run", (req, res): void => {
  const parsed = RunBenchmarkBody.safeParse(req.body);
  if (!parsed.success) { bad(res, parsed.error.message); return; }
  const result = runBenchmark(parsed.data.benchmarkId);
  if (!result) { res.status(404).json({ error: "Benchmark not found" }); return; }
  res.json(RunBenchmarkResponse.parse(result));
});

router.get("/analytics/summary", (_req, res): void => {
  res.json(GetAnalyticsSummaryResponse.parse(analytics()));
});

export default router;
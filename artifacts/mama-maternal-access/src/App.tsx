import { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import {
  Activity, ArrowLeft, ArrowRight, AudioLines, BarChart3, BookOpen, BrainCircuit, Check,
  CheckCircle2, CircleHelp, Clock3, FileHeart, Filter, Headphones, HeartPulse,
  Info, Languages, LayoutDashboard, LockKeyhole, Menu, MessageCircle, Mic, MoreHorizontal,
  Pause, PhoneCall, Play, Plus, Radio, RefreshCw, Send, ShieldCheck, Siren, Sparkles,
  TriangleAlert, UserRound, UsersRound, X, Zap,
} from 'lucide-react';
import type {
  BenchmarkScenario, Conversation, Referral, RiskLevel, TranscriptMessage,
} from '@workspace/api-client-react';
import { useAuth } from '@workspace/replit-auth-web';
import {
  ActionInputAction, ConsentStatus, MessageInputSource, ReferralStatus, TranscriptMessageSpeaker,
  useAddConversationMessage, useAnalyzeConversation, useCreateConversation, useCreateEscalation,
  useCreateReferral, useExecuteConversationAction, useGetAnalyticsSummary, useGetBenchmark,
  useGetReferral, useHealthCheck, useListBenchmarks, useListReferrals, useRecordReferralConsent, useRunBenchmark,
  useTranscribeConversationAudio,
  getGetAnalyticsSummaryQueryKey, getGetBenchmarkQueryKey, getGetReferralQueryKey, getHealthCheckQueryKey,
  getListBenchmarksQueryKey, getListReferralsQueryKey,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { trackEvent } from '@/lib/analytics';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

const INTRON_LANGUAGES = [
  'Nigerian Pidgin', 'Yoruba', 'Igbo', 'Hausa', 'Amharic', 'Swahili',
  'Kinyarwanda', 'Luganda', 'Twi', 'Wolof', 'Zulu', 'Xhosa',
];

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');
const formatTime = (date?: string) => date ? new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
const riskLabel = (risk?: string | null) => risk === 'urgent' ? 'Urgent' : risk === 'needs_attention' ? 'Needs attention' : 'Routine';
const RECORDER_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'] as const;
const CONVERSATION_RECOVERY_STORAGE_KEY = 'mama-conversation-recovery';
const VOICE_HANDOFF_RECOVERY_NOTICE = 'Your message was transcribed, but MAMA could not deliver the safety guidance. Review it below and send again, or choose “I want a human now.”';
const CONVERSATION_ANALYTICS_ROUTE = '/conversation';
type RecoveryUrgency = 'urgent' | 'non_urgent' | 'unclassified';
type ConversationRecovery = { conversationId: string; text: string; notice: string; urgency: RecoveryUrgency };
const toBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
const readConversationRecovery = (conversationId: string | null): ConversationRecovery | null => {
  if (!conversationId) return null;
  try {
    const stored = JSON.parse(localStorage.getItem(`${CONVERSATION_RECOVERY_STORAGE_KEY}:${conversationId}`) || 'null');
    return stored?.conversationId === conversationId && typeof stored.text === 'string' && typeof stored.notice === 'string'
      ? { ...stored, urgency: stored.urgency === 'urgent' ? 'urgent' : stored.urgency === 'non_urgent' ? 'non_urgent' : 'unclassified' }
      : null;
  } catch {
    return null;
  }
};
const saveConversationRecovery = (recovery: ConversationRecovery) => {
  try { localStorage.setItem(`${CONVERSATION_RECOVERY_STORAGE_KEY}:${recovery.conversationId}`, JSON.stringify(recovery)); } catch { /* best effort only */ }
};
const clearConversationRecovery = (conversationId: string | null) => {
  if (!conversationId) return;
  try { localStorage.removeItem(`${CONVERSATION_RECOVERY_STORAGE_KEY}:${conversationId}`); } catch { /* best effort only */ }
};
const audioDuration = (blob: Blob) => new Promise<number>((resolve, reject) => {
  const audio = document.createElement('audio');
  const url = URL.createObjectURL(blob);
  audio.preload = 'metadata';
  audio.onloadedmetadata = () => {
    const duration = Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : 0;
    URL.revokeObjectURL(url);
    duration > 0 ? resolve(duration) : reject(new Error('Audio duration unavailable'));
  };
  audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Audio duration unavailable')); };
  audio.src = url;
});

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" data-testid="link-logo" className="mama-focus flex items-center gap-3">
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_7px_0_hsl(var(--primary)/.22)]">
        <HeartPulse size={22} strokeWidth={2.6} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-accent" />
      </span>
      {!compact && <span className="font-[var(--app-font-serif)] text-[17px] font-extrabold tracking-[-.04em]">MAMA</span>}
    </Link>
  );
}

function Pill({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: 'neutral' | 'yellow' | 'coral' | 'teal' | 'dark'; className?: string }) {
  const tones = {
    neutral: 'bg-muted text-muted-foreground',
    yellow: 'bg-primary/20 text-foreground',
    coral: 'bg-accent/20 text-foreground',
    teal: 'bg-secondary text-secondary-foreground',
    dark: 'bg-sidebar text-sidebar-foreground',
  };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[.02em]', tones[tone], className)}>{children}</span>;
}

function Button({ children, variant = 'primary', className = '', onClick, disabled = false, type = 'button', testId }: {
  children: ReactNode; variant?: 'primary' | 'quiet' | 'outline' | 'danger' | 'dark'; className?: string;
  onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'; testId?: string;
}) {
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/.25)] hover:-translate-y-0.5',
    quiet: 'bg-muted text-foreground hover:bg-secondary',
    outline: 'border border-border bg-card text-foreground hover:border-foreground/30 hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground',
    dark: 'bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent',
  };
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={testId} className={cn('mama-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)}>{children}</button>;
}

function PageFrame({ children, className = '', eyebrow, title, description, action }: { children: ReactNode; className?: string; eyebrow?: string; title?: string; description?: string; action?: ReactNode }) {
  return (
    <div className={cn('min-h-[100dvh] bg-background text-foreground', className)}>
      <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-6 md:px-10 lg:px-14">
        {(eyebrow || title) && <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">{eyebrow}</div>}
            {title && <h1 className="max-w-3xl font-[var(--app-font-serif)] text-3xl font-extrabold tracking-[-.055em] md:text-5xl">{title}</h1>}
            {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>}
        {children}
      </div>
    </div>
  );
}

function HealthBadge() {
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 30_000 } });
  const status = healthQuery.data?.status || (healthQuery.isError ? 'unavailable' : 'checking');
  return <div data-testid="status-health" className="hidden items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:flex"><span className={cn('h-2 w-2 rounded-full', status === 'operational' ? 'bg-emerald-500' : status === 'checking' ? 'animate-pulse bg-primary' : 'bg-destructive')} /> Service {status}</div>;
}

function TopBar({ worker = false }: { worker?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();
  return (
    <header className={cn('relative z-20 flex items-center justify-between px-5 py-4 md:px-10', worker && 'border-b border-sidebar-border bg-sidebar text-sidebar-foreground')}>
      <Logo compact={false} />
      <div className="flex items-center gap-3">
        {!worker && <HealthBadge />}
        {worker && <span className="hidden font-mono text-[10px] uppercase tracking-[.14em] text-sidebar-foreground/60 md:block">Care operations / Lagos node</span>}
        <button data-testid="button-open-menu" onClick={() => setMenuOpen(!menuOpen)} className="mama-focus rounded-xl p-2 hover:bg-foreground/5 md:hidden"><Menu size={20} /></button>
        <nav className={cn('absolute right-5 top-[68px] flex min-w-[210px] flex-col gap-1 rounded-2xl border border-border bg-card p-2 shadow-xl md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none', !menuOpen && 'hidden md:flex')}>
          <Link href="/conversation" data-testid="link-start-nav" className="mama-focus rounded-lg px-3 py-2 text-sm font-semibold hover:bg-foreground/5">Start intake</Link>
          <Link href="/health-worker" data-testid="link-worker-nav" className="mama-focus rounded-lg px-3 py-2 text-sm font-semibold hover:bg-foreground/5">Health worker</Link>
          <Link href="/benchmark" data-testid="link-benchmark-nav" className="mama-focus rounded-lg px-3 py-2 text-sm font-semibold hover:bg-foreground/5">Voice lab</Link>
          <Link href="/responsible-ai" data-testid="link-responsible-nav" className="mama-focus rounded-lg px-3 py-2 text-sm font-semibold hover:bg-foreground/5">Safety</Link>
          {!isLoading && <button onClick={isAuthenticated ? logout : login} data-testid={isAuthenticated ? 'button-logout' : 'button-login'} className="mama-focus rounded-lg px-3 py-2 text-left text-sm font-bold hover:bg-foreground/5">{isAuthenticated ? `Log out${user?.firstName ? `, ${user.firstName}` : ''}` : 'Log in'}</button>}
        </nav>
      </div>
    </header>
  );
}

function HomePage() {
  const [, setLocation] = useLocation();
  const create = useCreateConversation();
  const start = (languagePair = 'English + Nigerian Pidgin') => create.mutate({ data: { demoMode: true, languagePair } }, {
    onSuccess: (conversation) => { localStorage.setItem('mama-conversation', JSON.stringify(conversation)); setLocation(`/conversation?id=${conversation.id}`); },
  });
  return (
    <div className="mama-noise min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <TopBar />
      <main>
        <section className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-5 pb-16 pt-12 md:px-10 md:pb-28 md:pt-20 lg:grid-cols-[1.03fr_.97fr] lg:px-14">
          <div className="relative z-10 mama-rise">
            <Pill tone="yellow"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Maternal access, monitoring & action</Pill>
            <h1 className="mt-6 max-w-3xl font-[var(--app-font-serif)] text-[clamp(3.4rem,8vw,7.7rem)] font-extrabold leading-[.89] tracking-[-.08em]">Tell MAMA<br /><span className="text-accent">what’s happening.</span></h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground md:text-lg">A calm, voice-first bridge for pregnancy and postpartum care. Speak naturally in English and code-switch across 12 African languages.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => start()} disabled={create.isPending} testId="button-start-intake">{create.isPending ? <><RefreshCw className="animate-spin" size={17} /> Opening a private space</> : <><Mic size={17} /> Start with your voice</>}</Button>
              <Button variant="outline" onClick={() => setLocation('/conversation')} testId="button-type-instead"><MessageCircle size={17} /> Type instead</Button>
            </div>
            <p data-testid="text-demo-disclaimer" className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><LockKeyhole size={13} /> Demo environment · no diagnosis · no real dispatch</p>
            {create.isError && <p data-testid="status-create-error" className="mt-3 text-sm font-semibold text-destructive">We couldn’t open the intake just now. Try again.</p>}
          </div>
          <div className="relative min-h-[420px] md:min-h-[540px] mama-rise mama-delay-2">
            <div className="absolute inset-5 rotate-[-3deg] rounded-[36px] border border-accent/30 bg-accent/10 md:inset-10" />
            <div className="absolute inset-0 overflow-hidden rounded-[36px] bg-sidebar p-6 text-sidebar-foreground shadow-2xl md:p-10">
              <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/80 blur-[1px]" />
              <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full border-[36px] border-accent/80" />
              <div className="relative flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/60">MAMA / live bridge</span><span className="flex items-center gap-1.5 font-mono text-[10px] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> ready</span>
              </div>
              <div className="relative mt-16 flex justify-center">
                <div className="relative flex h-52 w-52 items-center justify-center rounded-full border border-primary/30 md:h-64 md:w-64">
                  <div className="absolute inset-5 rounded-full border border-primary/20" /><div className="absolute inset-12 rounded-full border border-primary/20" />
                  <div className="mama-pulse flex h-28 w-28 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_18px_hsl(var(--primary)/.12)] md:h-36 md:w-36"><AudioLines size={50} strokeWidth={1.5} /></div>
                </div>
              </div>
              <div className="relative mt-14 rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-primary"><Radio size={13} /> listening space</div>
                <div className="flex h-8 items-center justify-center gap-1.5">{Array.from({ length: 22 }).map((_, index) => <span key={index} className="mama-wave w-1 rounded-full bg-primary/80" style={{ height: `${8 + ((index * 17) % 22)}px`, animationDelay: `${index * 35}ms` }} />)}</div>
                <p className="mt-3 text-center text-sm text-sidebar-foreground/75">You can pause, switch language, or type at any time.</p>
              </div>
            </div>
          </div>
        </section>
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-[1440px] gap-0 md:grid-cols-3">
            {[
              ['01', 'Say it once', 'Speak the way you normally would. No forms. No perfect words.'],
              ['02', 'MAMA structures it', 'Your words become a clear picture of what matters now.'],
              ['03', 'Care can pick it up', 'With your permission, a prepared handoff carries the story forward.'],
            ].map(([number, title, copy], index) => <div key={number} className={cn('p-7 md:p-10', index < 2 && 'border-b md:border-b-0 md:border-r border-border')}>
              <span className="font-mono text-xs text-accent">{number}</span><h2 className="mt-7 font-[var(--app-font-serif)] text-2xl font-extrabold tracking-[-.04em]">{title}</h2><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>)}
          </div>
        </section>
        <section className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 md:grid-cols-[.8fr_1.2fr] md:px-10 md:py-24 lg:px-14">
          <div><Pill tone="coral">Built for real voices</Pill><h2 className="mt-5 max-w-lg font-[var(--app-font-serif)] text-4xl font-extrabold leading-[.98] tracking-[-.06em] md:text-6xl">Language is not a barrier to being understood.</h2></div>
          <div className="grid gap-3 self-end sm:grid-cols-2">
            {INTRON_LANGUAGES.map((lang, i) => <button onClick={() => start(`English + ${lang}`)} key={lang} data-testid={`button-language-${i}`} className="mama-focus flex items-center justify-between rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-1 hover:border-primary"><span className="font-semibold">English + {lang}</span><ArrowRight size={17} className="text-muted-foreground" /></button>)}
          </div>
        </section>
        <footer className="mx-auto flex max-w-[1440px] flex-col gap-4 border-t border-border px-5 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-14"><span>© 2026 MAMA · a prototype for safer maternal pathways</span><div className="flex gap-5"><Link href="/judge" data-testid="link-judge-footer">Competition demo</Link><Link href="/responsible-ai" data-testid="link-ai-footer">Responsible AI</Link></div></footer>
      </main>
    </div>
  );
}

function VoiceButton({ listening, processing, onClick }: { listening: boolean; processing: boolean; onClick: () => void }) {
  return <button onClick={onClick} data-testid="button-voice" aria-label={listening ? 'Stop listening' : 'Start voice input'} className={cn('mama-focus group relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full transition-all md:h-28 md:w-28', listening ? 'bg-accent text-accent-foreground shadow-[0_0_0_12px_hsl(var(--accent)/.18)]' : 'bg-primary text-primary-foreground shadow-[0_8px_0_hsl(var(--primary)/.22)] hover:-translate-y-1')}><span className={cn('absolute inset-[-9px] rounded-full border-2 border-dashed transition-opacity', listening ? 'animate-spin border-accent/50 opacity-100' : 'opacity-0')} />{processing ? <RefreshCw size={30} className="animate-spin" /> : listening ? <Pause size={30} /> : <Mic size={30} />}</button>;
}

function ConversationPage() {
  const [, setLocation] = useLocation();
  const queryId = new URLSearchParams(window.location.search).get('id');
  const [conversation, setConversation] = useState<Conversation | null>(() => { try { return JSON.parse(localStorage.getItem('mama-conversation') || 'null'); } catch { return null; } });
  const conversationId = queryId || conversation?.id || null;
  const [recovery] = useState(() => readConversationRecovery(conversationId));
  const [text, setText] = useState(() => recovery?.text || '');
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [notice, setNotice] = useState(() => recovery?.notice || '');
  const [hasRecovery, setHasRecovery] = useState(() => Boolean(recovery));
  const [recoveryUrgency, setRecoveryUrgency] = useState<RecoveryUrgency>(() => recovery?.urgency || 'unclassified');
  const create = useCreateConversation();
  const addMessage = useAddConversationMessage();
  const analyze = useAnalyzeConversation();
  const action = useExecuteConversationAction();
  const createReferral = useCreateReferral();
  const escalate = useCreateEscalation();
  const consent = useRecordReferralConsent();
  const transcribe = useTranscribeConversationAudio();
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    login,
    logout,
  } = useAuth();
  const recognitionRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedRef = useRef(0);
  const currentId = conversationId;
  const messages = conversation?.transcript || [];
  const structure = conversation?.structuredState;

  useEffect(() => { if (queryId && conversation?.id !== queryId) { const stored = localStorage.getItem('mama-conversation'); if (stored) setConversation(JSON.parse(stored)); } }, [queryId, conversation?.id]);
  const saveConversation = (next: Conversation) => { setConversation(next); localStorage.setItem('mama-conversation', JSON.stringify(next)); };
  const openConversation = () => create.mutate({ data: { demoMode: true, languagePair: 'English + Nigerian Pidgin' } }, { onSuccess: (next) => { saveConversation(next); setLocation(`/conversation?id=${next.id}`); } });
  const send = (value: string, source: 'voice' | 'text' = 'text', successNotice = '', classifiedUrgency?: RecoveryUrgency) => {
    if (!value.trim() || !currentId) return;
    setProcessing(true); setNotice('');
    addMessage.mutate({ conversationId: currentId, data: { text: value.trim(), source: source === 'voice' ? MessageInputSource.voice : MessageInputSource.text } }, {
      onSuccess: (turn) => {
        if (hasRecovery) {
          if (recoveryUrgency === 'urgent') {
            trackEvent('urgent_handoff_recovered', { recovery_action: 'retry', route: CONVERSATION_ANALYTICS_ROUTE });
          }
        }
        clearConversationRecovery(currentId); setHasRecovery(false); saveConversation(turn.conversation); setText(''); setProcessing(false); setNotice(successNotice);
      },
      onError: () => {
        setProcessing(false);
        if (source === 'voice') {
          const urgency = classifiedUrgency || (structure?.riskLevel === 'urgent' ? 'urgent' : 'unclassified');
          if (!hasRecovery && urgency === 'urgent') {
            trackEvent('urgent_handoff_failed', { input_source: 'voice', route: CONVERSATION_ANALYTICS_ROUTE });
          }
          setText(value.trim());
          setNotice(VOICE_HANDOFF_RECOVERY_NOTICE);
          saveConversationRecovery({ conversationId: currentId, text: value.trim(), notice: VOICE_HANDOFF_RECOVERY_NOTICE, urgency });
          setRecoveryUrgency(urgency);
          setHasRecovery(true);
          return;
        }
        const retryNotice = 'MAMA could not hear that. Your words are still safe here — try once more.';
        setNotice(retryNotice);
        if (hasRecovery) {
          saveConversationRecovery({ conversationId: currentId, text: value.trim(), notice: retryNotice, urgency: recoveryUrgency });
        }
      },
    });
  };
  const browserRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setNotice('Voice capture is not available in this browser. You can type instead.'); return; }
    const recognition = new SpeechRecognition(); recognition.lang = 'en-NG'; recognition.interimResults = false; recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setNotice('We could not capture that. You can try again or type instead.'); };
    recognition.onresult = (event: any) => send(event.results[0][0].transcript, 'voice');
    recognitionRef.current = recognition; recognition.start();
  };
  const toggleVoice = async () => {
    if (listening) {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      else recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (authLoading) {
      setNotice('Checking secure live transcription access…');
      return;
    }
    if (!isAuthenticated) {
      setNotice('Log in from the menu to use secure live transcription. You can still type here.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { browserRecognition(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = RECORDER_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recordingStartedRef.current = Date.now();
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => { stream.getTracks().forEach((track) => track.stop()); setListening(false); setProcessing(false); setNotice('Recording failed. You can try browser recognition or type instead.'); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setListening(false);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (!blob.size || !currentId) { setNotice('No audio was captured. Please try again or type instead.'); return; }
        const durationMs = Math.min(120000, Math.max(1, Date.now() - recordingStartedRef.current));
        setProcessing(true);
        setNotice('Sending this recording securely to Intron Sahara…');
        try {
          const audioBase64 = await toBase64(blob);
          transcribe.mutate({
            conversationId: currentId,
            data: {
              audioBase64,
              mimeType: (blob.type.split(';')[0] || 'audio/webm') as any,
              fileName: `mama-${Date.now()}.${blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm'}`,
              languagePair: (conversation?.languageMix[0] || 'English + Nigerian Pidgin').replace('·', '+'),
              durationMs,
            },
          }, {
            onSuccess: (result) => send(result.transcript, 'voice', `Live ${result.provider} ${result.model} transcript · ${result.latencyMs}ms`, result.riskLevel === 'urgent' ? 'urgent' : 'non_urgent'),
            onError: (error: any) => {
              setProcessing(false);
              const retryAfter = error?.response?.headers?.get?.('retry-after');
              setNotice(retryAfter
                ? `Live transcription is at capacity. Please try again in ${retryAfter} seconds.`
                : error?.status === 401
                  ? 'Your session has expired. Log in again to use live transcription.'
                  : 'Live Intron transcription is unavailable. Switching to browser speech recognition…');
              browserRecognition();
            },
          });
        } catch {
          setProcessing(false);
          setNotice('The recording could not be prepared. You can try browser recognition or type instead.');
        }
      };
      recorder.start(250);
      setNotice('Recording locally. Tap the microphone again when you are done.');
      setListening(true);
    } catch {
      setNotice('Microphone permission was not available. Trying browser speech recognition instead.');
      browserRecognition();
    }
  };
  const runAnalysis = () => { if (currentId) analyze.mutate({ conversationId: currentId }, { onSuccess: (result) => { saveConversation(result.conversation); setNotice('Safety check complete. Review the handoff below.'); } }); };
  const requestHuman = () => {
    if (!currentId) return;
    const wasRecovery = hasRecovery;
    action.mutate({ conversationId: currentId, data: { action: ActionInputAction.REQUEST_HUMAN, consent: null } }, {
      onSuccess: () => {
        escalate.mutate({ data: { conversationId: currentId, reason: 'Patient requested human support during intake.' } }, {
          onSuccess: (result) => {
            if (wasRecovery) {
              if (recoveryUrgency === 'urgent') {
                trackEvent('urgent_handoff_recovered', { recovery_action: 'human_support', route: CONVERSATION_ANALYTICS_ROUTE });
              }
              clearConversationRecovery(currentId);
              setHasRecovery(false);
            }
            setNotice(result.message || 'A human support request has been recorded.');
          },
          onError: () => setNotice('Human support could not be reached right now. Please try again.'),
        });
      },
      onError: () => setNotice('Human support could not be reached right now. Please try again.'),
    });
  };
  const prepareReferral = () => { if (!currentId) return; createReferral.mutate({ data: { conversationId: currentId, consent: true, status: ReferralStatus.new } }, { onSuccess: () => { setShowConsent(false); setNotice('Referral prepared for the care team.'); } }); };
  if (!conversation) return <div className="min-h-[100dvh] bg-background"><TopBar /><div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/20 text-accent"><Mic size={28} /></div><h1 className="mt-7 font-[var(--app-font-serif)] text-4xl font-extrabold tracking-[-.06em]">A quiet place to start.</h1><p className="mt-4 text-sm leading-6 text-muted-foreground">Tell MAMA what is happening in your own words. You can speak or type, and you can stop at any time.</p><Button className="mt-8" onClick={openConversation} disabled={create.isPending} testId="button-open-conversation">{create.isPending ? 'Opening…' : <><Plus size={17} /> Begin intake</>}</Button></div></div>;
  return (
    <div className="mama-noise min-h-[100dvh] bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-8"><div className="flex items-center gap-4"><Link href="/" data-testid="link-conversation-home" className="mama-focus rounded-lg p-2 hover:bg-muted"><ArrowLeft size={18} /></Link><Logo /><span className="hidden border-l border-border pl-4 font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground sm:block">private intake / {conversation.id.slice(0, 8)}</span></div><div className="flex items-center gap-3"><Pill tone="teal"><LockKeyhole size={12} /> Demo data</Pill>{!authLoading && <button onClick={isAuthenticated ? logout : login} data-testid={isAuthenticated ? 'button-conversation-logout' : 'button-conversation-login'} className="mama-focus rounded-xl border border-border px-3 py-2 text-xs font-bold hover:bg-muted">{isAuthenticated ? `Log out${user?.firstName ? `, ${user.firstName}` : ''}` : 'Log in for live voice'}</button>}<button data-testid="button-conversation-help" onClick={requestHuman} className="mama-focus rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><CircleHelp size={20} /></button></div></header>
      <main className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 md:px-8 lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <section className="flex min-h-[calc(100dvh-120px)] flex-col rounded-[24px] border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[.18em] text-accent">Step 01 / listen</p><h1 className="mt-1 font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">Tell me what’s happening</h1></div><div className="flex items-center gap-2"><Pill tone={conversation.voiceState === 'LISTENING' ? 'coral' : 'neutral'}><span className={cn('h-1.5 w-1.5 rounded-full', listening ? 'animate-pulse bg-accent' : 'bg-muted-foreground')} />{listening ? 'Listening' : processing ? 'Understanding' : 'Ready'}</Pill><button data-testid="button-more-conversation" className="mama-focus rounded-lg p-2 text-muted-foreground hover:bg-muted"><MoreHorizontal size={18} /></button></div></div>
          <div className="mama-grid flex-1 space-y-5 overflow-auto p-4 md:p-8">
            <div className="mx-auto max-w-2xl rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm leading-6"><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><Sparkles size={13} /> MAMA says</div>{messages.length ? 'I’m following. Take your time — what else should I know?' : 'You do not need medical words. Start with the part that worries you most.'}</div>
            {messages.map((message, index) => <TranscriptBubble key={message.id || index} message={message} />)}
            {processing && <div className="mx-auto flex max-w-2xl items-center gap-3 text-sm text-muted-foreground"><span className="flex gap-1"><i className="h-2 w-2 animate-bounce rounded-full bg-accent" /><i className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:100ms]" /><i className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:200ms]" /></span> MAMA is making sense of that…</div>}
            {notice && <div data-testid="status-conversation-notice" className="mx-auto flex max-w-2xl items-start gap-2 rounded-xl bg-accent/10 p-3 text-xs font-semibold text-foreground"><Info size={15} className="mt-0.5 shrink-0 text-accent" /> {notice}</div>}
          </div>
           <div className="border-t border-border p-4 md:p-6"><div className="mx-auto flex max-w-2xl items-end gap-3"><div className="flex-1 rounded-2xl border border-input bg-background p-2 focus-within:border-primary"><textarea value={text} onChange={(event) => { const nextText = event.target.value; setText(nextText); if (hasRecovery && currentId) saveConversationRecovery({ conversationId: currentId, text: nextText, notice, urgency: recoveryUrgency }); }} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(text); } }} data-testid="input-message" rows={2} placeholder="Type in your own words…" className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground" /><div className="flex items-center justify-between px-1 pt-1"><span className="text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line</span><button data-testid="button-send-message" onClick={() => send(text)} disabled={!text.trim() || processing} className="mama-focus rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-40"><Send size={16} /></button></div></div><VoiceButton listening={listening} processing={processing} onClick={toggleVoice} /></div><p className="mx-auto mt-3 max-w-2xl text-center text-[11px] text-muted-foreground">{listening ? 'Listening now. Tap the circle when you are done.' : 'Voice works best when you speak naturally, even when you mix languages.'}</p></div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-[24px] border border-border bg-card p-5"><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Step 02 / structure</p><h2 className="mt-1 font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">What MAMA heard</h2></div><BrainCircuit size={20} className="text-accent" /></div><div className="mt-5 space-y-3">{[['Intent', structure?.intent], ['Pregnancy', structure?.pregnancyStatus], ['Symptoms', structure?.symptoms?.join(', ')], ['Red flags', structure?.redFlags?.join(', ')], ['When', structure?.duration], ['Severity', structure?.severity]].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><span className="text-xs text-muted-foreground">{label}</span><span data-testid={`text-structure-${String(label).replaceAll(' ', '-').toLowerCase()}`} className="text-right text-xs font-bold">{value || <span className="font-normal text-muted-foreground">Waiting to hear</span>}</span></div>)}</div><Button variant="quiet" onClick={runAnalysis} disabled={analyze.isPending || !messages.length} className="mt-5 w-full" testId="button-analyze">{analyze.isPending ? <><RefreshCw size={16} className="animate-spin" /> Checking safely</> : <><ShieldCheck size={16} /> Run safety check</>}</Button></section>
          <section className={cn('rounded-[24px] border p-5', structure?.riskLevel === 'urgent' ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-card')}><div className="flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">Step 03 / safety</p><h2 className="mt-1 font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">{structure?.riskLevel ? riskLabel(structure.riskLevel) : 'Not assessed yet'}</h2></div><div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', structure?.riskLevel === 'urgent' ? 'bg-destructive text-destructive-foreground' : 'bg-primary/20 text-accent')}><Siren size={18} /></div></div>{structure?.redFlags?.length ? <div className="mt-4 space-y-2">{structure.redFlags.map((flag) => <div key={flag} className="flex gap-2 text-xs font-semibold"><TriangleAlert size={14} className="shrink-0 text-destructive" />{flag}</div>)}</div> : <p className="mt-4 text-sm leading-6 text-muted-foreground">{structure?.recommendedAction || 'MAMA will clearly explain what needs attention, without diagnosing you.'}</p>}{structure?.riskLevel && <Pill className="mt-4" tone={structure.riskLevel === 'urgent' ? 'coral' : 'yellow'}><Activity size={12} /> {structure.recommendedAction || 'Review with a care team'}</Pill>}</section>
          <section className="rounded-[24px] border border-border bg-sidebar p-5 text-sidebar-foreground"><div className="flex items-center gap-2 text-primary"><FileHeart size={17} /><span className="font-mono text-[10px] font-bold uppercase tracking-[.16em]">Step 04 / handoff</span></div><h2 className="mt-3 font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">You said it once.</h2><p className="mt-2 text-sm leading-6 text-sidebar-foreground/70">With your permission, MAMA prepares the useful parts for a health worker. You do not have to repeat yourself.</p><Button onClick={() => setShowConsent(true)} variant="primary" className="mt-5 w-full" disabled={!messages.length || createReferral.isPending} testId="button-prepare-referral"><ArrowRight size={16} /> Prepare handoff</Button><button onClick={requestHuman} data-testid="button-request-human" className="mama-focus mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"><PhoneCall size={14} /> I want a human now</button></section>
        </aside>
      </main>
      {showConsent && <ConsentDialog onClose={() => setShowConsent(false)} onConfirm={prepareReferral} pending={createReferral.isPending} />}
    </div>
  );
}

function TranscriptBubble({ message }: { message: TranscriptMessage }) {
  const isUser = message.speaker === TranscriptMessageSpeaker.user;
  return <div data-testid={`message-transcript-${message.id}`} className={cn('mx-auto flex max-w-2xl gap-3', isUser && 'flex-row-reverse')}><div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold', isUser ? 'bg-accent text-accent-foreground' : 'bg-sidebar text-primary')}>{isUser ? <UserRound size={15} /> : <HeartPulse size={16} />}</div><div className={cn('max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6', isUser ? 'rounded-tr-sm bg-sidebar text-sidebar-foreground' : 'rounded-tl-sm border border-border bg-card')}><p>{message.text}</p><div className={cn('mt-1 flex items-center gap-2 text-[10px]', isUser ? 'text-sidebar-foreground/55' : 'text-muted-foreground')}><span>{isUser ? 'You' : 'MAMA'}</span><span>·</span><span>{formatTime(message.createdAt)}</span>{message.source === 'voice' && <AudioLines size={11} />}</div></div></div>;
}

function ConsentDialog({ onClose, onConfirm, pending }: { onClose: () => void; onConfirm: () => void; pending: boolean }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-sidebar/50 p-4 backdrop-blur-sm sm:items-center"><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-[28px] border border-border bg-card p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-accent"><LockKeyhole size={22} /></div><button onClick={onClose} data-testid="button-close-consent" className="mama-focus rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div><h2 className="mt-6 font-[var(--app-font-serif)] text-3xl font-extrabold tracking-[-.05em]">Your story stays yours.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">MAMA will share the structured intake and transcript with a health worker so they can understand the situation before speaking with you.</p><div className="mt-5 space-y-3 rounded-2xl bg-muted p-4 text-sm"><div className="flex gap-3"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" /><span>Only the information from this conversation is included.</span></div><div className="flex gap-3"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" /><span>You can decline, request a human, or end the conversation.</span></div><div className="flex gap-3"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-accent" /><span>This prototype does not diagnose or dispatch emergency services.</span></div></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose} testId="button-decline-consent">Not now</Button><Button onClick={onConfirm} disabled={pending} testId="button-confirm-consent">{pending ? <RefreshCw size={16} className="animate-spin" /> : <><Check size={16} /> I consent to handoff</>}</Button></div></div></div>;
}

function WorkerShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const links = [{ href: '/health-worker', label: 'Referral queue', icon: LayoutDashboard }, { href: '/benchmark', label: 'Voice intelligence lab', icon: BarChart3 }, { href: '/responsible-ai', label: 'Responsible AI', icon: ShieldCheck }];
  return <div className="min-h-[100dvh] bg-background text-foreground md:flex"><aside className="hidden w-[248px] shrink-0 flex-col bg-sidebar px-5 py-6 text-sidebar-foreground md:flex"><Logo /><div className="mt-12 font-mono text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/45">Care operations</div><nav className="mt-4 space-y-1">{links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} data-testid={`link-worker-${label.replaceAll(' ', '-').toLowerCase()}`} className={cn('mama-focus flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition', location.startsWith(href) ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground')}><Icon size={17} />{label}</Link>)}</nav><div className="mt-auto rounded-2xl border border-sidebar-border bg-sidebar-accent p-4"><div className="flex items-center gap-2 text-primary"><Radio size={14} /><span className="font-mono text-[10px] uppercase tracking-[.16em]">Demo node</span></div><p className="mt-2 text-xs leading-5 text-sidebar-foreground/60">Simulated referrals only. No real patient dispatch.</p></div></aside><div className="min-w-0 flex-1"><div className="md:hidden"><TopBar worker /></div>{children}</div></div>;
}

function ReferralQueue() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<'all' | RiskLevel>('all');
  const referralParams = filter === 'all' ? undefined : { priority: filter };
  const { data, isLoading, isError, refetch } = useListReferrals(referralParams, { query: { queryKey: getListReferralsQueryKey(referralParams) } });
  const referrals = data || [];
  return <PageFrame eyebrow="Care operations / queue" title="A clearer first minute for the care team." description="Every referral arrives with the patient’s own words, structured for action. Review, acknowledge, and follow the thread." action={<div className="flex items-center gap-2"><Pill tone="yellow"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Simulated queue</Pill><Button variant="outline" onClick={() => refetch()} testId="button-refresh-referrals"><RefreshCw size={15} /> Refresh</Button></div>}><div className="mb-5 flex flex-wrap items-center gap-2"><Filter size={16} className="mr-1 text-muted-foreground" />{[['all', 'All'], ['urgent', 'Urgent'], ['needs_attention', 'Attention'], ['routine', 'Routine']].map(([value, label]) => <button key={value} onClick={() => setFilter(value as typeof filter)} data-testid={`button-filter-${value}`} className={cn('mama-focus rounded-full border px-3 py-1.5 text-xs font-bold transition', filter === value ? 'border-primary bg-primary/20' : 'border-border bg-card text-muted-foreground hover:border-foreground/30')}>{label}</button>)}</div>{isLoading ? <QueueSkeleton /> : isError ? <EmptyState icon={TriangleAlert} title="Queue unavailable" copy="The care operations feed could not be loaded." action={<Button onClick={() => refetch()} testId="button-retry-referrals"><RefreshCw size={15} /> Try again</Button>} /> : referrals.length === 0 ? <EmptyState icon={FileHeart} title="No referrals in this view" copy="New consented handoffs will appear here with their context intact." /> : <div className="grid gap-3">{referrals.map((referral) => <ReferralRow key={referral.id} referral={referral} onClick={() => setLocation(`/health-worker/${referral.id}`)} />)}</div>}</PageFrame>;
}

function QueueSkeleton() { return <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>; }
function EmptyState({ icon: Icon, title, copy, action }: { icon: typeof FileHeart; title: string; copy: string; action?: ReactNode }) { return <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[26px] border border-dashed border-border bg-card p-8 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-accent"><Icon size={25} /></div><h2 className="mt-5 font-[var(--app-font-serif)] text-2xl font-extrabold tracking-[-.04em]">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>{action && <div className="mt-5">{action}</div>}</div>; }
function ReferralRow({ referral, onClick }: { referral: Referral; onClick: () => void }) { return <button onClick={onClick} data-testid={`card-referral-${referral.id}`} className="mama-focus grid w-full gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-lg md:grid-cols-[90px_1fr_auto] md:items-center"><div><Pill tone={referral.priority === 'urgent' ? 'coral' : referral.priority === 'needs_attention' ? 'yellow' : 'teal'}>{riskLabel(referral.priority)}</Pill><p className="mt-2 font-mono text-[10px] text-muted-foreground">{referral.caseCode}</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-[var(--app-font-serif)] text-lg font-extrabold tracking-[-.03em]">{referral.reportedConcerns?.[0] || 'Maternal health intake'}</h3><Pill tone="neutral">{referral.language || 'English'}</Pill></div><p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{referral.conversationSummary || referral.patientContext}</p><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-muted-foreground"><span className="flex items-center gap-1"><Clock3 size={12} /> {formatTime(referral.createdAt)}</span><span className="flex items-center gap-1"><MessageCircle size={12} /> {referral.transcript?.length || 0} turns</span>{referral.consentStatus === ConsentStatus.granted && <span className="flex items-center gap-1 text-emerald-700"><LockKeyhole size={12} /> Consent recorded</span>}</div></div><ArrowRight className="hidden text-muted-foreground md:block" size={19} /></button>; }

function ReferralDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: referral, isLoading, isError } = useGetReferral(id, { query: { enabled: !!id, queryKey: getGetReferralQueryKey(id) } });
  const consent = useRecordReferralConsent();
  const [status, setStatus] = useState('new');
  if (isLoading) return <PageFrame eyebrow="Referral detail" title="Loading case"><div className="h-80 animate-pulse rounded-3xl bg-muted" /></PageFrame>;
  if (isError || !referral) return <PageFrame eyebrow="Referral detail" title="Case not found"><EmptyState icon={TriangleAlert} title="This referral is unavailable" copy="Return to the queue and choose another case." action={<Button onClick={() => setLocation('/health-worker')} testId="button-back-queue"><ArrowLeft size={15} /> Back to queue</Button>} /></PageFrame>;
  const acknowledge = () => consent.mutate({ referralId: referral.id, data: { granted: true } }, { onSuccess: () => { setStatus('acknowledged'); queryClient.invalidateQueries({ queryKey: getGetReferralQueryKey(id) }); } });
  return <PageFrame eyebrow="Care operations / case detail" title={referral.caseCode} description="A structured handoff preserves the person’s story while making the next action visible." action={<div className="flex gap-2"><Button variant="outline" onClick={() => setLocation('/health-worker')} testId="button-back-queue"><ArrowLeft size={15} /> Queue</Button><Button onClick={acknowledge} disabled={consent.isPending || status === 'acknowledged'} testId="button-acknowledge-referral">{status === 'acknowledged' ? <><Check size={15} /> Acknowledged</> : <><CheckCircle2 size={15} /> Acknowledge</>}</Button></div>}><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><section className="rounded-[26px] border border-border bg-card p-6"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/20 text-accent"><FileHeart size={22} /></div><div><p className="text-xs text-muted-foreground">Patient context</p><h2 className="font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">{referral.patientContext || 'Context captured in conversation'}</h2></div></div><Pill tone={referral.priority === 'urgent' ? 'coral' : 'yellow'}>{riskLabel(referral.priority)}</Pill></div><div className="mt-6 grid gap-5 sm:grid-cols-2">{[['Reported concerns', referral.reportedConcerns?.join(', ')], ['Duration', referral.duration], ['Language', referral.language], ['Consent', referral.consentStatus], ['Recommended handoff', referral.conversationSummary], ['Missing information', referral.missingInformation?.join(', ') || 'None flagged']].map(([label, value]) => <div key={label}><div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">{label}</div><p data-testid={`text-referral-${String(label).replaceAll(' ', '-').toLowerCase()}`} className="mt-2 text-sm font-semibold leading-6">{value || 'Not captured'}</p></div>)}</div>{referral.criticalInformation?.length ? <div className="mt-7 rounded-2xl bg-primary/15 p-4"><div className="flex items-center gap-2 text-xs font-bold"><Zap size={14} className="text-accent" /> Critical information</div><ul className="mt-3 space-y-2 text-sm">{referral.criticalInformation.map((item) => <li className="flex gap-2" key={item}><Check size={14} className="mt-1 shrink-0 text-accent" /> {item}</li>)}</ul></div> : null}</section><section className="rounded-[26px] border border-border bg-card p-6"><div className="flex items-center justify-between border-b border-border pb-5"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Conversation carried forward</div><h2 className="mt-1 font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">No repeat required</h2></div><Headphones size={20} className="text-accent" /></div><div className="mt-5 space-y-4">{referral.transcript?.length ? referral.transcript.map((message) => <TranscriptBubble key={message.id} message={message} />) : <p className="text-sm text-muted-foreground">Transcript is not available for this case.</p>}</div></section></div></PageFrame>;
}

function BenchmarkPage() {
  const [languagePair, setLanguagePair] = useState('');
  const [noise, setNoise] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [benchmarkAudio, setBenchmarkAudio] = useState<File | null>(null);
  const [referenceTranscript, setReferenceTranscript] = useState('');
  const [benchmarkNotice, setBenchmarkNotice] = useState('');
  const benchmarkParams = { languagePair: languagePair || undefined, noiseCondition: noise || undefined };
  const { data: scenarios, isLoading, isError, refetch } = useListBenchmarks(benchmarkParams, { query: { queryKey: getListBenchmarksQueryKey(benchmarkParams) } });
  const list = scenarios || [];
  useEffect(() => { if (!selectedId && list[0]) setSelectedId(list[0].id); }, [list, selectedId]);
  const { data: selected } = useGetBenchmark(selectedId, { query: { enabled: !!selectedId, queryKey: getGetBenchmarkQueryKey(selectedId) } });
  const run = useRunBenchmark();
  const analytics = useGetAnalyticsSummary({ query: { queryKey: getGetAnalyticsSummaryQueryKey() } });
  const active = selected || list.find((item) => item.id === selectedId);
  useEffect(() => {
    if (!active) return;
    setBenchmarkAudio(null);
    setBenchmarkNotice('');
    setReferenceTranscript(active.dataLabel.includes('PENDING') ? '' : active.referenceTranscript);
  }, [active?.id]);
  const executeBenchmark = async () => {
    if (!active) return;
    setBenchmarkNotice('');
    if (!benchmarkAudio) { run.mutate({ data: { benchmarkId: active.id } }); return; }
    if (active.dataLabel.includes('PENDING')) { setBenchmarkNotice('This scenario needs a verified server-owned reference before live scoring is allowed.'); return; }
    try {
      const durationMs = await audioDuration(benchmarkAudio);
      const audioBase64 = await toBase64(benchmarkAudio);
      run.mutate({ data: { benchmarkId: active.id, audioBase64, mimeType: (benchmarkAudio.type.split(';')[0] || 'audio/webm') as any, fileName: benchmarkAudio.name, durationMs } }, {
        onSuccess: () => setBenchmarkNotice('Live Intron result measured against the locked reference transcript.'),
        onError: () => setBenchmarkNotice('Live Intron benchmarking is unavailable. Check the server credential and audio format.'),
      });
    } catch { setBenchmarkNotice('This audio file could not be read or exceeds the supported duration.'); }
  };
  return <PageFrame eyebrow="MAMA / voice intelligence lab" title="Can the model hear the whole story?" description="Benchmarking language, code-switching, and the details that change a safe next action. Every scenario is labelled and reviewable." action={<Pill tone="yellow"><BrainCircuit size={13} /> 12-language Intron matrix</Pill>}><div className="grid gap-5 xl:grid-cols-[300px_1fr]"><aside className="space-y-4"><section className="rounded-[24px] border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-[var(--app-font-serif)] text-lg font-extrabold">Scenarios</h2><Pill>{list.length}</Pill></div><div className="mt-4 space-y-2"><label className="block text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">Language pair<select value={languagePair} onChange={(event) => setLanguagePair(event.target.value)} data-testid="select-language-filter" className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold outline-none focus:border-primary"><option value="">All 12 language pairs</option>{INTRON_LANGUAGES.map((language) => <option key={language}>English + {language}</option>)}</select></label><label className="block text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">Noise condition<select value={noise} onChange={(event) => setNoise(event.target.value)} data-testid="select-noise-filter" className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs font-semibold outline-none focus:border-primary"><option value="">Any environment</option><option>Generator / fan</option><option>Quiet</option><option>To be recorded</option></select></label></div></section><div className="space-y-2">{isLoading ? [1, 2, 3].map((i) => <div className="h-20 animate-pulse rounded-2xl bg-muted" key={i} />) : isError ? <EmptyState icon={TriangleAlert} title="Lab unavailable" copy="Try loading the benchmark set again." action={<Button onClick={() => refetch()} testId="button-retry-benchmarks"><RefreshCw size={14} /> Retry</Button>} /> : list.length === 0 ? <EmptyState icon={BookOpen} title="No scenarios" copy="Try clearing a filter." /> : list.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} active={selectedId === scenario.id} onClick={() => setSelectedId(scenario.id)} />)}</div></aside><main className="space-y-5">{active ? <><section className="rounded-[26px] border border-border bg-sidebar p-6 text-sidebar-foreground md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><Pill tone="yellow">Scenario / {active.id.slice(0, 6)}</Pill><h2 className="mt-5 max-w-2xl font-[var(--app-font-serif)] text-3xl font-extrabold leading-tight tracking-[-.05em] md:text-5xl">{active.label}</h2></div><Button onClick={executeBenchmark} disabled={run.isPending || (Boolean(benchmarkAudio) && active.dataLabel.includes('PENDING'))} testId="button-run-benchmark">{run.isPending ? <><RefreshCw size={15} className="animate-spin" /> Running</> : <><Play size={15} /> {benchmarkAudio ? 'Run live Intron' : 'Replay stored result'}</>}</Button></div><div className="mt-8 rounded-2xl border border-sidebar-border bg-sidebar-accent p-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-primary"><AudioLines size={14} /> Evidence fixture</div><label className="mt-4 block text-xs font-bold">Recorded audio<input data-testid="input-benchmark-audio" type="file" disabled={active.dataLabel.includes('PENDING')} accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav" onChange={(event) => setBenchmarkAudio(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-sidebar-border bg-sidebar p-3 text-xs disabled:cursor-not-allowed disabled:opacity-50" /></label><label className="mt-4 block text-xs font-bold">Server-owned locked reference<textarea data-testid="input-reference-transcript" value={referenceTranscript} readOnly rows={3} placeholder="Pending verification; live scoring is disabled." className="mt-2 w-full resize-none rounded-xl border border-sidebar-border bg-sidebar p-3 text-sm leading-6 opacity-80 outline-none" /></label>{benchmarkNotice && <p className="mt-3 text-xs text-primary">{benchmarkNotice}</p>}<div className="mt-5 flex flex-wrap gap-2"><Pill tone="dark"><Languages size={12} /> {active.languagePair}</Pill><Pill tone="dark"><Radio size={12} /> {active.noiseCondition} noise</Pill><Pill tone="dark"><LockKeyhole size={12} /> {benchmarkAudio ? 'USER AUDIO · LIVE RUN' : active.dataLabel}</Pill></div></div></section><AnalyticsStrip summary={analytics.data} /><ModelTable results={run.data?.results || active.results} /></> : <EmptyState icon={Headphones} title="Choose a scenario" copy="Select a benchmark to inspect model behavior." />}</main></div></PageFrame>;
}

function ScenarioCard({ scenario, active, onClick }: { scenario: BenchmarkScenario; active: boolean; onClick: () => void }) { return <button onClick={onClick} data-testid={`button-scenario-${scenario.id}`} className={cn('mama-focus w-full rounded-2xl border p-4 text-left transition', active ? 'border-primary bg-primary/15' : 'border-border bg-card hover:border-primary/50')}><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] text-muted-foreground">{scenario.languagePair}</span>{scenario.audioAvailable && <AudioLines size={14} className="text-accent" />}</div><h3 className="mt-2 text-sm font-bold leading-5">{scenario.label}</h3><p className="mt-2 text-[11px] text-muted-foreground">{scenario.accentRegion} · {scenario.deviceType}</p></button>; }
function AnalyticsStrip({ summary }: { summary?: { totalConversations: number; codeSwitchedConversations: number; averageLatencyMs: number; taskSuccess: number } }) { const items = [['Conversations', summary?.totalConversations ?? '—'], ['Code-switched', summary?.codeSwitchedConversations ?? '—'], ['Avg latency', summary ? `${summary.averageLatencyMs}ms` : '—'], ['Task success', summary ? `${Math.round(summary.taskSuccess * 100)}%` : '—']]; return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(([label, value]) => <div key={label} data-testid={`metric-${String(label).replaceAll(' ', '-').toLowerCase()}`} className="rounded-2xl border border-border bg-card p-4"><div className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">{label}</div><div className="mt-2 font-[var(--app-font-serif)] text-2xl font-extrabold tracking-[-.04em]">{value}</div></div>)}</div>; }
function ModelTable({ results }: { results?: Array<{ model: string; transcript: string; metrics: { wer: number; intentAccuracy: number; criticalFactAccuracy: number; actionAccuracy: number; vasr: number; latencyMs: number; executed: boolean; availability: string } }> }) { return <section className="overflow-hidden rounded-[26px] border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><div><div className="font-mono text-[10px] uppercase tracking-[.14em] text-muted-foreground">Model comparison</div><h2 className="mt-1 font-[var(--app-font-serif)] text-xl font-extrabold tracking-[-.04em]">What matters beyond transcription</h2></div><Pill tone="teal">WER is not enough</Pill></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-muted text-[10px] uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-5 py-3">Model</th><th className="px-3 py-3">Transcript</th><th className="px-3 py-3">WER</th><th className="px-3 py-3">Critical facts</th><th className="px-3 py-3">Action</th><th className="px-5 py-3">Latency</th></tr></thead><tbody>{results?.length ? results.map((result) => <tr key={result.model} className="border-t border-border align-top"><td className="px-5 py-4 font-bold">{result.model}<div className="mt-1 text-[10px] font-normal text-muted-foreground">{result.metrics.availability}</div></td><td className="max-w-[260px] px-3 py-4 leading-5 text-muted-foreground">{result.transcript}</td><td className="px-3 py-4 font-mono">{Math.round(result.metrics.wer * 100)}%</td><td className="px-3 py-4 font-mono text-accent">{Math.round(result.metrics.criticalFactAccuracy * 100)}%</td><td className="px-3 py-4 font-mono">{Math.round(result.metrics.actionAccuracy * 100)}%</td><td className="px-5 py-4 font-mono">{result.metrics.latencyMs}ms</td></tr>) : <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">Run this scenario to populate model results.</td></tr>}</tbody></table></div></section>; }

function JudgePage() {
  const story = [{ n: '01', time: '0:00', title: 'Start with a voice', copy: 'A patient opens MAMA and speaks naturally — no form, no translation hurdle.', href: '/conversation' }, { n: '02', time: '0:50', title: 'Make the invisible visible', copy: 'MAMA shows the transcript, structured fields, and a transparent safety check.', href: '/conversation' }, { n: '03', time: '1:40', title: 'Carry the story forward', copy: 'Consent turns one conversation into a prepared referral a health worker can act on.', href: '/health-worker' }, { n: '04', time: '2:30', title: 'Prove the edges', copy: 'The Voice Intelligence Lab makes performance and limitations inspectable.', href: '/benchmark' }];
  return <div className="mama-noise min-h-[100dvh] bg-background text-foreground"><TopBar /><main className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 md:px-10 md:pt-20 lg:px-14"><div className="grid gap-10 lg:grid-cols-[.92fr_1.08fr]"><div><Pill tone="coral"><Zap size={13} /> Guided demo / 3 minutes</Pill><h1 className="mt-6 max-w-2xl font-[var(--app-font-serif)] text-6xl font-extrabold leading-[.9] tracking-[-.08em] md:text-8xl">A story that<br /><span className="text-accent">keeps moving.</span></h1><p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">MAMA is a human bridge: from an unstructured voice note to a safer, consent-aware handoff — without asking someone to start over.</p><Button onClick={() => window.scrollTo({ top: 580, behavior: 'smooth' })} className="mt-8" testId="button-begin-demo"><Play size={16} /> Begin the story</Button></div><div className="relative min-h-[480px] rounded-[34px] bg-sidebar p-6 text-sidebar-foreground md:p-10"><div className="absolute right-8 top-8 h-20 w-20 rounded-full border border-primary/30" /><div className="absolute bottom-8 left-8 h-24 w-24 rounded-full border-[14px] border-accent/70" /><div className="relative flex h-full flex-col justify-between"><div className="flex justify-between font-mono text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/55"><span>MAMA / competition view</span><span>03:00</span></div><div><div className="flex items-center gap-3 text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> voice → structure → action</div><div className="mt-5 flex flex-wrap gap-2">{['English', 'Pidgin', 'Yoruba', 'Igbo'].map((item) => <Pill tone="dark" key={item}>{item}</Pill>)}</div></div><div className="flex items-end justify-between"><div><p className="font-[var(--app-font-serif)] text-3xl font-extrabold tracking-[-.05em]">You said it once.</p><p className="mt-1 text-sm text-sidebar-foreground/60">MAMA carries the context.</p></div><ArrowRight className="text-primary" size={28} /></div></div></div></div><section className="mt-20" id="story"><div className="mb-5 flex items-end justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[.16em] text-muted-foreground">The judge’s route</div><h2 className="mt-2 font-[var(--app-font-serif)] text-3xl font-extrabold tracking-[-.05em]">Follow the handoff.</h2></div><Pill tone="yellow">3:00 total</Pill></div><div className="grid gap-3 md:grid-cols-2">{story.map((item) => <Link href={item.href} key={item.n} data-testid={`link-demo-step-${item.n}`} className="mama-focus group rounded-[24px] border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary"><div className="flex items-center justify-between"><span className="font-mono text-xs text-accent">{item.n} / {item.time}</span><ArrowRight className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-accent" size={18} /></div><h3 className="mt-12 font-[var(--app-font-serif)] text-2xl font-extrabold tracking-[-.04em]">{item.title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{item.copy}</p></Link>)}</div></section></main></div>;
}

function ResponsibleAiPage() {
  const principles = [{ icon: LockKeyhole, title: 'Consent is an action, not a footnote.', copy: 'A referral is never created from a conversation until the person sees what will be shared and chooses to continue.' }, { icon: Languages, title: 'Language mixing is expected.', copy: 'MAMA’s Intron test matrix treats English plus Nigerian Pidgin, Yoruba, Igbo, Hausa, Amharic, Swahili, Kinyarwanda, Luganda, Twi, Wolof, Zulu, and Xhosa as valid ways to tell one story.' }, { icon: TriangleAlert, title: 'Safety routing is not diagnosis.', copy: 'The system highlights signals and missing information for a human to review. It does not claim clinical certainty.' }, { icon: UsersRound, title: 'Oversight stays visible.', copy: 'Health workers can review the transcript, structured fields, model provenance, and what MAMA could not capture.' }];
  return <div className="mama-noise min-h-[100dvh] bg-background text-foreground"><TopBar /><PageFrame eyebrow="MAMA / responsible AI" title="Trust is part of the interface." description="A maternal health tool has to be honest about what it knows, what it is doing, and where a human must step in." action={<Pill tone="teal"><ShieldCheck size={13} /> Prototype safeguards</Pill>}><div className="grid gap-3 md:grid-cols-2">{principles.map(({ icon: Icon, title, copy }, index) => <section key={title} className={cn('rounded-[26px] border border-border bg-card p-6 md:p-8', index === 0 && 'bg-primary/15')}><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sidebar text-primary"><Icon size={20} /></div><h2 className="mt-7 max-w-sm font-[var(--app-font-serif)] text-2xl font-extrabold leading-tight tracking-[-.04em]">{title}</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{copy}</p></section>)}</div><section className="mt-5 grid gap-5 rounded-[26px] border border-border bg-sidebar p-6 text-sidebar-foreground md:grid-cols-[1fr_1fr] md:p-8"><div><div className="font-mono text-[10px] uppercase tracking-[.15em] text-primary">What this prototype does</div><ul className="mt-5 space-y-3 text-sm leading-6 text-sidebar-foreground/75">{['Captures voice or typed messages into a structured conversation.', 'Runs deterministic safety checks against the information shared.', 'Prepares a consent-aware referral for a simulated care queue.', 'Makes benchmark scenarios, metrics, and missing information inspectable.'].map((item) => <li key={item} className="flex gap-2"><Check size={16} className="mt-1 shrink-0 text-primary" />{item}</li>)}</ul></div><div className="border-t border-sidebar-border pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0"><div className="font-mono text-[10px] uppercase tracking-[.15em] text-accent">What it does not do</div><ul className="mt-5 space-y-3 text-sm leading-6 text-sidebar-foreground/75">{['It does not diagnose, prescribe, or replace a clinician.', 'It does not claim a real ambulance, facility, or human has been dispatched.', 'It does not hide uncertainty behind a single accuracy number.', 'It does not make a referral without an explicit consent decision.'].map((item) => <li key={item} className="flex gap-2"><X size={16} className="mt-1 shrink-0 text-accent" />{item}</li>)}</ul></div></section><div className="mt-8 flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center"><div><h2 className="font-[var(--app-font-serif)] text-lg font-extrabold">See the evidence, not a promise.</h2><p className="mt-1 text-sm text-muted-foreground">The Voice Intelligence Lab is where the system’s edges stay visible.</p></div><Link href="/benchmark" data-testid="link-open-benchmark" className="mama-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><BarChart3 size={16} /> Open benchmark lab</Link></div></PageFrame></div>;
}

function Router() {
  return <Switch><Route path="/" component={HomePage} /><Route path="/conversation" component={ConversationPage} /><Route path="/health-worker/:id" component={() => <WorkerShell><ReferralDetail /></WorkerShell>} /><Route path="/health-worker" component={() => <WorkerShell><ReferralQueue /></WorkerShell>} /><Route path="/benchmark" component={BenchmarkPage} /><Route path="/judge" component={JudgePage} /><Route path="/responsible-ai" component={ResponsibleAiPage} /><Route component={NotFound} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) { const [location] = useLocation(); return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }

export default App;
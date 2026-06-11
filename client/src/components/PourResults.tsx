import { useState, useEffect, useRef } from 'react';

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useScrollReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return { ref, visible };
}

// ── Count-up hook ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration: number, delay = 0) {
  const [value, setValue] = useState(0);
  const [done,  setDone]  = useState(false);

  useEffect(() => {
    setValue(0);
    setDone(false);
    let raf: number;
    const timeout = setTimeout(() => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p     = Math.min((now - t0) / duration, 1);
        const eased = 1 - (1 - p) ** 3;          // cubic ease-out
        setValue(Math.round(eased * target));
        if (p < 1) raf = requestAnimationFrame(step);
        else       setDone(true);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, duration, delay]);

  return { value, done };
}

// ── Tip tanımları ─────────────────────────────────────────────────────────────

interface CheckResult {
  id: string;
  title: string;
  passed: boolean;
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
  wcag?: string;
  level?: string;
}

interface AiInsights {
  criticalIssues: { issue: string; solution: string }[];
  scoreComment: string;
  generalAdvice: string;
}

export interface AnalysisResultForPour {
  htmlScore: number;
  cssScore: number;
  totalScore: number;
  htmlResults: CheckResult[];
  cssResults: CheckResult[];
  tokensLeft: number;
  aiInsights: AiInsights | null;
}

// ── POUR kategorisi haritası ───────────────────────────────────────────────────

type PourKey = 'P' | 'O' | 'U' | 'R';

const POUR_MAP: Record<string, PourKey> = {
  // Perceivable — 1.x.x
  alt_text:             'P',
  heading_hierarchy:    'P',
  form_labels:          'P',
  css_font_size:        'P',
  font_size:            'P',
  css_contrast:         'P',
  contrast:             'P',
  viewport_meta:        'P',
  input_types:          'P',
  table_accessibility:  'P',
  autoplay_media:       'P',
  css_line_height:      'P',
  css_letter_spacing:   'P',
  non_text_contrast_css:'P',
  css_reflow:           'P',
  // Operable — 2.x.x
  tabindex:             'O',
  skip_navigation:      'O',
  page_title:           'O',
  css_focus_outline:    'O',
  css_cursor:           'O',
  touch_target:         'O',
  focus_order:          'O',
  link_purpose:         'O',
  multiple_ways:        'O',
  headings_labels:      'O',
  css_animation:        'O',
  // Understandable — 3.x.x
  lang_attribute:       'U',
  input_assistance:     'U',
  error_prevention:     'U',
  consistent_nav:       'U',
  consistent_id:        'U',
  // Robust — 4.x.x
  empty_buttons_links:  'R',
  aria_references:      'R',
  css_display_none:     'R',
  css_visibility:       'R',
};

const POUR_DEFS: { key: PourKey; icon: string; name: string; sub: string; color: string }[] = [
  { key: 'P', icon: '🎨', name: 'Algılanabilirlik', sub: 'Perceivable',    color: '#00d4ff' },
  { key: 'O', icon: '⌨️', name: 'Kullanılabilirlik', sub: 'Operable',       color: '#39ff14' },
  { key: 'U', icon: '💡', name: 'Anlaşılabilirlik',  sub: 'Understandable', color: '#f59e0b' },
  { key: 'R', icon: '🔧', name: 'Sağlamlık',         sub: 'Robust',         color: '#8b5cf6' },
];

// ── Skor renk / etiket yardımcıları ─────────────────────────────────────────
function scoreColor(s: number) {
  return s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
}
function scoreLabel(s: number) {
  return s >= 75 ? 'İyi' : s >= 50 ? 'Orta' : 'Zayıf';
}

// ── Büyük skor halkası ────────────────────────────────────────────────────────

function BigRing({ score }: { score: number }) {
  const SIZE = 160;
  const CX = 80; const CY = 80; const R = 66;
  const circ  = 2 * Math.PI * R;
  const color = scoreColor(score);
  const label = scoreLabel(score);

  const { value: disp, done: filled } = useCountUp(score, 1500, 0);
  const [rot, setRot] = useState(-90);

  // Slow rotation after fill: full 360° every 10s (like SubRing)
  useEffect(() => {
    if (!filled) return;
    let raf: number;
    const t0 = performance.now();
    const spin = (now: number) => {
      const elapsed = now - t0;
      setRot(-90 + (elapsed / 10000) * 360);
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [filled]);

  const offset = circ * (1 - disp / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
        Genel Skor
      </p>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="#1a1a2e"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(${rot} ${CX} ${CY})`}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>

        {/* Text overlay — stays fixed, does not rotate */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span
            className="font-bold leading-none tabular-nums"
            style={{ fontSize: 44, fontFamily: 'system-ui, sans-serif', color: 'white' }}
          >
            {disp}
          </span>
          <span className="text-gray-500 leading-tight" style={{ fontSize: 13 }}>/100</span>
          <span
            className="font-semibold leading-tight mt-1"
            style={{ fontSize: 12, color }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Küçük skor halkası (HTML / CSS) ──────────────────────────────────────────

function SubRing({ score, label, delay = 300 }: {
  score: number;
  label: string;
  delay?: number;
}) {
  const SIZE = 90;
  const CX = 45; const CY = 45; const R = 34;
  const circ  = 2 * Math.PI * R;
  const color = scoreColor(score);

  const { value: disp, done: filled } = useCountUp(score, 1200, delay);
  // Arc starts at top (-90°). After fill it rotates continuously.
  const [rot, setRot] = useState(-90);

  // Slow rotation: full 360° every 8s
  useEffect(() => {
    if (!filled) return;
    let raf: number;
    const t0 = performance.now();
    const spin = (now: number) => {
      const elapsed = now - t0;
      setRot(-90 + (elapsed / 8000) * 360);
      raf = requestAnimationFrame(spin);
    };
    raf = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(raf);
  }, [filled]);

  const offset = circ * (1 - disp / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1a1a2e" strokeWidth="5" />
          {/* Progress arc — transform controls start angle + ongoing rotation */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform={`rotate(${rot} ${CX} ${CY})`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>

        {/* Score text overlay — does not rotate */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: 17, fontFamily: 'system-ui, sans-serif', color: 'white' }}
          >
            {disp}
          </span>
        </div>
      </div>
      <span className="text-[11px] text-gray-500 font-medium">{label}</span>
    </div>
  );
}

// ── İstatistik kartı ──────────────────────────────────────────────────────────

function StatCard({
  value, label, icon, color, delay,
}: {
  value: number;
  label: string;
  icon: string;
  color: string;
  delay: number;
}) {
  const { value: disp } = useCountUp(value, 800, delay);

  return (
    <div
      className="flex-1 rounded-xl py-4 px-3 flex flex-col items-center gap-2 cursor-default"
      style={{
        background:   `${color}0d`,
        borderTop:    `1px solid ${color}25`,
        borderRight:  `1px solid ${color}25`,
        borderBottom: `1px solid ${color}25`,
        borderLeft:   `3px solid ${color}`,
        transition:   'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform  = 'translateY(-3px)';
        el.style.boxShadow  = `0 8px 24px ${color}25`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = '';
        el.style.boxShadow = '';
      }}
    >
      <span
        className="font-bold leading-none tabular-nums"
        style={{ fontSize: 28, color, fontFamily: 'system-ui, sans-serif' }}
      >
        {disp}
      </span>
      <div className="flex items-center gap-1.5">
        <span style={{ color, fontSize: 13 }}>{icon}</span>
        <span className="text-[11px] text-gray-500 uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
    </div>
  );
}

// ── Tek kontrol satırı (accordion içi) ───────────────────────────────────────

function CheckRow({ result, index }: { result: CheckResult; index: number }) {
  const [open, setOpen] = useState(false);
  const { ref, visible } = useScrollReveal(index * 50);
  const hasDetails = !result.passed && (result.issues.length > 0 || result.suggestions.length > 0);

  const codeMatch = result.wcag?.match(/(\d+\.\d+\.\d+)/);
  const wcagCode  = codeMatch?.[1] ?? null;
  const level     = result.level ?? null;
  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;

  return (
    <div
      ref={ref}
      className={`border-b border-[#1e1e2e] last:border-b-0 ${!result.passed ? 'bg-red-500/[0.02]' : ''}`}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        onClick={() => hasDetails && setOpen(v => !v)}
        onKeyDown={e => { if (hasDetails && (e.key === 'Enter' || e.key === ' ')) setOpen(v => !v); }}
        className={`flex items-center gap-3 px-4 py-3 transition-colors ${hasDetails ? 'cursor-pointer hover:bg-white/[0.025]' : ''}`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          {wcagCode && (
            <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 tabular-nums">
              {wcagCode}
            </span>
          )}
          {level && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm border flex-shrink-0 ${
              level === 'AAA' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
              level === 'AA'  ? 'text-[#00d4ff] border-[#00d4ff]/25 bg-[#00d4ff]/8' :
                                'text-gray-400 border-gray-600/30 bg-gray-700/20'
            }`}>
              {level}
            </span>
          )}
          <span className="text-sm text-white font-medium leading-snug">{result.title}</span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-gray-600 tabular-nums hidden sm:block">
            {result.score}/{result.maxScore}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            result.passed
              ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/20'
              : 'bg-red-500/10  text-red-400  border border-red-500/20'
          }`}>
            {result.passed ? 'GEÇTİ' : 'HATALI'}
          </span>
          {hasDetails && (
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              className={`text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            >
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {!result.passed && (
        <div className="px-4 pb-1">
          <div className="h-0.5 bg-[#1e1e2e] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: pct > 50 ? '#f59e0b' : '#ef4444' }}
            />
          </div>
        </div>
      )}

      {open && hasDetails && (
        <div className="px-4 pb-4 pt-1 space-y-2 animate-fade-in">
          {result.issues.length > 0 && (
            <div className="space-y-1.5">
              {result.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">✕</span>
                  <span className="font-mono break-all leading-relaxed">{issue}</span>
                </div>
              ))}
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-[#1e1e2e]/60 space-y-1.5">
              {result.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#00d4ff]/80">
                  <span className="flex-shrink-0 mt-0.5">💡</span>
                  <span className="leading-relaxed">{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── POUR accordion bölümü ─────────────────────────────────────────────────────

function PourSection({
  def, checks, sectionIndex,
}: {
  def: typeof POUR_DEFS[number];
  checks: CheckResult[];
  sectionIndex: number;
}) {
  const passed    = checks.filter(c => c.passed).length;
  const allPassed = passed === checks.length;
  const [open, setOpen] = useState(false);

  const { ref: headerRef, visible: headerVisible } = useScrollReveal(sectionIndex * 80);

  const sorted = [...checks].sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? 1 : -1;
    return 0;
  });

  const borderColor = allPassed ? 'rgba(57,255,20,0.18)' : 'rgba(239,68,68,0.2)';
  const headBg      = allPassed ? 'rgba(57,255,20,0.03)'  : 'rgba(239,68,68,0.04)';

  return (
    <div
      ref={headerRef}
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor,
        background: 'rgba(12,12,20,0.7)',
        opacity:    headerVisible ? 1 : 0,
        transform:  headerVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        style={{ background: open ? headBg : 'transparent' }}
      >
        <span className="text-xl flex-shrink-0">{def.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{def.name}</span>
            <span className="text-[10px] text-gray-600">{def.sub}</span>
          </div>
        </div>

        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full border flex-shrink-0"
          style={allPassed
            ? { color: '#39ff14', background: 'rgba(57,255,20,0.08)', borderColor: 'rgba(57,255,20,0.22)' }
            : { color: '#f87171', background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.22)' }
          }
        >
          {passed}/{checks.length} geçti
        </span>

        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`text-gray-500 transition-transform duration-300 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor }}>
          {sorted.map((check, i) => <CheckRow key={check.id} result={check} index={i} />)}
        </div>
      )}
    </div>
  );
}

// ── AI kritik sorun kartı (scroll-reveal) ─────────────────────────────────────

function AiIssueCard({ item, index }: { item: AiInsights['criticalIssues'][number]; index: number }) {
  const { ref, visible } = useScrollReveal(index * 80);
  return (
    <div
      ref={ref}
      className="bg-red-500/5 border border-red-500/15 rounded-xl p-3"
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-red-400 mt-0.5 flex-shrink-0 text-xs">⚠</span>
        <div>
          <p className="text-red-300 text-xs font-medium leading-relaxed">{item.issue}</p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">💡 {item.solution}</p>
        </div>
      </div>
    </div>
  );
}

function AiTextLine({ children, delay }: { children: JSX.Element; delay: number }) {
  const { ref, visible } = useScrollReveal(delay);
  return (
    <div
      ref={ref}
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {children}
    </div>
  );
}

// ── AI kutusu ─────────────────────────────────────────────────────────────────

function AiBox({ ai }: { ai: AiInsights }) {
  const [open, setOpen] = useState(false);
  const { ref, visible } = useScrollReveal(0);

  return (
    <div
      ref={ref}
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: 'rgba(0,212,255,0.2)',
        background: 'rgba(12,12,20,0.7)',
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
        style={{ background: open ? 'rgba(0,212,255,0.03)' : 'transparent' }}
      >
        <span className="text-xl flex-shrink-0">🤖</span>
        <span className="flex-1 font-semibold text-white text-sm">AI Analiz Yorumu</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={`text-gray-500 transition-transform duration-300 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Body */}
      {open && (
        <div className="border-t px-5 pb-5 pt-4 space-y-3" style={{ borderColor: 'rgba(0,212,255,0.15)' }}>
          {ai.criticalIssues.length > 0 && (
            <div className="space-y-2">
              {ai.criticalIssues.map((item, i) => (
                <AiIssueCard key={i} item={item} index={i} />
              ))}
            </div>
          )}
          <AiTextLine delay={ai.criticalIssues.length * 80}>
            <p className="text-[#00d4ff] text-xs italic leading-relaxed">{ai.scoreComment}</p>
          </AiTextLine>
          <AiTextLine delay={ai.criticalIssues.length * 80 + 80}>
            <p className="text-gray-500 text-[11px] leading-relaxed">📌 {ai.generalAdvice}</p>
          </AiTextLine>
        </div>
      )}
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

interface Props {
  result: AnalysisResultForPour;
  plan: 'FREE' | 'STARTER' | 'PRO';
  previewOpen: boolean;
  onPreviewToggle: () => void;
  onDownloadPdf: () => void;
  onNewAnalysis: () => void;
}

export default function PourResults({
  result, plan, previewOpen, onPreviewToggle, onDownloadPdf, onNewAnalysis,
}: Props) {
  const allChecks   = [...result.htmlResults, ...result.cssResults];
  const totalPassed = allChecks.filter(r => r.passed).length;
  const totalFailed = allChecks.length - totalPassed;
  const totalIssues = allChecks.reduce((s, r) => s + r.issues.length, 0);

  const grouped: Record<PourKey, CheckResult[]> = { P: [], O: [], U: [], R: [] };
  for (const c of allChecks) {
    const cat = POUR_MAP[c.id] ?? 'R';
    grouped[cat].push(c);
  }

  return (
    <div className="mt-10 animate-fade-in space-y-6">

      {/* ── Skor özet kutusu ─────────────────────────────── */}
      <div className="bg-[#0e0e1a] border border-[#1e1e2e] rounded-2xl p-6">

        {/* Plan rozeti */}
        <div className="flex justify-end mb-4 -mt-1">
          {plan === 'PRO' && (
            <span
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold"
              style={{ boxShadow: '0 0 10px rgba(245,158,11,0.1)' }}
            >
              ⚜ Pro Analizi
            </span>
          )}
          {plan === 'STARTER' && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-[10px] font-bold">
              🔵 Starter Analizi
            </span>
          )}
        </div>

        {/* ── Büyük halka ── */}
        <div className="flex justify-center mb-6">
          <BigRing score={result.totalScore} />
        </div>

        {/* ── HTML + CSS halkaları ── */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <SubRing score={result.htmlScore} label="HTML" delay={300} />
          <div className="w-px bg-[#1e1e2e]" style={{ height: 56 }} />
          <SubRing score={result.cssScore}  label="CSS"  delay={300} />
        </div>

        {/* ── 3 istatistik kartı ── */}
        <div className="flex gap-3 mb-5">
          <StatCard value={totalPassed} label="Geçti"     icon="✓" color="#22c55e" delay={600} />
          <StatCard value={totalFailed} label="Başarısız" icon="✕" color="#ef4444" delay={600} />
          <StatCard value={totalIssues} label="Sorun"     icon="⚠" color="#f59e0b" delay={600} />
        </div>

        {/* ── Aksiyon butonları ── */}
        <div className="flex flex-wrap gap-3 justify-center">

          {/* PDF — gold solid */}
          {plan === 'PRO' && (
            <button
              onClick={onDownloadPdf}
              className="btn-hover px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{
                background: '#f59e0b',
                color: '#1a0a00',
                boxShadow: '0 0 18px rgba(245,158,11,0.35)',
              }}
            >
              ⚜ PDF Raporu İndir
            </button>
          )}

          {/* Yeni Analiz — cyan solid */}
          <button
            onClick={onNewAnalysis}
            className="btn-hover px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: '#00d4ff',
              color: '#020c10',
              boxShadow: '0 0 18px rgba(0,212,255,0.3)',
            }}
          >
            ↺ Yeni Analiz
          </button>

          {/* Önizleme — outline */}
          <button
            onClick={onPreviewToggle}
            className={`btn-hover px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              previewOpen
                ? 'bg-[#00d4ff]/10 border-[#00d4ff]/35 text-[#00d4ff]'
                : 'border-[#2a2a3e] text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            {previewOpen ? '✕ Önizlemeyi Kapat' : '👁 HTML Önizleme'}
          </button>

        </div>
      </div>

      {/* ── AI yorumu ────────────────────────────────────── */}
      {result.aiInsights && <AiBox ai={result.aiInsights} />}

      {/* ── POUR Accordion ───────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest px-1">
          WCAG 2.1 Kategorileri
        </h2>
        {POUR_DEFS.map((def, si) => {
          const checks = grouped[def.key];
          if (checks.length === 0) return null;
          return <PourSection key={def.key} def={def} checks={checks} sectionIndex={si} />;
        })}
      </div>

    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import ScoreRing from '../components/ScoreRing';
import CheckCard from '../components/CheckCard';
import api from '../lib/axios';

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

interface AnalysisRecord {
  id: string;
  url: string | null;
  htmlSnippet: string | null;
  score: number;
  results: CheckResult[];
  createdAt: string;
}

// CSS check ID'leri (analyzer.ts ile birebir eşleşmeli)
const CSS_IDS = new Set([
  'css_font_size', 'css_focus_outline', 'css_contrast', 'css_cursor',
  'css_reflow', 'css_animation', 'css_display_none', 'touch_target',
  'css_line_height', 'css_letter_spacing', 'focus_order', 'link_purpose',
  'multiple_ways', 'headings_labels', 'input_assistance', 'error_prevention',
  'consistent_nav', 'consistent_id', 'css_visibility', 'non_text_contrast_css',
]);

function calcScore(results: CheckResult[]): number {
  if (!results.length) return 0;
  const earned = results.reduce((s, r) => s + r.score, 0);
  const max    = results.reduce((s, r) => s + r.maxScore, 0);
  return max > 0 ? Math.round((earned / max) * 100) : 0;
}

// ── Mini bileşenler ───────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 75 ? 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14]/25' :
    score >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/25' :
                  'text-red-400   bg-red-500/10   border-red-500/25';
  return (
    <span className={`text-lg font-bold px-3 py-1 rounded-full border ${cls}`}>{score}</span>
  );
}

function ResultSection({
  title, score, results, accent,
}: {
  title: string;
  score: number;
  results: CheckResult[];
  accent: string;
}) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const issues = results.reduce((s, r) => s + r.issues.length, 0);
  const sorted = [...results].sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? 1 : -1));

  return (
    <div className="flex-1 min-w-0">
      <div
        className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-5 mb-4"
        style={{ borderTopColor: accent, borderTopWidth: 2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">{title}</h3>
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-bold" style={{ color: score >= 75 ? '#39ff14' : score >= 50 ? '#f59e0b' : '#ef4444' }}>
              {score}
            </span>
            <span className="text-gray-500 text-xs">/100</span>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-base font-bold text-[#39ff14]">{passed}</div>
            <div className="text-[10px] text-gray-500">Geçti</div>
          </div>
          <div className="w-px bg-[#1e1e2e]" />
          <div className="text-center">
            <div className="text-base font-bold text-red-400">{failed}</div>
            <div className="text-[10px] text-gray-500">Başarısız</div>
          </div>
          <div className="w-px bg-[#1e1e2e]" />
          <div className="text-center">
            <div className="text-base font-bold text-[#00d4ff]">{issues}</div>
            <div className="text-[10px] text-gray-500">Sorun</div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {sorted.map((r, i) => <CheckCard key={r.id} result={r} index={i} />)}
      </div>
    </div>
  );
}

function UrlCard({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [url]);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#12121a] border border-[#1e1e2e] mb-8 text-sm">
      <span className="text-lg flex-shrink-0">{url ? '🌐' : '📄'}</span>

      <div className="min-w-0 flex-1">
        <span className="text-gray-500 text-xs">{url ? 'Analiz edilen URL' : 'HTML Kodu'}</span>
        <p className="text-gray-300 truncate">{url ?? 'Doğrudan HTML girişi'}</p>
      </div>

      {/* Kopyala butonu — sadece URL varsa */}
      {url && (
        <button
          onClick={handleCopy}
          className="btn-hover flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
          style={copied
            ? { color: '#39ff14', borderColor: 'rgba(57,255,20,0.3)', background: 'rgba(57,255,20,0.08)' }
            : { color: '#00d4ff', borderColor: 'rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.06)' }
          }
          title="URL'yi kopyala"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Kopyalandı
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="4" y="4" width="6" height="7" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M8 4V3a1 1 0 00-1-1H3a1 1 0 00-1 1v6a1 1 0 001 1h1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Kopyala
            </>
          )}
        </button>
      )}

      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex-shrink-0 ${
        url ? 'text-[#00d4ff] bg-[#00d4ff]/10 border-[#00d4ff]/20' : 'text-[#8b5cf6] bg-[#8b5cf6]/10 border-[#8b5cf6]/20'
      }`}>
        {url ? 'URL' : 'HTML'}
      </span>
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────

export default function AnalysisDetail() {
  const { id }     = useParams<{ id: string }>();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const plan       = user?.plan ?? 'FREE';

  const [data,    setData]    = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // FREE plan erişimi engelle
  useEffect(() => {
    if (plan === 'FREE') { setLoading(false); return; }
    if (!id) { setError('Geçersiz analiz ID.'); setLoading(false); return; }

    api.get<AnalysisRecord>(`/api/analyze/history/${id}`)
      .then(res => setData(res.data))
      .catch(err => {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        setError(msg ?? 'Analiz yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [id, plan]);

  // FREE engel ekranı
  if (!loading && plan === 'FREE') {
    return (
      <div className="relative min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1e1e2e] border border-[#2a2a3e] flex items-center justify-center text-3xl">🔒</div>
          <h2 className="text-2xl font-bold text-white">Bu Özellik Kilitli</h2>
          <p className="text-gray-400 max-w-sm">Analiz geçmişi Starter ve Pro planlarda mevcuttur.</p>
          <Link to="/pricing" className="bg-[#a855f7] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#9333ea] transition-colors">
            Planları Gör
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3 text-gray-400">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Analiz yükleniyor...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="relative min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
          <div className="text-4xl">⚠️</div>
          <p className="text-red-400 font-medium">{error || 'Analiz bulunamadı.'}</p>
          <button
            onClick={() => navigate('/history')}
            className="btn-hover mt-2 px-5 py-2.5 rounded-xl bg-[#1e1e2e] border border-[#2a2a3e] text-gray-300 hover:text-white hover:border-[#00d4ff]/30"
          >
            ← Geçmişe Dön
          </button>
        </div>
      </div>
    );
  }

  // ── Verileri işle ─────────────────────────────────────────────────────────
  const allResults  = Array.isArray(data.results) ? data.results : [];
  const htmlResults = allResults.filter(r => !CSS_IDS.has(r.id));
  const cssResults  = allResults.filter(r => CSS_IDS.has(r.id));
  const htmlScore   = calcScore(htmlResults);
  const cssScore    = calcScore(cssResults);
  const totalScore  = data.score;

  const passedTotal = allResults.filter(r => r.passed).length;
  const label       = data.url
    ? data.url.replace(/^https?:\/\//, '').slice(0, 80)
    : 'HTML Analizi';
  const date = new Date(data.createdAt).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="relative min-h-screen">
      <Navbar />

      {/* Arka plan glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00d4ff]/4 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#8b5cf6]/4 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 pt-28 pb-20">

        {/* Üst bar — geri butonu + başlık */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <button
              onClick={() => navigate('/history')}
              className="btn-hover flex items-center gap-2 text-sm text-gray-400 hover:text-[#00d4ff] mb-3 px-2 py-1 rounded-lg group"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M8 3L4 7l4 4M4 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Geçmişe Dön
            </button>
            <h1 className="text-xl font-bold text-white truncate">{label}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{date}</p>
          </div>
          <ScorePill score={totalScore} />
        </div>

        {/* Özet kart */}
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 mb-8">
          <ScoreRing score={totalScore} size={150} />

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-bold text-white mb-1">Analiz Sonucu</h2>
            <p className="text-gray-400 text-sm mb-4">
              {passedTotal} / {allResults.length} kontrol başarılı
            </p>

            {/* Alt skorlar */}
            <div className="flex flex-wrap gap-3">
              <div className="px-3 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-center">
                <div className="text-[#00d4ff] font-bold text-lg">{htmlScore}</div>
                <div className="text-[10px] text-gray-500">HTML Skoru</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-center">
                <div className="text-[#8b5cf6] font-bold text-lg">{cssScore}</div>
                <div className="text-[10px] text-gray-500">CSS Skoru</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-center">
                <div className="text-gray-300 font-bold text-lg">{allResults.length}</div>
                <div className="text-[10px] text-gray-500">Toplam Kontrol</div>
              </div>
            </div>
          </div>
        </div>

        {/* Analiz kaynağı bilgisi */}
        <UrlCard url={data.url} />


        {/* Sonuç kartları */}
        <div className="flex flex-col lg:flex-row gap-6">
          <ResultSection
            title="HTML Kontrolleri"
            score={htmlScore}
            results={htmlResults}
            accent="#00d4ff"
          />
          <ResultSection
            title="CSS Kontrolleri"
            score={cssScore}
            results={cssResults}
            accent="#8b5cf6"
          />
        </div>

      </main>
    </div>
  );
}

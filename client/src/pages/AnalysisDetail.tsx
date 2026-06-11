import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PourResults, { type AnalysisResultForPour } from '../components/PourResults';
import { downloadPdf } from '../lib/downloadPdf';
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

// CSS check ID'leri
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

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export default function AnalysisDetail() {
  const { id }   = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const plan     = (user?.plan ?? 'FREE') as 'FREE' | 'STARTER' | 'PRO';

  const [data,    setData]    = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

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

  // FREE engel
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

  // Sonuçları işle
  const allResults  = Array.isArray(data.results) ? data.results : [];
  const htmlResults = allResults.filter(r => !CSS_IDS.has(r.id));
  const cssResults  = allResults.filter(r => CSS_IDS.has(r.id));
  const htmlScore   = calcScore(htmlResults);
  const cssScore    = calcScore(cssResults);

  const pourResult: AnalysisResultForPour = {
    htmlScore,
    cssScore,
    totalScore: data.score,
    htmlResults,
    cssResults,
    tokensLeft: user?.tokens ?? 0,
    aiInsights: null,
  };

  const date = new Date(data.createdAt).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="relative min-h-screen">
      <Navbar />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00d4ff]/4 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#8b5cf6]/4 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 pt-28 pb-20">

        {/* Üst bar */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="min-w-0">
            <button
              onClick={() => navigate('/history')}
              className="btn-hover flex items-center gap-2 text-sm text-gray-400 hover:text-[#00d4ff] mb-2 px-2 py-1 rounded-lg group"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M8 3L4 7l4 4M4 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Geçmişe Dön
            </button>
            <h1 className="text-lg font-bold text-white truncate">
              {data.url ? data.url.replace(/^https?:\/\//, '').slice(0, 80) : 'HTML Analizi'}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">{date}</p>
          </div>
        </div>

        {/* PourResults — yeni tasarım */}
        <PourResults
          result={pourResult}
          plan={plan}
          previewOpen={false}
          onPreviewToggle={() => {}}
          onDownloadPdf={() => downloadPdf(pourResult)}
          onNewAnalysis={() => navigate('/analyze')}
        />

      </main>
    </div>
  );
}

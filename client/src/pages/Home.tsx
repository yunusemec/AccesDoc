import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { downloadPdf } from '../lib/downloadPdf';
import Navbar from '../components/Navbar';
import HtmlPreview from '../components/HtmlPreview';
import PourResults from '../components/PourResults';
import ChatWidget from '../components/ChatWidget';
import api from '../lib/axios';

type Tab = 'url' | 'html' | 'file';

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

interface AnalysisResult {
  htmlScore: number;
  cssScore: number;
  totalScore: number;
  htmlResults: CheckResult[];
  cssResults: CheckResult[];
  tokensLeft: number;
  analysisId: string;
  originalHtml: string;
  fixedHtml: string;
  aiInsights: AiInsights | null;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, refreshUser } = useAuth();

  const [tab, setTab]         = useState<Tab>('url');
  const [urlInput, setUrlInput]   = useState('');
  const [htmlInput, setHtmlInput] = useState('');
  const [fileHtml, setFileHtml]   = useState('');
  const [fileName, setFileName]   = useState('');
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading]         = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult]           = useState<AnalysisResult | null>(null);
  const [error, setError]             = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── Dönen hero başlık ──────────────────────────────────────────────────
  const [heroIndex,   setHeroIndex]   = useState(0);
  const [heroVisible, setHeroVisible] = useState(true);

  const HERO_TITLES: [string, string][] = [
    ['Web Sitenizi',          'Analiz Edin'],
    ['Erişilebilirliği',      'Test Edin'],
    ['WCAG Uyumluluğunu',     'Ölçün'],
    ['Engelli Kullanıcılara', 'Kapı Açın'],
    ['Sitenizi Herkes İçin',  'Erişilebilir Yapın'],
    ['Dijital Kapsayıcılığı', 'Artırın'],
  ];

  const LOADING_MESSAGES = [
    '🌐 Sayfa yükleniyor...',
    '🔍 HTML yapısı analiz ediliyor...',
    '🎨 CSS stilleri kontrol ediliyor...',
    '⌨️ Klavye erişimi test ediliyor...',
    '👁️ Görsel kontrast ölçülüyor...',
    '📱 Mobil uyumluluk kontrol ediliyor...',
    '🤖 AI yorumu hazırlanıyor...',
  ];

  useEffect(() => {
    if (!loading) { setLoadingStep(0); return; }
    const timer = setInterval(() => {
      setLoadingStep((s) => (s + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    const iv = setInterval(() => {
      setHeroVisible(false);
      setTimeout(() => {
        setHeroIndex(i => (i + 1) % HERO_TITLES.length);
        setHeroVisible(true);
      }, 380);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const tokens = user?.tokens ?? 0;

  function readFile(file: File) {
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setError('Lütfen bir .html dosyası seçin.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => { setFileHtml(e.target?.result as string); setFileName(file.name); setError(''); };
    reader.readAsText(file);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) readFile(e.target.files[0]);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files?.[0]) readFile(e.dataTransfer.files[0]);
  }

  async function handleAnalyze() {
    setError(''); setResult(null); setPreviewOpen(false);

    let type: 'url' | 'html';
    let content: string;

    if (tab === 'url') {
      if (!urlInput.trim()) { setError('Lütfen bir URL girin.'); return; }
      type = 'url'; content = urlInput.trim();
    } else if (tab === 'html') {
      if (!htmlInput.trim()) { setError('Lütfen HTML kod yapıştırın.'); return; }
      type = 'html'; content = htmlInput.trim();
    } else {
      if (!fileHtml) { setError('Lütfen bir HTML dosyası yükleyin.'); return; }
      type = 'html'; content = fileHtml;
    }

    setLoading(true);
    try {
      const res = await api.post<AnalysisResult>('/api/analyze', { type, content });
      setResult(res.data);
      await refreshUser();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Analiz sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  const inputTabs: { key: Tab; label: string }[] = [
    { key: 'url',  label: 'URL Gir' },
    { key: 'html', label: 'HTML Yapıştır' },
    { key: 'file', label: 'Dosya Yükle' },
  ];

  return (
    <div className="relative min-h-screen">
      <Navbar />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00d4ff]/4 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-[#8b5cf6]/4 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 pt-28 pb-20">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            WCAG 2.1 AA Uyumlu Analiz
          </div>
          <div className="mb-3" style={{ minHeight: '4rem' }}>
            <h1
              className="text-4xl sm:text-5xl font-bold text-white tracking-tight transition-opacity duration-[380ms] ease-in-out"
              style={{ opacity: heroVisible ? 1 : 0 }}
            >
              {HERO_TITLES[heroIndex][0]}{' '}
              <span className="text-[#00d4ff]" style={{ textShadow: '0 0 30px rgba(0,212,255,0.4)' }}>
                {HERO_TITLES[heroIndex][1]}
              </span>
            </h1>
          </div>

          {/* PRO banner */}
          {user?.plan === 'PRO' && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3"
              style={{ boxShadow: '0 0 16px rgba(245,158,11,0.15)' }}>
              ⚜ Pro Plan — Sınırsız Analiz &amp; Tam WCAG 2.1 Kontrolü
            </div>
          )}

          <p className="text-gray-400 text-base max-w-lg mx-auto">
            50 WCAG 2.1 kriteri ile sitenizi tarayın, sorunları tespit edin ve çözüm önerileri alın.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>

          {/* Input tabs */}
          <div className="flex gap-1 p-1 bg-[#0a0a0f] rounded-xl mb-5">
            {inputTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setError(''); }}
                className={`btn-hover flex-1 py-2 rounded-lg text-sm font-medium ${
                  tab === t.key
                    ? 'bg-[#1e1e2e] text-white shadow border-b-2 border-[#00d4ff]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'url' && (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6.5 9.5l3-3M5.5 7l-1.5 1.5a3 3 0 004.243 4.243L9.75 11.25M10.5 9l1.5-1.5A3 3 0 007.757 3.257L6.25 4.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                placeholder="https://example.com"
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all font-mono"
              />
            </div>
          )}

          {tab === 'html' && (
            <textarea
              value={htmlInput} onChange={(e) => setHtmlInput(e.target.value)}
              placeholder={'<html>\n  <body>\n    <!-- HTML kodunuzu buraya yapıştırın -->\n  </body>\n</html>'}
              rows={10}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all font-mono resize-y"
            />
          )}

          {tab === 'file' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                dragging ? 'border-[#00d4ff] bg-[#00d4ff]/5'
                : fileName ? 'border-[#39ff14]/40 bg-[#39ff14]/5'
                : 'border-[#1e1e2e] hover:border-[#00d4ff]/40'
              }`}
            >
              <input ref={fileRef} type="file" accept=".html,.htm" className="hidden" onChange={onFileChange} />
              {fileName ? (
                <div>
                  <div className="text-[#39ff14] text-3xl mb-2">✓</div>
                  <p className="text-white font-medium text-sm">{fileName}</p>
                  <p className="text-gray-500 text-xs mt-1">Değiştirmek için tıklayın</p>
                </div>
              ) : (
                <div>
                  <div className="text-gray-600 text-4xl mb-3">📄</div>
                  <p className="text-gray-400 text-sm font-medium">HTML dosyanızı sürükleyin veya tıklayın</p>
                  <p className="text-gray-600 text-xs mt-1">.html, .htm desteklenir</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {tokens === 0 && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-sm text-center">
              Token yok — Premium'a geçerek devam edebilirsiniz.
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || tokens === 0}
            className="btn-hover mt-4 w-full py-3 rounded-xl font-bold text-black text-base disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #0099bb)',
              boxShadow: loading ? 'none' : '0 0 30px rgba(0,212,255,0.3)',
            }}
            onMouseEnter={e => { if (!loading && tokens > 0) (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 45px rgba(0,212,255,0.55)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? 'none' : '0 0 30px rgba(0,212,255,0.3)'; }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin-slow w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {LOADING_MESSAGES[loadingStep]}
              </span>
            ) : tokens === 0 ? "Token yok, Premium'a geç" : 'Analiz Et'}
          </button>
        </div>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        {result && (
          <>
            <PourResults
              result={result}
              plan={(user?.plan ?? 'FREE') as 'FREE' | 'STARTER' | 'PRO'}
              previewOpen={previewOpen}
              onPreviewToggle={() => setPreviewOpen(v => !v)}
              onDownloadPdf={() => downloadPdf(result)}
              onNewAnalysis={() => {
                setResult(null);
                setPreviewOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* HTML Önizleme — kontrol kartlarının altında, değişmeden */}
            {previewOpen && (
              <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 mt-4">
                <HtmlPreview
                  originalHtml={result.originalHtml}
                  fixedHtml={result.fixedHtml}
                  plan={(user?.plan ?? 'FREE') as 'FREE' | 'STARTER' | 'PRO'}
                />
              </div>
            )}
          </>
        )}
      </main>

      <ChatWidget analysisId={result?.analysisId} />
    </div>
  );
}

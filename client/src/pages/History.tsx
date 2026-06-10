import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../lib/axios';

interface AnalysisRow {
  id: string;
  url: string | null;
  htmlSnippet: string | null;
  score: number;
  results: unknown[];
  createdAt: string;
}

const PAGE_SIZE = 10;   // sayfa başına kayıt
const MAX_ROWS  = 50;   // toplam max gösterim

// ── Skor pill ─────────────────────────────────────────────────────────────────
function ScorePill({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14]/20' :
    score >= 50 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-red-400   bg-red-500/10   border-red-500/20';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      {score}
    </span>
  );
}

// ── Google-style pagination ───────────────────────────────────────────────────
function Pagination({
  page, totalPages, onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Görünecek sayfa numaraları: maks 5 adet, ortada bulunulan sayfa
  const buildPages = () => {
    const pages: number[] = [];
    const half = 2;
    let start = Math.max(1, page - half);
    let end   = Math.min(totalPages, page + half);
    if (end - start < 4) {
      if (start === 1) end   = Math.min(totalPages, start + 4);
      else              start = Math.max(1, end - 4);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const pages = buildPages();

  const btnBase = 'btn-hover w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all';
  const btnActive = 'bg-[#00d4ff] text-[#0a0a0f] font-bold';
  const btnIdle   = 'text-gray-400 hover:text-white border border-[#1e1e2e] hover:border-[#00d4ff]/40';
  const btnDisabled = 'text-gray-700 border border-[#1e1e2e] opacity-40 cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-1 mt-8">

      {/* Önceki */}
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={`${btnBase} ${page === 1 ? btnDisabled : btnIdle}`}
        aria-label="Önceki sayfa"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M8 3L4 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* İlk sayfa + ellipsis */}
      {pages[0] > 1 && (
        <>
          <button onClick={() => onChange(1)} className={`${btnBase} ${btnIdle}`}>1</button>
          {pages[0] > 2 && <span className="text-gray-600 px-1 text-sm">…</span>}
        </>
      )}

      {/* Sayfa numaraları */}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`${btnBase} ${p === page ? btnActive : btnIdle}`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}

      {/* Son sayfa + ellipsis */}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="text-gray-600 px-1 text-sm">…</span>
          )}
          <button onClick={() => onChange(totalPages)} className={`${btnBase} ${btnIdle}`}>
            {totalPages}
          </button>
        </>
      )}

      {/* Sonraki */}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={`${btnBase} ${page === totalPages ? btnDisabled : btnIdle}`}
        aria-label="Sonraki sayfa"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M6 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────
export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const plan = user?.plan ?? 'FREE';

  const [rows,    setRows]    = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [page,    setPage]    = useState(1);

  useEffect(() => {
    if (plan === 'FREE') { setLoading(false); return; }
    api.get<AnalysisRow[]>('/api/analyze/history')
      .then((res) => setRows(res.data.slice(0, MAX_ROWS)))
      .catch(() => setError('Geçmiş yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [plan]);

  // Sayfa değişince en üste çık
  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages  = Math.ceil(rows.length / PAGE_SIZE);
  const pageRows    = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const globalStart = (page - 1) * PAGE_SIZE; // bu sayfanın global başlangıç indeksi

  // FREE engel ekranı
  if (plan === 'FREE') {
    return (
      <div className="relative min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1e1e2e] border border-[#2a2a3e] flex items-center justify-center text-3xl">🔒</div>
          <h2 className="text-2xl font-bold text-white">Bu Özellik Kilitli</h2>
          <p className="text-gray-400 max-w-sm">
            Analiz geçmişi Starter ve Pro planlarda mevcuttur. Planınızı yükselterek tüm analizlerinize erişin.
          </p>
          <Link to="/pricing" className="btn-hover bg-[#a855f7] text-white font-semibold px-8 py-3 rounded-xl hover:bg-[#9333ea]">
            Planları Gör
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00d4ff]/4 rounded-full blur-3xl" />
      </div>

      <main className="relative max-w-4xl mx-auto px-4 pt-28 pb-20">

        {/* ── Header: sol = Yeni Analiz, sağ = başlık ── */}
        <div className="flex items-center justify-between mb-8 gap-4">

          {/* Sol — Yeni Analiz butonu */}
          <Link
            to="/"
            className="btn-hover flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#1e1e2e] text-sm font-medium text-gray-300 hover:text-white hover:border-[#00d4ff]/40 flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Yeni Analiz
          </Link>

          {/* Sağ — Başlık */}
          <div className="text-right">
            <h1 className="text-2xl font-bold text-white">Analiz Geçmişi</h1>
            {!loading && !error && rows.length > 0 && (
              <p className="text-gray-500 text-sm mt-0.5">
                {rows.length === MAX_ROWS ? `Son ${MAX_ROWS} analiz` : `${rows.length} analiz`}
                {totalPages > 1 && (
                  <span className="text-gray-600"> · Sayfa {page}/{totalPages}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* ── İçerik ── */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-gray-500">
            <svg className="animate-spin-slow w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Yükleniyor...
          </div>
        ) : error ? (
          <div className="text-center py-24 text-red-400">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-gray-400 font-medium">Henüz analiz yapmadınız.</p>
            <Link to="/" className="inline-block mt-4 text-[#00d4ff] text-sm hover:underline">
              İlk analizinizi yapın →
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {pageRows.map((row, idx) => {
                const allResults = Array.isArray(row.results) ? row.results as { passed: boolean }[] : [];
                const passed  = allResults.filter((r) => r.passed).length;
                const total   = allResults.length;
                const rowNum  = globalStart + idx + 1;   // 1-bazlı global numara
                const label   = row.url ? row.url : row.htmlSnippet ? 'HTML Snippet' : 'Doğrudan HTML';
                const display = row.url
                  ? row.url.replace(/^https?:\/\//, '').slice(0, 60)
                  : row.htmlSnippet
                    ? row.htmlSnippet.slice(0, 60).replace(/\s+/g, ' ') + '...'
                    : 'HTML Analizi';

                return (
                  <button
                    key={row.id}
                    onClick={() => navigate(`/history/${row.id}`)}
                    className="btn-hover w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#00d4ff]/30 hover:bg-[#14141f] text-left group"
                  >
                    {/* Numara */}
                    <span className="w-6 text-xs font-mono text-gray-600 flex-shrink-0 text-right leading-none">
                      {rowNum}
                    </span>

                    {/* Tip ikonu */}
                    <div className="w-9 h-9 rounded-lg bg-[#1e1e2e] flex items-center justify-center flex-shrink-0 text-sm">
                      {row.url ? '🌐' : '📄'}
                    </div>

                    {/* İçerik */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate group-hover:text-[#00d4ff] transition-colors">
                        {display}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(row.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {' · '}
                        <span className={label === 'HTML Snippet' || label === 'Doğrudan HTML' ? 'text-[#8b5cf6]' : 'text-[#00d4ff]'}>
                          {row.url ? 'URL' : 'HTML'}
                        </span>
                      </p>
                    </div>

                    {/* Kontrol sayısı */}
                    <div className="hidden sm:flex flex-col items-center">
                      <span className="text-xs text-gray-500">{passed}/{total}</span>
                      <span className="text-[10px] text-gray-600">kontrol</span>
                    </div>

                    {/* Skor */}
                    <ScorePill score={row.score} />

                    {/* Ok */}
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-gray-600 group-hover:text-[#00d4ff] transition-colors flex-shrink-0">
                      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Pagination */}
            <Pagination page={page} totalPages={totalPages} onChange={handlePageChange} />

            {/* Alt bilgi */}
            {rows.length === MAX_ROWS && (
              <p className="text-center text-xs text-gray-600 mt-4">
                En fazla son {MAX_ROWS} analiz gösterilmektedir.
              </p>
            )}
          </>
        )}

      </main>
    </div>
  );
}

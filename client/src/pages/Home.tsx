import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { jsPDF } from 'jspdf';
import { useAuth } from '../context/AuthContext';
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

// ── WCAG referans haritası ────────────────────────────────────────────────────

const WCAG_REFS: Record<string, string> = {
  alt_text:            'WCAG 1.1.1 — Non-text Content (Level A)',
  heading_hierarchy:   'WCAG 1.3.1 — Info and Relationships (Level A)',
  form_labels:         'WCAG 1.3.1, 3.3.2 — Labels or Instructions (Level A)',
  font_size:           'WCAG 1.4.4 — Resize Text (Level AA)',
  contrast:            'WCAG 1.4.3 — Contrast (Minimum) (Level AA)',
  lang_attribute:      'WCAG 3.1.1 — Language of Page (Level A)',
  page_title:          'WCAG 2.4.2 — Page Titled (Level A)',
  empty_buttons_links: 'WCAG 4.1.2 — Name, Role, Value (Level A)',
  viewport_meta:       'WCAG 1.4.4 — Resize Text (Level AA)',
  tabindex:            'WCAG 2.1.1 — Keyboard (Level A)',
  aria_references:     'WCAG 4.1.1 — Parsing (Level A)',
  skip_navigation:     'WCAG 2.4.1 — Bypass Blocks (Level A)',
  input_types:         'WCAG 1.3.5 — Identify Input Purpose (Level AA)',
  table_accessibility: 'WCAG 1.3.1 — Info and Relationships (Level A)',
  autoplay_media:      'WCAG 1.4.2 — Audio Control (Level A)',
  css_accessibility:   'WCAG 1.4.3, 1.4.4, 2.1.1 — CSS Accessibility',
};

// ── PDF raporu ────────────────────────────────────────────────────────────────

// POUR haritası (PDF için yerel kopya)
const POUR_MAP_PDF: Record<string, 'P' | 'O' | 'U' | 'R'> = {
  alt_text:'P', heading_hierarchy:'P', form_labels:'P', css_font_size:'P',
  font_size:'P', css_contrast:'P', contrast:'P', viewport_meta:'P',
  input_types:'P', table_accessibility:'P', autoplay_media:'P',
  css_line_height:'P', css_letter_spacing:'P', non_text_contrast_css:'P', css_reflow:'P',
  tabindex:'O', skip_navigation:'O', page_title:'O', css_focus_outline:'O',
  css_cursor:'O', touch_target:'O', focus_order:'O', link_purpose:'O',
  multiple_ways:'O', headings_labels:'O', css_animation:'O',
  lang_attribute:'U', input_assistance:'U', error_prevention:'U',
  consistent_nav:'U', consistent_id:'U',
  empty_buttons_links:'R', aria_references:'R', css_display_none:'R', css_visibility:'R',
};

const POUR_CATS_PDF = [
  { key: 'P' as const, label: 'Algilanabilirlik (Perceivable)',    rgb: [2,132,199]   as [number,number,number] },
  { key: 'O' as const, label: 'Kullanilabilirlik (Operable)',      rgb: [22,163,74]   as [number,number,number] },
  { key: 'U' as const, label: 'Anlasılabilirlik (Understandable)', rgb: [202,138,4]   as [number,number,number] },
  { key: 'R' as const, label: 'Saglamlik (Robust)',                rgb: [109,40,217]  as [number,number,number] },
];

function downloadPdf(result: AnalysisResult) {
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = 297;
  const margin = 16;
  const cW     = pageW - margin * 2;
  let y        = 0;
  let pageNum  = 1;

  // ── Türkçe → ASCII dönüşümü ───────────────────────────────────────
  const tr = (s: string) => s
    .replace(/ğ/g,'g').replace(/Ğ/g,'G')
    .replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/ş/g,'s').replace(/Ş/g,'S')
    .replace(/ı/g,'i').replace(/İ/g,'I')
    .replace(/ö/g,'o').replace(/Ö/g,'O')
    .replace(/ç/g,'c').replace(/Ç/g,'C');

  // ── Yardımcılar ───────────────────────────────────────────────────
  const scoreRgb = (s: number): [number,number,number] =>
    s >= 75 ? [22,163,74] : s >= 50 ? [202,138,4] : [220,38,38];

  const pageFooter = () => {
    doc.setDrawColor(203,213,225);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
    doc.setTextColor(160,174,192);
    doc.setFontSize(6.5);
    doc.setFont('helvetica','normal');
    doc.text('AccessiScan — WCAG 2.1 AA Raporu — accessiscan.com', margin, pageH - 6);
    doc.text(`Sayfa ${pageNum}`, pageW - margin, pageH - 6, { align: 'right' });
  };

  const newPage = () => {
    pageFooter();
    doc.addPage();
    pageNum++;
    doc.setFillColor(255,255,255);
    doc.rect(0, 0, pageW, pageH, 'F');
    // Mini header şeridi
    doc.setFillColor(12,74,110);
    doc.rect(0, 0, pageW, 9, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(6.5); doc.setFont('helvetica','bold');
    doc.text('AccessiScan', margin, 6.5);
    doc.setFont('helvetica','normal');
    doc.setTextColor(186,230,253);
    doc.text('Web Erisebilirlik Raporu', pageW / 2, 6.5, { align: 'center' });
    y = 16;
  };

  const checkY = (needed: number) => { if (y + needed > pageH - 18) newPage(); };

  // ══════════════════════════════════════════════════
  // SAYFA 1 — Özet
  // ══════════════════════════════════════════════════
  doc.setFillColor(255,255,255);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Başlık bandı
  doc.setFillColor(12,74,110);
  doc.rect(0, 0, pageW, 40, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(22); doc.setFont('helvetica','bold');
  doc.text('AccessiScan', margin, 17);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.setTextColor(186,230,253);
  doc.text('Web Erisebilirlik Raporu  |  WCAG 2.1 AA', margin, 25);
  const now = new Date();
  doc.text(tr(`Olusturulma: ${now.toLocaleDateString('tr-TR',{ year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}`), margin, 33);

  y = 50;

  // ── 3 skor kutusu yan yana ────────────────────────────────────────
  const boxH  = 32;
  const boxW3 = cW / 3 - 3;

  const scores = [
    { label: 'TOPLAM SKOR', val: result.totalScore,  rgb: scoreRgb(result.totalScore)  },
    { label: 'HTML SKORU',  val: result.htmlScore,    rgb: scoreRgb(result.htmlScore)   },
    { label: 'CSS SKORU',   val: result.cssScore,     rgb: scoreRgb(result.cssScore)    },
  ];

  scores.forEach((s, i) => {
    const bx = margin + i * (boxW3 + 4.5);
    doc.setFillColor(248,250,252);
    doc.setDrawColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setLineWidth(0.7);
    doc.roundedRect(bx, y, boxW3, boxH, 3, 3, 'FD');

    // Daire çizgisi (dekoratif)
    doc.setDrawColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setLineWidth(1.5);
    doc.circle(bx + boxW3 / 2, y + 13, 9, 'S');

    // Skor değeri
    doc.setTextColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setFontSize(12); doc.setFont('helvetica','bold');
    doc.text(`${s.val}`, bx + boxW3 / 2, y + 15.5, { align: 'center' });

    // /100 ve etiket
    doc.setFontSize(6); doc.setTextColor(100,116,139); doc.setFont('helvetica','normal');
    doc.text('/100', bx + boxW3 / 2, y + 21, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.setTextColor(50,65,80);
    doc.text(s.label, bx + boxW3 / 2, y + 29, { align: 'center' });
  });

  y += boxH + 8;

  // ── İstatistik satırı ─────────────────────────────────────────────
  const allResults = [...result.htmlResults, ...result.cssResults];
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.length - totalPassed;
  const totalIssues = allResults.reduce((s, r) => s + r.issues.length, 0);
  const rate        = allResults.length > 0 ? Math.round((totalPassed / allResults.length) * 100) : 0;

  const stats = [
    { label: 'Gecti',         val: `${totalPassed}`, rgb: [22,163,74]   as [number,number,number] },
    { label: 'Basarisiz',     val: `${totalFailed}`, rgb: [220,38,38]   as [number,number,number] },
    { label: 'Toplam Sorun',  val: `${totalIssues}`, rgb: [202,138,4]   as [number,number,number] },
    { label: 'Basari Orani',  val: `%${rate}`,        rgb: [12,74,110]   as [number,number,number] },
  ];

  const statW = cW / 4 - 2;
  stats.forEach((st, i) => {
    const bx = margin + i * (statW + 2.7);
    doc.setFillColor(248,250,252);
    doc.setDrawColor(st.rgb[0], st.rgb[1], st.rgb[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(bx, y, statW, 16, 2, 2, 'FD');
    doc.setTextColor(st.rgb[0], st.rgb[1], st.rgb[2]);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text(st.val, bx + statW / 2, y + 8, { align: 'center' });
    doc.setFontSize(6); doc.setFont('helvetica','normal'); doc.setTextColor(100,116,139);
    doc.text(st.label, bx + statW / 2, y + 14, { align: 'center' });
  });

  y += 24;

  // ── AI Yorumu (varsa) ─────────────────────────────────────────────
  if (result.aiInsights) {
    const ai = result.aiInsights;
    checkY(20);

    doc.setFillColor(239,246,255);
    doc.setDrawColor(2,132,199);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, cW, 8, 2, 2, 'FD');
    doc.setTextColor(12,74,110); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text('AI Analiz Yorumu (Groq AI)', margin + 4, y + 5.5);
    y += 11;

    if (ai.scoreComment) {
      checkY(10);
      doc.setTextColor(2,132,199); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      const scLines = doc.splitTextToSize(tr(ai.scoreComment), cW - 4);
      doc.text(scLines, margin + 2, y);
      y += scLines.length * 4.8 + 2;
    }

    if (ai.criticalIssues.length > 0) {
      for (const item of ai.criticalIssues.slice(0, 3)) {
        checkY(14);
        doc.setFillColor(254,242,242);
        doc.setDrawColor(252,165,165);
        doc.setLineWidth(0.4);
        const issLines = doc.splitTextToSize(tr(item.issue), cW - 22);
        const solLines = doc.splitTextToSize(tr(item.solution), cW - 22);
        const blockH = 6 + (issLines.length + solLines.length) * 4.5;
        doc.roundedRect(margin, y, cW, blockH, 2, 2, 'FD');
        doc.setTextColor(185,28,28); doc.setFontSize(7); doc.setFont('helvetica','bold');
        doc.text('!', margin + 3.5, y + 4.5);
        doc.setTextColor(185,28,28); doc.setFont('helvetica','normal');
        doc.text(issLines, margin + 8, y + 4.5);
        doc.setTextColor(71,85,105);
        doc.text(solLines, margin + 8, y + 4.5 + issLines.length * 4.5);
        y += blockH + 3;
      }
    }

    if (ai.generalAdvice) {
      checkY(10);
      doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont('helvetica','normal');
      const advLines = doc.splitTextToSize(tr('Not: ' + ai.generalAdvice), cW - 4);
      doc.text(advLines, margin + 2, y);
      y += advLines.length * 4.5 + 4;
    }
  }

  // ── Sayfa 1 footer ────────────────────────────────────────────────
  pageFooter();

  // ══════════════════════════════════════════════════
  // SAYFA 2+ — POUR Kategorileri
  // ══════════════════════════════════════════════════

  // Grupla
  const grouped: Record<'P'|'O'|'U'|'R', typeof allResults> = { P:[], O:[], U:[], R:[] };
  for (const r of allResults) grouped[POUR_MAP_PDF[r.id] ?? 'R'].push(r);

  for (const cat of POUR_CATS_PDF) {
    const checks = grouped[cat.key];
    if (checks.length === 0) continue;

    const sorted = [...checks].sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? 1 : -1));
    const catPassed = checks.filter(c => c.passed).length;

    // Yeni sayfada başla
    newPage();

    // Kategori başlık bandı
    doc.setFillColor(cat.rgb[0], cat.rgb[1], cat.rgb[2]);
    doc.rect(margin, y, cW, 11, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(cat.label, margin + 4, y + 7.5);
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(`${catPassed}/${checks.length} gecti`, pageW - margin - 2, y + 7.5, { align: 'right' });
    y += 15;

    for (const r of sorted) {
      // Başlık satırı yüksekliğini hesapla
      const titleLines = doc.splitTextToSize(tr(r.title), cW - 52);
      const headerH = Math.max(10, titleLines.length * 4.8 + 4);
      checkY(headerH + 2);

      // Kart arka planı
      doc.setFillColor(r.passed ? 240 : 254, r.passed ? 253 : 242, r.passed ? 244 : 242);
      doc.setDrawColor(r.passed ? 187 : 252, r.passed ? 247 : 165, r.passed ? 208 : 165);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, cW, headerH, 2, 2, 'FD');

      // Durum badge
      doc.setFillColor(r.passed ? 22 : 220, r.passed ? 163 : 38, r.passed ? 74 : 38);
      doc.roundedRect(margin + 2, y + (headerH - 6) / 2, 13, 6, 1, 1, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(6); doc.setFont('helvetica','bold');
      doc.text(r.passed ? 'GECTI' : 'HATALI', margin + 3, y + (headerH - 6) / 2 + 4.3);

      // WCAG kodu + level
      const codeMatch = r.wcag?.match(/(\d+\.\d+\.\d+)/);
      const wcagCode  = codeMatch?.[1] ?? (WCAG_REFS[r.id]?.match(/(\d+\.\d+\.\d+)/)?.[1] ?? '');
      doc.setTextColor(100,116,139); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      if (wcagCode) doc.text(wcagCode, margin + 17, y + (headerH - 6) / 2 + 2);
      if (r.level)  doc.text(r.level,  margin + 17, y + (headerH - 6) / 2 + 6.5);

      // Başlık
      doc.setTextColor(26,26,26); doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text(titleLines, margin + 33, y + (titleLines.length > 1 ? 4.5 : (headerH + 1) / 2));

      // Puan
      doc.setTextColor(100,116,139); doc.setFontSize(7);
      doc.text(`${r.score}/${r.maxScore}`, pageW - margin - 2, y + (headerH + 1) / 2, { align: 'right' });

      y += headerH + 2;

      // Sorunlar
      if (!r.passed && r.issues.length > 0) {
        for (const issue of r.issues.slice(0, 3)) {
          checkY(6);
          doc.setTextColor(185,28,28); doc.setFontSize(7); doc.setFont('helvetica','normal');
          const lines = doc.splitTextToSize(tr(`  * ${issue}`), cW - 6);
          doc.text(lines, margin + 3, y);
          y += lines.length * 4.5;
        }
      }

      // Öneri
      if (!r.passed && r.suggestions.length > 0) {
        checkY(6);
        doc.setTextColor(3,105,161); doc.setFontSize(7);
        const lines = doc.splitTextToSize(tr(`  > Oneri: ${r.suggestions[0]}`), cW - 6);
        doc.text(lines, margin + 3, y);
        y += lines.length * 4.5;
      }

      y += 2;
    }
  }

  // Son sayfa footer
  pageFooter();

  doc.save(`accessiscan-rapor-${new Date().toISOString().slice(0, 10)}.pdf`);
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

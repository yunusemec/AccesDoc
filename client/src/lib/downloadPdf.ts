import { jsPDF } from 'jspdf';

export interface PdfCheckResult {
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

export interface PdfInput {
  htmlScore: number;
  cssScore: number;
  totalScore: number;
  htmlResults: PdfCheckResult[];
  cssResults: PdfCheckResult[];
  aiInsights: { criticalIssues: { issue: string; solution: string }[]; scoreComment: string; generalAdvice: string } | null;
}

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
};

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

export function downloadPdf(result: PdfInput) {
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW  = doc.internal.pageSize.getWidth();
  const pageH  = 297;
  const margin = 16;
  const cW     = pageW - margin * 2;
  let y        = 0;
  let pageNum  = 1;

  const tr = (s: string) => s
    .replace(/ğ/g,'g').replace(/Ğ/g,'G')
    .replace(/ü/g,'u').replace(/Ü/g,'U')
    .replace(/ş/g,'s').replace(/Ş/g,'S')
    .replace(/ı/g,'i').replace(/İ/g,'I')
    .replace(/ö/g,'o').replace(/Ö/g,'O')
    .replace(/ç/g,'c').replace(/Ç/g,'C');

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

  doc.setFillColor(255,255,255);
  doc.rect(0, 0, pageW, pageH, 'F');
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
    doc.setDrawColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setLineWidth(1.5);
    doc.circle(bx + boxW3 / 2, y + 13, 9, 'S');
    doc.setTextColor(s.rgb[0], s.rgb[1], s.rgb[2]);
    doc.setFontSize(12); doc.setFont('helvetica','bold');
    doc.text(`${s.val}`, bx + boxW3 / 2, y + 15.5, { align: 'center' });
    doc.setFontSize(6); doc.setTextColor(100,116,139); doc.setFont('helvetica','normal');
    doc.text('/100', bx + boxW3 / 2, y + 21, { align: 'center' });
    doc.setFontSize(7); doc.setFont('helvetica','bold');
    doc.setTextColor(50,65,80);
    doc.text(s.label, bx + boxW3 / 2, y + 29, { align: 'center' });
  });
  y += boxH + 8;

  const allResults = [...result.htmlResults, ...result.cssResults];
  const totalPassed = allResults.filter(r => r.passed).length;
  const totalFailed = allResults.length - totalPassed;
  const totalIssues = allResults.reduce((s, r) => s + r.issues.length, 0);
  const rate        = allResults.length > 0 ? Math.round((totalPassed / allResults.length) * 100) : 0;
  const stats = [
    { label: 'Gecti',        val: `${totalPassed}`, rgb: [22,163,74]  as [number,number,number] },
    { label: 'Basarisiz',    val: `${totalFailed}`, rgb: [220,38,38]  as [number,number,number] },
    { label: 'Toplam Sorun', val: `${totalIssues}`, rgb: [202,138,4]  as [number,number,number] },
    { label: 'Basari Orani', val: `%${rate}`,        rgb: [12,74,110]  as [number,number,number] },
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

  if (result.aiInsights) {
    const ai = result.aiInsights;
    checkY(20);
    doc.setFillColor(239,246,255);
    doc.setDrawColor(2,132,199);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, cW, 8, 2, 2, 'FD');
    doc.setTextColor(12,74,110); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text('AI Analiz Yorumu', margin + 4, y + 5.5);
    y += 11;
    if (ai.scoreComment) {
      checkY(10);
      doc.setTextColor(2,132,199); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      const scLines = doc.splitTextToSize(tr(ai.scoreComment), cW - 4);
      doc.text(scLines, margin + 2, y);
      y += scLines.length * 4.8 + 2;
    }
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
      doc.setFont('helvetica','normal');
      doc.text(issLines, margin + 8, y + 4.5);
      doc.setTextColor(71,85,105);
      doc.text(solLines, margin + 8, y + 4.5 + issLines.length * 4.5);
      y += blockH + 3;
    }
    if (ai.generalAdvice) {
      checkY(10);
      doc.setTextColor(100,116,139); doc.setFontSize(7); doc.setFont('helvetica','normal');
      const advLines = doc.splitTextToSize(tr('Not: ' + ai.generalAdvice), cW - 4);
      doc.text(advLines, margin + 2, y);
      y += advLines.length * 4.5 + 4;
    }
  }

  pageFooter();

  const grouped: Record<'P'|'O'|'U'|'R', typeof allResults> = { P:[], O:[], U:[], R:[] };
  for (const r of allResults) grouped[POUR_MAP_PDF[r.id] ?? 'R'].push(r);

  for (const cat of POUR_CATS_PDF) {
    const checks = grouped[cat.key];
    if (checks.length === 0) continue;
    const sorted = [...checks].sort((a, b) => (a.passed === b.passed ? 0 : a.passed ? 1 : -1));
    const catPassed = checks.filter(c => c.passed).length;
    newPage();
    doc.setFillColor(cat.rgb[0], cat.rgb[1], cat.rgb[2]);
    doc.rect(margin, y, cW, 11, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(cat.label, margin + 4, y + 7.5);
    doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(`${catPassed}/${checks.length} gecti`, pageW - margin - 2, y + 7.5, { align: 'right' });
    y += 15;
    for (const r of sorted) {
      const titleLines = doc.splitTextToSize(tr(r.title), cW - 52);
      const headerH = Math.max(10, titleLines.length * 4.8 + 4);
      checkY(headerH + 2);
      doc.setFillColor(r.passed ? 240 : 254, r.passed ? 253 : 242, r.passed ? 244 : 242);
      doc.setDrawColor(r.passed ? 187 : 252, r.passed ? 247 : 165, r.passed ? 208 : 165);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, cW, headerH, 2, 2, 'FD');
      doc.setFillColor(r.passed ? 22 : 220, r.passed ? 163 : 38, r.passed ? 74 : 38);
      doc.roundedRect(margin + 2, y + (headerH - 6) / 2, 13, 6, 1, 1, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(6); doc.setFont('helvetica','bold');
      doc.text(r.passed ? 'GECTI' : 'HATALI', margin + 3, y + (headerH - 6) / 2 + 4.3);
      const codeMatch = r.wcag?.match(/(\d+\.\d+\.\d+)/);
      const wcagCode  = codeMatch?.[1] ?? (WCAG_REFS[r.id]?.match(/(\d+\.\d+\.\d+)/)?.[1] ?? '');
      doc.setTextColor(100,116,139); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
      if (wcagCode) doc.text(wcagCode, margin + 17, y + (headerH - 6) / 2 + 2);
      if (r.level)  doc.text(r.level,  margin + 17, y + (headerH - 6) / 2 + 6.5);
      doc.setTextColor(26,26,26); doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text(titleLines, margin + 33, y + (titleLines.length > 1 ? 4.5 : (headerH + 1) / 2));
      doc.setTextColor(100,116,139); doc.setFontSize(7);
      doc.text(`${r.score}/${r.maxScore}`, pageW - margin - 2, y + (headerH + 1) / 2, { align: 'right' });
      y += headerH + 2;
      if (!r.passed && r.issues.length > 0) {
        for (const issue of r.issues.slice(0, 3)) {
          checkY(6);
          doc.setTextColor(185,28,28); doc.setFontSize(7); doc.setFont('helvetica','normal');
          const lines = doc.splitTextToSize(tr(`  * ${issue}`), cW - 6);
          doc.text(lines, margin + 3, y);
          y += lines.length * 4.5;
        }
      }
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

  pageFooter();
  doc.save(`accessiscan-rapor-${new Date().toISOString().slice(0, 10)}.pdf`);
}

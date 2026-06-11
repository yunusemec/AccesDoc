import { useState } from 'react';

interface Props {
  originalHtml: string;
  fixedHtml: string;
  plan?: 'FREE' | 'STARTER' | 'PRO';
}

// ── Syntax Highlighter ────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colorTag(raw: string): string {
  const selfClose = raw.endsWith('/>');
  const inner = raw.slice(1, selfClose ? -2 : -1).trim();

  if (/^!DOCTYPE/i.test(inner)) {
    return `<span style="color:#a78bfa">&lt;${escHtml(inner)}&gt;</span>`;
  }

  const closing   = inner.startsWith('/');
  const nameMatch = inner.match(/^\/?([\w:-]+)/);
  if (!nameMatch) return escHtml(raw);

  const tagName = nameMatch[1];
  const rest    = inner.slice(nameMatch[0].length);

  const attrHtml = rest.replace(
    /(\s+)([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s/>]*)))?/g,
    (_, space, n, dq, sq, nq) => {
      const attrSpan = `<span style="color:#f59e0b">${n}</span>`;
      if (dq != null) return `${space}${attrSpan}=<span style="color:#86efac">&quot;${escHtml(dq)}&quot;</span>`;
      if (sq != null) return `${space}${attrSpan}=<span style="color:#86efac">'${escHtml(sq)}'</span>`;
      if (nq)         return `${space}${attrSpan}=<span style="color:#86efac">${escHtml(nq)}</span>`;
      return `${space}${attrSpan}`;
    },
  );

  const openBracket  = closing   ? '<span style="color:#60a5fa">&lt;/</span>' : '<span style="color:#60a5fa">&lt;</span>';
  const closeBracket = selfClose ? '<span style="color:#60a5fa">/&gt;</span>' : '<span style="color:#60a5fa">&gt;</span>';

  return `${openBracket}<span style="color:#f472b6">${tagName}</span>${attrHtml}${closeBracket}`;
}

function syntaxHighlight(code: string): string {
  const parts: string[] = [];
  const re = /(<!--[\s\S]*?-->|<[^>]*?>)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(code)) !== null) {
    if (m.index > last) parts.push(escHtml(code.slice(last, m.index)));
    const tok = m[1];
    if (tok.startsWith('<!--')) {
      parts.push(`<span style="color:#6b7280">${escHtml(tok)}</span>`);
    } else {
      parts.push(colorTag(tok));
    }
    last = m.index + tok.length;
  }
  if (last < code.length) parts.push(escHtml(code.slice(last)));
  return parts.join('');
}

// ── Yeni sekmede kod görünümü aç ──────────────────────────────────────────────

function openCodeWindow(html: string, title: string) {
  const lines   = html.split('\n');
  const numW    = String(lines.length).length;
  const highlighted = syntaxHighlight(html);
  const hlLines = highlighted.split('\n');

  const rows = hlLines.map((line, i) => {
    const num = String(i + 1).padStart(numW, ' ');
    return `<tr><td class="ln">${num}</td><td class="code">${line}</td></tr>`;
  }).join('');

  const page = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>${escHtml(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d0d17; color: #e2e8f0; font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace; font-size: 13px; line-height: 1.6; }
  .header { position: sticky; top: 0; background: #12121a; border-bottom: 1px solid #1e1e2e; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; z-index: 10; }
  .header-title { color: #9ca3af; font-size: 12px; }
  .header-meta  { color: #6b7280; font-size: 11px; }
  table { border-collapse: collapse; width: 100%; }
  td.ln   { color: #3d4a5c; text-align: right; padding: 0 16px 0 16px; user-select: none; white-space: pre; vertical-align: top; border-right: 1px solid #1a1a2e; }
  td.code { padding: 0 16px; white-space: pre; }
  tr:hover { background: rgba(255,255,255,0.03); }
</style>
</head>
<body>
<div class="header">
  <span class="header-title">🖥 ${escHtml(title)}</span>
  <span class="header-meta">${lines.length} satır · ${html.length.toLocaleString('tr-TR')} karakter</span>
</div>
<table><tbody>${rows}</tbody></table>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(page); w.document.close(); }
}

// ── Basit satır bazlı diff ────────────────────────────────────────────────────

interface DiffLine {
  type: 'add' | 'del' | 'eq';
  text: string;
  lineNum: number;
}

function computeDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  // LCS-based satır diff (basit O(n*m), makul boyutlar için)
  const a = oldLines;
  const b = newLines;
  const n = a.length;
  const m = b.length;

  // LCS length table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = 1 + dp[i + 1][j + 1];
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0, j = 0, lineNum = 1;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      result.push({ type: 'eq', text: a[i], lineNum: lineNum++ });
      i++; j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      result.push({ type: 'add', text: b[j], lineNum: lineNum++ });
      j++;
    } else {
      result.push({ type: 'del', text: a[i], lineNum: lineNum++ });
      i++;
    }
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

type TabKey = 'original' | 'fixed';

export default function HtmlPreview({ originalHtml, fixedHtml, plan = 'FREE' }: Props) {
  const canDownload = plan === 'STARTER' || plan === 'PRO';
  const canOpen     = plan === 'PRO';
  const [activeTab, setActiveTab] = useState<TabKey>('original');

  const highlightedOriginal = syntaxHighlight(originalHtml);
  const highlightedFixed    = syntaxHighlight(fixedHtml);

  // Diff — sadece fixed sekmesinde lazım, satır bazlı
  const diffLines = computeDiff(originalHtml.split('\n'), fixedHtml.split('\n'));
  const numW = String(diffLines.length).length;

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'original', label: 'Orijinal Kod',    icon: '</>' },
    { key: 'fixed',    label: 'Düzeltilmiş Kod', icon: '✅' },
  ];

  return (
    <div className="animate-fade-in w-full">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#0a0a0f] rounded-xl mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.key
                ? 'bg-[#1e1e2e] text-white shadow'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Orijinal Kod ────────────────────────────────────────────────── */}
      {activeTab === 'original' && (
        <div className="border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-500">Orijinal HTML Kodu</span>
            </div>
            <span className="text-[10px] text-gray-600">
              {originalHtml.split('\n').length} satır · {originalHtml.length.toLocaleString('tr-TR')} karakter
            </span>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', background: '#0d0d17' }}>
              <tbody>
                {highlightedOriginal.split('\n').map((line, i) => (
                  <tr key={i} style={{ verticalAlign: 'top' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ color: '#3d4a5c', textAlign: 'right', padding: '0 12px', userSelect: 'none', whiteSpace: 'pre', fontSize: 11, borderRight: '1px solid #1a1a2e', minWidth: 40, fontFamily: 'monospace', lineHeight: '1.6' }}>
                      {String(i + 1).padStart(String(highlightedOriginal.split('\n').length).length, ' ')}
                    </td>
                    <td style={{ padding: '0 16px', whiteSpace: 'pre', fontFamily: 'monospace', fontSize: 12, lineHeight: '1.6' }}
                        dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Düzeltilmiş Kod (diff görünümü) ─────────────────────────────── */}
      {activeTab === 'fixed' && (
        <div className="border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#39ff14]" />
              <span className="text-xs text-gray-500">AI ile Düzeltilmiş HTML Kodu</span>
              {/* Diff istatistik */}
              <span className="text-[10px] text-[#39ff14] bg-[#39ff14]/10 border border-[#39ff14]/20 px-1.5 py-0.5 rounded-full">
                +{diffLines.filter(d => d.type === 'add').length}
              </span>
              <span className="text-[10px] text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full">
                -{diffLines.filter(d => d.type === 'del').length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">
                {fixedHtml.split('\n').length} satır
              </span>

              {/* ↓ İndir */}
              {canDownload ? (
                <button
                  onClick={() => {
                    const blob = new Blob([fixedHtml], { type: 'text/html' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url; a.download = 'fixed.html'; a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                  }}
                  className="text-[10px] text-[#00d4ff] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 cursor-pointer"
                >
                  ↓ İndir
                </button>
              ) : (
                <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed" title="İndirme Starter ve Pro planlarda mevcut">
                  ↓ İndir 🔒
                </span>
              )}

              {/* ↗ Aç — kod görünümü */}
              {canOpen ? (
                <button
                  onClick={() => openCodeWindow(fixedHtml, 'AI ile Düzeltilmiş HTML')}
                  className="text-[10px] text-[#00d4ff] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 cursor-pointer"
                >
                  ↗ Aç
                </button>
              ) : (
                <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed" title="Tam ekranda açma Pro planda mevcut">
                  ↗ Aç 🔒
                </span>
              )}
            </div>
          </div>

          {/* Diff tablo */}
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', background: '#0d0d17' }}>
              <tbody>
                {diffLines.map((dl, idx) => {
                  const bg =
                    dl.type === 'add' ? '#0d2a0d' :
                    dl.type === 'del' ? '#2a0d0d' : 'transparent';
                  const prefix =
                    dl.type === 'add' ? <span style={{ color: '#4ade80' }}>+</span> :
                    dl.type === 'del' ? <span style={{ color: '#f87171' }}>-</span> :
                    <span style={{ color: '#374151' }}> </span>;
                  const textColor =
                    dl.type === 'add' ? '#86efac' :
                    dl.type === 'del' ? '#fca5a5' : undefined;
                  const highlighted = syntaxHighlight(dl.text);

                  return (
                    <tr key={idx} style={{ verticalAlign: 'top', background: bg }}>
                      {/* Satır numarası */}
                      <td style={{ color: '#3d4a5c', textAlign: 'right', padding: '0 8px', userSelect: 'none', whiteSpace: 'pre', fontSize: 11, borderRight: '1px solid #1a1a2e', minWidth: 36, fontFamily: 'monospace', lineHeight: '1.6' }}>
                        {dl.type !== 'del' ? String(dl.lineNum).padStart(numW, ' ') : ' '.repeat(numW)}
                      </td>
                      {/* +/- prefix */}
                      <td style={{ padding: '0 6px', fontFamily: 'monospace', fontSize: 12, lineHeight: '1.6', userSelect: 'none' }}>
                        {prefix}
                      </td>
                      {/* Kod */}
                      <td
                        style={{ padding: '0 12px 0 0', whiteSpace: 'pre', fontFamily: 'monospace', fontSize: 12, lineHeight: '1.6', color: textColor }}
                        dangerouslySetInnerHTML={{ __html: dl.type === 'eq' ? highlighted : escHtml(dl.text) }}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

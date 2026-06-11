import { useState, useMemo } from 'react';

interface Props {
  originalHtml: string;
  fixedHtml: string;
  plan?: 'FREE' | 'STARTER' | 'PRO';
}

// ── HTML escape ───────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Syntax Highlighter ────────────────────────────────────────────────────────

function colorTag(raw: string): string {
  const selfClose = raw.endsWith('/>');
  const inner     = raw.slice(1, selfClose ? -2 : -1).trim();

  if (/^!DOCTYPE/i.test(inner))
    return `<span style="color:#a78bfa">&lt;${escHtml(inner)}&gt;</span>`;

  const closing   = inner.startsWith('/');
  const nameMatch = inner.match(/^\/?([\w:-]+)/);
  if (!nameMatch) return escHtml(raw);

  const tagName  = nameMatch[1];
  const rest     = inner.slice(nameMatch[0].length);
  const attrHtml = rest.replace(
    /(\s+)([\w:-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s/>]*)))?/g,
    (_, space, n, dq, sq, nq) => {
      const a = `<span style="color:#f59e0b">${n}</span>`;
      if (dq != null) return `${space}${a}=<span style="color:#86efac">&quot;${escHtml(dq)}&quot;</span>`;
      if (sq != null) return `${space}${a}=<span style="color:#86efac">'${escHtml(sq)}'</span>`;
      if (nq)         return `${space}${a}=<span style="color:#86efac">${escHtml(nq)}</span>`;
      return `${space}${a}`;
    },
  );
  const ob = closing   ? '<span style="color:#60a5fa">&lt;/</span>' : '<span style="color:#60a5fa">&lt;</span>';
  const cb = selfClose ? '<span style="color:#60a5fa">/&gt;</span>' : '<span style="color:#60a5fa">&gt;</span>';
  return `${ob}<span style="color:#f472b6">${tagName}</span>${attrHtml}${cb}`;
}

function syntaxHighlight(code: string): string {
  const parts: string[] = [];
  const re = /(<!--[\s\S]*?-->|<[^>]*?>)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (m.index > last) parts.push(escHtml(code.slice(last, m.index)));
    const tok = m[1];
    parts.push(tok.startsWith('<!--')
      ? `<span style="color:#6b7280">${escHtml(tok)}</span>`
      : colorTag(tok));
    last = m.index + tok.length;
  }
  if (last < code.length) parts.push(escHtml(code.slice(last)));
  return parts.join('');
}

// ── Ortak sayfa şablonu ───────────────────────────────────────────────────────

const PAGE_STYLE = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#0a0a0f; color:#e2e8f0; font-family:'Fira Code','Cascadia Code',Consolas,monospace; font-size:13px; line-height:1.6; }
  .hdr { position:sticky; top:0; background:#12121a; border-bottom:1px solid #1e1e2e; padding:8px 16px; display:flex; justify-content:space-between; align-items:center; z-index:10; }
  .hdr-t { color:#9ca3af; font-size:12px; }
  .hdr-m { color:#6b7280; font-size:11px; }
  table { border-collapse:collapse; width:100%; }
  td.ln  { color:#3d4a5c; text-align:right; padding:0 12px; user-select:none; white-space:pre; vertical-align:top; border-right:1px solid #1a1a2e; min-width:40px; }
  td.pfx { padding:0 6px; user-select:none; vertical-align:top; }
  td.src { padding:0 12px; white-space:pre; vertical-align:top; }
  tr:hover { background:rgba(255,255,255,0.03); }
`;

// ── Orijinal kodu yeni sekmede aç ─────────────────────────────────────────────

function openOriginal(html: string) {
  const lines = html.split('\n');
  const numW  = String(lines.length).length;
  const rows  = lines.map((line, i) =>
    `<tr><td class="ln">${String(i + 1).padStart(numW, ' ')}</td><td class="src">${escHtml(line) || ' '}</td></tr>`
  ).join('');

  const page = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Orijinal HTML</title>
<style>${PAGE_STYLE}</style></head><body>
<div class="hdr"><span class="hdr-t">Orijinal HTML Kodu</span><span class="hdr-m">${lines.length} satır · ${html.length.toLocaleString('tr-TR')} karakter</span></div>
<table><tbody>${rows}</tbody></table></body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(page); w.document.close(); }
}

// ── Split diff'i yeni sekmede aç ──────────────────────────────────────────────

interface SplitRow {
  leftNum:   number | null;
  leftText:  string;
  leftType:  'del' | 'eq' | 'empty';
  rightNum:  number | null;
  rightText: string;
  rightType: 'add' | 'eq' | 'empty';
}

// Satır satır karşılaştırma: aynıysa eq, farklıysa del/add, kısa taraf boş satırla dolar
function computeSplitDiff(oldLines: string[], newLines: string[]): SplitRow[] {
  const maxLen = Math.max(oldLines.length, newLines.length);
  return Array.from({ length: maxLen }, (_, i) => {
    const hasL = i < oldLines.length;
    const hasR = i < newLines.length;
    const l    = hasL ? oldLines[i] : '';
    const r    = hasR ? newLines[i] : '';
    const same = hasL && hasR && l.trim() === r.trim();
    return {
      leftNum:   hasL ? i + 1 : null,
      leftText:  l,
      leftType:  !hasL ? 'empty' : same ? 'eq' : 'del',
      rightNum:  hasR ? i + 1 : null,
      rightText: r,
      rightType: !hasR ? 'empty' : same ? 'eq' : 'add',
    } satisfies SplitRow;
  });
}

function openSplitDiff(original: string, fixed: string) {
  const oldLines = original.split('\n');
  const newLines = fixed.split('\n');
  const rows     = computeSplitDiff(oldLines, newLines);
  const numW     = String(Math.max(oldLines.length, newLines.length)).length;

  const addedCount   = rows.filter(r => r.rightType === 'add').length;
  const deletedCount = rows.filter(r => r.leftType  === 'del').length;

  const leftRows = rows.map(r => {
    const bg  = r.leftType === 'del' ? '#2a0d0d' : 'transparent';
    const col = r.leftType === 'del' ? 'color:#fca5a5' : '';
    const pfx = r.leftType === 'del'
      ? `<span style="color:#f87171">-</span>`
      : `<span style="color:#374151"> </span>`;
    const txt = r.leftType === 'empty' ? '' : r.leftType === 'del'
      ? escHtml(r.leftText) : syntaxHighlight(r.leftText);
    const num = r.leftNum != null ? String(r.leftNum).padStart(numW, ' ') : ' '.repeat(numW);
    return `<tr style="background:${bg}">
      <td class="ln">${num}</td><td class="pfx">${pfx}</td>
      <td class="src" style="${col}">${txt || ' '}</td></tr>`;
  }).join('');

  const rightRows = rows.map(r => {
    const bg  = r.rightType === 'add' ? '#0d2a0d' : 'transparent';
    const col = r.rightType === 'add' ? 'color:#86efac' : '';
    const pfx = r.rightType === 'add'
      ? `<span style="color:#4ade80">+</span>`
      : `<span style="color:#374151"> </span>`;
    const txt = r.rightType === 'empty' ? '' : r.rightType === 'add'
      ? escHtml(r.rightText) : syntaxHighlight(r.rightText);
    const num = r.rightNum != null ? String(r.rightNum).padStart(numW, ' ') : ' '.repeat(numW);
    return `<tr style="background:${bg}">
      <td class="ln">${num}</td><td class="pfx">${pfx}</td>
      <td class="src" style="${col}">${txt || ' '}</td></tr>`;
  }).join('');

  const page = `<!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Diff Görünümü</title>
<style>
  ${PAGE_STYLE}
  html, body { height:100%; overflow:hidden; }
  .outer { display:flex; flex-direction:column; height:100%; }
  .panels { display:flex; flex-direction:row; flex:1; overflow:hidden; }
  .panel { flex:1; overflow:auto; }
  .panel-left { border-right:2px solid #0a0a0f; }
  .panel-hdr { position:sticky; top:0; background:#12121a; border-bottom:1px solid #1e1e2e; padding:4px 8px 4px 16px; font-size:11px; z-index:5; }
  .hdr-stats { display:flex; gap:8px; align-items:center; }
  .add-badge { color:#4ade80; background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.25); padding:1px 8px; border-radius:99px; font-size:11px; }
  .del-badge { color:#f87171; background:rgba(248,113,113,0.1); border:1px solid rgba(248,113,113,0.25); padding:1px 8px; border-radius:99px; font-size:11px; }
</style></head><body>
<div class="outer">
  <div class="hdr">
    <span class="hdr-t">Split Diff — Orijinal vs Düzeltilmiş</span>
    <div class="hdr-stats">
      <span class="add-badge">+${addedCount}</span>
      <span class="del-badge">-${deletedCount}</span>
      <span class="hdr-m">${rows.length} satır</span>
    </div>
  </div>
  <div class="panels">
    <div class="panel panel-left" id="pLeft">
      <div class="panel-hdr" style="color:#fca5a5">Orijinal — ${oldLines.length} satır</div>
      <table><tbody>${leftRows}</tbody></table>
    </div>
    <div class="panel" id="pRight">
      <div class="panel-hdr" style="color:#86efac">Düzeltilmiş — ${newLines.length} satır</div>
      <table><tbody>${rightRows}</tbody></table>
    </div>
  </div>
</div>
<script>
  const pL = document.getElementById('pLeft');
  const pR = document.getElementById('pRight');
  let lock = false;
  pL.addEventListener('scroll', () => { if (!lock) { lock = true; pR.scrollTop = pL.scrollTop; lock = false; } });
  pR.addEventListener('scroll', () => { if (!lock) { lock = true; pL.scrollTop = pR.scrollTop; lock = false; } });
</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(page); w.document.close(); }
}

// ── Component ─────────────────────────────────────────────────────────────────

type TabKey = 'original' | 'fixed';

export default function HtmlPreview({ originalHtml, fixedHtml, plan = 'FREE' }: Props) {
  const canDownload = plan === 'STARTER' || plan === 'PRO';
  const canOpen     = plan === 'PRO';
  const [activeTab, setActiveTab] = useState<TabKey>('original');

  const PREVIEW_LIMIT = 50;

  // Syntax highlight — sadece ilgili sekme aktifken hesapla
  const origLines = useMemo(() => syntaxHighlight(originalHtml).split('\n'), [originalHtml]);
  const origNumW  = String(origLines.length).length;
  const origPreview = origLines.slice(0, PREVIEW_LIMIT);
  const origExtra   = origLines.length - PREVIEW_LIMIT;

  const fixedLines = useMemo(
    () => activeTab === 'fixed' ? syntaxHighlight(fixedHtml).split('\n') : [],
    [activeTab, fixedHtml],
  );
  const fixedNumW   = String(fixedLines.length).length;
  const fixedPreview = fixedLines.slice(0, PREVIEW_LIMIT);
  const fixedExtra   = fixedLines.length - PREVIEW_LIMIT;

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

      {/* ── Orijinal Kod ─────────────────────────────────────────────────── */}
      {activeTab === 'original' && (
        <div className="border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-500">Orijinal HTML Kodu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">
                {origLines.length} satır · {originalHtml.length.toLocaleString('tr-TR')} karakter
              </span>
              {canOpen ? (
                <button
                  onClick={() => openOriginal(originalHtml)}
                  className="text-[10px] text-[#00d4ff] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#00d4ff]/30 hover:border-[#00d4ff]/60"
                >
                  ↗ Aç
                </button>
              ) : (
                <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed" title="Pro planda mevcut">
                  ↗ Aç 🔒
                </span>
              )}
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', background: '#0d0d17' }}>
              <tbody>
                {origPreview.map((line, i) => (
                  <tr key={i} style={{ verticalAlign: 'top' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ color: '#3d4a5c', textAlign: 'right', padding: '0 12px', userSelect: 'none', whiteSpace: 'pre', fontSize: 11, borderRight: '1px solid #1a1a2e', minWidth: 40, fontFamily: 'monospace', lineHeight: '1.6' }}>
                      {String(i + 1).padStart(origNumW, ' ')}
                    </td>
                    <td style={{ padding: '0 16px', whiteSpace: 'pre', fontFamily: 'monospace', fontSize: 12, lineHeight: '1.6' }}
                        dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                  </tr>
                ))}
              </tbody>
            </table>
            {origExtra > 0 && (
              <div className="px-4 py-2.5 text-xs text-gray-500 border-t border-[#1e1e2e]" style={{ background: '#0d0d17' }}>
                … ve <span className="text-gray-300 font-medium">{origExtra}</span> satır daha. Tamamını görmek için{' '}
                <button onClick={() => openOriginal(originalHtml)} className="text-[#00d4ff] hover:underline">Aç</button> butonuna tıklayın.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Düzeltilmiş Kod (syntax highlight, diff yok) ────────────────── */}
      {activeTab === 'fixed' && (
        <div className="border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#39ff14]" />
              <span className="text-xs text-gray-500">AI ile Düzeltilmiş HTML Kodu</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">
                {fixedLines.length} satır · {fixedHtml.length.toLocaleString('tr-TR')} karakter
              </span>

              {/* ↓ İndir */}
              {canDownload ? (
                <button
                  onClick={() => {
                    const blob = new Blob([fixedHtml], { type: 'text/plain' });
                    const url  = URL.createObjectURL(blob);
                    const a    = document.createElement('a');
                    a.href = url; a.download = 'accessiscan-fixed.html'; a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                  }}
                  className="text-[10px] text-[#00d4ff] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 cursor-pointer"
                >
                  ↓ İndir
                </button>
              ) : (
                <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed" title="Starter ve Pro planlarda mevcut">
                  ↓ İndir 🔒
                </span>
              )}

              {/* ↗ Aç — split diff (diff burada hesaplanır) */}
              {canOpen ? (
                <button
                  onClick={() => openSplitDiff(originalHtml, fixedHtml)}
                  className="text-[10px] text-[#00d4ff] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 cursor-pointer"
                >
                  ↗ Aç
                </button>
              ) : (
                <span className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed" title="Pro planda mevcut">
                  ↗ Aç 🔒
                </span>
              )}
            </div>
          </div>

          {/* Syntax highlighted preview, diff yok */}
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', background: '#0d0d17' }}>
              <tbody>
                {fixedPreview.map((line, i) => (
                  <tr key={i} style={{ verticalAlign: 'top' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ color: '#3d4a5c', textAlign: 'right', padding: '0 12px', userSelect: 'none', whiteSpace: 'pre', fontSize: 11, borderRight: '1px solid #1a1a2e', minWidth: 40, fontFamily: 'monospace', lineHeight: '1.6' }}>
                      {String(i + 1).padStart(fixedNumW, ' ')}
                    </td>
                    <td style={{ padding: '0 16px', whiteSpace: 'pre', fontFamily: 'monospace', fontSize: 12, lineHeight: '1.6' }}
                        dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                  </tr>
                ))}
              </tbody>
            </table>
            {fixedExtra > 0 && (
              <div className="px-4 py-2.5 text-xs text-gray-500 border-t border-[#1e1e2e]" style={{ background: '#0d0d17' }}>
                … ve <span className="text-gray-300 font-medium">{fixedExtra}</span> satır daha. Tamamını görmek için{' '}
                <button onClick={() => openSplitDiff(originalHtml, fixedHtml)} className="text-[#00d4ff] hover:underline">Aç</button> butonuna tıklayın.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const closing = inner.startsWith('/');
  const nameMatch = inner.match(/^\/?([\w:-]+)/);
  if (!nameMatch) return escHtml(raw);

  const tagName = nameMatch[1];
  const rest = inner.slice(nameMatch[0].length);

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
  const MAX = 40000;
  const src = code.length > MAX ? code.slice(0, MAX) + '\n\n… (çok uzun, kısaltıldı)' : code;

  const parts: string[] = [];
  const re = /(<!--[\s\S]*?-->|<[^>]*?>)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(src)) !== null) {
    if (m.index > last) parts.push(escHtml(src.slice(last, m.index)));
    const tok = m[1];
    if (tok.startsWith('<!--')) {
      parts.push(`<span style="color:#6b7280">${escHtml(tok)}</span>`);
    } else {
      parts.push(colorTag(tok));
    }
    last = m.index + tok.length;
  }
  if (last < src.length) parts.push(escHtml(src.slice(last)));
  return parts.join('');
}

// ── Component ─────────────────────────────────────────────────────────────────

type TabKey = 'original' | 'fixed';

export default function HtmlPreview({ originalHtml, fixedHtml, plan = 'FREE' }: Props) {
  const canDownload = plan === 'STARTER' || plan === 'PRO';
  const canOpen     = plan === 'PRO';
  const [activeTab, setActiveTab] = useState<TabKey>('original');

  const highlightedOriginal = syntaxHighlight(originalHtml);
  const highlightedFixed    = syntaxHighlight(fixedHtml);

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

      {/* Orijinal Kod */}
      {activeTab === 'original' && (
        <div className="border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-600" />
              <span className="text-xs text-gray-500">Orijinal HTML Kodu</span>
            </div>
            <span className="text-[10px] text-gray-600">
              {originalHtml.length.toLocaleString('tr-TR')} karakter
            </span>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '560px' }}>
            <pre
              className="text-[12px] leading-relaxed p-4 m-0 font-mono"
              style={{ background: '#0d0d17', tabSize: 2 }}
              dangerouslySetInnerHTML={{ __html: highlightedOriginal }}
            />
          </div>
        </div>
      )}

      {/* Düzeltilmiş Kod */}
      {activeTab === 'fixed' && (
        <div className="border border-[#1e1e2e] rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 py-2 bg-[#12121a] border-b border-[#1e1e2e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#39ff14]" />
              <span className="text-xs text-gray-500">AI ile Düzeltilmiş HTML Kodu</span>
              <span className="text-[10px] text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/20 px-1.5 py-0.5 rounded-full">
                Groq AI
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-600">
                {fixedHtml.length.toLocaleString('tr-TR')} karakter
              </span>

              {/* ↓ İndir — STARTER + PRO */}
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
                <span
                  className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed"
                  title="İndirme Starter ve Pro planlarda mevcut"
                >
                  ↓ İndir 🔒
                </span>
              )}

              {/* ↗ Aç — sadece PRO */}
              {canOpen ? (
                <button
                  onClick={() => {
                    const blob = new Blob([fixedHtml], { type: 'text/html' });
                    const url  = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                  }}
                  className="text-[10px] text-[#00d4ff] hover:text-white transition-colors px-2 py-0.5 rounded border border-[#00d4ff]/30 hover:border-[#00d4ff]/60 cursor-pointer"
                >
                  ↗ Aç
                </button>
              ) : (
                <span
                  className="text-[10px] text-gray-600 px-2 py-0.5 rounded border border-gray-700/50 cursor-not-allowed"
                  title="Tam ekranda açma Pro planda mevcut"
                >
                  ↗ Aç 🔒
                </span>
              )}
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: '560px' }}>
            <pre
              className="text-[12px] leading-relaxed p-4 m-0 font-mono"
              style={{ background: '#0d0d17', tabSize: 2 }}
              dangerouslySetInnerHTML={{ __html: highlightedFixed }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

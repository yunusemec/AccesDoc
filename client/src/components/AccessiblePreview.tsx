import { useState } from 'react';

interface Props {
  html: string;
}

export default function AccessiblePreview({ html }: Props) {
  const [accessible, setAccessible] = useState(false);

  const accessibleStyle = `
    body, * {
      font-size: 18px !important;
      line-height: 1.8 !important;
      letter-spacing: 0.05em !important;
      background-color: #000 !important;
      color: #ffff00 !important;
      border-color: #ffff00 !important;
    }
    a { color: #00ffff !important; }
    button, input, select, textarea {
      background: #111 !important;
      color: #ffff00 !important;
      border: 1px solid #ffff00 !important;
      font-size: 18px !important;
    }
    img { outline: 2px solid #ffff00 !important; }
  `;

  const srcDoc = accessible
    ? `<!DOCTYPE html><html><head><style>${accessibleStyle}</style></head><body>${html}</body></html>`
    : `<!DOCTYPE html><html><head></head><body>${html}</body></html>`;

  return (
    <div className="mt-6 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Erişilebilir Mod Önizleme</h3>
        <div className="flex items-center gap-2 bg-[#12121a] border border-[#1e1e2e] rounded-lg p-1">
          <button
            onClick={() => setAccessible(false)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              !accessible ? 'bg-[#1e1e2e] text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Normal Mod
          </button>
          <button
            onClick={() => setAccessible(true)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              accessible ? 'bg-[#00d4ff]/20 text-[#00d4ff]' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Erişilebilir Mod
          </button>
        </div>
      </div>

      {accessible && (
        <div className="mb-2 flex items-center gap-2 text-xs text-[#00d4ff]/70">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M6 5v3M6 4h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Yüksek kontrast, büyük font ve geniş harf aralığı aktif
        </div>
      )}

      <div className="border border-[#1e1e2e] rounded-xl overflow-hidden">
        <iframe
          srcDoc={srcDoc}
          className="w-full"
          style={{ height: '400px', background: accessible ? '#000' : '#fff' }}
          sandbox="allow-same-origin"
          title="HTML önizleme"
        />
      </div>
    </div>
  );
}

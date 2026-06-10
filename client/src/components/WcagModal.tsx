// ── WCAG kontrol listesi ──────────────────────────────────────────────────────

const WCAG_CHECKS: { wcag: string; level: 'A' | 'AA' | 'AAA'; title: string; category: 'HTML' | 'CSS' }[] = [
  { wcag: '1.1.1',  level: 'A',   title: 'Alt Text Kontrolü',              category: 'HTML' },
  { wcag: '1.2.2',  level: 'A',   title: 'Video Altyazı Kontrolü',         category: 'HTML' },
  { wcag: '1.2.3',  level: 'A',   title: 'Ses Açıklaması Kontrolü',        category: 'HTML' },
  { wcag: '1.3.1',  level: 'A',   title: 'Semantik HTML Yapısı',           category: 'HTML' },
  { wcag: '1.3.2',  level: 'A',   title: 'Anlamlı İçerik Sırası',         category: 'HTML' },
  { wcag: '1.4.1',  level: 'A',   title: 'Renk Bağımlılığı',              category: 'HTML' },
  { wcag: '1.4.3',  level: 'AA',  title: 'Renk Kontrastı (Metin)',        category: 'HTML' },
  { wcag: '1.4.4',  level: 'AA',  title: 'Metin Boyutu',                  category: 'HTML' },
  { wcag: '1.4.11', level: 'AA',  title: 'Metin Dışı Kontrast',           category: 'HTML' },
  { wcag: '1.4.12', level: 'AA',  title: 'Metin Aralığı',                 category: 'HTML' },
  { wcag: '2.4.6',  level: 'AA',  title: 'Başlık Hiyerarşisi',            category: 'HTML' },
  { wcag: '2.4.2',  level: 'A',   title: 'Sayfa Başlığı',                 category: 'HTML' },
  { wcag: '2.4.7',  level: 'AA',  title: 'Odak Görünürlüğü',              category: 'HTML' },
  { wcag: '2.4.1',  level: 'A',   title: 'Skip Navigation',               category: 'HTML' },
  { wcag: '3.3.2',  level: 'A',   title: 'Form Etiket Kontrolü',          category: 'HTML' },
  { wcag: '3.3.1',  level: 'A',   title: 'Hata Tanımlama',                category: 'HTML' },
  { wcag: '3.1.1',  level: 'A',   title: 'Dil Attribute Kontrolü',        category: 'HTML' },
  { wcag: '3.1.2',  level: 'AA',  title: 'Dil Değişikliği',               category: 'HTML' },
  { wcag: '1.3.5',  level: 'AA',  title: 'Input Type Kullanımı',          category: 'HTML' },
  { wcag: '2.1.1',  level: 'A',   title: 'Klavye Erişimi',                category: 'HTML' },
  { wcag: '2.4.3',  level: 'A',   title: 'Tabindex Kullanımı',            category: 'HTML' },
  { wcag: '4.1.2',  level: 'A',   title: 'Boş Buton ve Link',             category: 'HTML' },
  { wcag: '4.1.2',  level: 'A',   title: 'ARIA Kullanımı',                category: 'HTML' },
  { wcag: '1.3.1',  level: 'A',   title: 'Tablo Erişilebilirliği',        category: 'HTML' },
  { wcag: '1.4.2',  level: 'A',   title: 'Otomatik Oynatılan Medya',      category: 'HTML' },
  { wcag: '1.4.4',  level: 'AA',  title: 'Viewport Meta',                 category: 'HTML' },
  { wcag: '2.5.1',  level: 'A',   title: 'Pointer Hareketleri',           category: 'HTML' },
  { wcag: '2.5.3',  level: 'A',   title: 'İsimde Etiket',                 category: 'HTML' },
  { wcag: '4.1.3',  level: 'AA',  title: 'Durum Mesajları',               category: 'HTML' },
  { wcag: '2.3.3',  level: 'AAA', title: 'Animasyon Kontrolü',            category: 'HTML' },
  { wcag: '1.4.4',  level: 'AA',  title: 'CSS Font Boyutu',               category: 'CSS' },
  { wcag: '2.4.7',  level: 'AA',  title: 'CSS Focus Outline',             category: 'CSS' },
  { wcag: '1.4.3',  level: 'AA',  title: 'CSS Renk Kontrastı (UI)',       category: 'CSS' },
  { wcag: '2.4.7',  level: 'A',   title: 'CSS Cursor',                    category: 'CSS' },
  { wcag: '1.4.10', level: 'AA',  title: 'CSS Reflow (320px)',             category: 'CSS' },
  { wcag: '2.3.3',  level: 'AAA', title: 'CSS Animasyon (prefers-motion)', category: 'CSS' },
  { wcag: '1.4.13', level: 'AA',  title: 'CSS Gizleme',                   category: 'CSS' },
  { wcag: '2.5.5',  level: 'AA',  title: 'Touch Target Boyutu',           category: 'CSS' },
  { wcag: '1.4.12', level: 'AA',  title: 'CSS Satır Yüksekliği',         category: 'CSS' },
  { wcag: '1.4.12', level: 'AA',  title: 'CSS Harf Aralığı',             category: 'CSS' },
  { wcag: '2.4.3',  level: 'A',   title: 'Odak Sırası',                   category: 'CSS' },
  { wcag: '2.4.4',  level: 'A',   title: 'Bağlantı Amacı',                category: 'CSS' },
  { wcag: '2.4.5',  level: 'AA',  title: 'Çoklu Erişim Yolları',         category: 'CSS' },
  { wcag: '2.4.6',  level: 'AA',  title: 'Açıklayıcı Başlık & Etiket',   category: 'CSS' },
  { wcag: '3.3.5',  level: 'AAA', title: 'Giriş Yardımı',                category: 'CSS' },
  { wcag: '3.3.4',  level: 'AA',  title: 'Hata Önleme',                  category: 'CSS' },
  { wcag: '3.2.3',  level: 'AA',  title: 'Tutarlı Navigasyon',            category: 'CSS' },
  { wcag: '3.2.4',  level: 'AA',  title: 'Tutarlı Tanımlama',             category: 'CSS' },
  { wcag: '1.4.13', level: 'AA',  title: 'CSS İçerik Görünürlüğü',       category: 'CSS' },
  { wcag: '1.4.11', level: 'AA',  title: 'Non-text Renk Kontrastı (CSS)', category: 'CSS' },
];

// ── WCAG Bilgi Modalı ─────────────────────────────────────────────────────────

export default function WcagModal({ onClose }: { onClose: () => void }) {
  const levelColor = (l: string) =>
    l === 'A'   ? { bg: 'bg-red-500/10',   border: 'border-red-500/30',   text: 'text-red-400',   badge: 'bg-red-500/20 text-red-300' } :
    l === 'AA'  ? { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' } :
                  { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-300' };

  const htmlChecks = WCAG_CHECKS.filter(c => c.category === 'HTML');
  const cssChecks  = WCAG_CHECKS.filter(c => c.category === 'CSS');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl border border-[#1e1e2e] bg-[#0e0e18]"
        style={{ boxShadow: '0 0 60px rgba(0,212,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#0e0e18] border-b border-[#1e1e2e]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center text-[#00d4ff] text-sm font-bold">?</div>
            <h2 className="text-white font-bold text-base">WCAG 2.1 Standartları Nedir?</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-[#1e1e2e] transition-all text-lg cursor-pointer"
          >✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Açıklama */}
          <p className="text-gray-400 text-sm leading-relaxed">
            <span className="text-white font-semibold">WCAG</span> (Web Content Accessibility Guidelines),
            web içeriklerinin engelli kullanıcılar için erişilebilir olmasını sağlayan uluslararası standartlardır.
            WCAG 2.1'de toplam <span className="text-[#00d4ff]">78 başarı kriteri</span> bulunur, 3 uyumluluk seviyesine ayrılır:
          </p>

          {/* Seviye kartları */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { level: 'A',   label: 'Temel',    count: 30, desc: 'En temel erişilebilirlik gereksinimleri' },
              { level: 'AA',  label: 'Standart', count: 20, desc: 'Kurumsal uyumluluk için hedef seviye' },
              { level: 'AAA', label: 'Gelişmiş', count: 28, desc: 'En üst düzey erişilebilirlik' },
            ].map(({ level, label, count, desc }) => {
              const c = levelColor(level);
              return (
                <div key={level} className={`rounded-xl border ${c.border} ${c.bg} p-3 text-center`}>
                  <div className={`text-2xl font-black ${c.text}`}>{count}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">kontrol</div>
                  <div className={`text-xs font-bold mt-1 ${c.text}`}>Seviye {level}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</div>
                  <div className="text-[10px] text-gray-600 mt-1 leading-tight hidden sm:block">{desc}</div>
                </div>
              );
            })}
          </div>

          {/* Notlar */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs text-gray-400 bg-[#12121a] border border-[#1e1e2e] rounded-xl px-4 py-2.5">
              <span className="text-amber-400 mt-0.5 flex-shrink-0">⚑</span>
              Kurumsal uyumluluk için <span className="text-amber-300 font-medium mx-1">AA seviyesi (50 kontrol)</span> hedeflenir.
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-400 bg-[#00d4ff]/5 border border-[#00d4ff]/15 rounded-xl px-4 py-2.5">
              <span className="text-[#00d4ff] mt-0.5 flex-shrink-0">✓</span>
              <span>AccessiScan, WCAG 2.1 AA seviyesinde <span className="text-[#00d4ff] font-semibold">50 kontrol</span> gerçekleştirir.</span>
            </div>
          </div>

          {/* Kontrol listesi */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="text-[#00d4ff]">⊞</span> Tüm Kontroller
            </h3>

            {/* HTML */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/20 px-2 py-0.5 rounded-full">HTML</span>
                <span className="text-[10px] text-gray-600">30 kontrol</span>
              </div>
              <div className="space-y-1">
                {htmlChecks.map((c, i) => {
                  const lc = levelColor(c.level);
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121a] hover:bg-[#16161f] transition-colors">
                      <span className="text-gray-600 text-[10px] w-5 text-right flex-shrink-0">{i + 1}</span>
                      <span className="text-[10px] text-gray-500 w-12 flex-shrink-0 font-mono">{c.wcag}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${lc.badge}`}>{c.level}</span>
                      <span className="text-xs text-gray-300">{c.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* CSS */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2 py-0.5 rounded-full">CSS</span>
                <span className="text-[10px] text-gray-600">20 kontrol</span>
              </div>
              <div className="space-y-1">
                {cssChecks.map((c, i) => {
                  const lc = levelColor(c.level);
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12121a] hover:bg-[#16161f] transition-colors">
                      <span className="text-gray-600 text-[10px] w-5 text-right flex-shrink-0">{i + 31}</span>
                      <span className="text-[10px] text-gray-500 w-12 flex-shrink-0 font-mono">{c.wcag}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${lc.badge}`}>{c.level}</span>
                      <span className="text-xs text-gray-300">{c.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

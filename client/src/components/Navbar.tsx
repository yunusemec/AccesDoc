import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WcagModal from './WcagModal';

export default function Navbar() {
  const { user, logout } = useAuth();
  const plan         = user?.plan ?? 'FREE';
  const subStatus    = user?.subscriptionStatus ?? null;
  const isCancelling = subStatus === 'cancelling';

  const [wcagOpen,   setWcagOpen]   = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklanınca menüyü kapat
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  // ── Plan badge config ─────────────────────────────────────────────────────
  type BadgeCfg = { label: string; bg: string; border: string; text: string; glow: string };

  let badge: BadgeCfg;
  if (plan === 'PRO' && isCancelling) {
    badge = { label: '⚠ Pro — İptal Sürecinde', bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', glow: '' };
  } else if (plan === 'PRO') {
    badge = { label: '⚜ Pro', bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]' };
  } else if (plan === 'STARTER' && isCancelling) {
    badge = { label: '⚠ Starter — İptal Sürecinde', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', glow: '' };
  } else if (plan === 'STARTER') {
    badge = { label: 'Starter', bg: 'bg-[#00d4ff]/10', border: 'border-[#00d4ff]/30', text: 'text-[#00d4ff]', glow: '' };
  } else {
    badge = { label: 'Free Plan', bg: 'bg-white/5', border: 'border-white/10', text: 'text-gray-400', glow: '' };
  }

  return (
    <>
      {wcagOpen && <WcagModal onClose={() => setWcagOpen(false)} />}

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1e2e] bg-[#0a0a0f]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#00d4ff]/20 border border-[#00d4ff]/40 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#00d4ff" strokeWidth="1.5"/>
                <path d="M5 8h6M8 5v6" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              Accessi<span className="text-[#00d4ff]">Scan</span>
            </span>
          </div>

          {/* ── Masaüstü sağ taraf (sm ve üzeri) ── */}
          {user && (
            <div className="hidden sm:flex items-center gap-3">

              {/* Plan badge */}
              <Link
                to="/pricing"
                className={`btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-full ${badge.bg} border ${badge.border} ${badge.glow}`}
              >
                <span className={`text-xs font-semibold ${badge.text}`}>{badge.label}</span>
              </Link>

              {/* Token sayısı — FREE ve STARTER */}
              {plan !== 'PRO' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" className={plan === 'STARTER' ? 'text-[#00d4ff]' : 'text-gray-500'}/>
                    <text x="6" y="9" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold" className={plan === 'STARTER' ? 'text-[#00d4ff]' : 'text-gray-500'}>T</text>
                  </svg>
                  <span className={`text-xs font-semibold ${plan === 'STARTER' ? 'text-[#00d4ff]' : 'text-gray-400'}`}>
                    {user.tokens} token
                  </span>
                </div>
              )}

              {/* Sınırsız — PRO */}
              {plan === 'PRO' && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold text-amber-400 border border-amber-500/30 bg-amber-500/5 tracking-wide">
                  ∞ Sınırsız
                </span>
              )}

              {/* Geçmiş — STARTER / PRO */}
              {(plan === 'STARTER' || plan === 'PRO') && (
                <Link
                  to="/history"
                  className="btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Geçmiş
                </Link>
              )}

              {/* Geçmiş — FREE (kilitli) */}
              {plan === 'FREE' && (
                <Link
                  to="/pricing"
                  className="btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-400 hover:bg-white/5"
                  title="Bu özellik Starter ve Pro planlarda mevcut"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 6V4.5a2 2 0 014 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  Geçmiş
                </Link>
              )}

              {/* ? WCAG butonu */}
              <div className="relative group">
                <button
                  onClick={() => setWcagOpen(true)}
                  className="btn-hover w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'rgba(0,212,255,0.12)',
                    border: '1.5px solid rgba(0,212,255,0.35)',
                    color: '#00d4ff',
                    boxShadow: '0 0 10px rgba(0,212,255,0.15)',
                  }}
                  aria-label="WCAG Standartları hakkında bilgi"
                >
                  ?
                </button>
                <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-lg bg-[#1e1e2e] border border-[#2a2a3e] text-[#00d4ff] text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                  WCAG Standartları Nedir?
                </span>
              </div>

              {/* Email — hesap ayarlarına link */}
              <Link
                to="/account"
                className="btn-hover hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 max-w-[170px]"
                title="Hesap Ayarları"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                  <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M7 1.5v1M7 11.5v1M12.5 7h-1M2.5 7h-1M10.9 3.1l-.7.7M3.8 10.2l-.7.7M10.9 10.9l-.7-.7M3.8 3.8l-.7-.7" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                </svg>
                <span className="truncate">{user.email}</span>
              </Link>

              {/* Logout — masaüstü */}
              <button
                onClick={logout}
                className="btn-hover flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Çıkış</span>
              </button>
            </div>
          )}

          {/* ── Mobil: hamburger ikonu (sm altı) ── */}
          {user && (
            <div className="sm:hidden" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="btn-hover w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                aria-label="Menüyü aç"
              >
                {menuOpen ? (
                  /* Kapat ikonu */
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                ) : (
                  /* Hamburger */
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
              </button>

              {/* ── Dropdown menü ── */}
              {menuOpen && (
                <div
                  className="absolute top-16 right-0 left-0 border-b border-[#1e1e2e] bg-[#0a0a0f]/98 backdrop-blur-md"
                  style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                >
                  <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">

                    {/* Email — hesap ayarlarına link */}
                    <Link
                      to="/account"
                      onClick={() => setMenuOpen(false)}
                      className="btn-hover flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/3 border border-white/5 mb-1"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-600 mb-0.5">Hesap Ayarları</p>
                        <p className="text-sm text-gray-300 truncate">{user.email}</p>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 text-gray-500">
                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Link>

                    {/* Plan badge */}
                    <Link
                      to="/pricing"
                      onClick={() => setMenuOpen(false)}
                      className={`btn-hover flex items-center gap-2 px-3 py-2.5 rounded-lg ${badge.bg} border ${badge.border}`}
                    >
                      <span className={`text-xs font-semibold ${badge.text}`}>{badge.label}</span>
                      {plan === 'PRO' && <span className="ml-auto text-[10px] text-amber-400 font-bold">∞ Sınırsız</span>}
                    </Link>

                    {/* Token sayısı — FREE ve STARTER */}
                    {plan !== 'PRO' && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-white/3 border border-white/5">
                        <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" className={plan === 'STARTER' ? 'text-[#00d4ff]' : 'text-gray-500'}/>
                          <text x="6" y="9" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="bold" className={plan === 'STARTER' ? 'text-[#00d4ff]' : 'text-gray-500'}>T</text>
                        </svg>
                        <span className="text-xs text-gray-400">Token</span>
                        <span className={`ml-auto text-xs font-bold ${plan === 'STARTER' ? 'text-[#00d4ff]' : 'text-gray-300'}`}>
                          {user.tokens}
                        </span>
                      </div>
                    )}

                    {/* Geçmiş — STARTER / PRO */}
                    {(plan === 'STARTER' || plan === 'PRO') && (
                      <Link
                        to="/history"
                        onClick={() => setMenuOpen(false)}
                        className="btn-hover flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5"
                      >
                        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        Geçmiş
                      </Link>
                    )}

                    {/* Geçmiş — FREE (kilitli) */}
                    {plan === 'FREE' && (
                      <Link
                        to="/pricing"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 transition-all duration-200 cursor-pointer"
                      >
                        <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                          <rect x="3" y="6" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                          <path d="M5 6V4.5a2 2 0 014 0V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                        <span>Geçmiş</span>
                        <span className="ml-auto text-[10px] text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded">Kilitli</span>
                      </Link>
                    )}

                    {/* ? WCAG butonu */}
                    <button
                      onClick={() => { setWcagOpen(true); setMenuOpen(false); }}
                      className="btn-hover flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#00d4ff] hover:bg-[#00d4ff]/5 w-full text-left"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{
                          background: 'rgba(0,212,255,0.12)',
                          border: '1.5px solid rgba(0,212,255,0.35)',
                        }}
                      >?</span>
                      WCAG Standartları Nedir?
                    </button>

                    {/* Çizgi */}
                    <div className="border-t border-[#1e1e2e] my-1" />

                    {/* Logout */}
                    <button
                      onClick={() => { setMenuOpen(false); logout(); }}
                      className="btn-hover flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full border border-transparent hover:border-red-500/20"
                    >
                      <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
                        <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Çıkış Yap
                    </button>

                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </header>
    </>
  );
}

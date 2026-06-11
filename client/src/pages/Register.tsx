import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Uzay yıldızları canvas ────────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    interface Star { x: number; y: number; r: number; speed: number; opacity: number }
    const stars: Star[] = [];

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 160; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.2 + 0.2,
        speed: Math.random() * 0.12 + 0.03,
        opacity: Math.random() * 0.6 + 0.2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.y += s.speed;
        if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.opacity})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

// ── Göz ikonu ─────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [terms,     setTerms]     = useState(false);
  const [emailErr,  setEmailErr]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  function validateEmail(val: string) {
    if (val && !EMAIL_RE.test(val)) {
      setEmailErr('Geçerli bir e-posta adresi giriniz.');
    } else {
      setEmailErr('');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { setEmailErr('Geçerli bir e-posta adresi giriniz.'); return; }
    if (!terms) return;
    setError('');
    setLoading(true);
    try {
      await register(email, password);
      navigate('/analyze');
    } catch {
      setError('Kayıt başarısız. Bu e-posta zaten kullanımda olabilir.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8" style={{ background: '#05050e' }}>
      <StarField />

      {/* Nebula efekti */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '15%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', animation: 'nebula-drift 20s ease-in-out infinite alternate' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', animation: 'nebula-drift 16s ease-in-out infinite alternate-reverse' }} />
      </div>

      <style>{`
        @keyframes nebula-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.08); }
        }
      `}</style>

      {/* ← Ana Sayfa */}
      <Link
        to="/"
        className="fixed top-5 left-5 flex items-center gap-1.5 text-gray-500 hover:text-white text-xs font-medium transition-colors"
        style={{ zIndex: 10 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Ana Sayfa
      </Link>

      <div className="relative w-full max-w-sm animate-fade-in" style={{ zIndex: 5 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Accessi<span className="text-[#00d4ff]">Scan</span>
          </span>
          <p className="text-gray-500 text-sm mt-1">Ücretsiz hesap oluştur</p>
        </div>

        <div className="bg-[#0d0d1a]/90 border border-[#1e1e2e] rounded-2xl p-8" style={{ backdropFilter: 'blur(12px)' }}>
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-posta */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">E-posta</label>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); validateEmail(e.target.value); }}
                onBlur={() => validateEmail(email)}
                className={`w-full bg-[#0a0a0f] border rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:ring-1 transition-all ${emailErr ? 'border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20' : 'border-[#1e1e2e] focus:border-[#00d4ff]/60 focus:ring-[#00d4ff]/20'}`}
                required
              />
              {emailErr && <p className="mt-1 text-xs text-red-400">{emailErr}</p>}
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Şifre</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="En az 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 pr-10 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00d4ff]/60 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Kullanım Koşulları checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTerms(v => !v)}
                className={`w-4 h-4 mt-0.5 rounded flex-shrink-0 border transition-all flex items-center justify-center ${terms ? 'bg-[#00d4ff] border-[#00d4ff]' : 'bg-[#0a0a0f] border-[#2a2a3e]'}`}
                aria-label="Kullanım koşullarını kabul et"
              >
                {terms && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#000" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <p className="text-xs text-gray-500 leading-relaxed">
                <Link to="/terms" className="text-[#00d4ff] hover:text-[#00a8cc] transition-colors" target="_blank" rel="noopener noreferrer">
                  Kullanım Koşulları
                </Link>
                'nı okudum ve kabul ediyorum. Başlangıçta 5 ücretsiz token alırsınız.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !terms || !!emailErr}
              className="w-full mt-2 py-2.5 rounded-lg bg-[#00d4ff] hover:bg-[#00a8cc] text-black font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 20px rgba(0,212,255,0.25)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Hesap oluşturuluyor...
                </span>
              ) : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="text-[#00d4ff] hover:text-[#00a8cc] transition-colors">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

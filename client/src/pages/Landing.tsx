import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Scroll-reveal hook ────────────────────────────────────────────────────────
function useScrollReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);
  return { ref, visible };
}

// ── Animasyonlu kelimeler ─────────────────────────────────────────────────────
const WORDS = ['artır', 'ölç', 'geliştir', 'test et'];
const COLORS = ['#00d4ff', '#a855f7', '#10b981', '#f59e0b'];

// SVG fırça stroke path — wavy underline
const BRUSH_PATH = 'M2,14 C30,8 70,18 110,12 C150,6 190,16 228,12';
const PATH_LEN = 240;

function AnimatedWord() {
  const [idx, setIdx]           = useState(0);
  const [phase, setPhase]       = useState<'in' | 'out'>('in');
  const [strokeOffset, setStrokeOffset] = useState(PATH_LEN);

  useEffect(() => {
    // animate stroke on mount / word change
    const t = setTimeout(() => setStrokeOffset(0), 50);
    return () => clearTimeout(t);
  }, [idx]);

  useEffect(() => {
    const hold   = setTimeout(() => setPhase('out'), 2200);
    const change = setTimeout(() => {
      setIdx(i => (i + 1) % WORDS.length);
      setPhase('in');
      setStrokeOffset(PATH_LEN);
    }, 2700);
    return () => { clearTimeout(hold); clearTimeout(change); };
  }, [idx]);

  const word  = WORDS[idx];
  const color = COLORS[idx];

  return (
    <span className="relative inline-block">
      <span
        style={{
          color,
          opacity: phase === 'in' ? 1 : 0,
          transform: phase === 'in' ? 'translateY(0)' : 'translateY(-8px)',
          transition: 'opacity 0.4s ease, transform 0.4s ease',
          display: 'inline-block',
          textShadow: `0 0 40px ${color}55`,
        }}
      >
        {word}
      </span>
      {/* SVG fırça çizgisi */}
      <span
        className="absolute left-0 right-0"
        style={{ bottom: -6, opacity: phase === 'in' ? 1 : 0, transition: 'opacity 0.4s ease' }}
      >
        <svg
          viewBox="0 0 232 20"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: 12, overflow: 'visible' }}
        >
          <path
            d={BRUSH_PATH}
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={PATH_LEN}
            strokeDashoffset={strokeOffset}
            style={{ transition: 'stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
      </span>
    </span>
  );
}

// ── Adım kartı ────────────────────────────────────────────────────────────────
function StepCard({ num, icon, title, desc, delay }: {
  num: number; icon: string; title: string; desc: string; delay: number;
}) {
  const { ref, visible } = useScrollReveal(delay);
  return (
    <div
      ref={ref}
      className="flex-1 min-w-0 rounded-2xl p-6 border border-[#00d4ff]/15 bg-[#0e0e1a]/80"
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        boxShadow: visible ? '0 0 24px rgba(0,212,255,0.04)' : 'none',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-4"
        style={{ background: 'rgba(0,212,255,0.1)', border: '1.5px solid rgba(0,212,255,0.25)', color: '#00d4ff' }}
      >
        {num}
      </div>
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Özellik kartı ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay }: {
  icon: string; title: string; desc: string; delay: number;
}) {
  const { ref, visible } = useScrollReveal(delay);
  return (
    <div
      ref={ref}
      className="rounded-2xl p-5 border border-[#1e1e2e] bg-[#0e0e1a]/60"
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.borderColor = 'rgba(0,212,255,0.25)';
        el.style.boxShadow = '0 8px 32px rgba(0,212,255,0.06)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = '';
        el.style.borderColor = '';
        el.style.boxShadow = '';
      }}
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-white font-semibold text-sm mb-2">{title}</h3>
      <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Plan özet kartı ───────────────────────────────────────────────────────────
function PlanCard({ name, price, features, color, highlight, delay }: {
  name: string; price: string; features: string[]; color: string; highlight?: boolean; delay: number;
}) {
  const { ref, visible } = useScrollReveal(delay);
  return (
    <div
      ref={ref}
      className="flex-1 min-w-0 rounded-2xl p-6 border"
      style={{
        borderColor: highlight ? color : '#1e1e2e',
        background:  highlight ? `${color}0a` : '#0e0e1a80',
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.45s ease, transform 0.45s ease',
        boxShadow: highlight ? `0 0 32px ${color}18` : 'none',
      }}
    >
      {highlight && (
        <div className="text-center mb-3">
          <span
            className="text-[10px] font-bold px-3 py-1 rounded-full"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
          >
            EN POPÜLER
          </span>
        </div>
      )}
      <h3 className="font-bold text-white text-lg mb-1">{name}</h3>
      <p className="font-bold mb-4" style={{ color, fontSize: 26 }}>{price}</p>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-gray-400 text-xs">
            <span style={{ color }}>✓</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Giriş yapmış kullanıcıyı doğrudan analyze'e yönlendir
  useEffect(() => {
    if (!loading && user) navigate('/analyze', { replace: true });
  }, [user, loading, navigate]);

  const howRef    = useScrollReveal(0);
  const featRef   = useScrollReveal(0);
  const plansRef  = useScrollReveal(0);
  const ctaRef    = useScrollReveal(0);

  if (loading) return null;

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0a0f' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="font-bold text-white text-lg tracking-tight">
          Accessi<span style={{ color: '#00d4ff' }}>Scan</span>
        </span>
        <div className="flex items-center gap-3">
          <Link to="/login"
            className="text-gray-400 hover:text-white text-sm font-medium transition-colors px-3 py-1.5"
          >
            Giriş Yap
          </Link>
          <Link to="/register"
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
            style={{ background: '#00d4ff', color: '#020c10', boxShadow: '0 0 16px rgba(0,212,255,0.3)' }}
          >
            Ücretsiz Başla
          </Link>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00d4ff]/20 bg-[#00d4ff]/5 text-[#00d4ff] text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse" />
            50+ WCAG 2.1 AA Kontrolü
          </div>

          {/* Başlık */}
          <h1 className="font-extrabold leading-tight mb-3"
            style={{ fontSize: 'clamp(2.2rem, 6vw, 4rem)', letterSpacing: '-0.02em' }}
          >
            <span className="text-white">Web erişilebilirliğini</span>
            <br />
            <AnimatedWord />
            <span className="text-white"> ile daha iyi bir web</span>
          </h1>

          <p className="text-gray-400 text-base mt-6 mb-10 max-w-xl mx-auto leading-relaxed">
            50+ WCAG 2.1 AA kontrolü ile web sitenizin erişilebilirliğini analiz edin,
            AI destekli önerilerle anında iyileştirin.
          </p>

          {/* Butonlar */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register"
              className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
              style={{ background: '#00d4ff', color: '#020c10', boxShadow: '0 0 24px rgba(0,212,255,0.35)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 36px rgba(0,212,255,0.55)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 24px rgba(0,212,255,0.35)'; }}
            >
              Ücretsiz Başla →
            </Link>
            <Link to="/login"
              className="px-8 py-3.5 rounded-xl font-semibold text-sm border border-[#2a2a3e] text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              Giriş Yap
            </Link>
          </div>

          {/* Küçük detay */}
          <p className="text-gray-600 text-xs mt-5">Kredi kartı gerekmez · Ücretsiz plan sonsuzdur</p>
        </div>

        {/* Aşağı ok */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce opacity-40">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 8l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      {/* ── NASIL ÇALIŞIR ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            ref={howRef.ref}
            className="text-center mb-14"
            style={{
              opacity:   howRef.visible ? 1 : 0,
              transform: howRef.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-3">Nasıl Çalışır?</h2>
            <p className="text-gray-500 text-sm">3 adımda erişilebilirlik analizi</p>
          </div>

          <div className="flex flex-col md:flex-row gap-5">
            <StepCard
              num={1} icon="🌐"
              title="URL gir veya HTML yapıştır"
              desc="Web sitenizin adresini yazın ya da HTML kodunuzu doğrudan yapıştırın."
              delay={100}
            />
            {/* Bağlantı çizgisi */}
            <div className="hidden md:flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-px bg-gradient-to-r from-[#00d4ff]/30 to-[#00d4ff]/10" />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-0.5">
                <path d="M2 5h6M6 3l2 2-2 2" stroke="#00d4ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              </svg>
            </div>
            <StepCard
              num={2} icon="🔍"
              title="Otomatik WCAG analizi"
              desc="50+ WCAG 2.1 AA kontrolü saniyeler içinde tamamlanır. HTML ve CSS hataları tespit edilir."
              delay={200}
            />
            <div className="hidden md:flex items-center justify-center flex-shrink-0">
              <div className="w-8 h-px bg-gradient-to-r from-[#00d4ff]/30 to-[#00d4ff]/10" />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-0.5">
                <path d="M2 5h6M6 3l2 2-2 2" stroke="#00d4ff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
              </svg>
            </div>
            <StepCard
              num={3} icon="🤖"
              title="AI destekli öneriler al"
              desc="Yapay zeka en kritik sorunları özetler, pratik çözümler önerir ve HTML'i otomatik düzeltir."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* ── ÖZELLİKLER ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(0,212,255,0.015)' }}>
        <div className="max-w-5xl mx-auto">
          <div
            ref={featRef.ref}
            className="text-center mb-14"
            style={{
              opacity:   featRef.visible ? 1 : 0,
              transform: featRef.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-3">Özellikler</h2>
            <p className="text-gray-500 text-sm">Profesyonel erişilebilirlik araçları</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard icon="🔍" title="50+ WCAG Kontrolü"
              desc="WCAG 2.1 AA standardına göre kapsamlı HTML ve CSS erişilebilirlik denetimi."
              delay={0} />
            <FeatureCard icon="🤖" title="AI Destekli Analiz"
              desc="Yapay zeka kritik sorunları özetler ve otomatik HTML düzeltmeleri üretir."
              delay={100} />
            <FeatureCard icon="📊" title="Detaylı Raporlama"
              desc="POUR kategorilerine göre ayrıştırılmış raporlar ve PDF indirme desteği."
              delay={200} />
            <FeatureCard icon="📱" title="URL & HTML Desteği"
              desc="Canlı URL analizi veya HTML kodu yapıştırarak anında sonuç alın."
              delay={100} />
            <FeatureCard icon="⚡" title="Hızlı Analiz"
              desc="Saniyeler içinde tamamlanan analiz, anlık sonuçlar ve öneriler."
              delay={200} />
            <FeatureCard icon="🔒" title="Güvenli & Özel"
              desc="Verileriniz sadece analiz süresince işlenir, saklanmaz veya paylaşılmaz."
              delay={300} />
          </div>
        </div>
      </section>

      {/* ── PLANLAR ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            ref={plansRef.ref}
            className="text-center mb-14"
            style={{
              opacity:   plansRef.visible ? 1 : 0,
              transform: plansRef.visible ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-3">Fiyatlandırma</h2>
            <p className="text-gray-500 text-sm">İhtiyacınıza göre plan seçin</p>
          </div>

          <div className="flex flex-col md:flex-row gap-5 mb-10">
            <PlanCard
              name="Free" price="₺0/ay"
              features={['5 analiz hakkı', 'HTML & CSS analizi', 'Otomatik düzeltme önizleme']}
              color="#6b7280" delay={0}
            />
            <PlanCard
              name="Starter" price="₺149/ay"
              features={['50 analiz / ay', 'URL & HTML analizi', 'AI önerileri', 'E-posta desteği']}
              color="#00d4ff" highlight delay={100}
            />
            <PlanCard
              name="Pro" price="₺299/ay"
              features={['Sınırsız analiz', 'PDF raporu indirme', 'Öncelikli destek', 'API erişimi']}
              color="#f59e0b" delay={200}
            />
          </div>

          <div className="text-center">
            <Link to="/pricing"
              className="inline-block px-8 py-3 rounded-xl font-semibold text-sm border border-[#2a2a3e] text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              Tüm Planları Gör →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        {/* Gradient arka plan */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,212,255,0.06) 0%, transparent 70%)' }}
        />
        <div
          ref={ctaRef.ref}
          className="relative z-10 max-w-xl mx-auto"
          style={{
            opacity:   ctaRef.visible ? 1 : 0,
            transform: ctaRef.visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease',
          }}
        >
          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            Hemen <span style={{ color: '#00d4ff' }}>ücretsiz</span> başlayın
          </h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Kredi kartı gerektirmez. Dakikalar içinde kurulum. İlk analizinizi hemen yapın.
          </p>
          <Link to="/register"
            className="inline-block px-10 py-4 rounded-xl font-bold text-base transition-all"
            style={{ background: '#00d4ff', color: '#020c10', boxShadow: '0 0 32px rgba(0,212,255,0.4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 48px rgba(0,212,255,0.6)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 0 32px rgba(0,212,255,0.4)'; }}
          >
            Ücretsiz Hesap Oluştur →
          </Link>
          <p className="text-gray-600 text-xs mt-4">
            Zaten hesabınız var mı?{' '}
            <Link to="/login" className="text-[#00d4ff] hover:underline">Giriş yapın</Link>
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 text-center border-t border-[#1e1e2e]">
        <p className="text-gray-600 text-xs">
          © 2025 AccessiScan ·{' '}
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Gizlilik</Link>
          {' · '}
          <Link to="/terms" className="hover:text-gray-400 transition-colors">Kullanım Koşulları</Link>
        </p>
      </footer>
    </div>
  );
}

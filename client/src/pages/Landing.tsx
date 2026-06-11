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
const WORDS  = ['artır', 'ölç', 'geliştir', 'test et'];
const COLORS = ['#00d4ff', '#a855f7', '#10b981', '#f59e0b'];

// Sweep süresi (ms) ve bekleme/çıkış süreleri
const SWEEP_MS = 800;
const HOLD_MS  = 2500;
const EXIT_MS  = 400;

function AnimatedWord() {
  const [idx,      setIdx]      = useState(0);
  // 'sweep': fırça geçiyor | 'show': kelime görünür | 'exit': soluklaşıyor
  const [phase,    setPhase]    = useState<'sweep' | 'show' | 'exit'>('sweep');
  const [progress, setProgress] = useState(0); // 0→1 sweep boyunca

  useEffect(() => {
    setProgress(0);
    setPhase('sweep');

    let raf: number;
    const t0 = performance.now();

    const sweep = (now: number) => {
      const p = Math.min((now - t0) / SWEEP_MS, 1);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(sweep);
        return;
      }
      // Sweep bitti → bekleme
      setPhase('show');
      const holdTimer = setTimeout(() => {
        setPhase('exit');
        setTimeout(() => {
          setIdx(i => (i + 1) % WORDS.length);
        }, EXIT_MS);
      }, HOLD_MS);
      // Cleanup için holdTimer'ı saklamak lazım — closure yeterli
      return () => clearTimeout(holdTimer);
    };

    raf = requestAnimationFrame(sweep);
    return () => cancelAnimationFrame(raf);
  }, [idx]);

  const word  = WORDS[idx];
  const color = COLORS[idx];

  // clip-path: progress 0→1 iken soldan sağa açılır
  const clip    = `inset(0 ${Math.round((1 - progress) * 100)}% 0 0)`;
  // fırça X konumu: container genişliğinin progress%'i
  const brushX  = `${progress * 100}%`;
  // çıkış opaklığı
  const exitOp  = phase === 'exit' ? 0 : 1;

  return (
    <span
      className="relative inline-block"
      style={{ verticalAlign: 'baseline' }}
    >
      {/* Yer tutucu — layout genişliğini sabit tutar */}
      <span className="invisible" aria-hidden="true">{word}</span>

      {/* Clip ile açılan renkli kelime */}
      <span
        className="absolute inset-0 whitespace-nowrap"
        style={{
          color,
          clipPath: clip,
          opacity: exitOp,
          transition: phase === 'exit' ? `opacity ${EXIT_MS}ms ease` : 'none',
          textShadow: `0 0 36px ${color}55`,
        }}
      >
        {word}
      </span>

      {/* Büyüyen alt çizgi */}
      <span
        className="absolute left-0 pointer-events-none"
        style={{
          bottom: -5,
          height: 3,
          width: brushX,
          background: color,
          borderRadius: 2,
          opacity: exitOp,
          transition: phase === 'exit' ? `opacity ${EXIT_MS}ms ease` : 'none',
          boxShadow: `0 0 8px ${color}99`,
        }}
      />

      {/* SVG gerçekçi fırça — sadece sweep fazında */}
      {phase === 'sweep' && (
        <span
          className="absolute pointer-events-none select-none"
          style={{
            left: brushX,
            top: '50%',
            // Sallanma: sweep boyunca -40° ile -50° arasında sin dalgası
            transform: `translate(-50%, -55%) rotate(${-45 + Math.sin(progress * Math.PI * 5) * 5}deg)`,
            filter: `drop-shadow(0 0 8px ${color}88)`,
            zIndex: 20,
            lineHeight: 0,
          }}
        >
          <svg viewBox="0 0 18 56" width="22" height="56">
            <defs>
              {/* Ahşap sap gradyanı */}
              <linearGradient id="brush-handle" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#5C3A10"/>
                <stop offset="28%"  stopColor="#B8742A"/>
                <stop offset="50%"  stopColor="#D4933A"/>
                <stop offset="72%"  stopColor="#B8742A"/>
                <stop offset="100%" stopColor="#5C3A10"/>
              </linearGradient>
              {/* Metal ferrule gradyanı */}
              <linearGradient id="brush-ferrule" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#888"/>
                <stop offset="40%"  stopColor="#EEE"/>
                <stop offset="60%"  stopColor="#FFF"/>
                <stop offset="100%" stopColor="#888"/>
              </linearGradient>
              {/* Kıl gradyanı — renk + uçta şeffaflık */}
              <linearGradient id="brush-bristle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="1"/>
                <stop offset="75%"  stopColor={color} stopOpacity="0.7"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.2"/>
              </linearGradient>
            </defs>

            {/* ── Ahşap sap ── */}
            <path d="M6.5,0 Q7,0 7,1 L7.5,31 L10.5,31 L11,1 Q11,0 11.5,0 Z"
              fill="url(#brush-handle)"/>
            {/* Sap üzerinde ahşap doku çizgisi */}
            <line x1="9" y1="1" x2="9.2" y2="30" stroke="white" strokeWidth="0.4" strokeOpacity="0.18"/>
            {/* Sap alt yuvarlak bitiş */}
            <ellipse cx="9" cy="0.5" rx="2.5" ry="0.5" fill="#7A5020"/>

            {/* ── Metal ferrule ── */}
            <rect x="6" y="30" width="6" height="6" rx="0.5" fill="url(#brush-ferrule)"/>
            {/* Ferrule üst/alt çizgiler */}
            <line x1="6" y1="31.2" x2="12" y2="31.2" stroke="white" strokeWidth="0.5" strokeOpacity="0.6"/>
            <line x1="6" y1="34.8" x2="12" y2="34.8" stroke="#666"  strokeWidth="0.3" strokeOpacity="0.5"/>

            {/* ── Kıl gövdesi (fan/yelpaze) ── */}
            <path d="M6.2,36 C5.2,42 3,50 1,56 L17,56 C15,50 12.8,42 11.8,36 Z"
              fill="url(#brush-bristle)"/>

            {/* Kıl doku çizgileri — dağınık yelpaze */}
            <path d="M7.5,36 C6.5,42 5,50 3.5,56"  fill="none" stroke={color} strokeWidth="0.55" strokeOpacity="0.45"/>
            <path d="M8.5,36 C8,42 7.2,50 6.5,56"  fill="none" stroke={color} strokeWidth="0.55" strokeOpacity="0.45"/>
            <path d="M9,36 C9,43 9,50 9,56"         fill="none" stroke={color} strokeWidth="0.55" strokeOpacity="0.45"/>
            <path d="M9.5,36 C10,43 10.8,50 11.5,56" fill="none" stroke={color} strokeWidth="0.55" strokeOpacity="0.45"/>
            <path d="M10.5,36 C11.5,42 13,50 14.5,56" fill="none" stroke={color} strokeWidth="0.55" strokeOpacity="0.45"/>
            {/* Uç dağınık kıllar */}
            <path d="M7,36 C5.5,44 2.5,52 0.5,56"  fill="none" stroke={color} strokeWidth="0.3" strokeOpacity="0.25"/>
            <path d="M11,36 C12.5,44 15.5,52 17.5,56" fill="none" stroke={color} strokeWidth="0.3" strokeOpacity="0.25"/>
          </svg>
        </span>
      )}
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

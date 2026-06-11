import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Scroll-reveal hook — her görünümde tekrar tetiklenir ─────────────────────
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
        } else {
          setVisible(false);
        }
      },
      { threshold: 0.2 },
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
const SWEEP_MS = 1400;
const HOLD_MS  = 2500;
const EXIT_MS  = 400;

// ── Partikül tipi ─────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  opacity: number;
  born: number;
}

function AnimatedWord() {
  const [idx,      setIdx]      = useState(0);
  const [phase,    setPhase]    = useState<'sweep' | 'show' | 'exit'>('sweep');
  const [progress, setProgress] = useState(0);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  // Tek birleşik döngü: sweep + partikül üretimi + canvas çizimi
  useEffect(() => {
    setProgress(0);
    setPhase('sweep');
    particlesRef.current = [];

    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const PAD = 70;
    const w   = container.offsetWidth;
    const h   = container.offsetHeight;
    // Canvas boyutunu bir kez ayarla — reset etme
    canvas.width  = w + PAD * 2;
    canvas.height = h + PAD * 2;

    const color   = COLORS[idx];
    const LIFE    = 650;
    let raf: number;
    const t0      = performance.now();
    let swept     = false;

    const loop = (now: number) => {
      const p = Math.min((now - t0) / SWEEP_MS, 1);
      setProgress(p);

      // Her frame 2-3 partikül üret (fırça hareket ederken sürekli)
      if (p < 1) {
        const bx = p * w + PAD;
        const by = h * 0.5 + PAD;
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2.8 + 0.8;
          particlesRef.current.push({
            x: bx, y: by,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.6,
            r: Math.random() * 2.2 + 1.2,
            opacity: 1,
            born: now,
          });
        }
      }

      // Canvas'ı çiz
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(pt => now - pt.born < LIFE);
      for (const pt of particlesRef.current) {
        const age   = now - pt.born;
        pt.opacity  = 1 - age / LIFE;
        pt.x       += pt.vx * 0.5;
        pt.y       += pt.vy * 0.5;
        pt.vy      += 0.1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle    = color;
        ctx.globalAlpha  = Math.max(0, pt.opacity);
        ctx.shadowBlur   = 7;
        ctx.shadowColor  = color;
        ctx.fill();
        ctx.globalAlpha  = 1;
        ctx.shadowBlur   = 0;
      }

      // Döngüyü devam ettir
      if (p < 1 || particlesRef.current.length > 0) {
        raf = requestAnimationFrame(loop);
      }

      // Sweep bitince bir kez tetikle
      if (p >= 1 && !swept) {
        swept = true;
        setPhase('show');
        const hold = setTimeout(() => {
          setPhase('exit');
          setTimeout(() => setIdx(i => (i + 1) % WORDS.length), EXIT_MS);
        }, HOLD_MS);
        // hold temizlenmez — setIdx sonrası effect yeniden başlar
        void hold;
      }
    };

    raf = requestAnimationFrame(loop);
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
      ref={containerRef}
      className="relative inline-block"
      style={{ verticalAlign: 'baseline' }}
    >
      {/* Partikül canvas — her yana 60px taşarak kırpılmayı önler */}
      <canvas
        ref={canvasRef}
        className="absolute pointer-events-none"
        style={{ left: -60, top: -60, zIndex: 15 }}
      />

      {/* Yer tutucu — aynı font, layout genişliğini sabit tutar */}
      <span
        className="invisible"
        aria-hidden="true"
        style={{ fontFamily: "'Pacifico', cursive" }}
      >{word}</span>

      {/* Clip ile açılan renkli kelime — el yazısı fontu */}
      <span
        className="absolute inset-0 whitespace-nowrap"
        style={{
          color,
          clipPath: clip,
          opacity: exitOp,
          transition: phase === 'exit' ? `opacity ${EXIT_MS}ms ease` : 'none',
          textShadow: `0 0 36px ${color}55`,
          fontFamily: "'Pacifico', cursive",
        }}
      >
        {word}
      </span>

      {/* alt çizgi kaldırıldı — partiküller yeterli */}

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
            🔥 En Popüler
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

  const howRef   = useScrollReveal(0);
  const featRef  = useScrollReveal(0);
  const plansRef = useScrollReveal(0);

  if (loading) return null;

  return (
    <div className="min-h-screen text-white" style={{ background: '#0a0a0f' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Pacifico&display=swap');`}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center px-6 py-4"
        style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <span className="font-bold text-white text-lg tracking-tight">
          Accessi<span style={{ color: '#00d4ff' }}>Scan</span>
        </span>
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
          <h1 className="font-extrabold leading-none mb-2" style={{ letterSpacing: '-0.03em', overflow: 'visible' }}>
            <span className="block text-white text-5xl md:text-6xl lg:text-7xl mb-1">
              Web erişilebilirliğini
            </span>
            <span
              className="text-6xl md:text-7xl lg:text-8xl font-black"
              style={{ display: 'block', overflow: 'visible', paddingBottom: '5rem', paddingTop: '0.5rem', paddingRight: '4rem', lineHeight: 1.5 }}
            >
              <AnimatedWord />
            </span>
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
              features={[
                '5 analiz hakkı',
                'HTML erişilebilirlik analizi',
                'CSS erişilebilirlik analizi',
                'Otomatik düzeltme önizleme',
              ]}
              color="#6b7280" delay={0}
            />
            <PlanCard
              name="Starter" price="₺99/ay"
              features={[
                "Free'deki her şey +",
                '50 analiz hakkı / ay',
                'Analiz geçmişi',
                'Kod indirme',
                'E-posta desteği',
              ]}
              color="#00d4ff" delay={100}
            />
            <PlanCard
              name="Pro" price="₺249/ay"
              features={[
                "Starter'daki her şey +",
                'Sınırsız analiz',
                'PDF raporu indirme',
                'Öncelikli destek',
                'API erişimi (yakında)',
              ]}
              color="#f59e0b" highlight delay={200}
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
        <div className="relative z-10 max-w-xl mx-auto">
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

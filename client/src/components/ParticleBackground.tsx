import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  r: number; g: number; b: number;
  glowColor: string;          // glow rengi (#00d4ff veya #8b5cf6)
  opacity: number;            // baz opaklık
  phase: number;              // sinüs fazı (salınım)
  phaseSpeed: number;         // salınım hızı
  blink: boolean;             // yanıp-sönme modu mu?
  blinkPhase: number;         // yanıp-sönme fazı (daha hızlı)
  blinkSpeed: number;
}

// Renk paleti: cyan ağırlıklı, biraz mor, biraz açık cyan
const COLORS: { rgb: [number, number, number]; glow: string }[] = [
  { rgb: [0,   212, 255], glow: '#00d4ff' },  // cyan
  { rgb: [0,   212, 255], glow: '#00d4ff' },
  { rgb: [0,   212, 255], glow: '#00d4ff' },
  { rgb: [0,   212, 255], glow: '#00d4ff' },
  { rgb: [100, 210, 255], glow: '#00d4ff' },  // açık cyan
  { rgb: [139,  92, 246], glow: '#8b5cf6' },  // mor
  { rgb: [139,  92, 246], glow: '#8b5cf6' },
  { rgb: [0,   212, 255], glow: '#00d4ff' },
];

const COUNT = 45;   // 40-50 arası

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let particles: Particle[] = [];

    // ── Canvas boyutu ──────────────────────────────────────────────────────
    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // ── Tek partikül oluştur ───────────────────────────────────────────────
    function spawn(startAtBottom = false): Particle {
      const col   = COLORS[Math.floor(Math.random() * COLORS.length)];
      const blink = Math.random() < 0.25;   // %25 ihtimalle yanıp-söner
      const w = window.innerWidth;
      const h = window.innerHeight;
      return {
        x:          Math.random() * w,
        y:          startAtBottom
                      ? h + Math.random() * 20
                      : Math.random() * h,
        vx:         (Math.random() - 0.5) * 0.40,          // biraz daha hızlı
        vy:         -(Math.random() * 0.55 + 0.12),         // yukarı
        radius:     Math.random() * 2 + 2,                  // 2 – 4 px
        r:          col.rgb[0],
        g:          col.rgb[1],
        b:          col.rgb[2],
        glowColor:  col.glow,
        opacity:    Math.random() * 0.20 + 0.40,            // 0.40 – 0.60
        phase:      Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.022 + 0.006,
        blink,
        blinkPhase: Math.random() * Math.PI * 2,
        blinkSpeed: Math.random() * 0.06 + 0.04,            // yanıp-sönme hızı
      };
    }

    // ── İlk partiküller ────────────────────────────────────────────────────
    function init() {
      resize();
      particles = Array.from({ length: COUNT }, () => spawn(false));
    }

    // ── Animasyon döngüsü ──────────────────────────────────────────────────
    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Konum güncelle
        p.x          += p.vx;
        p.y          += p.vy;
        p.phase      += p.phaseSpeed;
        p.blinkPhase += p.blinkSpeed;

        // Ekrandan çıkınca alttan tekrar gir
        if (p.y < -10) {
          Object.assign(p, spawn(true));
          continue;
        }
        if (p.x < -10)                    p.x = canvas.width  + 10;
        if (p.x > canvas.width  + 10)   p.x = -10;

        // Opaklık hesapla
        let alpha: number;
        if (p.blink) {
          // Yanıp-sönme: 0'a kadar iner, tam bir nabız etkisi
          alpha = p.opacity * Math.max(0, Math.sin(p.blinkPhase));
        } else {
          // Normal salınım: %55-100 arasında titreşir
          alpha = p.opacity * (0.55 + 0.45 * Math.sin(p.phase));
        }

        if (alpha < 0.01) continue;  // görünmezse çizme

        // Glow efekti
        ctx.save();
        ctx.shadowBlur  = 4;
        ctx.shadowColor = p.glowColor;

        // Çizim
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha.toFixed(3)})`;
        ctx.fill();

        ctx.restore();
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
}

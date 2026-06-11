# AccessiScan — Web Erişilebilirlik Analiz Platformu

## 🚀 Proje Hakkında
AccessiScan, web sitelerinin WCAG 2.1 AA standartlarına uygunluğunu analiz eden, AI destekli SaaS uygulamasıdır.

## 🛠️ Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + PWA
- **Backend:** Node.js + Express + TypeScript
- **Veritabanı:** PostgreSQL + Prisma ORM
- **Analiz Motoru:** Puppeteer (Headless Browser)
- **AI:** Cloudflare Workers AI (Llama 3.3 70B)
- **Ödeme:** Stripe (Test Modu, TRY)
- **Auth:** JWT
- **Deploy:** Vercel (Frontend) + Render (Backend)

## ✨ Özellikler
- 50+ WCAG 2.1 AA kontrolü (30 HTML + 20 CSS)
- POUR kategorileri (Algılanabilirlik, Kullanılabilirlik, Anlaşılabilirlik, Sağlamlık)
- AI destekli analiz yorumu ve otomatik HTML/CSS fix
- Plan bazlı özellikler (Free / Starter / Pro)
- Analiz geçmişi ve PDF raporu
- PWA desteği (mobil ve web)
- Stripe entegrasyonu (abonelik, iptal, yenileme)

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- PostgreSQL
- Docker (opsiyonel)

### Yerel Geliştirme
```bash
git clone https://github.com/yunusemec/AccesDoc.git
cd AccesDoc

cd server
npm install
cp .env.example .env
npm run dev

cd client
npm install
npm run dev
```

### Docker ile
```bash
docker-compose up
```

## 🌐 Canlı Demo
- Frontend: https://accessiscan-sand.vercel.app
- Backend: https://accessiscan-api-ccge.onrender.com



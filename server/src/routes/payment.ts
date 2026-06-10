import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { PLANS, PlanKey } from '../config/plans';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-04-22.dahlia' as any });

// ── GET /api/payment/plans ─────────────────────────────────────────────────
router.get('/plans', (_req: Request, res: Response): void => {
  res.json({
    FREE: {
      name: 'Free', price: 0, tokens: 5, interval: null,
      features: ['5 analiz hakkı', 'HTML erişilebilirlik analizi', 'CSS erişilebilirlik analizi', 'Otomatik düzeltme önizleme'],
    },
    STARTER: {
      ...PLANS.STARTER,
      features: ['50 analiz hakkı / ay', 'HTML erişilebilirlik analizi', 'CSS erişilebilirlik analizi', 'Otomatik düzeltme önizleme', 'URL ve HTML analizi', 'E-posta desteği'],
    },
    PRO: {
      ...PLANS.PRO,
      features: ['Sınırsız analiz', 'HTML erişilebilirlik analizi', 'CSS erişilebilirlik analizi', 'Otomatik düzeltme önizleme', 'URL ve HTML analizi', 'Öncelikli destek', 'API erişimi (yakında)', 'Takım çalışması (yakında)'],
    },
  });
});

// ── POST /api/payment/create-checkout ─────────────────────────────────────
router.post('/create-checkout', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { plan } = req.body as { plan?: string };

  if (!plan || !['STARTER', 'PRO'].includes(plan)) {
    res.status(400).json({ error: 'Geçerli bir plan seçin: STARTER veya PRO.' });
    return;
  }

  const planKey = plan as PlanKey;
  const planConfig = PLANS[planKey];

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); return; }

  try {
    // ── Stripe customer al veya oluştur ───────────────────────────────────
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
      console.log(`[checkout] Yeni Stripe customer oluşturuldu: ${customerId}`);
    }

    // ── Mevcut subscription varsa upgrade için billing portal session ─────
    if (user.subscriptionId) {
      console.log(`[checkout] Mevcut subscription bulundu: ${user.subscriptionId}`);
      console.log(`[checkout] Upgrade akışı — checkout session açılıyor, plan: ${planKey}`);

      // Mevcut subscription'ı iptal ettikten sonra yeni plan için checkout aç.
      // Bu şekilde kullanıcı ödemeyi Stripe üzerinde onaylar, webhook DB'yi günceller.
      // Stripe'ın önerilen upgrade yöntemi: yeni subscription checkout session'ı
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
        mode: 'subscription',
        success_url: process.env.SUCCESS_URL || 'https://accessiscan-sand.vercel.app/payment/success',
        cancel_url: process.env.CANCEL_URL || 'https://accessiscan-sand.vercel.app/pricing',
        metadata: { userId: user.id, plan: planKey },
        subscription_data: { metadata: { userId: user.id, plan: planKey } },
      });

      console.log(`[checkout] Upgrade session oluşturuldu: ${session.id}`);
      res.json({ sessionId: session.id, url: session.url });
      return;
    }

    // ── Yeni subscription — checkout session ─────────────────────────────
    console.log(`[checkout] Yeni subscription — session oluşturuluyor, plan: ${planKey}, userId: ${user.id}`);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: { userId: user.id, plan: planKey },
      subscription_data: { metadata: { userId: user.id, plan: planKey } },
    });

    console.log(`[checkout] Session oluşturuldu: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe hatası.';
    console.error('[checkout] Hata:', message);
    res.status(500).json({ error: message });
  }
});

// ── DELETE /api/payment/cancel-subscription ───────────────────────────────
router.delete('/cancel-subscription', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('[cancel] İstek alındı — userId:', req.user?.id);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); return; }

    console.log('[cancel] Kullanıcı bulundu — plan:', user.plan, 'subscriptionId:', user.subscriptionId);

    if (!user.subscriptionId) {
      console.warn('[cancel] subscriptionId yok — iptal edilecek abonelik bulunamadı');
      res.status(400).json({ error: 'Aktif bir abonelik bulunamadı.' });
      return;
    }

    console.log(`[cancel] cancel_at_period_end=true ayarlanıyor — subId: ${user.subscriptionId}`);

    // Hemen iptal etme, dönem sonunda iptal et
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (stripe.subscriptions as any).update(user.subscriptionId, {
      cancel_at_period_end: true,
    });

    console.log('[iptal] full subscription:', JSON.stringify(updated, null, 2));
    console.log('[iptal] cancel_at_period_end:', updated.cancel_at_period_end);
    console.log('[iptal] current_period_end:', updated.items.data[0].current_period_end);

    const cancelAt = new Date((updated.items.data[0].current_period_end as number) * 1000).toISOString();

    console.log(`[cancel] Stripe güncellendi — cancel_at_period_end: ${updated.cancel_at_period_end}, cancelAt: ${cancelAt}`);

    // Plan değişmez, sadece status güncellenir
    const dbResult = await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'cancelling' },
      select: { id: true, subscriptionStatus: true },
    });

    console.log(`[cancel] DB güncellendi — id: ${dbResult.id}, subscriptionStatus: ${dbResult.subscriptionStatus}`);

    res.json({ success: true, cancelAt, plan: user.plan });
  } catch (err) {
    console.error('[cancel] HATA türü:', err instanceof Error ? err.constructor.name : typeof err);
    console.error('[cancel] HATA mesajı:', err instanceof Error ? err.message : String(err));
    console.error('[cancel] HATA stack:', err instanceof Error ? err.stack : '(stack yok)');
    // Stripe hata detayları
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stripeErr = err as any;
    if (stripeErr?.type) console.error('[cancel] Stripe hata tipi:', stripeErr.type, '| code:', stripeErr.code, '| param:', stripeErr.param);
    const message = err instanceof Error ? err.message : 'İptal işlemi başarısız.';
    res.status(500).json({ error: message });
  }
});

// ── POST /api/payment/reactivate ──────────────────────────────────────────
router.post('/reactivate', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); return; }

  if (!user.subscriptionId) {
    res.status(400).json({ error: 'Aktif bir abonelik bulunamadı.' });
    return;
  }

  try {
    console.log(`[reactivate] cancel_at_period_end=false — subId: ${user.subscriptionId}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (stripe.subscriptions as any).update(user.subscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionStatus: 'active' },
    });

    console.log(`[reactivate] Abonelik yeniden aktifleştirildi — userId: ${user.id}`);

    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Yeniden aktivasyon başarısız.';
    console.error('[reactivate] Hata:', message);
    res.status(500).json({ error: message });
  }
});

// ── POST /api/payment/webhook ──────────────────────────────────────────────
// NOT: Bu route için express.raw() middleware index.ts'de tanımlandı
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] ?? '';
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  console.log('[webhook] İstek alındı — Content-Type:', req.headers['content-type']);
  console.log('[webhook] Signature mevcut:', !!sig);
  console.log('[webhook] Body tipi:', typeof req.body, Buffer.isBuffer(req.body) ? `Buffer(${(req.body as Buffer).length})` : 'Buffer değil!');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook doğrulama hatası';
    console.error('[webhook] constructEvent HATA:', msg);
    res.status(400).send(`Webhook Error: ${msg}`);
    return;
  }

  console.log('[webhook] Event tipi:', event.type);

  // ── checkout.session.completed ──────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as any;

    const userId   = (session.metadata?.userId  ?? '') as string;
    const planKey  = (session.metadata?.plan    ?? '') as string;
    const subId    = (typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? '') as string;
    const customerEmail = (session.customer_details?.email ?? '') as string;

    console.log('[webhook] checkout.session.completed metadata:', { userId, planKey, subId, customerEmail });

    if (!planKey || !['STARTER', 'PRO'].includes(planKey)) {
      console.error('[webhook] Geçersiz plan key:', planKey);
      res.json({ received: true });
      return;
    }

    const config = PLANS[planKey as PlanKey];

    const data = {
      plan: planKey,
      tokens: config.tokens,
      subscriptionId: subId || null,
      subscriptionStatus: 'active',
    };

    // 1. userId ile dene
    if (userId) {
      const r = await prisma.user.updateMany({ where: { id: userId }, data });
      console.log(`[webhook] userId ile güncelleme — id: ${userId}, etkilenen: ${r.count}`);
      if (r.count > 0) { res.json({ received: true }); return; }
    }

    // 2. Fallback: email ile dene
    if (customerEmail) {
      const r = await prisma.user.updateMany({ where: { email: customerEmail }, data });
      console.log(`[webhook] email ile güncelleme — email: ${customerEmail}, etkilenen: ${r.count}`);
      if (r.count > 0) { res.json({ received: true }); return; }
    }

    console.error('[webhook] HATA: Kullanıcı bulunamadı! userId:', userId, 'email:', customerEmail);
  }

  // ── customer.subscription.updated (upgrade webhook'u) ──────────────────
  if (event.type === 'customer.subscription.updated') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = event.data.object as any;
    const planKey = sub.metadata?.plan as string | undefined;
    const userId  = sub.metadata?.userId as string | undefined;

    console.log('[webhook] subscription.updated — planKey:', planKey, 'userId:', userId);

    if (planKey && ['STARTER', 'PRO'].includes(planKey) && userId) {
      const config = PLANS[planKey as PlanKey];
      const r = await prisma.user.updateMany({
        where: { id: userId },
        data: { plan: planKey, tokens: config.tokens, subscriptionId: sub.id, subscriptionStatus: 'active' },
      });
      console.log(`[webhook] subscription.updated güncellendi — rows: ${r.count}`);
    }
  }

  // ── customer.subscription.deleted ─────────────────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = event.data.object as any;
    const userId = sub.metadata?.userId as string | undefined;

    console.log('[webhook] subscription.deleted — sub:', sub.id, 'userId (metadata):', userId);

    // 1. metadata.userId ile dene
    if (userId) {
      const r = await prisma.user.updateMany({
        where: { id: userId },
        data: { plan: 'FREE', tokens: 5, subscriptionId: null, subscriptionStatus: null },
      });
      console.log(`[webhook] subscription.deleted userId ile güncellendi — rows: ${r.count}`);
      if (r.count > 0) { res.json({ received: true }); return; }
    }

    // 2. Fallback: subscriptionId ile dene
    const r = await prisma.user.updateMany({
      where: { subscriptionId: sub.id },
      data: { plan: 'FREE', tokens: 5, subscriptionId: null, subscriptionStatus: null },
    });
    console.log(`[webhook] subscription.deleted subscriptionId ile güncellendi — rows: ${r.count}`);
  }

  res.json({ received: true });
});

export default router;

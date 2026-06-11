import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-04-22.dahlia' as any });

function signToken(id: string, email: string) {
  return jwt.sign({ id, email }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already in use' });
    return;
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { email, password: hashed } });
  const token = signToken(user.id, user.email);
  res.status(201).json({ token, user: { id: user.id, email: user.email, plan: user.plan, tokens: user.tokens } });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, plan: user.plan, tokens: user.tokens } });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, plan: true, tokens: true, subscriptionStatus: true, subscriptionId: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

// ── PATCH /api/auth/password — şifre değiştir ──────────────────────────────
router.patch('/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Mevcut ve yeni şifre gereklidir.' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Mevcut şifre yanlış.' });
    return;
  }

  const sameAsOld = await bcrypt.compare(newPassword, user.password);
  if (sameAsOld) {
    res.status(400).json({ error: 'Yeni şifre eskisinden farklı olmalıdır.' });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  res.json({ success: true });
});

// ── DELETE /api/auth/account — hesabı kalıcı sil ───────────────────────────
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body as { password?: string };

  if (!password) {
    res.status(400).json({ error: 'Hesabı silmek için şifrenizi girin.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: 'Şifre yanlış.' });
    return;
  }

  // Aktif abonelik varsa Stripe'tan iptal et (best-effort)
  if (user.subscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.subscriptionId);
    } catch (err) {
      console.warn('[delete-account] Stripe abonelik iptali başarısız:', err);
    }
  }

  // Önce analizleri, sonra kullanıcıyı sil (FK kısıtı)
  await prisma.analysis.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });

  res.json({ success: true });
});

export default router;

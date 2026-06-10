import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { analyzeHtml } from '../lib/analyzer';
import { generateAiInsights } from '../lib/gemini';
import type { Prisma } from '@prisma/client';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, content } = req.body as { type?: string; content?: string };

  if (!type || !content || !['url', 'html'].includes(type)) {
    res.status(400).json({ error: 'type ("url" veya "html") ve content zorunludur.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); return; }

  if (user.tokens < 1) {
    res.status(403).json({ error: 'Yetersiz token. Premium\'a geçin.' });
    return;
  }

  const urlField: string | undefined        = type === 'url'  ? content : undefined;
  const htmlSnippetField: string | undefined = type === 'html' ? content.slice(0, 500) : undefined;

  let analysisOutput: Awaited<ReturnType<typeof analyzeHtml>>;
  try {
    analysisOutput = await analyzeHtml(content, type as 'url' | 'html');
  } catch (err) {
    console.error('[analyze] analyzeHtml hata:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Analiz sırasında bir hata oluştu.' });
    return;
  }

  const { htmlScore, cssScore, totalScore, htmlResults, cssResults, fixedHtml, originalHtml } =
    analysisOutput;

  const allResults = [...htmlResults, ...cssResults];

  const [analysis] = await prisma.$transaction([
    prisma.analysis.create({
      data: {
        userId: user.id,
        url: urlField,
        htmlSnippet: htmlSnippetField,
        score: totalScore,
        results: allResults as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { tokens: { decrement: 1 } },
    }),
  ]);

  // AI insights — hata olursa null dön, analizi engelleme
  const aiInsights = await generateAiInsights(allResults, totalScore, urlField);

  res.json({
    htmlScore,
    cssScore,
    totalScore,
    htmlResults,
    cssResults,
    tokensLeft: user.tokens - 1,
    analysisId: analysis.id,
    originalHtml,
    fixedHtml,
    aiInsights,
  });
});

// ── GET /api/analyze/history ──────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'Kullanıcı bulunamadı.' }); return; }

  if (user.plan === 'FREE') {
    res.status(403).json({ error: 'Bu özellik Starter ve Pro planlarda mevcut.' });
    return;
  }

  const analyses = await prisma.analysis.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      url: true,
      htmlSnippet: true,
      score: true,
      results: true,
      createdAt: true,
    },
  });

  res.json(analyses);
});

// ── GET /api/analyze/history/:id ──────────────────────────────────────────────
router.get('/history/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const analysis = await prisma.analysis.findFirst({
    where: { id: paramId, userId: req.user!.id },
  });

  if (!analysis) { res.status(404).json({ error: 'Analiz bulunamadı.' }); return; }

  res.json(analysis);
});

export default router;

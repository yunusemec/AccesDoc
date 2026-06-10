import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { chatComplete } from '../lib/gemini';

const router = Router();

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
router.post('/chat', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, analysisId } = req.body as { message?: string; analysisId?: string };

  if (!message?.trim()) {
    res.status(400).json({ error: 'Mesaj boş olamaz.' });
    return;
  }

  try {
    let contextBlock = '';

    if (analysisId) {
      const analysis = await prisma.analysis.findFirst({
        where: { id: analysisId, userId: req.user!.id },
        select: { score: true, results: true, url: true },
      });

      if (analysis) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results = analysis.results as any[];
        const failed = results.filter((r) => !r.passed).map((r) => r.title).join(', ');
        contextBlock = `\n\nKullanıcının analiz bağlamı:\n- Site: ${analysis.url ?? 'HTML kodu'}\n- Genel skor: ${analysis.score}/100\n- Başarısız kontroller: ${failed || 'Yok'}`;
      }
    }

    const system = `Sen AccessiScan'ın web erişilebilirlik asistanısın. Kullanıcılara WCAG 2.1 standartları hakkında Türkçe, sade ve pratik yardım ediyorsun. Teknik jargondan kaçın, anlaşılır ol. Kısa ve öz cevap ver.${contextBlock}`;

    const reply = await chatComplete(system, message.trim());

    res.json({ reply });
  } catch (err) {
    console.error('[ai/chat] Hata:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'AI yanıt oluşturulamadı.' });
  }
});

export default router;

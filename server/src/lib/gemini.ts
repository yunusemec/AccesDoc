import fetch from 'node-fetch';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

async function complete(system: string, user: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user   },
      ],
    }),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await response.json() as any;
  console.log('[openrouter] response:', JSON.stringify(data));
  return data.choices[0].message.content;
}

// ── AI Fix ───────────────────────────────────────────────────────────────────
export async function applyAiFixes(
  originalHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[],
  url?: string,
): Promise<string> {
  try {
    const failed = results.filter((r) => !r.passed);
    if (failed.length === 0) {
      return injectBaseTag(originalHtml, url);
    }

    const issuesList = failed
      .map((r) => `- ${r.title}: ${r.issues.slice(0, 3).join('; ')}`)
      .join('\n');

    const system = 'Sen bir web erişilebilirlik uzmanısın. Verilen HTML kodunu WCAG 2.1 standartlarına göre düzeltiyorsun. Sadece düzeltilmiş ham HTML döndürürsün — markdown, açıklama veya kod bloğu kullanmazsın.';

    const user = `Aşağıdaki HTML kodunda şu WCAG 2.1 erişilebilirlik sorunları tespit edildi:\n\n${issuesList}\n\nBu HTML'i eksiksiz düzelt:\n1. Eksik alt text'leri ekle\n2. Form label'larını ekle\n3. Başlık hiyerarşisini düzelt\n4. lang attribute ekle\n5. title ekle\n6. viewport meta ekle\n7. skip navigation ekle\n8. Boş butonlara text ekle\n9. CSS sorunlarını düzelt\n10. Tablo erişilebilirliğini düzelt\n11. Autoplay kaldır\n12. ARIA referanslarını düzelt\n\nHTML kodu:\n${originalHtml.slice(0, 12000)}`;

    let text = await complete(system, user);

    const codeBlock = text.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) text = codeBlock[1].trim();

    return injectBaseTag(text || originalHtml, url);
  } catch (err) {
    console.error('[ai] applyAiFixes hata:', err instanceof Error ? err.message : err);
    return injectBaseTag(originalHtml, url);
  }
}

function injectBaseTag(html: string, url?: string): string {
  if (!url) return html;
  try {
    const origin = new URL(url).origin;
    const baseTag = `<base href="${origin}/">`;
    if (/<base\s/i.test(html)) return html;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>\n  ${baseTag}`);
    }
    if (/<html[^>]*>/i.test(html)) {
      return html.replace(/<html([^>]*)>/i, `<html$1>\n${baseTag}`);
    }
    return `${baseTag}\n${html}`;
  } catch {
    return html;
  }
}

// ── AI Insights ──────────────────────────────────────────────────────────────
export interface AiInsights {
  criticalIssues: { issue: string; solution: string }[];
  scoreComment: string;
  generalAdvice: string;
}

export async function generateAiInsights(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[],
  totalScore: number,
  url?: string,
): Promise<AiInsights | null> {
  try {
    const failed = results.filter((r) => !r.passed);
    if (failed.length === 0) {
      return {
        criticalIssues: [],
        scoreComment: 'Tüm kontroller başarıyla geçildi. Mükemmel bir erişilebilirlik seviyesi!',
        generalAdvice: 'Siteniz WCAG 2.1 AA standartlarını karşılıyor. Periyodik kontrollere devam edin.',
      };
    }

    const failedSummary = failed
      .slice(0, 8)
      .map((r) => `- ${r.title}: ${r.issues.slice(0, 2).join('; ')}`)
      .join('\n');

    const system = 'Sen bir web erişilebilirlik uzmanısın. Türkçe, sade ve kısa yanıt verirsin. Yanıtını SADECE geçerli JSON olarak döndürürsün.';

    const user = `Site: ${url ?? 'HTML kodu'}\nGenel skor: ${totalScore}/100\nBaşarısız kontroller:\n${failedSummary}\n\nYanıtı SADECE geçerli JSON olarak döndür:\n{\n  "criticalIssues": [\n    { "issue": "...", "solution": "..." }\n  ],\n  "scoreComment": "...",\n  "generalAdvice": "..."\n}`;

    const text = await complete(system, user);

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    return JSON.parse(jsonStr) as AiInsights;
  } catch (err) {
    console.error('[ai] generateAiInsights hata:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export async function chatComplete(system: string, message: string): Promise<string> {
  return complete(system, message);
}

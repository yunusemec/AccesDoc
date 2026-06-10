import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

// ── Yardımcı: tek seferlik tamamlama ─────────────────────────────────────────
async function complete(systemPrompt: string, userPrompt: string): Promise<string> {
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  });
  return chat.choices[0]?.message?.content?.trim() ?? '';
}

// ── AI Fix — erişilebilirlik sorunlarını AI ile düzelt ───────────────────────
export async function applyAiFixes(
  originalHtml: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[],
  url?: string,
): Promise<string> {
  try {
    const failed = results.filter((r) => !r.passed);
    if (failed.length === 0) {
      console.log('[ai] applyAiFixes: tüm kontroller geçti, orijinal HTML döndürülüyor.');
      return injectBaseTag(originalHtml, url);
    }

    const issuesList = failed
      .map((r) => `- ${r.title}: ${r.issues.slice(0, 3).join('; ')}`)
      .join('\n');

    const system = 'Sen bir web erişilebilirlik uzmanısın. Verilen HTML kodunu WCAG 2.1 standartlarına göre düzeltiyorsun. Sadece düzeltilmiş ham HTML döndürürsün — markdown, açıklama veya kod bloğu kullanmazsın.';

    const user = `Aşağıdaki HTML kodunda şu WCAG 2.1 erişilebilirlik sorunları tespit edildi:

${issuesList}

Bu HTML'i eksiksiz düzelt:
1. Eksik alt text'leri içeriğe göre anlamlı açıklamalarla ekle
2. Form label'larını uygun şekilde ekle
3. Başlık hiyerarşisini düzelt (h1→h2→h3 sırası)
4. Lang attribute ekle (<html lang="tr">)
5. Title ekle (içeriğe uygun)
6. Viewport meta ekle
7. Skip navigation ekle
8. Boş butonlara ve linklere anlamlı text ekle
9. CSS sorunlarını düzelt (outline:none → outline: 2px solid #005fcc, font-size küçükse büyüt, cursor:none kaldır)
10. Tablo erişilebilirliğini düzelt (th, scope, caption ekle)
11. Autoplay kaldır
12. ARIA referanslarını düzelt
13. Diğer tüm tespit edilen sorunları düzelt

HTML kodu:
${originalHtml.slice(0, 12000)}`;

    console.log('[ai] applyAiFixes: Groq isteği gönderiliyor...');
    let text = await complete(system, user);

    // Markdown kod bloğu varsa soy
    const codeBlock = text.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) text = codeBlock[1].trim();

    console.log('[ai] applyAiFixes: yanıt alındı, uzunluk:', text.length);
    return injectBaseTag(text || originalHtml, url);
  } catch (err) {
    console.error('[ai] applyAiFixes hata:', err instanceof Error ? err.message : err);
    return injectBaseTag(originalHtml, url);
  }
}

// ── <base> tag enjeksiyonu ────────────────────────────────────────────────────
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

// ── AI Insights — analiz sonuçlarına yorum ekle ───────────────────────────────
interface CheckResult {
  id: string;
  title: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
}

export interface AiInsights {
  criticalIssues: { issue: string; solution: string }[];
  scoreComment: string;
  generalAdvice: string;
}

export async function generateAiInsights(
  results: CheckResult[],
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

    const system = 'Sen bir web erişilebilirlik uzmanısın. Türkçe, sade ve kısa yanıt verirsin. Teknik jargon kullanmazsın. Yanıtını SADECE geçerli JSON olarak döndürürsün.';

    const user = `Aşağıdaki WCAG 2.1 analiz sonuçlarına göre değerlendirme yap:

Site: ${url ?? 'HTML kodu'}
Genel skor: ${totalScore}/100
Başarısız kontroller:
${failedSummary}

Şunları yap:
1. En kritik 3 sorunu özetle (Türkçe, sade dil)
2. Her sorun için tek cümlelik pratik çözüm öner
3. Genel bir erişilebilirlik skoru yorumu yap

Yanıtı SADECE geçerli JSON olarak döndür, başka hiçbir şey ekleme:
{
  "criticalIssues": [
    { "issue": "...", "solution": "..." }
  ],
  "scoreComment": "...",
  "generalAdvice": "..."
}`;

    const text = await complete(system, user);

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ?? text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text;

    const parsed = JSON.parse(jsonStr) as AiInsights;
    return parsed;
  } catch (err) {
    console.error('[ai] generateAiInsights hata:', err instanceof Error ? err.message : err);
    return null;
  }
}

// ── Chat — tek seferlik sohbet tamamlama (routes/ai.ts için) ──────────────────
export async function chatComplete(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  return complete(systemPrompt, userMessage);
}

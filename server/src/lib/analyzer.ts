import puppeteer, { type Page } from 'puppeteer';
import { applyAiFixes } from './gemini';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CheckResult {
  id: string;
  wcag: string;
  level: string;
  title: string;
  passed: boolean;
  score: number;
  maxScore: number;
  issues: string[];
  suggestions: string[];
}

export interface AnalysisOutput {
  htmlScore: number;
  cssScore: number;
  totalScore: number;
  htmlResults: CheckResult[];
  cssResults: CheckResult[];
  originalHtml: string;
  fixedHtml: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function makeResult(
  id: string, wcag: string, level: string, title: string, maxScore: number,
  issues: string[], suggestions: string[],
): CheckResult {
  const passed = issues.length === 0;
  const score  = passed ? maxScore : Math.max(0, Math.round(maxScore * Math.max(0, 1 - issues.length / Math.max(issues.length, 3))));
  return { id, wcag, level, title, passed, score, maxScore, issues, suggestions };
}

async function safeEval<T>(page: Page, fn: () => T): Promise<T> {
  try { return await page.evaluate(fn); }
  catch { return fn.length === 0 ? ([] as unknown as T) : ({} as unknown as T); }
}

// ── Browser-side contrast helpers (injected as string into evaluate) ──────────

const CONTRAST_JS = /* js */`
  function parseRgb(c) {
    const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
    if (m) return [+m[1], +m[2], +m[3]];
    if (c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return null;
    let h = c.replace('#','');
    if (h.length === 3) h = h.split('').map(x=>x+x).join('');
    if (h.length === 6) { const n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
    return null;
  }
  function lum(r,g,b){
    return [r,g,b].reduce((s,v,i)=>{
      const s2=v/255; const l=s2<=0.03928?s2/12.92:Math.pow((s2+0.055)/1.055,2.4);
      return s+l*[0.2126,0.7152,0.0722][i];
    },0);
  }
  function cr(c1,c2){
    if(!c1||!c2) return 21;
    const l1=lum(...c1),l2=lum(...c2);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  }
`;

// ── HTML CHECKS 1–30 ─────────────────────────────────────────────────────────

async function runHtmlBatch(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(() => {
    const R: Record<string, string[]> = {};

    // 1. Alt Text
    R.alt_text = [];
    document.querySelectorAll('img').forEach(img => {
      const role = img.getAttribute('role');
      if (role === 'presentation' || role === 'decorative') return;
      if (!img.hasAttribute('alt') || img.getAttribute('alt') === '')
        R.alt_text.push(`<img> alt text eksik: ${(img.getAttribute('src') ?? '').slice(0,60)}`);
    });

    // 2. Video Captions
    R.video_captions = [];
    document.querySelectorAll('video').forEach((v, i) => {
      const hasTrack = v.querySelector('track[kind="captions"], track[kind="subtitles"]');
      if (!hasTrack) R.video_captions.push(`Video ${i+1}: altyazı track eksik.`);
    });

    // 3. Audio Description
    R.audio_description = [];
    document.querySelectorAll('audio').forEach((a, i) => {
      const hasDesc = a.getAttribute('aria-label') || a.getAttribute('aria-describedby')
        || a.parentElement?.querySelector('[role="note"], .transcript');
      if (!hasDesc) R.audio_description.push(`Audio ${i+1}: açıklama veya transkript eksik.`);
    });

    // 4. Semantic HTML
    R.semantic_html = [];
    const semanticTags = ['header','nav','main','footer','article','section'];
    const found = semanticTags.filter(t => document.querySelector(t));
    if (found.length < 2) R.semantic_html.push(`Semantik HTML elementleri yetersiz (${found.join(', ') || 'yok'}). header, nav, main, footer kullanın.`);
    // Table layout check
    document.querySelectorAll('table').forEach((t, i) => {
      if (!t.querySelector('th') && !t.querySelector('caption'))
        R.semantic_html.push(`Tablo ${i+1}: layout tablo olabilir — semantik yapı eksik.`);
    });

    // 5. Meaningful Sequence
    R.meaningful_sequence = [];
    {
      // Computed style: off-screen absolute/fixed elements
      const allEls = Array.from(document.querySelectorAll('*')).slice(0, 300);
      let offScreenCount = 0;
      allEls.forEach(el => {
        const cs = getComputedStyle(el as HTMLElement);
        const pos = cs.position;
        if (pos === 'absolute' || pos === 'fixed') {
          const top  = parseFloat(cs.top  || '0');
          const left = parseFloat(cs.left || '0');
          if (top < -100 || left < -9000) offScreenCount++;
        }
      });
      if (offScreenCount > 2) R.meaningful_sequence.push(`${offScreenCount} element position:absolute/fixed ile görünüm dışına çıkarılmış (içerik sırası bozulabilir).`);
      // z-index stacking: elements with very high z-index covering others
      const highZ = allEls.filter(el => {
        const z = parseInt(getComputedStyle(el as HTMLElement).zIndex || '0');
        return z > 900 && getComputedStyle(el as HTMLElement).position !== 'static';
      });
      if (highZ.length > 3) R.meaningful_sequence.push(`${highZ.length} element yüksek z-index ile içerik sırasını bozuyor olabilir.`);
    }

    // 6. Color Dependency
    R.color_dependency = [];
    {
      // Computed style: elements using only red/green to convey meaning
      const semanticEls = Array.from(document.querySelectorAll('p,span,div,li,td,label,small,strong,em')).slice(0, 150);
      semanticEls.forEach(el => {
        const cs = getComputedStyle(el as HTMLElement);
        const color = cs.color;
        const isRed   = /rgb\(2[0-4]\d,\s*[0-3]\d,\s*[0-3]\d\)|rgb\(255,\s*0,\s*0\)/.test(color);
        const isGreen = /rgb\([0-3]\d,\s*1[2-9]\d,\s*[0-3]\d\)|rgb\(0,\s*1[0-9]\d,\s*0\)/.test(color);
        if (!isRed && !isGreen) return;
        const text = el.textContent?.trim() ?? '';
        if (!text || text.length < 2) return;
        const hasIcon = el.querySelector('svg,img,[class*="icon"]');
        const hasSymbol = /[✓✗✘✔✕!?*★]/.test(text) || /(\(!\)|\[x\]|\[ok\])/.test(text.toLowerCase());
        if (!hasIcon && !hasSymbol) {
          R.color_dependency.push(`<${el.tagName.toLowerCase()}> "${text.slice(0, 30)}" — bilgi yalnızca ${isRed ? 'kırmızı' : 'yeşil'} renkle iletiliyor olabilir.`);
        }
      });
      // Error/warning/success elements with only color, no icon or text indicator
      const stateEls = Array.from(document.querySelectorAll('[class*="error"],[class*="warning"],[class*="success"],[class*="danger"],[class*="hata"],[class*="uyari"]'));
      stateEls.forEach(el => {
        const hasIcon = el.querySelector('svg,img,[class*="icon"],[aria-label],[role="img"]');
        const text = el.textContent?.trim() ?? '';
        const hasTextIndicator = /hata|uyarı|başarı|error|warning|success|danger|!|✓|✗/.test(text);
        if (!hasIcon && !hasTextIndicator) {
          R.color_dependency.push(`<${el.tagName.toLowerCase()} class="${(el.getAttribute('class') ?? '').slice(0, 40)}"> durum yalnızca CSS class/renkle belirtilmiş, metin göstergesi yok.`);
        }
      });
    }

    // 8. Text Size (computed)
    R.text_size = [];
    {
      const textEls2 = Array.from(document.querySelectorAll('p,span,a,li,td,th,label,button,div,small')).slice(0, 80);
      textEls2.forEach(el => {
        const fs = parseFloat(getComputedStyle(el as HTMLElement).fontSize);
        if (fs > 0 && fs < 12) {
          const text = el.textContent?.trim() ?? '';
          if (text.length > 1)
            R.text_size.push(`<${el.tagName.toLowerCase()}> computed font-size: ${fs.toFixed(1)}px (min 12px). İçerik: "${text.slice(0, 30)}"`);
        }
      });
    }

    // 11. Heading Hierarchy
    R.heading_hierarchy = [];
    const hels = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'));
    if (hels.length > 0) {
      if (!document.querySelector('h1')) R.heading_hierarchy.push('Sayfada <h1> etiketi eksik.');
      const h1Count = document.querySelectorAll('h1').length;
      if (h1Count > 1) R.heading_hierarchy.push(`Birden fazla <h1> var (${h1Count} adet).`);
      let prev = 0;
      hels.forEach(h => {
        const lvl = parseInt(h.tagName[1]);
        if (prev > 0 && lvl > prev + 1) R.heading_hierarchy.push(`Başlık seviyesi atlandı: h${prev} → h${lvl}`);
        prev = lvl;
      });
    }

    // 12. Page Title
    R.page_title = [];
    const title = document.title.trim();
    if (!title) R.page_title.push('<title> etiketi eksik veya boş.');
    else if (title.length < 4) R.page_title.push(`<title> çok kısa: "${title}"`);

    // 14. Skip Navigation
    R.skip_navigation = [];
    const skipPatterns = ['skip','ana içeriğe','içeriğe geç','skip to content','skip to main'];
    const hasSkip = Array.from(document.querySelectorAll('a')).some(a => {
      const t = a.textContent?.toLowerCase() ?? '';
      const h = a.getAttribute('href') ?? '';
      return skipPatterns.some(p => t.includes(p)) || h === '#main' || h === '#content';
    });
    if (!hasSkip) R.skip_navigation.push('Sayfada "ana içeriğe geç" skip link bulunamadı.');

    // 15. Form Labels
    R.form_labels = [];
    document.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(el => {
      const id = el.getAttribute('id');
      const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
      const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
      if (!hasLabel && !hasAria) {
        const t = el.getAttribute('type') ?? el.tagName.toLowerCase();
        const n = el.getAttribute('name') ?? id ?? '(isimsiz)';
        R.form_labels.push(`<${el.tagName.toLowerCase()} type="${t}" name="${n}"> için etiket eksik.`);
      }
    });

    // 16. Error Identification
    R.error_identification = [];
    const requiredInputs = document.querySelectorAll('input[required], input[aria-required="true"]');
    if (requiredInputs.length === 0 && document.querySelector('form')) {
      R.error_identification.push('Form var ama required/aria-required attribute kullanılmamış.');
    }

    // 17. Language Attribute
    R.lang_attribute = [];
    const lang = document.documentElement.getAttribute('lang');
    if (!lang || lang.trim() === '') R.lang_attribute.push('<html lang="..."> attribute eksik.');
    else if (lang.trim().length < 2) R.lang_attribute.push(`<html lang="${lang}"> geçersiz dil kodu.`);

    // 18. Language Change
    R.lang_change = [];
    {
      const pageLang = (document.documentElement.getAttribute('lang') ?? '').toLowerCase().split('-')[0];
      // Non-Latin script ranges that clearly indicate a different language
      const nonLatinRanges = [
        { re: /[؀-ۿ]/, name: 'Arapça' },
        { re: /[一-鿿]/, name: 'Çince' },
        { re: /[぀-ヿ]/, name: 'Japonca' },
        { re: /[가-힯]/, name: 'Korece' },
        { re: /[Ѐ-ӿ]/, name: 'Kiril' },
        { re: /[ऀ-ॿ]/, name: 'Hintçe (Devanagari)' },
        { re: /[฀-๿]/, name: 'Tayca' },
      ];
      // Check explicitly lang-marked sub-elements
      document.querySelectorAll(':not(html)[lang]').forEach(el => {
        const elLang = (el.getAttribute('lang') ?? '').toLowerCase().split('-')[0];
        if (pageLang && elLang && elLang !== pageLang) {
          // This is fine — it IS marked. No issue.
        }
      });
      // Check elements with non-Latin text but no lang attribute
      const textEls = Array.from(document.querySelectorAll('p,span,li,td,h1,h2,h3,h4,h5,h6,div,a,button')).slice(0, 200);
      textEls.forEach(el => {
        if (el.closest('[lang]:not(html)')) return; // already wrapped in lang element
        const text = el.childNodes.length
          ? Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent ?? '').join('').trim()
          : (el.textContent ?? '').trim();
        if (!text || text.length < 5) return;
        for (const { re, name } of nonLatinRanges) {
          if (re.test(text)) {
            R.lang_change.push(`<${el.tagName.toLowerCase()}> "${text.slice(0, 30)}…" ${name} içeriği lang attribute olmadan kullanılmış.`);
            break;
          }
        }
      });
      // Also flag explicit lang markers that differ from page lang (positive check — ensure they exist for foreign phrases)
      if (pageLang) {
        const foreignPhrases = Array.from(document.querySelectorAll('p,span,blockquote,q')).filter(el => {
          const t = el.textContent ?? '';
          // Latin content on a non-Latin page or vice versa — simplified heuristic
          const latinRatio = (t.match(/[a-zA-Z]/g) ?? []).length / Math.max(t.length, 1);
          if (pageLang === 'tr' || pageLang === 'en') return false; // Latin pages — skip Latin ratio check
          return latinRatio > 0.7 && t.trim().length > 10;
        });
        foreignPhrases.forEach(el => {
          if (!el.getAttribute('lang') && !el.closest('[lang]:not(html)')) {
            R.lang_change.push(`<${el.tagName.toLowerCase()}> farklı dilde görünen içerik lang attribute olmadan kullanılmış: "${(el.textContent ?? '').slice(0, 30)}"`);
          }
        });
      }
    }

    // 19. Input Types
    R.input_types = [];
    const emailHints = ['email','mail','eposta','e-posta'];
    const telHints = ['tel','phone','telefon','gsm','cep'];
    document.querySelectorAll('input[type="text"], input:not([type])').forEach(el => {
      const n = ((el.getAttribute('name') ?? '') + ' ' + (el.getAttribute('id') ?? '') + ' ' + (el.getAttribute('placeholder') ?? '')).toLowerCase();
      if (emailHints.some(h => n.includes(h))) R.input_types.push(`"${el.getAttribute('name') ?? ''}" alanı için type="email" kullanın.`);
      else if (telHints.some(h => n.includes(h))) R.input_types.push(`"${el.getAttribute('name') ?? ''}" alanı için type="tel" kullanın.`);
    });

    // 20. Keyboard Access
    R.keyboard_access = [];
    {
      const interactiveTags = ['a','button','input','select','textarea'];
      // onclick / onmousedown / onpointerdown on non-interactive elements
      ['onclick','onmousedown','onpointerdown'].forEach(evAttr => {
        document.querySelectorAll(`[${evAttr}]`).forEach(el => {
          const tag = el.tagName.toLowerCase();
          if (!interactiveTags.includes(tag)) {
            const hasKey = el.getAttribute('onkeydown') || el.getAttribute('onkeyup') || el.getAttribute('onkeypress');
            const hasRole = el.getAttribute('role');
            const hasTabindex = el.getAttribute('tabindex');
            if (!hasKey && (!hasRole || !hasTabindex))
              R.keyboard_access.push(`<${tag} ${evAttr}="..."> tıklama olayı var ama klavye desteği (onkeydown/role+tabindex) eksik.`);
          }
        });
      });
      // role="button" but not a <button> — check for keyboard support
      document.querySelectorAll('[role="button"]').forEach(el => {
        const tag = el.tagName.toLowerCase();
        if (tag !== 'button' && tag !== 'input') {
          const hasTabindex = el.getAttribute('tabindex');
          const hasKey = el.getAttribute('onkeydown') || el.getAttribute('onkeyup') || el.getAttribute('onkeypress');
          if (!hasTabindex || (!hasKey)) {
            R.keyboard_access.push(`<${tag} role="button"> tabindex veya onkeydown eksik — klavyeyle aktive edilemiyor olabilir.`);
          }
        }
      });
      // <a> without href — not keyboard-focusable by default
      document.querySelectorAll('a:not([href])').forEach(el => {
        const hasTabindex = el.getAttribute('tabindex');
        const hasRole = el.getAttribute('role');
        if (!hasTabindex && !hasRole)
          R.keyboard_access.push(`<a> href attribute yok — klavyeyle focus almıyor. tabindex="0" veya <button> kullanın.`);
      });
    }

    // 21. Tabindex
    R.tabindex = [];
    document.querySelectorAll('[tabindex]').forEach(el => {
      const v = parseInt(el.getAttribute('tabindex') ?? '0');
      if (v > 0) R.tabindex.push(`<${el.tagName.toLowerCase()}> tabindex="${v}" — pozitif tabindex klavye sırasını bozar.`);
      if (v < 0 && ['button','a','input'].includes(el.tagName.toLowerCase()))
        R.tabindex.push(`<${el.tagName.toLowerCase()}> tabindex="-1" — etkileşimli element klavyeden gizlenmiş.`);
    });

    // 22. Empty Buttons/Links
    R.empty_buttons_links = [];
    const meaningless = ['click here','buraya tıkla','daha fazla','more','read more','devam et','link','here','burada'];
    document.querySelectorAll('button').forEach(btn => {
      const text = btn.textContent?.trim() ?? '';
      const aria = btn.getAttribute('aria-label');
      if (!text && !aria) R.empty_buttons_links.push('<button> içeriği boş ve aria-label yok.');
    });
    document.querySelectorAll('a').forEach(a => {
      const text = (a.textContent?.trim() ?? '').toLowerCase();
      const aria = a.getAttribute('aria-label');
      if (!text && !aria) R.empty_buttons_links.push(`<a href="${(a.getAttribute('href') ?? '#').slice(0,40)}"> içeriği boş.`);
      else if (!aria && meaningless.includes(text)) R.empty_buttons_links.push(`<a> anlamsız metin: "${text}"`);
    });

    // 23. ARIA Usage
    R.aria_usage = [];
    const validRoles = ['alert','alertdialog','application','article','banner','button','cell','checkbox','columnheader','combobox','complementary','contentinfo','definition','dialog','directory','document','feed','figure','form','grid','gridcell','group','heading','img','link','list','listbox','listitem','log','main','marquee','math','menu','menubar','menuitem','menuitemcheckbox','menuitemradio','navigation','none','note','option','presentation','progressbar','radio','radiogroup','region','row','rowgroup','rowheader','scrollbar','search','searchbox','separator','slider','spinbutton','status','switch','tab','table','tablist','tabpanel','term','textbox','timer','toolbar','tooltip','tree','treegrid','treeitem'];
    document.querySelectorAll('[role]').forEach(el => {
      const role = el.getAttribute('role') ?? '';
      if (!validRoles.includes(role)) R.aria_usage.push(`<${el.tagName.toLowerCase()}> geçersiz role="${role}".`);
    });
    document.querySelectorAll('[aria-labelledby],[aria-describedby]').forEach(el => {
      ['aria-labelledby','aria-describedby'].forEach(attr => {
        const val = el.getAttribute(attr);
        if (!val) return;
        val.split(/\s+/).forEach(id => {
          if (id && !document.getElementById(id)) R.aria_usage.push(`${attr}="${id}" — id bulunamadı.`);
        });
      });
    });
    document.querySelectorAll('[aria-hidden="true"]').forEach(el => {
      if (el.querySelector('button,a,input,select,textarea,[tabindex]'))
        R.aria_usage.push('<aria-hidden="true"> içinde focusable element var.');
    });

    // 24. Table Accessibility
    R.table_accessibility = [];
    document.querySelectorAll('table').forEach((t, i) => {
      if (!t.querySelector('caption')) R.table_accessibility.push(`Tablo ${i+1}: <caption> eksik.`);
      if (!t.querySelector('th')) R.table_accessibility.push(`Tablo ${i+1}: <th> başlık satırı eksik.`);
      t.querySelectorAll('th').forEach(th => {
        if (!th.getAttribute('scope')) R.table_accessibility.push(`Tablo ${i+1}: <th> scope attribute eksik.`);
      });
    });

    // 25. Autoplay Media
    R.autoplay_media = [];
    document.querySelectorAll('video[autoplay], audio[autoplay]').forEach(el => {
      if (!el.hasAttribute('muted')) R.autoplay_media.push(`<${el.tagName.toLowerCase()}> autoplay ve muted değil.`);
      if (!el.hasAttribute('controls')) R.autoplay_media.push(`<${el.tagName.toLowerCase()}> controls attribute eksik.`);
    });

    // 26. Viewport Meta
    R.viewport_meta = [];
    const vm = document.querySelector('meta[name="viewport"]');
    if (!vm) R.viewport_meta.push('<meta name="viewport"> eksik.');
    else {
      const content = vm.getAttribute('content') ?? '';
      if (/user-scalable\s*=\s*no/i.test(content)) R.viewport_meta.push('viewport user-scalable=no — zoom engelleniyor.');
      if (/maximum-scale\s*=\s*1/i.test(content)) R.viewport_meta.push('viewport maximum-scale=1 — zoom kısıtlanmış.');
    }

    // 27. Pointer Gestures
    R.pointer_gestures = [];
    {
      Array.from(document.querySelectorAll('*')).slice(0, 200).forEach(el => {
        const cs = getComputedStyle(el as HTMLElement);
        if (cs.touchAction === 'none')
          R.pointer_gestures.push(`<${el.tagName.toLowerCase()}> computed touch-action:none — dokunma engelleniyor.`);
      });
    }

    // 28. Label in Name
    R.label_in_name = [];
    document.querySelectorAll('[aria-label]').forEach(el => {
      const visible = el.textContent?.trim().toLowerCase() ?? '';
      const ariaLbl = (el.getAttribute('aria-label') ?? '').toLowerCase();
      if (visible && ariaLbl && !ariaLbl.includes(visible) && !visible.includes(ariaLbl))
        R.label_in_name.push(`<${el.tagName.toLowerCase()}> görünür metin ("${visible.slice(0,20)}") aria-label ile eşleşmiyor.`);
    });

    // 29. Status Messages
    R.status_messages = [];
    const hasLive = !!document.querySelector('[aria-live],[role="status"],[role="alert"]');
    if (!hasLive && (document.querySelector('form') || document.querySelector('[class*="toast"],[class*="notification"],[class*="alert"]')))
      R.status_messages.push('Form veya bildirim var ama aria-live/role="status" kullanılmamış.');

    // 30. Animation
    R.animation = [];
    const hasAnim = Array.from(document.styleSheets).some(ss => {
      try { return Array.from(ss.cssRules ?? []).some(r => r instanceof CSSKeyframesRule); }
      catch { return false; }
    });
    const hasMotionQuery = Array.from(document.styleSheets).some(ss => {
      try { return Array.from(ss.cssRules ?? []).some(r => r instanceof CSSMediaRule && r.conditionText?.includes('prefers-reduced-motion')); }
      catch { return false; }
    });
    if (hasAnim && !hasMotionQuery) R.animation.push('CSS animasyonlar var ama prefers-reduced-motion media query kullanılmamış.');

    return R;
  });
}

// ── Contrast check (HTML check 7 + CSS checks 33, 50) ───────────────────────

async function runContrastCheck(page: Page): Promise<{ text: string[]; nonText: string[] }> {
  return page.evaluate((`
    (() => {
      ${CONTRAST_JS.replace(/`/g, '\\`')}
      const textIssues = [];
      const nonTextIssues = [];
      const els = Array.from(document.querySelectorAll('p,span,a,button,label,h1,h2,h3,h4,h5,h6,li,td,th,div')).slice(0,40);
      els.forEach(el => {
        const cs = getComputedStyle(el);
        const fg = parseRgb(cs.color);
        const bg = parseRgb(cs.backgroundColor);
        if (!fg || !bg) return;
        const ratio = cr(fg, bg);
        const fs = parseFloat(cs.fontSize);
        const bold = parseInt(cs.fontWeight) >= 700;
        const threshold = (fs >= 18 || (bold && fs >= 14)) ? 3.0 : 4.5;
        if (ratio < threshold) textIssues.push('<' + el.tagName.toLowerCase() + '> kontrast: ' + ratio.toFixed(2) + ':1 (min ' + threshold + ':1).');
      });
      document.querySelectorAll('button,input,select,textarea').forEach(el => {
        const cs = getComputedStyle(el);
        const border = parseRgb(cs.borderColor);
        const bg = parseRgb(cs.backgroundColor) || [255,255,255];
        if (!border) return;
        const ratio = cr(border, bg);
        if (ratio < 3) nonTextIssues.push('<' + el.tagName.toLowerCase() + '> border kontrast: ' + ratio.toFixed(2) + ':1 (min 3:1).');
      });
      return { text: textIssues.slice(0,8), nonText: nonTextIssues.slice(0,5) };
    })()
  `) as unknown as () => { text: string[]; nonText: string[] });
}

// ── CSS CHECKS batch ──────────────────────────────────────────────────────────

async function runCssBatch(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate((`
    (() => {
      ${CONTRAST_JS.replace(/`/g, '\\`')}
      const R = {};

      // 31. CSS Font Size (computed)
      R.css_font_size = [];
      document.querySelectorAll('*').length; // warm up
      Array.from(document.querySelectorAll('p,span,a,li,td,th,div,button,label')).slice(0,60).forEach(el => {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs > 0 && fs < 12) R.css_font_size.push('<' + el.tagName.toLowerCase() + '> computed font-size: ' + fs + 'px (min 12px).');
      });

      // 34. CSS Cursor (computed + stylesheet)
      R.css_cursor = [];
      Array.from(document.querySelectorAll('*')).slice(0, 200).forEach(el => {
        if (getComputedStyle(el).cursor === 'none')
          R.css_cursor.push('<' + el.tagName.toLowerCase() + '> computed cursor:none — imleç gizleniyor.');
      });
      try {
        Array.from(document.styleSheets).forEach(ss => {
          Array.from(ss.cssRules ?? []).forEach(r => {
            if (r.cssText && /cursor\s*:\s*none/.test(r.cssText))
              R.css_cursor.push('CSS stylesheet: cursor:none kuralı tespit edildi (' + (r.cssText).slice(0,60) + ')');
          });
        });
      } catch(e) {}

      // 36. CSS Animation — checks specifically for transition/animation properties in stylesheets
      R.css_animation = [];
      {
        let hasKeyframes = false, hasTransition = false, hasMotionQuery = false;
        try {
          Array.from(document.styleSheets).forEach(ss => {
            try {
              Array.from(ss.cssRules ?? []).forEach(r => {
                if (r instanceof CSSKeyframesRule) hasKeyframes = true;
                if (r instanceof CSSMediaRule && r.conditionText?.includes('prefers-reduced-motion')) hasMotionQuery = true;
                // Check for transition/animation properties in style rules
                if (r instanceof CSSStyleRule && r.style) {
                  if (r.style.transition && r.style.transition !== 'none' && r.style.transition !== '') hasTransition = true;
                  if (r.style.animation && r.style.animation !== 'none' && r.style.animation !== '') hasTransition = true;
                }
              });
            } catch(e) {}
          });
        } catch(e) {}
        if ((hasKeyframes || hasTransition) && !hasMotionQuery)
          R.css_animation.push('CSS stylesheet\'te animasyon/transition var ama @media (prefers-reduced-motion) desteği bulunamadı.');
      }

      // 37. CSS Display None
      R.css_display_none = [];
      document.querySelectorAll('[style]').forEach(el => {
        if ((el).style.display === 'none') {
          const focusable = (el).querySelector('button,a,input,select,textarea,[tabindex]');
          if (focusable) R.css_display_none.push('<' + el.tagName.toLowerCase() + '> display:none içinde focusable element var.');
        }
      });

      // 39. CSS Line Height
      R.css_line_height = [];
      Array.from(document.querySelectorAll('p,li,td,div')).slice(0,30).forEach(el => {
        const cs = getComputedStyle(el);
        const lh = cs.lineHeight;
        const fs = parseFloat(cs.fontSize);
        if (lh !== 'normal' && fs > 0) {
          const ratio = parseFloat(lh) / fs;
          if (ratio > 0 && ratio < 1.5) R.css_line_height.push('<' + el.tagName.toLowerCase() + '> line-height: ' + ratio.toFixed(2) + ' (min 1.5).');
        }
      });

      // 40. CSS Letter Spacing (computed)
      R.css_letter_spacing = [];
      Array.from(document.querySelectorAll('p,span,a,li,td,h1,h2,h3,h4,h5,h6,button,label')).slice(0, 60).forEach(el => {
        const ls = getComputedStyle(el).letterSpacing;
        if (ls && ls !== 'normal') {
          const val = parseFloat(ls);
          if (!isNaN(val) && val < 0)
            R.css_letter_spacing.push('<' + el.tagName.toLowerCase() + '> computed letter-spacing: ' + ls + ' (negatif değer okunabilirliği bozuyor).');
        }
      });

      // 42. Link Purpose
      R.link_purpose = [];
      const bad = ['daha fazla','click here','buraya tıkla','more','devam et','link','here','burada','detay'];
      document.querySelectorAll('a').forEach(a => {
        const t = (a.textContent?.trim() ?? '').toLowerCase();
        if (bad.includes(t) && !a.getAttribute('aria-label')) R.link_purpose.push('<a> anlamsız link metni: "' + t + '"');
      });

      // 43. Multiple Ways
      R.multiple_ways = [];
      const hasSearch = !!document.querySelector('[type="search"],input[name*="search"],input[placeholder*="Ara"],input[placeholder*="Search"]');
      const hasSitemap = !!document.querySelector('a[href*="sitemap"],nav,ul[role="navigation"]');
      const hasBreadcrumb = !!document.querySelector('[aria-label*="breadcrumb"],[class*="breadcrumb"]');
      if (!hasSearch && !hasSitemap && !hasBreadcrumb) R.multiple_ways.push('Arama, site haritası veya breadcrumb navigasyon bulunamadı.');

      // 44. Headings and Labels
      R.headings_labels = [];
      {
        const badHeadings = [
          'başlık','heading','title','label','header','untitled','section',
          'content','text','paragraph','item','element','...','???',
          'içerik','bölüm','konu','metin','paragraf','bilgi','detay',
          'page','sayfa','main','ana','sub','alt','new','yeni','temp',
        ];
        document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h => {
          const t = (h.textContent?.trim() ?? '');
          const tl = t.toLowerCase();
          // Exact match with bad list
          if (badHeadings.includes(tl))
            R.headings_labels.push('<' + h.tagName.toLowerCase() + '> anlamsız başlık: "' + t + '"');
          // Too short (less than 2 words and less than 5 chars, skip icons)
          else if (t.length > 0 && t.length < 5 && !/[\u{1F300}-\u{1FFFF}]/u.test(t))
            R.headings_labels.push('<' + h.tagName.toLowerCase() + '> çok kısa başlık: "' + t + '" (açıklayıcı olmayabilir).');
          // Single word that's a generic term
          const words = t.split(/\s+/).filter(Boolean);
          if (words.length === 1 && t.length < 8 && badHeadings.some(b => tl.includes(b)))
            R.headings_labels.push('<' + h.tagName.toLowerCase() + '> tek kelimelik belirsiz başlık: "' + t + '"');
        });
        // Form inputs without visible label text (only placeholder)
        document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])').forEach(el => {
          const id = el.getAttribute('id');
          const hasLabel = id ? !!document.querySelector('label[for="' + id + '"]') : false;
          const hasAriaLabel = !!el.getAttribute('aria-label');
          const hasPlaceholderOnly = !!el.getAttribute('placeholder') && !hasLabel && !hasAriaLabel;
          if (hasPlaceholderOnly)
            R.headings_labels.push('<input name="' + (el.getAttribute('name') ?? '') + '"> sadece placeholder kullanıyor, kalıcı label yok.');
        });
      }

      // 45. Input Assistance
      R.input_assistance = [];
      document.querySelectorAll('form').forEach((form, i) => {
        const hasHelp = form.querySelector('[class*="help"],[class*="hint"],[class*="description"],small,[aria-describedby]');
        if (!hasHelp) R.input_assistance.push('Form ' + (i+1) + ': yardım metni veya ipucu bulunamadı.');
      });

      // 46. Error Prevention
      R.error_prevention = [];
      document.querySelectorAll('form').forEach((form, i) => {
        const hasConfirm = form.getAttribute('onsubmit')?.includes('confirm') || form.querySelector('[data-confirm]');
        const isPayment = /payment|payment|ödeme|sipariş|order/i.test(form.innerHTML);
        if (isPayment && !hasConfirm) R.error_prevention.push('Form ' + (i+1) + ': ödeme/sipariş formu — onay mekanizması eksik olabilir.');
      });

      // 47. Consistent Navigation
      R.consistent_nav = [];
      if (!document.querySelector('nav,[role="navigation"]')) R.consistent_nav.push('<nav> veya role="navigation" elementi bulunamadı.');

      // 48. Consistent Identification
      R.consistent_id = [];
      {
        // Search inputs with different labels
        const searchInputs = Array.from(document.querySelectorAll('input[type="search"],input[name*="search"],input[placeholder*="Ara"],input[placeholder*="Search"]'));
        const searchLabels = new Set(searchInputs.map(el => (el.getAttribute('aria-label') ?? el.getAttribute('placeholder') ?? '').toLowerCase().trim()).filter(Boolean));
        if (searchLabels.size > 1) R.consistent_id.push('Arama alanları farklı etiketlerle tanımlanmış: ' + Array.from(searchLabels).join(' | '));

        // Navigation landmarks: multiple nav with different or missing aria-labels
        const navEls = Array.from(document.querySelectorAll('nav,[role="navigation"]'));
        if (navEls.length > 1) {
          const noLabel = navEls.filter(el => !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'));
          if (noLabel.length > 0) R.consistent_id.push(noLabel.length + ' <nav> elementi birden fazla nav var ama aria-label ile ayırt edilmemiş.');
        }

        // Buttons with same visible text but different roles/actions (icon buttons without aria-label)
        const iconBtns = Array.from(document.querySelectorAll('button,a[role="button"]')).filter(el => {
          const text = (el.textContent ?? '').trim();
          const hasOnlyIcon = text === '' || /^[\u{1F300}-\u{1FFFF}☀-⛿✀-➿]+$/u.test(text);
          return hasOnlyIcon && !el.getAttribute('aria-label') && !el.getAttribute('title');
        });
        if (iconBtns.length > 0) R.consistent_id.push(iconBtns.length + ' ikon buton/link aria-label veya title olmadan kullanılmış — ekran okuyucu tanımlayamaz.');

        // Repeated interactive elements with inconsistent naming
        const submitBtns = Array.from(document.querySelectorAll('button[type="submit"],input[type="submit"]'));
        const submitLabels = new Set(submitBtns.map(el => (el.getAttribute('value') ?? el.textContent ?? '').trim().toLowerCase()));
        if (submitLabels.size > 2) R.consistent_id.push('Submit butonları ' + submitLabels.size + ' farklı etiketle kullanılmış — tutarsız tanımlama.');
      }

      // 49. CSS Visibility
      R.css_visibility = [];
      document.querySelectorAll('[class*="tooltip"],[class*="dropdown"],[class*="popup"],[class*="hover"]').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') {
          R.css_visibility.push('<' + el.tagName.toLowerCase() + '> hover/focus içerik gizli — klavye ile dismiss edilebilir mi?');
        }
      });

      // 38. Touch Target Size
      R.touch_target = [];
      Array.from(document.querySelectorAll('button,a')).slice(0,30).forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44))
          R.touch_target.push('<' + el.tagName.toLowerCase() + '> boyutu ' + Math.round(r.width) + 'x' + Math.round(r.height) + 'px (min 44x44px).');
      });

      // 41. Focus Order
      R.focus_order = [];
      const tabbable = Array.from(document.querySelectorAll('a,button,input,select,textarea,[tabindex="0"]'));
      const hasPosTabindex = tabbable.some(el => parseInt(el.getAttribute('tabindex') ?? '0') > 0);
      if (hasPosTabindex) R.focus_order.push('Pozitif tabindex kullanımı DOM sırasını bozuyor.');

      return R;
    })()
  `) as unknown as () => Record<string, string[]>);
}

// ── Reflow check (Check 35) ───────────────────────────────────────────────────

async function checkReflow(page: Page): Promise<string[]> {
  try {
    await page.setViewport({ width: 320, height: 568 });
    const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    await page.setViewport({ width: 1280, height: 800 });
    return hasHScroll ? ['320px genişlikte yatay kaydırma oluşuyor (reflow sorunu).'] : [];
  } catch {
    await page.setViewport({ width: 1280, height: 800 }).catch(() => {});
    return [];
  }
}

// ── Focus visibility check (Check 13 + CSS Check 32) ─────────────────────────
// html → computed outline check on interactive elements (for check #13)
// css  → :focus rules in stylesheets ONLY (for check #32, stylesheet-specific)

async function checkFocusVisibility(page: Page): Promise<{ html: string[]; css: string[] }> {
  try {
    const result = await page.evaluate(() => {
      const htmlIssues: string[] = [];
      const cssIssues: string[] = [];

      // CSS-only: scan stylesheet rules for :focus with outline:none/0
      try {
        Array.from(document.styleSheets).forEach(ss => {
          try {
            Array.from(ss.cssRules ?? []).forEach(r => {
              const text = r.cssText ?? '';
              const sel  = (r as CSSStyleRule).selectorText ?? '';
              if (/:focus/.test(sel) && /outline\s*:\s*(none|0)\b/.test(text))
                cssIssues.push('CSS stylesheet: "' + sel + ' { outline:none }" — focus görünürlüğü stylesheet\'ten engelleniyor.');
              if (/^\*$/.test(sel.trim()) && /outline\s*:\s*(none|0)\b/.test(text))
                cssIssues.push('CSS stylesheet: * { outline:none } — tüm elementlerde focus kaldırılıyor.');
              // :focus-visible suppressed
              if (/:focus-visible/.test(sel) && /outline\s*:\s*(none|0)\b/.test(text))
                cssIssues.push('CSS stylesheet: "' + sel + ' { outline:none }" — :focus-visible devre dışı bırakılmış.');
            });
          } catch { /* cross-origin */ }
        });
      } catch { /* access error */ }

      // HTML: computed outline on interactive elements (not inline style — class-based)
      const interactives = Array.from(document.querySelectorAll('a,button,input,select,textarea')).slice(0, 15);
      interactives.forEach(el => {
        // Skip if it has an inline style overriding — we want CSS-class-sourced
        const inlineOutline = (el as HTMLElement).style.outline;
        const computed = getComputedStyle(el).outlineStyle;
        if (computed === 'none' && inlineOutline !== 'none')
          htmlIssues.push('<' + el.tagName.toLowerCase() + '> CSS class\'tan gelen computed outline:none — focus göstergesi yok.');
        else if (computed === 'none' && !inlineOutline)
          htmlIssues.push('<' + el.tagName.toLowerCase() + '> computed outline:none — focus göstergesi yok.');
      });

      return { html: htmlIssues.slice(0, 6), css: cssIssues.slice(0, 6) };
    });
    return result;
  } catch {
    return { html: [], css: [] };
  }
}

// ── Non-text contrast (Check 9) ───────────────────────────────────────────────

async function checkNonTextContrast(page: Page): Promise<string[]> {
  return page.evaluate((`
    (() => {
      ${CONTRAST_JS.replace(/`/g, '\\`')}
      const issues = [];
      document.querySelectorAll('button,input,select,textarea').forEach(el => {
        const cs = getComputedStyle(el);
        const border = parseRgb(cs.borderColor);
        const bg = parseRgb(document.body ? getComputedStyle(document.body).backgroundColor : 'rgb(255,255,255)') || [255,255,255];
        if (!border) return;
        const ratio = cr(border, bg);
        if (ratio < 3) issues.push('<' + el.tagName.toLowerCase() + '> border kontrastı: ' + ratio.toFixed(2) + ':1 (min 3:1 gerekli).');
      });
      return issues.slice(0,5);
    })()
  `) as unknown as () => string[]);
}

// ── CSS Non-text contrast (Check 50) — CSS-class-sourced borders/outlines ─────
// Different from check #9 (which checks computed border on form elements):
// This checks graphical UI components (icons, separators, focus rings) defined via CSS

async function checkCssNonTextContrast(page: Page): Promise<string[]> {
  return page.evaluate((`
    (() => {
      ${CONTRAST_JS.replace(/`/g, '\\`')}
      const issues = [];
      const pageBg = parseRgb(getComputedStyle(document.body).backgroundColor) || [255,255,255];

      // Check SVG icons and decorative elements
      document.querySelectorAll('svg,hr,[role="separator"],[class*="divider"],[class*="separator"]').forEach(el => {
        const cs = getComputedStyle(el);
        const fill   = parseRgb(cs.fill   || cs.color);
        const stroke = parseRgb(cs.stroke || cs.borderColor);
        const color  = fill || stroke;
        if (!color) return;
        const ratio = cr(color, pageBg);
        if (ratio < 3) issues.push('<' + el.tagName.toLowerCase() + '> grafik eleman kontrastı: ' + ratio.toFixed(2) + ':1 (min 3:1).');
      });

      // Check custom focus ring / outline via CSS
      document.querySelectorAll('button,a,input,select,textarea').forEach(el => {
        const cs = getComputedStyle(el);
        const outlineColor = parseRgb(cs.outlineColor);
        const bgColor      = parseRgb(cs.backgroundColor) || pageBg;
        if (!outlineColor) return;
        const ratio = cr(outlineColor, bgColor);
        if (cs.outlineStyle !== 'none' && ratio < 3)
          issues.push('<' + el.tagName.toLowerCase() + '> focus outline kontrastı: ' + ratio.toFixed(2) + ':1 (min 3:1).');
      });

      return issues.slice(0, 6);
    })()
  `) as unknown as () => string[]);
}

// ── Text Spacing check (Check 10) ─────────────────────────────────────────────

async function checkTextSpacing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const issues: string[] = [];
    Array.from(document.querySelectorAll('p,li,td,span,div')).slice(0, 30).forEach(el => {
      const cs = getComputedStyle(el as Element);
      const lh = cs.lineHeight;
      const fs = parseFloat(cs.fontSize);
      if (lh !== 'normal' && fs > 0 && parseFloat(lh) / fs < 1.2 && parseFloat(lh) > 0)
        issues.push(`<${(el as Element).tagName.toLowerCase()}> line-height çok dar.`);
      const ls = cs.letterSpacing;
      if (ls && ls !== 'normal' && parseFloat(ls) < 0)
        issues.push(`<${(el as Element).tagName.toLowerCase()}> negatif letter-spacing: ${ls}`);
    });
    return issues.slice(0, 5);
  });
}

// ── Build CheckResult from batch output ───────────────────────────────────────

function buildResult(
  id: string, wcag: string, level: string, title: string, maxScore: number,
  issues: string[], suggestions: string[],
): CheckResult {
  return makeResult(id, wcag, level, title, maxScore, [...new Set(issues)].slice(0, 6), suggestions);
}

// ── Main analyzeHtml ──────────────────────────────────────────────────────────

export async function analyzeHtml(
  input: string,
  type: 'url' | 'html',
): Promise<AnalysisOutput> {
  console.log(`[analyzer] Başlatılıyor — type: ${type}, input: ${input.slice(0, 80)}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('AccessiScan/2.0 (Accessibility Analyzer)');

    // Gereksiz resource'ları engelle (hız için)
    await page.setRequestInterception(true);
    page.on('request', req => {
      const t = req.resourceType();
      if (['image', 'media', 'font'].includes(t)) req.abort();
      else req.continue();
    });

    if (type === 'url') {
      await page.goto(input, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      await page.setContent(input, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Kısa bekleme — JS render için
    await new Promise(r => setTimeout(r, 800));

    // Relative URL'leri absolute'a çevir (URL tipinde)
    if (type === 'url') {
      await page.evaluate(() => {
        const baseUrl = window.location.origin;
        document.querySelectorAll('[href],[src]').forEach(el => {
          ['href', 'src'].forEach(attr => {
            const val = el.getAttribute(attr);
            if (val && val.startsWith('/') && !val.startsWith('//')) {
              el.setAttribute(attr, baseUrl + val);
            }
          });
        });
      });
    }

    const originalHtml = await page.evaluate(() => document.documentElement.outerHTML);
    console.log('[analyzer] Sayfa yüklendi, kontroller başlıyor...');

    // ── Tüm check'leri paralel çalıştır ─────────────────────────────────────
    const [htmlBatch, cssBatch, contrastResult, focusResult, reflowIssues, nonTextIssues, textSpacingIssues, cssNonTextIssues] =
      await Promise.all([
        safeEval(page, () => ({})).then(() => runHtmlBatch(page)).catch(() => ({} as Record<string, string[]>)),
        runCssBatch(page).catch(() => ({} as Record<string, string[]>)),
        runContrastCheck(page).catch(() => ({ text: [] as string[], nonText: [] as string[] })),
        checkFocusVisibility(page).catch(() => ({ html: [] as string[], css: [] as string[] })),
        checkReflow(page).catch(() => [] as string[]),
        checkNonTextContrast(page).catch(() => [] as string[]),
        checkTextSpacing(page).catch(() => [] as string[]),
        checkCssNonTextContrast(page).catch(() => [] as string[]),
      ]);

    const g = (key: string): string[] => htmlBatch[key] ?? [];
    const c = (key: string): string[] => cssBatch[key] ?? [];

    // ── 30 HTML CheckResult'ları ─────────────────────────────────────────────
    const htmlResults: CheckResult[] = [
      buildResult('alt_text',             '1.1.1', 'A',   'Alt Text Kontrolü',              20, g('alt_text'),             ['Tüm görsellere açıklayıcı alt text ekleyin.']),
      buildResult('video_captions',       '1.2.2', 'A',   'Video Altyazı Kontrolü',         15, g('video_captions'),       ['Video elementlerine <track kind="captions"> ekleyin.']),
      buildResult('audio_description',    '1.2.3', 'A',   'Ses Açıklaması Kontrolü',        10, g('audio_description'),    ['Audio elementlerine transkript veya aria-label ekleyin.']),
      buildResult('semantic_html',        '1.3.1', 'A',   'Semantik HTML Yapısı',           15, g('semantic_html'),        ['header, nav, main, footer, article, section elementlerini kullanın.']),
      buildResult('meaningful_sequence',  '1.3.2', 'A',   'Anlamlı İçerik Sırası',         10, g('meaningful_sequence'),  ['CSS ile görsel sıra DOM sırasından ayrılmamalı.']),
      buildResult('color_dependency',     '1.4.1', 'A',   'Renk Bağımlılığı',              15, g('color_dependency'),     ['Bilgiyi yalnızca renkle iletmeyin; ikon veya metin ekleyin.']),
      buildResult('contrast',             '1.4.3', 'AA',  'Renk Kontrastı (Metin)',        20, contrastResult.text,       ['Metin kontrastını en az 4.5:1 yapın.']),
      buildResult('text_size',            '1.4.4', 'AA',  'Metin Boyutu',                  15, g('text_size'),            ['Font boyutunu en az 12px (tercihen 16px) kullanın.']),
      buildResult('non_text_contrast',    '1.4.11','AA',  'Metin Dışı Kontrast',           15, nonTextIssues,             ['Form elemanları border kontrastını 3:1 üzerine çıkarın.']),
      buildResult('text_spacing',         '1.4.12','AA',  'Metin Aralığı',                 10, textSpacingIssues,         ['line-height en az 1.5, letter-spacing negatif olmamalı.']),
      buildResult('heading_hierarchy',    '2.4.6', 'AA',  'Başlık Hiyerarşisi',            20, g('heading_hierarchy'),    ['Başlıkları h1→h2→h3 sırasıyla kullanın, seviye atlamayın.']),
      buildResult('page_title',           '2.4.2', 'A',   'Sayfa Başlığı',                 15, g('page_title'),           ['Sayfaya açıklayıcı bir <title> ekleyin.']),
      buildResult('focus_visibility',     '2.4.7', 'AA',  'Odak Görünürlüğü',              20, focusResult.html,          ['Interaktif elementlerde outline:none kullanmayın.']),
      buildResult('skip_navigation',      '2.4.1', 'A',   'Skip Navigation',               15, g('skip_navigation'),      ['<a href="#main">Ana içeriğe geç</a> linki ekleyin.']),
      buildResult('form_labels',          '3.3.2', 'A',   'Form Etiket Kontrolü',          20, g('form_labels'),          ['Her input için <label for="id"> veya aria-label ekleyin.']),
      buildResult('error_identification', '3.3.1', 'A',   'Hata Tanımlama',                15, g('error_identification'), ['required ve aria-invalid attribute kullanın.']),
      buildResult('lang_attribute',       '3.1.1', 'A',   'Dil Attribute Kontrolü',        15, g('lang_attribute'),       ['<html lang="tr"> ile dil belirtin.']),
      buildResult('lang_change',          '3.1.2', 'AA',  'Dil Değişikliği',               10, g('lang_change'),          ['Farklı dildeki içeriklere lang attribute ekleyin.']),
      buildResult('input_types',          '1.3.5', 'AA',  'Input Type Kullanımı',          10, g('input_types'),          ['Email için type="email", telefon için type="tel" kullanın.']),
      buildResult('keyboard_access',      '2.1.1', 'A',   'Klavye Erişimi',                20, g('keyboard_access'),      ['onclick olan div/span elementlerine role ve onkeydown ekleyin.']),
      buildResult('tabindex',             '2.4.3', 'A',   'Tabindex Kullanımı',            15, g('tabindex'),             ['Pozitif tabindex kullanmayın; tabindex="-1" interaktif elementlerde dikkatli olun.']),
      buildResult('empty_buttons_links',  '4.1.2', 'A',   'Boş Buton ve Link',             15, g('empty_buttons_links'),  ['Buton ve linklere açıklayıcı metin veya aria-label ekleyin.']),
      buildResult('aria_usage',           '4.1.2', 'A',   'ARIA Kullanımı',                15, g('aria_usage'),           ['Geçerli ARIA role\'leri ve referans ID\'leri kullanın.']),
      buildResult('table_accessibility',  '1.3.1', 'A',   'Tablo Erişilebilirliği',        15, g('table_accessibility'),  ['<th scope>, <caption> ekleyin.']),
      buildResult('autoplay_media',       '1.4.2', 'A',   'Otomatik Oynatılan Medya',      15, g('autoplay_media'),       ['autoplay medyaya muted ve controls ekleyin.']),
      buildResult('viewport_meta',        '1.4.4', 'AA',  'Viewport Meta',                 10, g('viewport_meta'),        ['user-scalable=no ve maximum-scale=1 kullanmayın.']),
      buildResult('pointer_gestures',     '2.5.1', 'A',   'Pointer Hareketleri',           10, g('pointer_gestures'),     ['touch-action:none kullanmaktan kaçının.']),
      buildResult('label_in_name',        '2.5.3', 'A',   'İsimde Etiket',                 10, g('label_in_name'),        ['aria-label görünür metni içermeli.']),
      buildResult('status_messages',      '4.1.3', 'AA',  'Durum Mesajları',               10, g('status_messages'),      ['Dinamik içerik için aria-live="polite" kullanın.']),
      buildResult('animation',            '2.3.3', 'AAA', 'Animasyon Kontrolü',            10, g('animation'),            ['prefers-reduced-motion media query ekleyin.']),
    ];

    // ── 20 CSS CheckResult'ları ──────────────────────────────────────────────
    const cssResults: CheckResult[] = [
      buildResult('css_font_size',         '1.4.4', 'AA',  'CSS Font Boyutu',               15, c('css_font_size'),        ['Computed font-size min 12px olmalı.']),
      buildResult('css_focus_outline',     '2.4.7', 'AA',  'CSS Focus Outline',             20, focusResult.css,           ['outline:none veya outline:0 kullanmayın.']),
      buildResult('css_contrast',          '1.4.3', 'AA',  'CSS Renk Kontrastı (UI)',       20, contrastResult.nonText,        ['Form/UI elemanlarının border ve arka plan kontrastını 3:1 üzerinde tutun.']),
      buildResult('css_cursor',            '2.4.7', 'A',   'CSS Cursor',                    10, c('css_cursor'),           ['cursor:none kullanmaktan kaçının.']),
      buildResult('css_reflow',            '1.4.10','AA',  'CSS Reflow (320px)',             15, reflowIssues,              ['320px genişlikte yatay scroll oluşmamalı. max-width ve % kullanın.']),
      buildResult('css_animation',         '2.3.3', 'AAA', 'CSS Animasyon (prefers-motion)', 10, c('css_animation'),       ['@media (prefers-reduced-motion: reduce) ile animasyonları devre dışı bırakın.']),
      buildResult('css_display_none',      '1.4.13','AA',  'CSS Gizleme',                   10, c('css_display_none'),     ['display:none içinde focusable element olmamalı.']),
      buildResult('touch_target',          '2.5.5', 'AA',  'Touch Target Boyutu',           15, c('touch_target'),         ['Buton ve linklerin boyutu min 44x44px olmalı.']),
      buildResult('css_line_height',       '1.4.12','AA',  'CSS Satır Yüksekliği',         10, c('css_line_height'),      ['line-height en az 1.5 olmalı.']),
      buildResult('css_letter_spacing',    '1.4.12','AA',  'CSS Harf Aralığı',             10, c('css_letter_spacing'),   ['Negatif letter-spacing kullanmayın.']),
      buildResult('focus_order',           '2.4.3', 'A',   'Odak Sırası',                   15, c('focus_order'),          ['Pozitif tabindex DOM sırasını bozar; kullanmayın.']),
      buildResult('link_purpose',          '2.4.4', 'A',   'Bağlantı Amacı',                15, c('link_purpose'),         ['"Daha fazla" yerine açıklayıcı link metni kullanın.']),
      buildResult('multiple_ways',         '2.4.5', 'AA',  'Çoklu Erişim Yolları',         10, c('multiple_ways'),        ['Arama, site haritası veya breadcrumb navigasyon ekleyin.']),
      buildResult('headings_labels',       '2.4.6', 'AA',  'Açıklayıcı Başlık & Etiket',   10, c('headings_labels'),      ['Başlıklar ve etiketler açıklayıcı olmalı.']),
      buildResult('input_assistance',      '3.3.5', 'AAA', 'Giriş Yardımı',                10, c('input_assistance'),     ['Formlarda yardım metni veya örnek değer gösterin.']),
      buildResult('error_prevention',      '3.3.4', 'AA',  'Hata Önleme',                  10, c('error_prevention'),     ['Önemli formlarda onay veya geri alma mekanizması ekleyin.']),
      buildResult('consistent_nav',        '3.2.3', 'AA',  'Tutarlı Navigasyon',            10, c('consistent_nav'),       ['<nav> veya role="navigation" ile navigasyonu tanımlayın.']),
      buildResult('consistent_id',         '3.2.4', 'AA',  'Tutarlı Tanımlama',             10, c('consistent_id'),        ['Aynı işlevdeki elementler tutarlı etiketlenmeli.']),
      buildResult('css_visibility',        '1.4.13','AA',  'CSS İçerik Görünürlüğü',       10, c('css_visibility'),       ['Hover/focus içeriği dismiss edilebilir olmalı.']),
      buildResult('non_text_contrast_css', '1.4.11','AA',  'Non-text Renk Kontrastı (CSS)', 15, cssNonTextIssues,          ['SVG ikon, focus ring ve grafik UI elemanlarının kontrastı min 3:1 olmalı.']),
    ];

    // ── Skorlama ─────────────────────────────────────────────────────────────
    const htmlEarned = htmlResults.reduce((s, r) => s + r.score, 0);
    const htmlMax    = htmlResults.reduce((s, r) => s + r.maxScore, 0);
    const htmlScore  = Math.round((htmlEarned / htmlMax) * 100);

    const cssEarned  = cssResults.reduce((s, r) => s + r.score, 0);
    const cssMax     = cssResults.reduce((s, r) => s + r.maxScore, 0);
    const cssScore   = Math.round((cssEarned / cssMax) * 100);

    const totalScore = Math.round(htmlScore * 0.6 + cssScore * 0.4);

    console.log(`[analyzer] Skorlar — HTML: ${htmlScore}, CSS: ${cssScore}, Total: ${totalScore}`);

    // ── AI Fix ───────────────────────────────────────────────────────────────
    const allResults = [...htmlResults, ...cssResults];
    const fixedHtml  = await applyAiFixes(originalHtml, allResults, type === 'url' ? input : undefined);

    return {
      htmlScore, cssScore, totalScore,
      htmlResults, cssResults,
      originalHtml, fixedHtml,
    };

  } finally {
    await browser.close();
    console.log('[analyzer] Browser kapatıldı.');
  }
}

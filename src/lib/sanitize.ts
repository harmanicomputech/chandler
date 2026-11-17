/**
 * Allow-list HTML sanitiser for migrated/CMS rich text. Content is authored by staff or migrated
 * from the legacy CMS, but we still strip scripts, event handlers, javascript: URLs and unknown
 * tags/attributes before rendering, so a compromised editor account cannot inject script.
 */
const ALLOWED_TAGS = new Set(['p','br','strong','b','em','i','u','a','ul','ol','li','h2','h3','h4','h5','blockquote','table','thead','tbody','tr','th','td','img','figure','figcaption','span','div','hr','sup','sub','iframe']);
const ALLOWED_ATTR: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'],
  iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'],
};
const IFRAME_HOSTS = ['www.youtube.com', 'www.youtube-nocookie.com', 'storymaps.arcgis.com', 'chandler.ecdev.org', 'e.issuu.com', 'www.google.com', 'player.vimeo.com'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  let out = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|form|object|embed|svg|math|template)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|link|meta|base|input|button|select|textarea)[^>]*>/gi, '');
  out = out.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(t)) return '';
    if (full.startsWith('</')) return `</${t}>`;
    const allowed = ALLOWED_ATTR[t] ?? [];
    const kept: string[] = [];
    attrs.replace(/([a-zA-Z-:]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g, (_m, name: string, _v, d, s, u) => {
      const n = name.toLowerCase(); const v = (d ?? s ?? u ?? '').trim();
      if (!allowed.includes(n)) return '';
      if ((n === 'href' || n === 'src') && /^\s*(javascript|data|vbscript):/i.test(v)) return '';
      if (t === 'iframe' && n === 'src') { try { if (!IFRAME_HOSTS.includes(new URL(v, 'https://x').host)) return ''; } catch { return ''; } }
      kept.push(`${n}="${v.replace(/"/g, '&quot;')}"`);
      return '';
    });
    if (t === 'a' && kept.some((k) => k.startsWith('href="http'))) kept.push('rel="noopener"');
    if (t === 'img') kept.push('loading="lazy"', 'decoding="async"');
    if (t === 'iframe' && !kept.some((k) => k.startsWith('src='))) return '';
    return `<${t}${kept.length ? ' ' + kept.join(' ') : ''}>`;
  });
  return out.replace(/&nbsp;/g, ' ').trim();
}

export function stripTags(html: string) { return (html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(); }
export function excerpt(html: string, n = 180) { const t = stripTags(html); return t.length > n ? t.slice(0, t.lastIndexOf(' ', n)) + '…' : t; }

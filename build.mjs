// Builds the bilingual static site into _site/.
//   English pages live at the site root; Japanese pages live under /ja/.
// Usage: npm run build   (or `npm run serve` to build and preview locally)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, '_site');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const LANGS = { en: '', ja: 'ja/' };            // language → URL prefix
const md = new MarkdownIt({ html: true, typographer: false });

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const relFor = fullPath => '../'.repeat(fullPath.split('/').filter(Boolean).length);

function readPage(file) {
  let src = fs.readFileSync(file, 'utf8');
  const meta = {};
  const m = src.match(/^---\n([\s\S]*?)\n---\n/);
  if (m) {
    for (const line of m[1].split('\n')) {
      const i = line.indexOf(':');
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    src = src.slice(m[0].length);
  }
  return { meta, body: src };
}

function slugify(text, used) {
  let s = text.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  let out = s, n = 2;
  while (used.has(out)) out = `${s}-${n++}`;
  used.add(out);
  return out;
}

// Markdown → HTML, plus the site's small extensions.
function render(markdown, { rel, pageKey }) {
  let html = md.render(markdown);
  html = html.replace(/(href|src)="@\//g, `$1="${rel}`);                       // "@/x" → relative link
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener">');
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  let n = 0;                                                                   // "- [ ] item" → saved checkbox
  html = html.replace(/<li>\[ \] ([\s\S]*?)<\/li>/g, (_, inner) => {
    const id = `${pageKey}-task-${++n}`;
    return `<li class="task"><input type="checkbox" id="${id}" data-task><label for="${id}">${inner}</label></li>`;
  });
  html = html.replace(/<ul>\n<li class="task">/g, '<ul class="tasks">\n<li class="task">');
  const used = new Set();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, lvl, inner) => `<h${lvl} id="${slugify(inner, used)}">${inner}</h${lvl}>`);
  return html;
}

// Turn "Guide 3" / "ガイド3" into links to that guide (except the page's own number).
function linkGuides(body, lang, guides, selfNum) {
  const re = lang === 'ja' ? /(?<!\[)ガイド([1-8])(?![\d\]])/g : /(?<![\w[])Guide ([1-8])(?![\w\]\d])/g;
  return body.replace(re, (m, n) => {
    const g = guides[Number(n) - 1];
    return Number(n) === selfNum || !g ? m : `[${m}](@/${LANGS[lang]}guides/${g.slug}/)`;
  });
}

function roadmap(L) {
  const rows = L.roadmap.map((p, i) => `
    <li class="phase${i === L.roadmap.length - 1 ? ' last' : ''}">
      <div class="when"><span class="std">${esc(p.standard)}</span><span class="fast">${esc(L.ui.fast)}${esc(p.fast)}</span></div>
      <div class="step">
        <h3 class="step-title">${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
        <p class="gate"><span class="diamond" aria-hidden="true"></span><span><span class="gate-label">${esc(L.ui.doneWhen)}</span>${esc(p.gate)}</span></p>
      </div>
    </li>`).join('');
  return `<figure class="roadmap"><figcaption>${esc(L.ui.roadmapCaption)}</figcaption><ol>${rows}</ol></figure>`;
}

// Page shell. `suffix` is the page's path within its language (e.g. "guides/01-x/").
function layout({ lang, suffix, title, description, body, bodyClass = '', headExtra = '' }) {
  const L = SITE[lang];
  const rel = relFor(LANGS[lang] + suffix);
  const fullTitle = title === L.title ? title : `${title} · ${L.title}`;
  const switcher = Object.keys(LANGS).map(code => {
    const here = code === lang;
    return `<a href="${rel}${LANGS[code]}${suffix}" lang="${SITE[code].htmlLang}" hreflang="${SITE[code].htmlLang}" data-lang="${code}"${here ? ' aria-current="true"' : ''}>${esc(SITE[code].langName)}</a>`;
  }).join('');
  const alternates = Object.keys(LANGS).map(code =>
    `<link rel="alternate" hreflang="${SITE[code].htmlLang}" href="${rel}${LANGS[code]}${suffix}">`).join('\n');
  return `<!doctype html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
${alternates}
${headExtra}
<link rel="icon" href="${rel}assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=Shippori+Mincho+B1:wght@700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<link rel="stylesheet" href="${rel}assets/style.css">
</head>
<body class="${bodyClass}">
<header class="site-bar">
  <div class="wrap bar-inner">
    <a class="site-name" href="${rel}${LANGS[lang]}">${esc(L.title)}</a>
    <nav class="lang-switch" aria-label="${esc(L.ui.langNav)}">${switcher}</nav>
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-foot">
  <div class="wrap"><p>${esc(L.footer)}</p></div>
</footer>
<script src="${rel}assets/site.js"></script>
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(ROOT, 'static'), OUT);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

let count = 0;
for (const lang of Object.keys(LANGS)) {
  const L = SITE[lang];
  const prefix = LANGS[lang];
  const guideDir = path.join(ROOT, 'content', lang, 'guides');
  const guides = fs.readdirSync(guideDir).filter(f => f.endsWith('.md')).sort().map((f, i) => {
    const { meta, body } = readPage(path.join(guideDir, f));
    return { num: i + 1, slug: f.replace(/\.md$/, ''), meta, body };
  });
  const total = guides.length;

  // Guides
  for (const g of guides) {
    const suffix = `guides/${g.slug}/`;
    const rel = relFor(prefix + suffix);
    let html = render(linkGuides(g.body, lang, guides, g.num), { rel, pageKey: `${lang}-${g.slug}` });
    html = html.replace('<!-- roadmap -->', roadmap(L));
    const prev = guides[g.num - 2], next = guides[g.num];
    const home = `${rel}${prefix}`;
    const pager = `<nav class="pager">
    ${prev ? `<a class="prev" href="${home}guides/${prev.slug}/"><span class="dir">${esc(fill(L.ui.prev, { n: prev.num }))}</span><span class="t">${esc(prev.meta.title)}</span></a>` : '<span></span>'}
    ${next ? `<a class="next" href="${home}guides/${next.slug}/"><span class="dir">${esc(fill(L.ui.next, { n: next.num }))}</span><span class="t">${esc(next.meta.title)}</span></a>` : `<a class="next" href="${home}"><span class="dir">${esc(L.ui.finished)}</span><span class="t">${esc(L.ui.backToAll)}</span></a>`}
  </nav>`;
    const page = `<article class="doc">
  <p class="eyebrow">${esc(fill(L.ui.guideOf, { n: g.num, total }))}</p>
  <h1>${esc(g.meta.title)}</h1>
  <p class="updated">${esc(L.updated)}</p>
  ${html}
  ${pager}
</article>`;
    write(prefix + suffix + 'index.html', layout({ lang, suffix, title: g.meta.title, description: g.meta.summary, body: page }));
    count++;
  }

  // Worksheet
  {
    const suffix = 'worksheet/';
    const rel = relFor(prefix + suffix);
    const { meta, body } = readPage(path.join(ROOT, 'content', lang, 'worksheet.md'));
    const page = `<article class="doc">
  <p class="eyebrow">${esc(L.ui.tool)}</p>
  <h1>${esc(meta.title)}</h1>
  <p class="updated">${esc(L.updated)}</p>
  ${render(body, { rel, pageKey: `${lang}-worksheet` })}
</article>`;
    write(prefix + suffix + 'index.html', layout({ lang, suffix, title: meta.title, description: meta.summary, body: page }));
    count++;
  }

  // Landing page
  {
    const rel = relFor(prefix);
    const list = guides.map(g => `
      <li><a href="guides/${g.slug}/">
        <span class="num">${String(g.num).padStart(2, '0')}</span>
        <span class="txt"><span class="t">${esc(g.meta.title)}</span><span class="s">${esc(g.meta.summary)}</span></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a></li>`).join('');
    const tools = L.tools.map(t => `
      <li><a class="tool" href="${t.root ? rel : ''}${t.href}"${t.download ? ' download' : ''}${t.lang ? ` lang="${t.lang}"` : ''}>
        <span class="kind">${esc(t.kind)}</span>
        <span class="t">${esc(t.title)}</span>
        <span class="s">${esc(t.text)}</span>
      </a></li>`).join('');
    const page = `<section class="hero">
  <h1>${esc(L.headline)}</h1>
  <p class="lede">${esc(L.lede)}</p>
  <div class="actions">
    <a class="btn primary" href="${rel}${L.roleFinder}">${esc(L.ui.findRole)}</a>
    <a class="btn" href="guides/${guides[0].slug}/">${esc(L.ui.startGuide1)}</a>
  </div>
</section>
<section class="block" aria-labelledby="guides-h">
  <h2 id="guides-h">${esc(L.ui.guidesH)}</h2>
  <p class="block-lede">${esc(L.ui.guidesLede)}</p>
  <ol class="guide-list">${list}
  </ol>
</section>
<section class="block" aria-labelledby="tools-h">
  <h2 id="tools-h">${esc(L.ui.toolsH)}</h2>
  <ul class="tool-grid">${tools}
  </ul>
</section>`;
    // The English home page sends Japanese-language browsers (or people who chose Japanese) to /ja/.
    const headExtra = lang === 'en'
      ? `<script>try{var p=localStorage.getItem('mcg:lang');if(p==='ja'||(!p&&/^ja\\b/i.test(navigator.language||'')))location.replace('ja/');}catch(e){}</script>`
      : '';
    write(prefix + 'index.html', layout({ lang, suffix: '', title: L.title, description: L.lede, body: page, bodyClass: 'home', headExtra }));
    count++;
  }
}

console.log(`Built ${count} pages (English and Japanese) into _site/`);

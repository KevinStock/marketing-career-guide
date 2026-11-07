// Builds the static site into _site/.
// Usage: npm run build   (then open _site/index.html, or run `npm run serve`)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, '_site');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const md = new MarkdownIt({ html: true, typographer: false });

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  // Root-relative links: "@/path" → relative to this page.
  html = html.replace(/(href|src)="@\//g, `$1="${rel}`);
  // External links open in a new tab.
  html = html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener">');
  // Tables scroll inside their own box on small screens.
  html = html.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
  // Task lists: "- [ ] item" → a checkbox that remembers its state.
  let n = 0;
  html = html.replace(/<li>\[ \] ([\s\S]*?)<\/li>/g, (_, inner) => {
    const id = `${pageKey}-task-${++n}`;
    return `<li class="task"><input type="checkbox" id="${id}" data-task><label for="${id}">${inner}</label></li>`;
  });
  html = html.replace(/<ul>\n<li class="task">/g, '<ul class="tasks">\n<li class="task">');
  // Anchor ids on section headings.
  const used = new Set();
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, lvl, inner) => `<h${lvl} id="${slugify(inner, used)}">${inner}</h${lvl}>`);
  return html;
}

function roadmap() {
  const rows = SITE.roadmap.map((p, i) => `
    <li class="phase${i === SITE.roadmap.length - 1 ? ' last' : ''}">
      <div class="when"><span class="std">${esc(p.standard)}</span><span class="fast">Fast: ${esc(p.fast)}</span></div>
      <div class="step">
        <h3 class="step-title">${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
        <p class="gate"><span class="diamond" aria-hidden="true"></span><span><span class="gate-label">Done when:</span> ${esc(p.gate)}</span></p>
      </div>
    </li>`).join('');
  return `<figure class="roadmap"><figcaption>Six months part time, or about three months full time</figcaption><ol>${rows}</ol></figure>`;
}

function layout({ title, description, rel, body, bodyClass = '', crumb = '' }) {
  const fullTitle = title === SITE.title ? title : `${title} · ${SITE.title}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<link rel="icon" href="${rel}assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=Shippori+Mincho+B1:wght@700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<link rel="stylesheet" href="${rel}assets/style.css">
</head>
<body class="${bodyClass}">
<header class="site-bar">
  <div class="wrap bar-inner">
    <a class="site-name" href="${rel}">${esc(SITE.title)}</a>
    ${crumb ? `<span class="crumb">${crumb}</span>` : ''}
  </div>
</header>
<main class="wrap">
${body}
</main>
<footer class="site-foot">
  <div class="wrap">
    <p>${esc(SITE.footer)}</p>
    <p lang="ja">${esc(SITE.footerJa)}</p>
  </div>
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

const guideDir = path.join(ROOT, 'content', 'guides');
const guides = fs.readdirSync(guideDir).filter(f => f.endsWith('.md')).sort().map((f, i) => {
  const { meta, body } = readPage(path.join(guideDir, f));
  return { num: i + 1, slug: f.replace(/\.md$/, ''), meta, body };
});

for (const g of guides) {
  const rel = '../../';
  // Link "Guide N" mentions to that guide (not the page's own number).
  let body = g.body.replace(/(?<![\w[])Guide ([1-8])(?![\w\]])/g, (m, n) => {
    const target = guides[Number(n) - 1];
    return Number(n) === g.num || !target ? m : `[Guide ${n}](@/guides/${target.slug}/)`;
  });
  let html = render(body, { rel, pageKey: g.slug });
  html = html.replace('<!-- roadmap -->', roadmap());
  const prev = guides[g.num - 2], next = guides[g.num];
  const pager = `<nav class="pager" aria-label="Guides">
    ${prev ? `<a class="prev" href="${rel}guides/${prev.slug}/"><span class="dir">Previous · Guide ${prev.num}</span><span class="t">${esc(prev.meta.title)}</span></a>` : '<span></span>'}
    ${next ? `<a class="next" href="${rel}guides/${next.slug}/"><span class="dir">Next · Guide ${next.num}</span><span class="t">${esc(next.meta.title)}</span></a>` : `<a class="next" href="${rel}"><span class="dir">Finished</span><span class="t">Back to all guides</span></a>`}
  </nav>`;
  const page = `<article class="doc">
  <p class="eyebrow">Guide ${g.num} of ${guides.length}</p>
  <h1>${esc(g.meta.title)}</h1>
  <p class="updated">Updated ${esc(SITE.updated)}</p>
  ${html}
  ${pager}
</article>`;
  write(`guides/${g.slug}/index.html`, layout({ title: g.meta.title, description: g.meta.summary, rel, body: page, crumb: `Guide ${g.num} of ${guides.length}` }));
}

// Worksheet
{
  const { meta, body } = readPage(path.join(ROOT, 'content', 'worksheet.md'));
  const rel = '../';
  const page = `<article class="doc">
  <p class="eyebrow">Tool</p>
  <h1>${esc(meta.title)}</h1>
  <p class="updated">Updated ${esc(SITE.updated)}</p>
  ${render(body, { rel, pageKey: 'worksheet' })}
</article>`;
  write('worksheet/index.html', layout({ title: meta.title, description: meta.summary, rel, body: page, crumb: 'Worksheet' }));
}

// Landing page
{
  const rel = '';
  const list = guides.map(g => `
      <li><a href="guides/${g.slug}/">
        <span class="num">${String(g.num).padStart(2, '0')}</span>
        <span class="txt"><span class="t">${esc(g.meta.title)}</span><span class="s">${esc(g.meta.summary)}</span></span>
        <span class="arrow" aria-hidden="true">→</span>
      </a></li>`).join('');
  const tools = SITE.tools.map(t => `
      <li><a class="tool" href="${t.href}"${t.download ? ' download' : ''}>
        <span class="kind">${esc(t.kind)}</span>
        <span class="t">${esc(t.title)}</span>
        <span class="s">${esc(t.text)}</span>
      </a></li>`).join('');
  const page = `<section class="hero">
  <h1>${esc(SITE.headline)}</h1>
  <p class="lede">${esc(SITE.lede)}</p>
  <div class="actions">
    <a class="btn primary" href="role-finder/">Find your role</a>
    <a class="btn" href="guides/${guides[0].slug}/">Start with Guide 1</a>
  </div>
</section>
<section class="block" aria-labelledby="guides-h">
  <h2 id="guides-h">The guides</h2>
  <p class="block-lede">Work through them in order. Each one takes 10–15 minutes to read.</p>
  <ol class="guide-list">${list}
  </ol>
</section>
<section class="block" aria-labelledby="tools-h">
  <h2 id="tools-h">Tools and downloads</h2>
  <ul class="tool-grid">${tools}
  </ul>
</section>`;
  write('index.html', layout({ title: SITE.title, description: SITE.lede, rel, body: page, bodyClass: 'home' }));
}

console.log(`Built ${guides.length} guides, worksheet and landing page into _site/`);

# Marketing Career Guide

A self-study path into targeted marketing in Japan, in English and Japanese: eight short guides, a bilingual role finder, a worksheet and fillable PDFs. The site is published with GitHub Pages:

- English: <https://kevinstock.github.io/marketing-career-guide/>
- 日本語: <https://kevinstock.github.io/marketing-career-guide/ja/>

Every page has an English / 日本語 switch that opens the same page in the other language. The English home page sends visitors whose browser is set to Japanese to `/ja/`, unless they have chosen English.

## Editing

| To change | Edit |
| --- | --- |
| An English guide | `content/en/guides/NN-slug.md` |
| A Japanese guide | `content/ja/guides/NN-slug.md` (same file name as the English one) |
| The worksheet | `content/en/worksheet.md`, `content/ja/worksheet.md` |
| Landing page text, tool cards, footer, labels, career-plan roadmap | `site.json` (`en` and `ja` sections) |
| Styles | `static/assets/style.css` |
| Role Finder (both languages) | `static/role-finder/index.html` (strings are in the `T` object) |
| PDFs | Replace the files in `static/downloads/` |

Push to `main` and the **Publish site** workflow rebuilds and deploys the site in about a minute.

### Writing conventions

- Each Markdown file starts with front matter: `title` and `summary` (shown on the landing page).
- Keep the English and Japanese file names identical so the language switch links the right pages.
- Link to another page with `@/`, for example `[Role Finder](@/role-finder/?lang=en)` or `[ガイド2](@/ja/guides/02-roles-and-career-paths/)`. The build turns it into a relative link.
- Plain mentions of `Guide 3` (English) or `ガイド3` (Japanese) become links to that guide automatically.
- `- [ ] item` makes a checkbox that remembers its state in the reader's browser.
- New guides are picked up automatically; the number prefix sets their order.

## Building locally

```sh
npm install
npm run serve   # builds into _site/ and serves it at http://localhost:8080
```

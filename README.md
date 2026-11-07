# Marketing Career Guide

A self-study path into targeted marketing in Japan: eight short guides, a bilingual role finder, a worksheet and fillable PDFs. The site is published with GitHub Pages at <https://kevinstock.github.io/marketing-career-guide/>.

## Editing

| To change | Edit |
| --- | --- |
| A guide | `content/guides/NN-slug.md` |
| The worksheet | `content/worksheet.md` |
| Landing page text, tool cards, footer, career-plan roadmap | `site.json` |
| Styles | `static/assets/style.css` |
| Role Finder (English and Japanese) | `static/role-finder/index.html` (strings are in the `T` object) |
| PDFs | Replace the files in `static/downloads/` |

Push to `main` and the **Publish site** workflow rebuilds and deploys the site in about a minute.

### Writing conventions

- Each Markdown file starts with front matter: `title` and `summary` (shown on the landing page).
- Link to another page on the site with `@/`, for example `[Role Finder](@/role-finder/)`. The build turns it into a relative link.
- Plain mentions of `Guide 3` become links to that guide automatically.
- `- [ ] item` makes a checkbox that remembers its state in the reader's browser.
- New guides are picked up automatically; the number prefix sets their order.

## Building locally

```sh
npm install
npm run serve   # builds into _site/ and serves it at http://localhost:8080
```

## Japanese version

The guides are English only for now. The Role Finder and the PDFs are already bilingual.

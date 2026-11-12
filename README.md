# GlossQuote Visuals

原創視覺網頁作品集：研究排版、材質、光影與互動如何一起構成一個有個性的網站。

Original visual websites exploring typography, materials, light and interaction. Each work has its own composition and art direction; this is not a set of recolored templates.

**Status:** M01 is live with the bilingual gallery, Paper & Light, Liquid Archive and Night Signal. See the work registry for acceptance and release status.

[繁中畫廊](https://kystr.github.io/glossquote-visuals/) · [English gallery](https://kystr.github.io/glossquote-visuals/en/)

- Source: https://github.com/KYStr/glossquote-visuals
- Start development: [START-HERE.md](START-HERE.md)
- Continuing objective: [GOAL.md](GOAL.md)
- Work status: [coordination/work-registry.json](coordination/work-registry.json)
- Upstream skill and licenses: [docs/UPSTREAM.md](docs/UPSTREAM.md)
- Paper & Light design and verification: [evidence/V001/DESIGN.md](evidence/V001/DESIGN.md)
- Liquid Archive design and verification: [evidence/V002/DESIGN.md](evidence/V002/DESIGN.md)
- Night Signal design and verification: [evidence/V003/DESIGN.md](evidence/V003/DESIGN.md)

Initial works: **紙與光 / Paper & Light**, **流體檔案 / Liquid Archive**, **夜航訊號 / Night Signal**. Art directions and acceptance criteria are written before implementation. Future directions are in [docs/IDEAS.md](docs/IDEAS.md), not counted as ready production.

Shaders are progressive enhancement. Essential content and navigation remain HTML; a designed static fallback is always available. No accounts, uploads, analytics or third-party runtime requests are intended. These promises must be checked before each release.

Original source is made public for inspection; no blanket license is granted to original artworks at bootstrap. Vendored upstream material retains its own MIT license in `licenses/shaders-MIT.txt`. Record any future asset licenses individually.

## Reproduce the candidate

Use Node.js `24.14.0`. The candidate build uses the GitHub Pages project path and marks candidate HTML as noindex.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

The preview serves the bilingual gallery at `/glossquote-visuals/`. The browser verification command runs in the repository's GitHub-hosted workflow. Third-party notices for the emitted shader bundle are in [public/licenses/NOTICES.txt](public/licenses/NOTICES.txt).

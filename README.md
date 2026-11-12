# GlossQuote Visuals

原創品牌網站作品集：以紙品訂製、金屬家飾與音樂活動為主題，將材質、光影與完整顧客流程結合。

Original brand websites for bespoke stationery, steel homeware and an electronic music event. Each brings its own art direction, material language and complete customer journey.

**Status:** The M02 integration candidate `40d3740761c2c8b44f41bf8efe0723e03f8a650a` passed the complete isolated-browser suite and non-author design review. All nine category scores are strictly above 9/10. M02 is live at deployment `06709c4d6ccdd60096e3e5282bcbe9b329d08c24`. The release build, Pages deployment and actual HTTPS/browser verification all passed. [Release evidence](evidence/M02/06709c4d6ccdd60096e3e5282bcbe9b329d08c24/RELEASE.md). See the work registry for exact release status and preserved M01 history.

| Website | Art direction | UI design | Commercial completeness | Fixed-candidate review |
|---|---:|---:|---:|---|
| Paper & Light | 9.2 | 9.3 | 9.2 | [V001](evidence/V001/40d3740761c2c8b44f41bf8efe0723e03f8a650a/REVIEW.md) |
| FORME Objects | 9.3 | 9.2 | 9.3 | [V002](evidence/V002/40d3740761c2c8b44f41bf8efe0723e03f8a650a/REVIEW.md) |
| Night Signal | 9.2 | 9.3 | 9.5 | [V003](evidence/V003/40d3740761c2c8b44f41bf8efe0723e03f8a650a/REVIEW.md) |

These are evidence-backed design judgments for concept websites, not measured conversion rates or external certification. [Integrated verification and limitations](evidence/M02/40d3740761c2c8b44f41bf8efe0723e03f8a650a/INTEGRATION.md).

[繁中畫廊](https://kystr.github.io/glossquote-visuals/) · [English gallery](https://kystr.github.io/glossquote-visuals/en/)

- Source: https://github.com/KYStr/glossquote-visuals
- Start development: [START-HERE.md](START-HERE.md)
- Continuing objective: [GOAL.md](GOAL.md)
- Work status: [coordination/work-registry.json](coordination/work-registry.json)
- Upstream skill and licenses: [docs/UPSTREAM.md](docs/UPSTREAM.md)
- Historical M01 design baselines: [Paper & Light](evidence/V001/DESIGN.md), [Liquid Archive](evidence/V002/DESIGN.md), [Night Signal](evidence/V003/DESIGN.md)

Current works: **紙與光 / Paper & Light**, **物形 / FORME Objects**, **夜航訊號 / Night Signal**. These are original concept brands. Customer flows create local briefs or itineraries; they do not submit orders, collect payments or reserve tickets. Art direction and review criteria are in [docs/M02-ART-DIRECTION.md](docs/M02-ART-DIRECTION.md). Future directions in [docs/IDEAS.md](docs/IDEAS.md) are not counted as ready production.

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

# GlossQuote Visuals

五個原創雙語商業網站作品：紙品訂製、不鏽鋼家飾、電子音樂活動、建築玻璃及動態設計服務。每件都有獨立的品牌、WebGPU 主視覺、產品或服務資訊，以及能選配、修改和下載的顧客需求流程。

Five original bilingual concept websites, combining distinct brand identities, shader-led art direction and complete local customer journeys.

**Status:** M03 is deployed, but final visual acceptance is blocked by a newly observed V001 English paused-layout defect at 1100px. The author is repairing it; previous scores remain historical until the corrected candidate is independently rendered and reviewed. [Original failure](evidence/M03/a7cb4ca0a598cd9b9c91d28dc28e121b7f2aea06/caption-rejected/REVIEW.md).

[繁中作品集](https://kystr.github.io/glossquote-visuals/) · [English portfolio](https://kystr.github.io/glossquote-visuals/en/) · [Verification and limits](evidence/M03/8fa4e8bcb86748fb100a10fd5a07904761e3c933/INTEGRATION.md)

| Website | Art direction | UI design | Commercial completeness | Independent review |
|---|---:|---:|---:|---|
| 紙與光 / Paper & Light | 9.2 | 9.3 | 9.4 | [Review](evidence/V001/8fa4e8bcb86748fb100a10fd5a07904761e3c933/REVIEW.md) |
| FORME Objects | 9.1 | 9.2 | 9.4 | [Review](evidence/V002/8fa4e8bcb86748fb100a10fd5a07904761e3c933/REVIEW.md) |
| 夜航訊號 / Night Signal | 9.1 | 9.2 | 9.4 | [Review](evidence/V003/8fa4e8bcb86748fb100a10fd5a07904761e3c933/REVIEW.md) |
| 折光材料室 / PRISM Materials | 9.2 | 9.3 | 9.4 | [Review](evidence/V004/8fa4e8bcb86748fb100a10fd5a07904761e3c933/REVIEW.md) |
| 空型動態設計 / AERIFORM | 9.1 | 9.2 | 9.3 | [Review](evidence/V005/8fa4e8bcb86748fb100a10fd5a07904761e3c933/REVIEW.md) |

Every category must independently exceed 9/10 under the fixed [commercial design rubric](docs/M02-ART-DIRECTION.md). These scores are non-author design judgments, not market certification or measured conversion rates. The review covers original desktop/mobile frames, material coherence through complete motion cycles, controls and a pause that preserves the current rendered frame.

The five sites are concept brands. Customer flows produce local briefs, sample lists, product inquiries or itineraries. They do not submit orders, collect payments or reserve tickets.

Static hosting serves HTML, CSS and JavaScript; WebGPU renders the live visuals in the browser. Readable HTML and designed still alternatives remain available without JavaScript or GPU, and with reduced motion. Fonts and runtime assets are bundled locally; the isolated browser checks verify same-origin static requests, privacy, lifecycle and customer flows.

Each new work uses a new sidebar-visible production chat requested as `gpt-6.1-sol / high`. Revisions stay in that work's chat. The director owns art direction, independent review, integration and release. Requested configuration is recorded separately from backend model identity, which is not independently exposed.

- Development entry: [START-HERE.md](START-HERE.md)
- Exact work and release state: [work registry](coordination/work-registry.json)
- Review and release records: [evidence status](evidence/STATUS.md)
- Upstream API, adapters and licenses: [UPSTREAM](docs/UPSTREAM.md)
- Historical M02 release: [release evidence](evidence/M02/06709c4d6ccdd60096e3e5282bcbe9b329d08c24/RELEASE.md)
- Historical M01 assessment: [design baseline](docs/M02-ART-DIRECTION.md)

## Reproduce the candidate

Use Node.js `24.14.0` and the committed lockfile. Dependencies include `shaders 4.0.7`, `vite 8.3.8` and `playwright 1.65.0`.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

The candidate build uses `/glossquote-visuals/` and marks its HTML as noindex. Browser verification runs only in documented isolated GitHub-hosted Windows VMs. Eight candidate lanes and their aggregate must pass before publication; release and actual HTTPS verification are separate steps. Software GPU evidence does not establish physical-device FPS, battery behavior or a human screen-reader audit.

Original source is public for inspection; no blanket license is granted to original artworks. Vendored upstream material retains its MIT license in `licenses/shaders-MIT.txt`; bundled third-party notices are in [NOTICES](public/licenses/NOTICES.txt).

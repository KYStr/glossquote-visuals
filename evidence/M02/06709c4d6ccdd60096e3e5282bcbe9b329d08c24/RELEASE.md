# M02 commercial collection — published

Deployed source: `06709c4d6ccdd60096e3e5282bcbe9b329d08c24`.
Reviewed application candidate: `40d3740761c2c8b44f41bf8efe0723e03f8a650a`.
The intervening changes are review evidence, registry and README metadata; application source is unchanged.

[Traditional Chinese portfolio](https://kystr.github.io/glossquote-visuals/) · [English portfolio](https://kystr.github.io/glossquote-visuals/en/) · [Release workflow](https://github.com/KYStr/glossquote-visuals/actions/runs/43276174243)

| Website | Art | UI | Commercial | Live Chinese / English |
|---|---:|---:|---:|---|
| Paper & Light | 9.2 | 9.3 | 9.2 | [中文](https://kystr.github.io/glossquote-visuals/works/paper-light/) / [English](https://kystr.github.io/glossquote-visuals/en/works/paper-light/) |
| FORME Objects | 9.3 | 9.2 | 9.3 | [中文](https://kystr.github.io/glossquote-visuals/works/liquid-archive/) / [English](https://kystr.github.io/glossquote-visuals/en/works/liquid-archive/) |
| Night Signal | 9.2 | 9.3 | 9.5 | [中文](https://kystr.github.io/glossquote-visuals/works/night-signal/) / [English](https://kystr.github.io/glossquote-visuals/en/works/night-signal/) |

All scores are non-author judgments from the fixed candidate's fifteen-criterion rubric and real rendered/interaction evidence. Every category exceeds 9 independently. They are not conversion-rate measurements or external certification.

## Observed release checks

- Build job `131385087076`: release proof for all three works, clean install, source check, 13 unit tests, production build and complete isolated-browser suite passed.
- Deploy job `131386671006`: GitHub Pages deployment succeeded.
- Live job `131386842132`: both languages of all three websites were opened through the live gallery; source links, indexed metadata, share images, visible WebGPU output, real composite control effects, same-origin request privacy and gallery backlinks passed.
- The live composition tests keep original opacity, blend modes and masks. A/A/B/A measurements distinguish control changes from natural animation; native pause supplies a static comparison. Mean composite control differences were 7.07–7.10 for paper, 3.36–4.75 for FORME and 6.02–6.04 for Night Signal, exceeding observed drift. The commissioning director also inspected the three actual live hero composites.
- A separate HTTPS readback checked eight localized pages, 32 static resources, correct canonical/language/index metadata, deployment source links, and an actual unknown-path 404. [HTTP results](https-check.json)
- The public [release receipt](release.json) lists exactly V001, V002 and V003, all bound to the reviewed candidate and this deployment SHA.

Live artifact `13970442424` SHA-256 is `93c88e6cebf35b426fa638bc2482499c82b4dfd6404037e944c6f97d281e7de2`; the downloaded archive matched before extraction. [CI receipt](CI.json) · [Browser results](results.json). The same directory preserves all 66 live screenshots, including original composites and separately identified shader-only output.

## Remaining limits

Rendering was verified on isolated GitHub-hosted Windows Server 2025 with Chromium, SwiftShader WebGPU and WARP composition. Physical GPU/mobile performance, battery use, complete screen-reader operation, human usability, external acceptance and real commercial conversion are NOT_RUN. Concept brands generate local summaries; no actual order, payment or seat reservation is transmitted. Candidate acceptance records retain their original pre-release scope; this record supplies the subsequent live evidence.

No persistent Windows environment or global/system Git configuration was changed. Raw machine-local guard snapshots remain excluded from the source and delivery.

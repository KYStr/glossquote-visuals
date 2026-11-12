# M02 integrated commercial collection

Candidate: `40d3740761c2c8b44f41bf8efe0723e03f8a650a` · [PR #7](https://github.com/KYStr/glossquote-visuals/pull/7)

The integration preserves the author branches: Paper & Light `88ec74e0da4c4062c065b56c3bf781d504043c89`, FORME `918a2feef5f1de5bd85aff7fdedbbf46e1355a0c`, and Night Signal `82ba3063ec2e7bd2bddee2a6efe7307563d8a7bd`. The commissioning director owns shared gallery, registry, release code and integration. The work authors are the three separately recorded production chats.

## Fixed-candidate verification

[Actions run 43272957275](https://github.com/KYStr/glossquote-visuals/actions/runs/43272957275), job `131373875460`, passed clean installation, source checks, 13 unit tests, production build, and the complete browser suite. Artifact `13969476687` has SHA-256 `372edbaaddbaf5fd476ae7778f457424d7f819da1f595e5c77a0c35b93999bd8`; the downloaded archive matched this digest before extraction. [CI receipt](CI.json)

All three websites were exercised in Traditional Chinese and English at 320, 390, 768 and 1440 CSS pixels, with 200% text-size checks, keyboard/touch input, no-JS/no-GPU/reduced-motion fallback, pause, offscreen/hidden lifecycle, device recovery, and same-origin privacy inspection. Customer tests saved and compared the actual bilingual downloaded briefs, inquiry lists and itineraries. See each work's same-candidate `results.json`, screenshots and `.txt` files.

The extra 1100px composition tests use original CSS, measure A/A drift, change a real control A/B/A, read the independent WebGPU texture, and compare with the native pause state. They do not force an opaque canvas to claim visible rendering. Observed composite mean differences for the forward control change were approximately 7.12 for paper light angle, 3.97–4.02 for FORME light angle, and 6.13 for Night Signal program selection. Corresponding natural drift was 0.002, 0.018–0.026 and 0.265. These are RGB screenshot differences, not perceptual quality scores or frame-rate claims.

Both gallery renders were inspected. Their thumbnails and descriptions now identify the three commercial concepts and lead to the correct localized routes. The gallery has no active GPU canvas.

## Limits and release boundary

The environment is a GitHub-hosted Windows Server 2025 VM with Chromium 158.0.8127.18, SwiftShader WebGPU and WARP composition. Physical GPU/mobile performance, battery consumption, complete screen-reader interaction, human usability and conversion results are NOT_RUN. Some viewport checks are automated layout/interaction assertions rather than a saved screenshot at every possible state.

This record proves the candidate build. Independent per-work acceptance is stored under each work's matching commit directory. Deployment and actual HTTPS/browser verification are separate and must be recorded after the Pages workflow succeeds. The three brands are original concepts; their local downloads do not place orders, accept payment or reserve tickets.

# V00 primary review

Date: 2026-11-12. This reviews studio setup, not a finished visual website.

Independent read-only reviewer `visuals_upstream_review` requested Sol/medium; primary inspected actual created files, upstream skill blob hashes, registry and publication result. Reviewer found unsupported rendererSettings/fps/DPR assumptions; the brief and acceptance matrix now describe measurable targets and the actual public API limitation. Release instructions now bind accepted commit/ref to artifact and github-pages environment, and correctly distinguish meta CSP from response headers. Registry has explicit branch fields. Git guard repeats ancestor validation after directory creation.

Bootstrap checks performed by primary: exact two vendored skill blobs match pinned upstream tree, upstream MIT retained, three registry briefs exist and are not falsely implemented/live, six Markdown relative links resolve, JS guard parses, Git fingerprints unchanged, staged diff whitespace check passes. New repository API reports public/main, and remote main matches initial local commit `22cbb38ec1203d2ac465d4b39e781bdd31bea267` (later bootstrap documentation corrections preserve this initial commit).

NOT_RUN: shader runtime, UI rendering, performance, Network/Storage, Pages deployment, external review. They are future M01 product gates; no tests or sites are claimed passed by this setup review.

Durable chat was created with requested gpt-6.1-sol/max; App tool accepted these settings. No independently exposed backend model identity was available. V00 chat setup returned its actual working directory and tool versions, saved locally in excluded HANDOFF-READY.md.

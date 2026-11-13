# M03 release — final live verification pending

- Deployed source: `a7cb4ca0a598cd9b9c91d28dc28e121b7f2aea06`.
- Reviewed candidate: `8fa4e8bcb86748fb100a10fd5a07904761e3c933`.
- [Pages run 43378478650](https://github.com/KYStr/glossquote-visuals/actions/runs/43378478650): build and deploy succeeded; overall run failed in its live job.
- [Attempt 1 original report](attempt-1-failed/results.json): FORME locator screenshot timed out waiting for element stability.
- [Attempt 2 original report](attempt-2-failed/results.json): FORME isolated output had 378 colors, but its first controlled GPU readback timed out. No completed FORME control comparison exists in this attempt.
- [Independent HTTPS readback](https-check.json): twelve localized pages, 47 same-origin resources, receipt, sitemap, robots and actual missing-path 404 passed.

Neither timeout is relabeled as a product pass. Existing evidence does not establish the exact root cause. A separate read-only isolated verifier retains the deployed SHA and records its own source SHA, checks complete stage geometry around explicit-clip screenshots and records GPU readback phases. It does not redeploy or change application sources, scores, pixel thresholds or pause gates.

[Diagnostic verifier ef28 report](verifier-ef28-failed/results.json) also failed at FORME a0. Its instrumented phase is `submitted`, before `buffer.mapAsync` resolves; it recorded 676 texture acquisitions, a 780×445 target, running motion and visible document. This narrows the stage but does not prove the root cause. The next verifier moves unchanged control/pause checks before diagnostic and full-page screenshots, matching the accepted candidate order; both screenshot checks remain afterward.

[Verifier 3339 original report](verifier-3339-failed/results.json): FORME zh now completed all controlled GPU/composite states, native frozen pause with zero submissions and resume. The subsequent still screenshot after automatic motion resumed timed out. The next verifier takes diagnostic/full-page stills using the product native pause after all motion gates pass, then resumes before backlink navigation. Paused stills are explicitly labeled and never substituted for temporal evidence.

[Verifier e316 original report](verifier-e316-failed/results.json) passed both locales for the first three works, including all controls, native freeze/resume, isolated/full-page stills and backlinks. It then timed out on the obsolete `.site-footer` selector: the new works use `prism-footer` and `site-end`. The next verifier checks semantic footer links by exact deployed-source and locale-correct gallery URLs, preserving the navigation assertions without forcing a shared CSS class.

[Verifier 1e62 technical report](verifier-1e62-technical-pass/results.json) passed all ten locales, but independent original-image review subsequently rejected the V001 1100px English paused caption. [Visual rejection](caption-rejected/REVIEW.md). This technical PASS does not override the visual blocker; corrected source must be reviewed and deployed separately.

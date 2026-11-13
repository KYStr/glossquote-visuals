# V004 — rejected after technical verification

Candidate `646a2c675d4b4a2d947c4595bba1f5c10670ccd8` passed all eight isolated technical lanes in [run 43369646754](https://github.com/KYStr/glossquote-visuals/actions/runs/43369646754). It was not released.

Non-author reviewer `/root/signal_review` found that the 320px, 200% text sample form retained a narrow image/specification split, then split the remaining specification width into two further columns. The labels and values wrapped almost one character per line, and the selected material name was truncated. The responsive-accessibility criterion was reduced from 1.8 to 1.3. Scores: art **9.2**, UI **8.8**, commercial **9.4**. The UI gate failed; earlier author-candidate scores did not override this finding.

Original, unedited PNGs from artifact `14012465927` (archive SHA-256 `7a88df906e66cbf9c7e820c91b141ca34e1eb4c7344604ccfa3d5b3ad4805539`):

- [English sampling form](prism-en-320-200pct-sampling.png)
- [Traditional Chinese sampling form](prism-zh-Hant-320-200pct-sampling.png)

The producer was instructed to stack the preview and full-width specification rows when space is insufficient, retain magnified text, and provide enough width for selected material names. Full-cycle material, angle, customer-flow and same-frame pause evidence otherwise passed. The replacement candidate requires new rendered evidence and an independent recheck of this reflow.

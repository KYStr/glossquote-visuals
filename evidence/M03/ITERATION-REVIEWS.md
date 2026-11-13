# M03 — author-candidate review history

These are non-author design reviews of individual production candidates. They do not approve deployment or substitute for the final five-work integration SHA. Scores use the fixed five criteria per category in `docs/M02-ART-DIRECTION.md`; 9.0 does not pass. Original PNGs and downloads were read from the matching GitHub Actions artifacts, with archive SHA-256 verification. Local downloads are kept outside Git; the final acceptance package will retain its own matching evidence.

| Work | Fixed author candidate | Art / UI / commercial | Independent reviewer | Result |
|---|---|---|---|---|
| V001 | `5a16440b85293a4ace7e103443a87495d7f327f1` | 9.2 / 9.3 / 9.4 | `/root/commercial_review` | Paper fibers, blind-emboss shoulders, curved sheet and shadow now use a coherent surface. Five angles, desktop/mobile natural sequences, frozen pause and bilingual actual downloads reviewed. |
| V003 | `7d2fce3754ed5aa5b58230923d3a4a3600a377b7` | 9.1 / 9.2 / 9.4 | `/root/commercial_review` | Hero program selectors, 18:30 doors in completion/download, and original 0/350/700/1080 ms controlled-clock transition composites reviewed. |
| V004 | `9f02e3d889a0181269228bd3accada8349a95fff` | 9.0 / 9.3 / 9.4 | `/root/signal_review` | Rejected for the flat opaque gray-blue glass edge; commerce and layout evidence already passed. |
| V004 | `1c7f85d34dd11798ee09c059cd973bd085f1732c` | 9.2 / 9.3 / 9.4 | `/root/signal_review` | Position-dependent reflected room lighting restores edge variation. Both angle extremes, natural frames, satin and ribbed transmission reviewed. Native pause/lifecycle capture still pending after a test screenshot timeout. |
| V005 | `23849827bbf9afa54818d979ee404063c71394e7` | 8.9 / 9.2 / 9.3 | `/root/commercial_review` | All five technical lanes passed, but mobile particles still lose volumetric definition. Only mobile size/density/depth needs refinement; branding, case applications and customer flows are accepted at this stage. |
| V004 | `fa67cbc3d367a2e4547e0d9b2c818277779889db` | Same product source as `1c7f85d`; final integration review pending | `/root/signal_review` identified the capture defect | Both author workflows passed after correcting viewport-relative mobile screenshot coordinates. Native pause/queued controls remained pixel-identical and segmented 200% footer evidence was added. |
| V005 | `c9db17d750927158547171ed02c41e9410bca75d` | 9.1 / 9.2 / 9.3 | `/root/commercial_review` | Mobile particle size, density and depth floor retain the rear contours and three distinct forms. The complete 26-second sequence, scattering/regrouping and exact pause hashes were independently checked. |
| V002 | `1db807b6efe93d8b755db65efde5bb69e23abcb8` | 9.1 / 9.2 / 9.4 | `/root/commercial_review` | Both finishes retain reflected light on the outer/inner normals, a stable foot and contact shadow. Original desktop/mobile natural sequences through 12 seconds, fixed angles, held pause frames and actual bilingual inquiry downloads were reviewed. |

V002's earlier bright light-edge aliasing was reduced in `1db807b`. Its native-time sequences now run separately from the controlled-clock context, avoiding a fake-clock catch-up queue during native GPU readback. The focused author workflow passed. All five author-candidate design reviews now exceed 9; the shared integration SHA still needs its own passing checks and independent review.

## Evidence boundaries

- A natural sequence is sampled motion, not a continuous video or an FPS measurement. V003 logical transition time is the browser clock after the selection; the adjacent GPU texture and composite are not proven to be the same submitted frame.
- V004's old 18,808px-high 320/200% screenshot repeats its top after y=16,384. This is a capture limitation, not evidence of duplicated site content. DOM overflow checks remain valid; a segmented/footer capture is required.
- V005 pause captures wait for the last submitted GPU work and two compositor animation frames, then retain the strict original PNG hash comparison. This does not relax pixel tolerances or permit new renderer submissions while paused.
- The initial integrated particle-control metric bilinearly downsampled sparse points and exaggerated natural drift. Direct area averaging of the retained original pixels showed a stable torus versus a clearly different helix. The A/A/B/A control comparator now averages all source pixels into each 80×60 cell, retaining the same three-times-drift threshold. Other existing movement metrics keep their original sampling, and full-resolution native-pause checks are unchanged. Original composites and independent GPU textures remain the review evidence.
- Reviews use a documented isolated Windows VM. Physical GPU/mobile, continuous-video smoothness, human screen-reader use and conversion performance remain unverified.

The M02 live release is unchanged while M03 is under review.

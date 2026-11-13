# AERIFORM mobile capture failure — retained

Candidate `5e2cbdd8adb804ed05aee718dca68cfb020ea2eb`, [run 43371916932](https://github.com/KYStr/glossquote-visuals/actions/runs/43371916932), shared job 131709388879: **FAIL**. Seven dedicated lanes passed, but this does not make the aggregate pass. The mobile pause capture was not reached.

The [original measurements](AERIFORM-CAPTURE-FAILURE.json) and eight original PNGs are retained unchanged. At 351×285 GPU resolution, texture changed cells were 642 (A/A), 1763 (A/B), 1847 (B/A), below the required 3× baseline. Opaque composite differences passed. Non-author inspection recognized ring → helix → ring, but does not retroactively pass this test.

Two capture-method defects were identified. The SDK configures premultiplied canvas alpha and writes associated RGB, while the probe passed those bytes directly to straight-alpha ImageData. Displaying the resulting transparent PNG applies alpha again; it is not a lossless record of GPU bytes. Flattening that PNG to black a second time gives a misleading pass and was rejected. Also A/A submissions were 112ms apart, while A/B and B/A were 1088/1104ms apart. A no-op selector could therefore appear different through natural particle evolution alone.

The next candidate preserves original RGBA bytes and alphaMode, unpremultiplies display PNGs, and measures fixed-black pixels directly from the associated RGB. It uses equal wait windows for evolving A/A/B/A diagnostics. Pixel ratios are not accepted as proof of a simulation's shape: release requires independent same-candidate desktop/mobile composite and GPU review of identity ring → motion helix → digital ribbon → identity ring. Missing, duplicated, unreviewed or wrong-shape evidence blocks release.

Supplemental mobile shared coverage is explicitly pause-only: visible evolution before pause, original-resolution before/action/1000ms held/resume, unchanged canvas/device/size, zero paused submissions, pointer challenge and restored evolution. Dedicated lanes retain mobile controls, three forms and natural sequences. The failed test above remains historical FAIL; new coverage must pass under its own candidate SHA.

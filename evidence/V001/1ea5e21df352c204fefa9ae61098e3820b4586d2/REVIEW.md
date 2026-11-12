# V001 Chromium 合成覆核

非作者 reviewer `/root/v001_review` 覆核 `1ea5e21df352c204fefa9ae61098e3820b4586d2`。同 SHA 的遠端 run 讀回 804 × 574 WebGPU texture，236 種樣本色，GPU validation errors 為零。Chromium 的 ANGLE 使用 Mesa llvmpipe，Dawn adapter 為 SwiftShader。截圖只有背景，runner 同時回報 `Unable to initialize SkSurface`。GPU texture 為 PASS，頁面合成為 FAIL，未執行其後的動態測試。

來源為 [run 43187064397](https://github.com/KYStr/glossquote-visuals/actions/runs/43187064397) 與 [browser-results.json](browser-results.json)。下輪使用 Chromium 的 WebGPU pixel-test flags 讓合成和 WebGPU 都選 SwiftShader，若失敗則在同一 VM 用 Xvfb。

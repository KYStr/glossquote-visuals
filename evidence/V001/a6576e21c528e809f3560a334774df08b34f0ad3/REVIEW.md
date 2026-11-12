# V001 獨立覆核

`/root/v001_review` 於 2026-11-12 核對 [PR #1](https://github.com/KYStr/glossquote-visuals/pull/1) 的 `a6576e21c528e809f3560a334774df08b34f0ad3`，並讀回 [Actions run 43189203467](https://github.com/KYStr/glossquote-visuals/actions/runs/43189203467) 的同 SHA Windows 和 Ubuntu artifact。兩份下載的 ZIP 雜湊均與 GitHub API digest 相符。

| 面向 | 結果 |
| --- | --- |
| 視覺與互動 | PASS Windows。目視 1440px 英文和 390px 繁中完整作品。晨白與灰藍可見合成各取樣 266 與 133 色。 |
| Shader | PASS Windows。SwiftShader 執行 WebGPU，Microsoft Basic Render Driver 合成。Ubuntu texture 有 236 色，頁面合成只有背景，為 FAIL。 |
| 生命週期 | PASS 兩平台。暫停／繼續、注入 hidden、實際離屏、注入 unknown loss 後銷毀原 device、重建、畫廊回返。 |
| 可及性 | PASS 兩平台。四寬、200% 文字、Tab、44px、鍵盤、觸控、reduced motion、無 JS 與無 adapter fallback。最低抽測對比 6.83:1。 |
| 效能 | PASS 最大 719,113 bytes gzip 含 shader。DSF 1 實測 DPR 1。每秒 texture acquisition 為 Windows 10.42、Ubuntu 59.4。兩者皆是軟體環境測值。 |
| 隱私與 SEO | PASS。兩平台只有同源靜態 GET。CSP、遙測、儲存、validation error 檢查通過。雙語 canonical、alternate、分享圖和候選 noindex 通過。 |
| 可重現與發布 | PASS 候選 clean install、check、7 項單元測試、build、子路徑 HTTP、404 和回鏈。正式站、ZIP 與外部驗收當時為 NOT_RUN。 |

Windows 實際可見合成通過候選環境要求。Ubuntu 軟體合成 FAIL 保留在 [Ubuntu 結果](browser-results-ubuntu.json)。真機 FPS、高 DPR、耗電、讀屏完整體驗為 NOT_RUN。固定 API 無硬性 FPS 或 DPR 參數。此作品用單一 canvas、懶載入和不可見時暫停減少負荷，保留用戶可直接選擇的靜態呈現。

[Windows 結果](browser-results-windows.json) · [1440px 英文頁](paper-en-1440-webgpu.png) · [390px 繁中頁](paper-zh-390-webgpu.png) · [WebGPU 讀回圖](paper-en-texture-readback.png) · [建置雜湊](build-manifest.json)

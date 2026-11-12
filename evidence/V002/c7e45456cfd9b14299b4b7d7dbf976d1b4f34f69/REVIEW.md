# V002 獨立覆核

`/root/v001_review` 於 2026-11-12 核對 [PR #2](https://github.com/KYStr/glossquote-visuals/pull/2) 的 `c7e45456cfd9b14299b4b7d7dbf976d1b4f34f69`、同 SHA Windows job 與下載 artifact 雜湊。九項必要候選驗收為 PASS。見 [驗收紀錄](acceptance.json)、[瀏覽器結果](browser-results.json) 與 [建置雜湊](build-manifest.json)。 [Windows job](https://github.com/KYStr/glossquote-visuals/actions/runs/43193761795/job/131099342333)

| 面向 | 結果 |
| --- | --- |
| 視覺與 shader | PASS。目視核對三種 Chrome 物件與雙語版面。折光環、靜滴、開口弧的可見合成各取樣 109、117、87 色，無 GPU validation errors。 |
| 互動 | PASS。三件選取與鍵盤、觸控、靜態輪廓切換。弧形從 0° 轉到 180° 可見開口換向，24 × 24 取樣亮區重心由 (9.68, 11.82) 到 (13.24, 10.88)。 |
| 生命週期 | PASS。20 次快速切換後仍是一個 canvas 和裝置，configure 次數無增加。離屏與回返維持手動暫停。 |
| 可及性 | PASS。四寬、200% 文字、44px、鍵盤與觸控。選中物件有底線。抽測文字對比最低 8.52:1，控制邊界對底色 3.86:1。 |
| 效能 | PASS。V002 最大 718,829 bytes gzip，含懶載入。DSF 1 下 DPR 1、9.31 次 texture acquisition/s 為軟體測值。實體裝置 FPS、高 DPR、耗電與完整讀屏為 NOT_RUN。 |
| 隱私、SEO 與可重現 | PASS。兩語動態頁的網路、CSP、storage 皆通過。雙語 SEO、子路徑、clean install、check、7 項單元測試、build 與 V001 瀏覽器回歸通過。 |

合成證據見 [折光環](liquid-ring-webgpu.png)、[靜滴](liquid-orb-webgpu.png)、[開口弧](liquid-arc-webgpu.png)、[0°](liquid-arc-angle-0.png) 和 [180°](liquid-arc-angle-180.png)。正式發布與外部驗收另記。

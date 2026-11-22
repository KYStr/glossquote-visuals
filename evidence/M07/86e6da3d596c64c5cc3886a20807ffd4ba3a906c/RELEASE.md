# M07 正式發布

修訂果時、疊印與摺徑。三件作品依 [14 條規則](../../../docs/M04-ACCEPTANCE.md) 與[本期版頭美術規格](../../../briefs/M07-key-visuals.md) 逐項驗收。

候選 `df6ba61887571c76af1d2d65122db9905ba089bb`。部署 `86e6da3d596c64c5cc3886a20807ffd4ba3a906c`。

| 作品 | 正式網站 | 候選驗收 | 正式站實際匯出 |
|---|---|---|---|
| V008 果時 | [繁中](https://kystr.github.io/glossquote-visuals/works/sorbet-hour/) · [English](https://kystr.github.io/glossquote-visuals/en/works/sorbet-hour/) | [逐條紀錄](../../V008/df6ba61887571c76af1d2d65122db9905ba089bb/REVIEW.md) | [繁中 · 710 bytes](works/V008/zh-Hant/jelly-hour-recipe-zh-Hant.txt) · [English · 762 bytes](works/V008/en/jelly-hour-recipe-en.txt) |
| V009 疊印 | [繁中](https://kystr.github.io/glossquote-visuals/works/afterimage-press/) · [English](https://kystr.github.io/glossquote-visuals/en/works/afterimage-press/) | [逐條紀錄](../../V009/df6ba61887571c76af1d2d65122db9905ba089bb/REVIEW.md) | [繁中 · 332 bytes](works/V009/zh-Hant/afterimage-print-sheet-zh-Hant.txt) · [English · 347 bytes](works/V009/en/afterimage-print-sheet-en.txt) |
| V010 摺徑 | [繁中](https://kystr.github.io/glossquote-visuals/works/foldline/) · [English](https://kystr.github.io/glossquote-visuals/en/works/foldline/) | [逐條紀錄](../../V010/df6ba61887571c76af1d2d65122db9905ba089bb/REVIEW.md) | [繁中 · 475 bytes](works/V010/zh-Hant/foldline-kit-zh-Hant.txt) · [English · 482 bytes](works/V010/en/foldline-kit-en.txt) |

## 證據

- [同一候選的 12 組桌機與手機尺寸測試](https://github.com/KYStr/glossquote-visuals/actions/runs/45002487345)涵蓋兩語與三件作品。
- [發行建置與部署](https://github.com/KYStr/glossquote-visuals/actions/runs/45004587757)及[正式站瀏覽器驗證](https://github.com/KYStr/glossquote-visuals/actions/runs/45004587757)的工作 ID 與官方 ZIP 校驗值，見[驗證收據](live-verification.json)。
- 發布建置從八件舊作還原 16 頁及 27 個執行檔案，並逐位元比對含共用資產在內的 143 個已發布檔案。[原始建置紀錄與 SHA-256](carried-verification.json)。
- 逐檔核對 24 張材質影格、6 張暫停畫面及 6 份實際下載。三件作品的中英滑鼠操作各有起態、結果、重設三張，共 18 張。果時另有 4 張切入及重設後另一側挖取影格。連續留下兩處缺口、雙墨分版與連續展艇的完整影片在固定候選驗收中。[正式站原始結果](live-results.json) · [驗證摘要](live-verification.md)。
- 獨立 HTTPS 讀回 24 個兩語入口及 113 個實際資產。[逐一回應](https-readback.json) · [部署版本](live-receipt.json)。
- 部署完成後，再從正式站逐一下載 143 個沿用檔案；每個檔案的長度與 SHA-256 均符合歷史原件。[HTTPS 逐檔指紋](carried-https.json)。

## 正式站滑鼠操作

| 作品 | 語言 | 操作影格 |
|---|---|---|
| 果時 | zh-Hant | [起態](works/V008/zh-Hant/live-sorbet-hour-zh-Hant-interaction-before.png) · [切入](works/V008/zh-Hant/live-sorbet-hour-zh-Hant-interaction-mid.png) · [結果](works/V008/zh-Hant/live-sorbet-hour-zh-Hant-interaction-after.png) · [另一側挖取](works/V008/zh-Hant/live-sorbet-hour-zh-Hant-interaction-alternate.png) · [重設](works/V008/zh-Hant/live-sorbet-hour-zh-Hant-interaction-reset.png) |
| 果時 | en | [起態](works/V008/en/live-sorbet-hour-en-interaction-before.png) · [切入](works/V008/en/live-sorbet-hour-en-interaction-mid.png) · [結果](works/V008/en/live-sorbet-hour-en-interaction-after.png) · [另一側挖取](works/V008/en/live-sorbet-hour-en-interaction-alternate.png) · [重設](works/V008/en/live-sorbet-hour-en-interaction-reset.png) |
| 疊印 | zh-Hant | [起態](works/V009/zh-Hant/live-afterimage-press-zh-Hant-interaction-before.png) · [結果](works/V009/zh-Hant/live-afterimage-press-zh-Hant-interaction-after.png) · [重設](works/V009/zh-Hant/live-afterimage-press-zh-Hant-interaction-reset.png) |
| 疊印 | en | [起態](works/V009/en/live-afterimage-press-en-interaction-before.png) · [結果](works/V009/en/live-afterimage-press-en-interaction-after.png) · [重設](works/V009/en/live-afterimage-press-en-interaction-reset.png) |
| 摺徑 | zh-Hant | [起態](works/V010/zh-Hant/live-foldline-zh-Hant-interaction-before.png) · [結果](works/V010/zh-Hant/live-foldline-zh-Hant-interaction-after.png) · [重設](works/V010/zh-Hant/live-foldline-zh-Hant-interaction-reset.png) |
| 摺徑 | en | [起態](works/V010/en/live-foldline-en-interaction-before.png) · [結果](works/V010/en/live-foldline-en-interaction-after.png) · [重設](works/V010/en/live-foldline-en-interaction-reset.png) |

## 驗證環境

候選美術及效能證據取自隔離 Windows、軟體 WebGPU，以及桌面與模擬手機 viewport。實體手機效能、耗電、散熱、完整真人螢幕閱讀器體驗與轉換率未量測。網站提供概念商品與本地下載。

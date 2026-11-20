# M05 正式發布

新作三件、修訂兩件。五件均在同一候選版本依 [14 條規則](../../../docs/M04-ACCEPTANCE.md) 逐項驗收。

候選 `c19abda5645c174c8fa6df79c06d26993cc31746`。部署 `d28a1030bdd348c2733a644027ca35d782d00c9d`。

| 作品 | 正式網站 | 候選驗收 | 正式站實際匯出 |
|---|---|---|---|
| V007 布邊 | [繁中](https://kystr.github.io/glossquote-visuals/works/selvedge/) · [English](https://kystr.github.io/glossquote-visuals/en/works/selvedge/) | [逐條紀錄](../../V007/c19abda5645c174c8fa6df79c06d26993cc31746/REVIEW.md) | [繁中 · 467 bytes](works/V007/zh-Hant/selvedge-samples-zh-Hant.txt) · [English · 527 bytes](works/V007/en/selvedge-samples-en.txt) |
| V008 果時 | [繁中](https://kystr.github.io/glossquote-visuals/works/sorbet-hour/) · [English](https://kystr.github.io/glossquote-visuals/en/works/sorbet-hour/) | [逐條紀錄](../../V008/c19abda5645c174c8fa6df79c06d26993cc31746/REVIEW.md) | [繁中 · 710 bytes](works/V008/zh-Hant/jelly-hour-recipe-zh-Hant.txt) · [English · 762 bytes](works/V008/en/jelly-hour-recipe-en.txt) |
| V009 疊印 AFTERIMAGE PRESS | [繁中](https://kystr.github.io/glossquote-visuals/works/afterimage-press/) · [English](https://kystr.github.io/glossquote-visuals/en/works/afterimage-press/) | [逐條紀錄](../../V009/c19abda5645c174c8fa6df79c06d26993cc31746/REVIEW.md) | [繁中 · 332 bytes](works/V009/zh-Hant/afterimage-print-sheet-zh-Hant.txt) · [English · 356 bytes](works/V009/en/afterimage-print-sheet-en.txt) |
| V010 摺徑 FOLDLINE | [繁中](https://kystr.github.io/glossquote-visuals/works/foldline/) · [English](https://kystr.github.io/glossquote-visuals/en/works/foldline/) | [逐條紀錄](../../V010/c19abda5645c174c8fa6df79c06d26993cc31746/REVIEW.md) | [繁中 · 475 bytes](works/V010/zh-Hant/foldline-kit-zh-Hant.txt) · [English · 482 bytes](works/V010/en/foldline-kit-en.txt) |
| V011 食刻 UMBRA DIAL | [繁中](https://kystr.github.io/glossquote-visuals/works/umbra-dial/) · [English](https://kystr.github.io/glossquote-visuals/en/works/umbra-dial/) | [逐條紀錄](../../V011/c19abda5645c174c8fa6df79c06d26993cc31746/REVIEW.md) | [繁中 · 589 bytes](works/V011/zh-Hant/umbra-dial-proposal-zh-Hant.txt) · [English · 643 bytes](works/V011/en/umbra-dial-proposal-en.txt) |

## 證據

- [同一候選的 20 組桌機與手機尺寸測試](https://github.com/KYStr/glossquote-visuals/actions/runs/44803659273)涵蓋兩語與五件作品。
- [發行建置與部署](https://github.com/KYStr/glossquote-visuals/actions/runs/44806874731)及[正式站瀏覽器驗證](https://github.com/KYStr/glossquote-visuals/actions/runs/44806874731)的工作 ID 與官方 ZIP 校驗值，見[驗證收據](live-verification.json)。
- 逐檔核對 40 張材質控制影格、10 張暫停畫面、10 個完成流程及果時兩語各三張滑鼠挖取與重設畫面。[正式站結果](live-results.json) · [驗證摘要](live-verification.md)。
- 獨立 HTTPS 讀回 24 個兩語入口及 106 個實際資產。[逐一回應](https-readback.json) · [部署版本](live-receipt.json)。
- 發行 build 第 1 次失敗，單次回歸的原始錯誤與完整 log 指紋已保留。[原始錯誤](attempts/failed-build-44806874731-attempt-1/error.txt) · [原始工作](https://github.com/KYStr/glossquote-visuals/actions/runs/44806874731/job/136533092261)。

## 驗證環境

候選美術及效能證據取自隔離 Windows、軟體 WebGPU，以及桌面與模擬手機 viewport。實體手機效能、耗電、散熱、完整真人螢幕閱讀器體驗與轉換率未量測。網站提供概念商品與本地下載。

# M04 發布與正式站驗證

本次發行來源為 `873d07650ee107e465ab163f6a1df050b928f114`。三件雙語商業作品依 [14 條逐條規則](../../../docs/M04-ACCEPTANCE.md) 完成獨立驗收。發行沿用前五件作品的 91 個已發布檔案，經位元比對一致。

| 作品 | 進入網站 | 獨立驗收 |
|---|---|---|
| V006 | [繁中](https://kystr.github.io/glossquote-visuals/works/tide-table/) · [English](https://kystr.github.io/glossquote-visuals/en/works/tide-table/) | [逐條紀錄](../../V006/52fa4e91f748be73f060c3acc3c91ce9728fccd9/REVIEW.md) |
| V007 | [繁中](https://kystr.github.io/glossquote-visuals/works/selvedge/) · [English](https://kystr.github.io/glossquote-visuals/en/works/selvedge/) | [逐條紀錄](../../V007/52fa4e91f748be73f060c3acc3c91ce9728fccd9/REVIEW.md) |
| V008 | [繁中](https://kystr.github.io/glossquote-visuals/works/sorbet-hour/) · [English](https://kystr.github.io/glossquote-visuals/en/works/sorbet-hour/) | [逐條紀錄](../../V008/52fa4e91f748be73f060c3acc3c91ce9728fccd9/REVIEW.md) |

## 可重查的證據

- [固定候選的 12 個環境及彙總](https://github.com/KYStr/glossquote-visuals/actions/runs/44783845662)，[舊作回歸](https://github.com/KYStr/glossquote-visuals/actions/runs/44783845425)。
- [正式建置與部署](https://github.com/KYStr/glossquote-visuals/actions/runs/44785808933)，參閱 [工作清單](jobs.json) 與 [部署憑據](live-receipt.json)。 兩次原驗證在頁尾解析完成前讀取連結數，記錄為失敗；[第一次](attempts/publish-live-attempt-1.json) 與 [第二次](attempts/publish-live-attempt-2.json)。
- [獨立 HTTPS 讀回](https-readback.json) 涵蓋 8 個兩語入口及 34 個實際引用資產，核對畫廊鏈結、頁面語言及 canonical。
- 正式瀏覽器走完三件作品的兩語版本，操作材質並下載與選擇相符的檔案。參閱 [瀏覽器原始結果](live-results.json)、[獨立驗證工作](verification-job.json) 與 [24 張材質對照、6 份匯出](live-verification.md)。

參考環境為隔離 Windows、軟體 WebGPU 與模擬手機 viewport。真實手機的耗電、散熱、螢幕閱讀器實機體驗及商業轉換率未量測。顧客產生的行前單、打樣單及禮盒配方都留在瀏覽器端。

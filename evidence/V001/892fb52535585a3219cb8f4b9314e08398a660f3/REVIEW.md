# V001 發布前獨立覆核

`/root/v001_review` 於 2026-11-12 覆核 [PR #1](https://github.com/KYStr/glossquote-visuals/pull/1) 的 `892fb52535585a3219cb8f4b9314e08398a660f3`。九項必要候選驗收皆為 PASS，見 [驗收紀錄](acceptance.json) 和 [Windows 瀏覽器證據](browser-results.json)。 [Windows job](https://github.com/KYStr/glossquote-visuals/actions/runs/43190342621/job/131087749799)

候選 build 的 18 個檔案 SHA-256 與前一個已驗收版本一致。Reviewer 目視 1440px 英文與 390px 繁中頁面的完整合成。晨白、灰藍的 texture 取樣各有 237 與 101 色，可見合成各有 256 與 123 色。GPU validation、CSP、storage 和額外 runtime network 檢查為零違規。最大傳輸 719,113 bytes gzip，DSF 1 的 DPR 為 1，11.01 次 texture acquisition/s 屬軟體測值。

Reviewer 核對 Pages workflow 固定 action SHA，`main` dispatch 輸入須等於 checkout SHA，部署前核對候選承接、同 SHA Windows job、獨立覆核與程式差異，再完整測試 release build。公開 Jobs API 回應含部署驗證所用欄位。

正式站、部署 SHA、ZIP 與外部驗收在本次覆核時尚未執行。Ubuntu 軟體合成的失敗保留於 [前次跨平台紀錄](../a6576e21c528e809f3560a334774df08b34f0ad3/REVIEW.md)。

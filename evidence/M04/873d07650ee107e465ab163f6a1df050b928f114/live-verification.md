# M04 正式站驗收

發布 commit `873d07650ee107e465ab163f6a1df050b928f114`，候選 `52fa4e91f748be73f060c3acc3c91ce9728fccd9`。建置、部署與正式站驗證均通過。
發布 run 結果為 failure。正式站取證由 [GitHub Actions run 44787603552](https://github.com/KYStr/glossquote-visuals/actions/runs/44787603552) 完成，驗證 SHA 為 `847d2c7311d8635f921220ec7e2e51ff17db5008`，ZIP 校驗值為 `sha256:9517e5958a951307952c6de53d7da343e045a1ff1efb5c02024edec9471d843f`。

六個中文／英文客戶流程的下載檔均與已驗收候選一致，並逐張比對 24 張材質控制的 PNG 與原始 SHA-256。每頁另核對一張原生暫停畫面。

| 作品 | 語言 | 正式站 | 匯出 | 位元組 | 材質操作 |
|---|---|---|---|---:|---|
| V006 tide-table | zh-Hant | [開啟](https://kystr.github.io/glossquote-visuals/works/tide-table/) | tide-table-zh-Hant.txt | 352 | 0→1→2→0 |
| V006 tide-table | en | [開啟](https://kystr.github.io/glossquote-visuals/en/works/tide-table/) | tide-table-en.txt | 366 | 0→1→2→0 |
| V007 selvedge | zh-Hant | [開啟](https://kystr.github.io/glossquote-visuals/works/selvedge/) | selvedge-samples-zh-Hant.txt | 467 | 0→1→2→0 |
| V007 selvedge | en | [開啟](https://kystr.github.io/glossquote-visuals/en/works/selvedge/) | selvedge-samples-en.txt | 527 | 0→1→2→0 |
| V008 sorbet-hour | zh-Hant | [開啟](https://kystr.github.io/glossquote-visuals/works/sorbet-hour/) | sorbet-hour-recipe-zh-Hant.txt | 680 | 0→1→2→0 |
| V008 sorbet-hour | en | [開啟](https://kystr.github.io/glossquote-visuals/en/works/sorbet-hour/) | sorbet-hour-recipe-en.txt | 741 | 0→1→2→0 |

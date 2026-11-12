# V001 正式發布

GitHub Pages deployment `7733311289` 為 success。已發布 commit `f0af4882eeb13ed26386e877b9125c0877b50f0d`。候選 `892fb52535585a3219cb8f4b9314e08398a660f3` 的 [獨立覆核](../892fb52535585a3219cb8f4b9314e08398a660f3/REVIEW.md) 與主線的 release build 均通過。 [發布 run](https://github.com/KYStr/glossquote-visuals/actions/runs/43191059813)

- 正式站與雙語作品均回應 HTTP 200。分享圖、授權 notices、sitemap、release.json 回應 200，未知路由回應 404。release.json 的 SHA 與 deployment 相同。 [繁中作品](https://kystr.github.io/glossquote-visuals/works/paper-light/) · [English exhibition](https://kystr.github.io/glossquote-visuals/en/works/paper-light/)
- Windows GitHub-hosted VM 的瀏覽器在兩語正式頁面驗證了實際合成、對應語言畫廊回鏈、來源 SHA 與同源網路。見 [正式站測試](live-results.json)、[release build 測試](release-build-results.json)、[繁中截圖](live-zh-Hant.png) 與 [英文截圖](live-en.png)。
- 外部驗收為 NOT_RUN。Ubuntu 軟體合成限制與未驗硬體測值留在 [相容性紀錄](../a6576e21c528e809f3560a334774df08b34f0ad3/REVIEW.md)。

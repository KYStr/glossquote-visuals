# V003 與 M01 整合發布

GitHub Pages deployment `7734274249` 為 success，已部署 `2a69f0f86baf86ca8e85f846b071c0e5b82922c8`。候選 `dc8fc1481ef72f64c804dd38faf085e0edbe2297` 九項獨立覆核為 PASS。 [獨立覆核](../dc8fc1481ef72f64c804dd38faf085e0edbe2297/REVIEW.md) · [發布 run](https://github.com/KYStr/glossquote-visuals/actions/runs/43197692146)

```sh
gh workflow run pages.yml -R KYStr/glossquote-visuals --ref main -f work=V003 -f source_commit=2a69f0f86baf86ca8e85f846b071c0e5b82922c8
```

- 正式 artifact 完整重驗 V001、V002 與 V003。發布後的 Windows 瀏覽器確認 V003 兩語有可見 WebGPU，來源 SHA、畫廊回鏈、CSP 與網路檢查通過。 [release build](release-build-results.json) · [正式站結果](live-results.json) · [繁中截圖](live-zh-Hant.png) · [英文截圖](live-en.png)
- 讀回八個正式入口、16 項靜態資源、互返語言 metadata、robots、sitemap、notices、release.json 和 404。雙語畫廊各有三個正式作品，頁面無 canvas 或 script。 [HTTP 結果](http-results.json) · [繁中畫廊](https://kystr.github.io/glossquote-visuals/) · [English gallery](https://kystr.github.io/glossquote-visuals/en/)
- 外部驗收與真機效能為 NOT_RUN。固定版 DPR/FPS 限制與 Ubuntu 軟體合成 FAIL 留在各作品候選覆核。 [V001 相容性紀錄](../../V001/a6576e21c528e809f3560a334774df08b34f0ad3/REVIEW.md)

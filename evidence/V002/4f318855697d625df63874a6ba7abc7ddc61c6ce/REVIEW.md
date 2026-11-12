# V002 首次覆核

Reviewer `/root/v001_review` 核對 [PR #2](https://github.com/KYStr/glossquote-visuals/pull/2) 的 `4f318855697d625df63874a6ba7abc7ddc61c6ce` 及 [Windows job](https://github.com/KYStr/glossquote-visuals/actions/runs/43193056865/job/131096954012)。實際看過 1440px 英文、390px 繁中及三種可見 Chrome 物件。三物件合成取樣為 110、116、88 色，20 次切換後仍是一個裝置，V001 回歸通過。

完整發布覆核待修。第一版選取只靠顏色。旋轉驗收需對比可見輪廓。英文動態頁要在換語前讀回 CSP、storage 與錯誤，避免導覽清除當頁探針資料。

# 免費發布

採單一公開 repo + GitHub Pages（靜態 artifact）。初期計畫網址 `https://kystr.github.io/glossquote-visuals/`。只有 Pages API/正式 GET 證明成功後才寫成 live；不使用 Labs Cloudflare token、不改 DNS 或 Labs 首頁。

實作時建立經審查的 `.github/workflows/pages.yml`：以 lockfile 安裝、執行 check/test/build，再上傳 artifact；Actions 版本固定到可信的完整 commit。workflow_dispatch 或已驗收的主線 commit 才部署，PR 只檢查。不要讓 bootstrap/未驗候選 push 自動發布。權限限定本 repo 的 contents:read、pages:write、id-token:write，無私人 secret。若既有連線無法啟用 Pages，記錄可重現的權限錯誤，不自行更改帳號權限。

Vite base 與路由必須支援 `/glossquote-visuals/`；檢查所有語言切換、backlink、資產、分享圖和 canonical，避免本機 `/` 正常、Pages 子路徑卻壞掉。可以先建立純建置驗證 workflow；不要把綠燈 CI 寫成 deployed。

發布順序：作者推 codex candidate → 開 PR → 非作者 review 同 SHA → 修正並重新核對必要項 → 合併核准內容 → 免費 Pages 配置/部署 → 讀回 deployment SHA 和 HTTPS 頁面/資產 → 真實瀏覽器 spot check → 更新 live 狀態。workflow_dispatch 也只能部署已有必要驗收證據的確切 default-branch commit 或受保護核准 ref，觸發人按下按鈕本身不等於驗收；build artifact、review 與部署需綁同一 source commit，合併造成差異就重新驗證差異。GitHub Pages 不能自訂所有 HTTP headers；不可偽稱有正式 CSP response headers。允許的 meta CSP 需驗證是否足夠保護本靜態作品，frame-ancestors 不能用 meta 假裝生效。若未來需要 Cloudflare hosting 再獨立安排具體遷移，不阻擋目前來源作品集。

失敗只回退本 repo 自己已驗證的前版，保留失敗證據；不得刪歷史、force push、停其他站、改 040141.xyz。

啟用前先查 Pages 與現有 repo admin/maintainer capability；缺權限是操作阻塞，不是任意擴權的理由。workflow_dispatch 的 workflow 定義要先在 default branch，部署 job 使用 `github-pages` environment，並顯式檢查被允許的 SHA/ref。候選 PR 的程式碼不得獲得部署權限。

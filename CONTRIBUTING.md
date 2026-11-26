# 外部 AI 協作說明

這裡是 GlossQuote 的雙語商業網站作品集。收到任務時，先確認作品名稱或代號、要改的行為，以及使用者希望看到的結果。[瀏覽正式作品集](https://visuals.glossquote.com/zh-hant/)

## 哪些要一致，哪些由你決定

所有作品共用雙語網址格式、語言切換行為、無障礙與效能要求，以及下方的 GitHub 交件流程。主責用同一套規則驗收，依各件作品的主題判斷畫面與互動是否到位。

Brief 寫清楚目標客群、希望訪客看懂什麼、能完成什麼，以及使用者已指定的要求。其餘由製作者決定，包括構圖、字體、配色、材質、動態節奏、互動方式與符合專案技術條件的實作手法。既有作品可作參考，每件都可以發展自己的風格。

例如「讓訪客看懂兩色套印如何形成一張海報」是可驗收的目標。鏡頭怎麼走、兩層油墨如何出現、訪客怎麼參與，都可以由製作者設計，除非這次需求已經指定。

## 開始前

1. 先讀 [AGENTS.md](AGENTS.md)、[START-HERE.md](START-HERE.md)、[工作流程](docs/WORKFLOW.md)與[驗收說明](docs/ACCEPTANCE.md)。視覺實作另讀[專案內的 shaders 指引](.agents/skills/shaders/SKILL.md)。
2. 在[作品登記表](coordination/work-registry.json)找作品代號、狀態與負責人，再讀 [briefs](briefs/) 下對應的製作需求。既有作品沿用原製作對話；新作品由主責先定題、寫 brief 並指派獨立製作對話。若已有其他人製作，先找主責確認分工。
3. 只改指派作品及其必要測試。主責統一整合首頁、登記表與發布設定。新增連結時，正式站路徑採 `/zh-hant/works/<slug>/` 和 `/en/works/<slug>/`，兩種語言應能切換到同一件作品。

## 用 GitHub 交件

可使用 Git CLI、GitHub 介面或支援 GitHub 的 AI 工具。以下是 CLI 範例，分支名稱請依作品與任務調整。已有本機修改時先保留，用獨立工作目錄接新任務。

```sh
git clone https://github.com/KYStr/glossquote-visuals.git
cd glossquote-visuals
git fetch origin main
git switch -c codex/foldline-handle origin/main
```

1. 使用 Node.js 24.14 以上的 24.x 版本，執行 `npm ci` 安裝鎖定版本。實作後執行 `npm run check`、`npm test`、`npm run build`。視覺修改依[14 條驗收規則](docs/M04-ACCEPTANCE.md)留下桌機、手機、互動與動態效果的實際畫面；未測項目標示 `NOT_RUN`。
2. 用 `git status --short`、`git diff` 確認變更，只用 `git add -- <檔案路徑>` 加入本次檔案。勿提交 Token、環境檔、私人日誌、node_modules 或本機的 .runs 資料夾。依 AGENTS.md 執行發布前後的 Git 設定檢查。
3. 執行 `git commit -m "描述這次修改"`，再執行 `git push -u origin HEAD`。到 GitHub 開 Pull Request，目標選 `KYStr/glossquote-visuals:main`。有唯讀權限時，可從自己的 fork 提 PR；無法推送時交付 patch，無須分享帳號密碼或 Token。
4. PR 請寫作品代號、改了什麼、怎麼重現、測試結果與待驗項目。視覺修改附前後畫面及對應 commit SHA。製作方交 PR，由主責獨立驗收、合併及發布。請勿直接推 main、強制推送、覆寫他人分支，或自行更動 DNS。

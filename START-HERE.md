# 接續入口

<!-- M06 release -->
## 本期作品與接續入口

更新 [果時](https://kystr.github.io/glossquote-visuals/works/sorbet-hour/)、[疊印](https://kystr.github.io/glossquote-visuals/works/afterimage-press/)、[摺徑](https://kystr.github.io/glossquote-visuals/works/foldline/) 的產品版頭。三件作品均通過 14 條規則與六項美術觀察的逐項驗收，完成中英兩語的正式站操作與下載。[發布證據與限制](evidence/M06/93475d7b705cc487258ebb8bdb72ff0088b85dfd/RELEASE.md)。
<!-- /M06 release -->

<!-- M05 release -->
## 本期作品與接續入口

新增 [疊印 AFTERIMAGE PRESS](https://kystr.github.io/glossquote-visuals/works/afterimage-press/)、[摺徑 FOLDLINE](https://kystr.github.io/glossquote-visuals/works/foldline/)、[食刻 UMBRA DIAL](https://kystr.github.io/glossquote-visuals/works/umbra-dial/)，同步更新[布邊](https://kystr.github.io/glossquote-visuals/works/selvedge/)與[果時](https://kystr.github.io/glossquote-visuals/works/sorbet-hour/)。五件作品均通過 14 條逐項驗收，完成中英兩語的正式站操作與下載。[發布證據與限制](evidence/M05/d28a1030bdd348c2733a644027ca35d782d00c9d/RELEASE.md)。
<!-- /M05 release -->

三件 M04 作品已發布，可由 [繁中畫廊](https://kystr.github.io/glossquote-visuals/) 或 [English gallery](https://kystr.github.io/glossquote-visuals/en/) 進入。[發布驗證與限制](evidence/M04/873d07650ee107e465ab163f6a1df050b928f114/RELEASE.md)。

自 2026-11-21 M04 起，新商業網站由主責先寫 brief、每件另開側欄製作對話，指定 gpt-6.2-sol / medium。主責按 docs/M04-ACCEPTANCE.md 逐條獨立驗收，各項均須 PASS。歷史批次的分數與製作設定僅適用於當時版本。

這是獨立的 GlossQuote Visuals。M03 已完成三件商業網站版頭重做與折光材料室、空型動態設計兩件新作，五件均已發布並通過美術、UI、商業完整度各嚴格 >9/10 的非作者驗收。[正式發布證據](evidence/M03/33d0aee9006b2b76f02a58c9ddd575571a4704b9/RELEASE.md)。五個側欄可見製作對話各持有一件作品，主責負責美術、整合、共享畫廊與發布。下一個新作品依使用者新任務寫 brief，開新的製作對話；M01/M02 與本輪被退回的證據保留為歷史。

## M03 歷史流程

1. 讀 AGENTS.md、GOAL.md、docs/WORKFLOW.md、docs/ACCEPTANCE.md。
2. 讀 `.agents/skills/shaders/SKILL.md` 和 docs/UPSTREAM.md；不要執行 skill 裡涉及登入、遠端專案或付費預設的命令。
3. 讀 coordination/work-registry.json；如 remote 已存在，先讀回最新 default branch/PR head，保留本地修改，比對承接，不能重做別人正在做的工作。
4. 本輪讀 briefs/M03-hero-direction.md，再讀對應商業 brief；新作見 briefs/V004-prism-materials.md、briefs/V005-aeriform.md。每位作者只修改自己承接的作品。每件新作品都使用新的側欄可見製作對話，指定 gpt-6.1-sol/high；後續修訂留在該作品對話。設定要求與實際後端身份分開記錄。畫廊不啟動 GPU canvas。
5. 每件寫來源、設計說明、實測與限制，推候選 codex 分支/PR；使用非作者 reviewer。五件的美術、UI、商業完整度十五項分數各須嚴格 >9/10，不能取平均或把 9.0 當通過。另須通過桌面／手機原始時間影格、材質貼合與真正凍結當前畫面的暫停驗收。未通過項留 pending，不能把靜態檢查當畫面驗收。
6. 通過後按 docs/RELEASE.md 免費發布，驗證中英文頁面、正式網址與來源 commit；更新畫廊、README、registry。一次交付一個 ZIP。

建議來源結構：

```text
briefs/                       完整可開工的作品規格
coordination/work-registry.json 任務、承接、版本、驗收、發布狀態
src/shared/                   動態生命週期、可及性與導覽；不是共用作品版型
src/works/<slug>/              獨立 CSS、shader 組合、在地素材
public/                       自行託管素材與 license notices
index.html, en/index.html      雙語畫廊
works/<slug>/index.html        中文作品頁
en/works/<slug>/index.html     英文作品頁
test/, scripts/               聚焦驗證、build/check/release 工具
evidence/<work>/<commit>/      可公開的驗收證據與限制
docs/                         長期操作說明
.runs/, outputs/, work/        本機暫存/交付；不進 Git
```

Node 24+、Git、既有 gh CLI 供本機開發；不要安裝全域依賴。實作階段加入 package.json/lockfile，scripts 至少包含 check、test、build。未加入前不要宣稱這些命令已可執行。不要依賴作者電腦上的絕對路徑建置。

新對話只在本次 active turn 執行；文檔不會自動排程。使用者下次在專屬對話說「接著做」即可依 registry 接續，無須重新交接整套背景。

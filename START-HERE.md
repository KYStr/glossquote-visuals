# 接續入口

這是獨立的 GlossQuote Visuals，不是 Labs 工具製作任務。本輪 M03 重做三件既有商業網站的版頭，新增折光材料室與空型動態設計。五個側欄可見的製作對話各持有一件作品，主責負責美術、整合、共享畫廊與發布。M02 已發布成果與評分保留為歷史。

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

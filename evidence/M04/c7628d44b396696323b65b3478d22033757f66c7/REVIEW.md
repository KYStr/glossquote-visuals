# 繁中初訪的剩餘問題

十二組流暢度及所有商業操作均通過。最慢的一組中位數 29.4 ms，p95 31.5 ms，最大間隔 48.2 ms。三個預設 Edge 分頁均能完成備援流程。[固定候選執行](https://github.com/KYStr/glossquote-visuals/actions/runs/44780705122)

八組符合全部自動規則，四組繁中缺少合格開場畫面，分別為潮間帶桌面及手機、布邊手機、果時桌面。布邊手機已在 39 ms 內取得兩份網站字型，但仍有近五秒的主執行緒長任務。根因尚未確認，首次畫面不能簽核。參閱 [逐組實測](measurement-summary.json)、[與前候選的冷開頁對照](against-1ee.json) 及 [瀏覽器原始診斷影格](cjk-cold-filmstrip.jpg)。

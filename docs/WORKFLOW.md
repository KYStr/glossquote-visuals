# 製作與接續

## 每輪的可追溯單位

每件有固定 ID、slug、brief、實際承接者、分支、candidate commit、PR、驗收證據、阻塞、live URL 與 deployed commit。不要拿聊天中的「好了」當完成證據。

狀態：idea（只構想）→ ready（完整 brief）→ building（承接中）→ candidate（已推來源）→ reviewed（必要驗收通過）→ published（正式站讀回驗證）→ external-reviewed（使用者/外部指定版本通過）。blocked 是明確原因與保存點，不能假裝釋放承接。狀態倒退保留歷史。

此獨立 repo 不採用 Labs 的私有執行端和庫存政策。M02 依使用者指示採三個獨立 clone 與製作對話（gpt-6.1-sol/high），每位作者承接一件作品與獨立 PR；主責是共享 gallery、registry 與 release 的唯一 writer。指派及整合前讀回遠端 head 和 registry，保留各自來源歷史；不得照抄不存在的 claim API。

## Brief 的完成條件

定義觀眾/情境、內容架構、desktop/mobile 組成、主視覺與真正互動、至少三個差異維度、shader 組合/資料來源、fallback、motion/resource budget、鍵盤/觸控、SEO、測試矩陣、非目標與完成結果。無參考圖時由作者做合理設計，不要求使用者每一步批准。

## 作者與 reviewer

作者交 source diff、命令/結果、可用瀏覽器證據、限制、已知風險。reviewer 需非作者，讀同一 candidate 的實際程式與輸出，逐項記錄 PASS/FAIL/NOT_RUN；M02 每件美術、UI、商業完整度各須嚴格 >9/10，且無未完成 release gate。缺少安全的 WebGPU 瀏覽器時繼續可做的來源與文件，不發布有「已驗證 shader」承諾的作品。

作者先推 candidate 分支開 PR；reviewer 不應只對未上傳的本地稿給正式 acceptance。修正後只重跑受影響項。尚有必要 gate 失敗就不推 live，但來源/交接仍可公開供檢查。共享 gallery 更動需驗證已發布作品連結無回歸。

## 保存與交付

每輪更新 registry 和 evidence/STATUS.md，附確定的遠端 SHA、實際 hosting、待驗項。將 source、brief、LICENSE、lockfile、可公開驗收與總表放一個 ZIP，以 00-START-HERE.md 為入口。排除 .git、node_modules、dist 重複副本、憑證、瀏覽器 profile、私人資訊；產 manifest SHA-256，驗證 ZIP 路徑安全與相對文件連結。

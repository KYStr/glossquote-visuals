# V002 流體檔案 / Liquid Archive

觀眾：想看實驗工業設計/材質研究作品集的人。任務是瀏覽三件原創「液態物件」概念，切換材質和旋轉角，感受物件與版面同時成立。

與 V001 差異：黑底銀色、巨型無襯線橫排標題、中心懸浮物件、左右不對稱技術邊注、底部橫向物件選單；不採雜誌雙欄。暖橙僅為互動提示。Mobile 把側註下移為簡短說明，選單可換行，無橫向頁面溢出。

使用官方 LiquidMetal/Chrome 或經 exact props 驗證的免費 shape-effect 組合；三個自行組成的形狀方案 Ring/Orb/Arc，先核對 shape 是否受支援，不存在就選可表達的官方shape。主要互動為三個有文字的材質/物件選擇和角度滑桿，實際重繪形狀/光色；不要加沒有功能的「購買」。原創 concept label 明確，不冒充商品供應。正文用 HTML 清楚描述每個研究意圖與組成。

與共通 lifecycle 結合，但 CSS/排版專屬於此件。黑底 fallback 用本地原創 SVG 金屬明暗與輪廓；沒有 GPU/reduced-motion 仍可選物件、讀說明；static state 坦白標示。需可暫停；切換快速連按不累積 canvas/GPU资源；離開/hidden 後停止，回返遵守使用者暫停狀態。初始 no-script 有一個完整物件與全部描述。

中英文頁與獨立 title/description/canonical/hreflang；連回 gallery；每個選項 label/selected state 鍵盤可辨，不靠顏色；touch target44px。不要 remote font/圖片/環境貼圖、平台預設、Webcam。

依賴 V001 shared runtime + gallery 基礎已可用；有問題先退回 shared owner 修，不能複製另一套有遙測的初始化。允許路徑：自身作品CSS/JS/HTML、brief、registry自身紀錄、manifest/evidence；shared修改先列影響並回歸V001。驗收：三物件真實GPU render、快速切換20次無殘留實例、鍵盤/觸控、4種寬度、no-GPU/reduced-motion、Network/Storage、子路徑資產與雙語SEO。記 exact candidate SHA，非作者review，通過後發布。無真實隔離GPU時保留候選和NOT_RUN。

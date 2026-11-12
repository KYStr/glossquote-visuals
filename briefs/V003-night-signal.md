# V003 夜航訊號 / Night Signal

觀眾：需要音樂文化活動/實驗廣播視覺參考的人。以虛構且明示的「夜間訊號展」構成實際有章節可讀的網頁，不播放音訊、不伪裝真實活動。

視覺不同於前兩件：奶油黃/深靛藍/少量紅，粗體壓縮感標題、棋盤式但不等大的節目欄位、斜切海報主視覺；等寬小字只是頻道與節目索引。Desktop 海報和章節導覽交錯，Mobile 變成垂直海報/節目序列，導覽是可觸控文字連結。寫三個原創節目章節，各有中英名稱/介紹，不含假贊助、時間/票務承諾。

主視覺用免費 Grid/Stripes/SineWave 等存在且核對 props 的元件，組出自創訊號圖，不是拿 CRT preset。三個「頻道」按鈕改變視覺排列/參數與章節摘要；強度滑桿限制在溫和、不閃爍範圍。不得掃描式全螢幕高頻閃爍、滾動劫持、custom cursor或自動播放音樂。標題與說明保持HTML可選取。

Fallback用CSS/SVG海報與條紋，no GPU/no JS看得到節目；reduced-motion預設靜止，頻道可切換但無動畫。可見暫停控制、鍵盤操作與焦點，44px touch target。背景hidden/offscreen停止，快速換頻道不重複建立renderer；共通狀態機來自V001。

中英文各有獨立HTML/SEO、gallery backlinks。允許改自身作品、manifest、registry自身紀錄、證據；不能改V001/V002視覺。共享程式改動需一次記錄影響並回歸三件。目標4寬度、200%字體zoom；驗證頻道選中與對應內容、強度邊界、pause/reduced-motion/visibility、真實GPU無錯、fallback、無遙測/儲存、build子路徑與sitemap。

三件整合完成後檢查畫廊只列真實發布狀態，產一份來源/驗收ZIP與總表。未通過GPU或必要操作驗收只能報candidate；不要透過弱化規格把三件都宣告完成。

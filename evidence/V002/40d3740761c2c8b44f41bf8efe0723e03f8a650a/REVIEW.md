# V002 FORME 物形｜最終候選獨立審查

2026-11-13。候選提交 `40d3740761c2c8b44f41bf8efe0723e03f8a650a`。作者 `01a1d0b2-3cc2-7600-bf46-2cab8dda6039`，非作者 reviewer `/root/v001_review`。

GitHub-hosted Windows Server 2025、Chromium 158.0.8127.18。WebGPU adapter 回報 SwiftShader，合成器回報 Microsoft Basic Render Driver。Run 43272957275、job 131373875460、artifact 13969476687。下載 ZIP 的 SHA-256 為 `372edbaaddbaf5fd476ae7778f457424d7f819da1f595e5c77a0c35b93999bd8`，與 GitHub artifact digest 相符。公開截圖、下載原文與結果逐檔比對 runner artifact。四份來源快照與候選提交逐份比對。 [GitHub Actions](https://github.com/KYStr/glossquote-visuals/actions/runs/43272957275)、[CI](./CI.json)、[瀏覽器結果](./results.json)。

與 `918a2feef5f1de5bd85aff7fdedbbf46e1355a0c` 比對，FORME 的雙語頁、商品程式、樣式及專屬資產相同，整合版新增共同候選原 CSS 的可見合成驗證。重新實看整合版的雙語桌面/手機、選品、詢問與下載後，保留美術 **9.3/10**、UI **9.2/10**、商業完整度 **9.3/10**。

## 候選驗收

| 檢查 | 結果 | 同 SHA 證據 |
| --- | --- | --- |
| 視覺 | PASS | 實看雙語 1440、390px 全頁與商品。FORME 的全幅鋼環、炭黑冷灰與 Geist，與整合候選 V001 的暖紙色/印刷構圖、V003 的深藍活動海報/波形在構圖、字體、材質色彩、動態上有區分。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[中文 1440 全頁](./liquid-forme-zh-Hant-1440-full.png)、[英文 390 全頁](./liquid-forme-en-390-full.png)、[中文 390 WebGPU 全頁](./liquid-forme-zh-Hant-390-webgpu-full.png) |
| 互動 | PASS | 中英文商品/表面、價格、觸控/鍵盤清單、驗證、編修與本地摘要實測。桌面三筆 NT$8,640、NT$2,280、NT$6,760，合計 NT$17,680。手機書擋一組 NT$3,380。 [英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[中文 1440 詢問完成](./liquid-forme-zh-Hant-1440-inquiry.png)、[英文 390 詢問清單](./liquid-forme-en-390-inquiry.png)、[英文下載原文](./liquid-forme-en-download.txt)、[中文下載原文](./liquid-forme-zh-Hant-download.txt) |
| Shader | PASS | 鏡面與拉絲各有非均勻 WebGPU texture。原 CSS 合成 A/A/B/A 在兩語的 0°→180° 比較各有 375 個取樣像素最大色頻差大於 10，固定角度與回到 0° 的對照各為 0。原生暫停參照另確認可見 GPU 貢獻。 [英文 0° 合成](./candidate-liquid-archive-en-composite-a1.png)、[英文 180° 合成](./candidate-liquid-archive-en-composite-b.png)、[英文回到 0° 合成](./candidate-liquid-archive-en-composite-a2.png)、[中文原生暫停](./candidate-liquid-archive-zh-Hant-composite-native-pause.png)、[瀏覽器結果](./results.json) |
| 生命週期 | PASS | 無 WebGPU、拒絕 adapter、暫停/繼續、實際離屏/回返、注入 hidden、換語、返回畫廊與瀏覽器回上一頁均測。20 次商品/表面切換保留一張 canvas、同一 device 和 configure 計數。注入 unknown-loss 並銷毀原 device 後，建立新 device、恢復原拉絲設定。 [瀏覽器結果](./results.json)、[候選瀏覽器測試](./source/test/browser/verify.mjs) |
| 可及性 | PASS | 雙語 320/390/768/1440px 與根文字 200% 無超界；390px 有觸控實測，鍵盤焦點、已選表面底線、主要控制 44 CSS px、抽測對比最低 6.87:1。減少動態不載入 GPU 裝置，無 JS 仍提供三款兩種表面價格與保養。320/768px 與 200% 以自動斷言取證。 [中文 390 無 JS](./liquid-forme-zh-Hant-390-no-js.png)、[中文 390 商品](./liquid-forme-zh-Hant-390-product.png)、[瀏覽器結果](./results.json)、[候選瀏覽器測試](./source/test/browser/verify.mjs) |
| 效能 | PASS | 單一活動 canvas，runner 實測有效像素比 1、每秒 10.81 次 GPU texture acquisition。中英文含 lazy chunks 分別 1,044,097 與 1,043,571 bytes gzip，均低於 2 MiB。Texture acquisition 是此環境的觀測值，顯示 FPS 與真機耗電未測。 [CI](./CI.json)、[瀏覽器結果](./results.json) |
| 隱私 | PASS | 建置有 meta CSP；固定的 createShader 入口停用 telemetry，測試只見同源靜態 GET 與預期本地字型，檢查換語前後、下載與回返，無 fetch/XHR、beacon、socket、CSP 錯誤、cookies 或未宣告儲存。詢問摘要由記憶體產生。 [瀏覽器結果](./results.json)、[候選瀏覽器測試](./source/test/browser/verify.mjs)、[商業候選原始紀錄](./source/evidence/V002/COMMERCIAL.md) |
| 雙語 SEO | PASS | 伺服器可讀雙語 HTML，獨立 title/description/h1/canonical，互返 zh-Hant/en/x-default 與商品分享圖。候選建置有 noindex，隔離伺服器已查 Pages base、分享圖、robots、sitemap、404 與畫廊連結。 [瀏覽器結果](./results.json)、[英文 HTML](./source/en/works/liquid-archive/index.html)、[中文 HTML](./source/works/liquid-archive/index.html) |
| 可重現 | PASS | 固定 SHA 的託管 job 通過 clean install、check、13 項單元測試與 build；已核對 ZIP digest、同 SHA 公開 CI 結果與四份源碼快照。此列涵蓋候選部分，正式站、發行 ZIP 與外部複核狀態列於下方。 [CI](./CI.json)、[瀏覽器結果](./results.json)、[商業候選原始紀錄](./source/evidence/V002/COMMERCIAL.md) |

## 設計評分

| 分類 | 子項 | 分數 / 2 | 評析與證據 |
| --- | --- | ---: | --- |
| 美術 | 品牌辨識 | 1.9 | FORME 物形的炭黑、冷灰與深青色一路延伸至系列與表單；以鋼環、煙燻木、灰泥和斜光建立可辨識的物件品牌。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[中文 390 WebGPU 全頁](./liquid-forme-zh-Hant-390-webgpu-full.png) |
| 美術 | 首屏構圖 | 1.9 | 桌面全幅情境照以燭台和環狀落影平衡左側標題及主行動。390px 將圖文依序堆疊，保留燭火、鋼環與選品入口。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[中文 390 WebGPU 全頁](./liquid-forme-zh-Hant-390-webgpu-full.png) |
| 美術 | 字體排版 | 1.8 | Geist 在英文實際載入，中英文標題、產品規格、價格與按鈕有清楚的字級層次。英文首屏標題字距緊，部分次要中英標籤偏小。 [英文 0° 合成](./candidate-liquid-archive-en-composite-a1.png)、[中文原生暫停](./candidate-liquid-archive-zh-Hant-composite-native-pause.png)、[英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[瀏覽器結果](./results.json) |
| 美術 | 材質影像 | 1.9 | 鏡面沿鋼環有清楚的反射帶，拉絲的寬高光仍保留細紋與邊界；花器、書擋與工藝近照維持相同的暖灰光線。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[拉絲首屏](./liquid-forme-en-1440-satin-composite.png)、[英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[商業候選原始紀錄](./source/evidence/V002/COMMERCIAL.md) |
| 美術 | 整頁與跨尺寸節奏 | 1.8 | 桌面一大兩小的系列構圖與手機直排都保有商品順序，工藝深色區後接較安靜的 FAQ 和清單。手機首屏、系列及設定區反覆出現同一鋼環，稍拉長選品動線。 [中文 1440 全頁](./liquid-forme-zh-Hant-1440-full.png)、[英文 390 全頁](./liquid-forme-en-390-full.png)、[中文 390 WebGPU 全頁](./liquid-forme-zh-Hant-390-webgpu-full.png) |
| UI | 資訊層級 | 1.9 | 系列、款式與表面設定、工藝、FAQ、詢問清單可依序掃讀。設定區把即時單價放在數量旁，詢問清單將小計與總額分開呈現。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[中文 1440 詢問完成](./liquid-forme-zh-Hant-1440-inquiry.png) |
| UI | 導航與行動 | 1.8 | 探索系列、選擇款式、加入、檢視清單、下載及返回選品都有明確入口，連結可用鍵盤。手機導覽與首屏的次要連結密度較高。 [英文 390 全頁](./liquid-forme-en-390-full.png)、[中文 390 詢問清單](./liquid-forme-zh-Hant-390-inquiry.png)、[英文 1440 詢問完成](./liquid-forme-en-1440-inquiry.png)、[候選瀏覽器測試](./source/test/browser/verify.mjs) |
| UI | 表單與狀態 | 1.9 | 觸控可選商品與表面，已選表面有邊框及底線。實測新增、合併、移除、無效數量、修正後重新啟用下載與空清單焦點回復。 [英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[中文 390 商品](./liquid-forme-zh-Hant-390-product.png)、[中文 1440 詢問完成](./liquid-forme-zh-Hant-1440-inquiry.png)、[瀏覽器結果](./results.json)、[候選瀏覽器測試](./source/test/browser/verify.mjs) |
| UI | 手機、鍵盤與縮放 | 1.8 | 中英四種寬度及 200% 文字尺寸均通過布局斷言；主要操作的 44 CSS px、鍵盤焦點、手機觸控、減少動態及無 JS 均有證據。次要資訊字級仍偏小。 [中文 390 無 JS](./liquid-forme-zh-Hant-390-no-js.png)、[英文 390 詢問清單](./liquid-forme-en-390-inquiry.png)、[中文 390 商品](./liquid-forme-zh-Hant-390-product.png)、[瀏覽器結果](./results.json)、[候選瀏覽器測試](./source/test/browser/verify.mjs) |
| UI | 互動回饋與一致性 | 1.8 | 款式與表面同步更新選品照片、規格、價格及清單，首屏的 Halo 標籤跟著表面更新。首屏固定展示 Halo，切換花器或書擋後，仍須讀商品標籤才能理解兩區的角色差異。 [英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[拉絲首屏](./liquid-forme-en-1440-satin-composite.png)、[英文 1440 詢問完成](./liquid-forme-en-1440-inquiry.png)、[瀏覽器結果](./results.json)、[商業候選原始紀錄](./source/evidence/V002/COMMERCIAL.md) |
| 商業完整度 | 定位與價值 | 1.9 | 首屏定位為不鏽鋼家飾，三件商品對應餐桌、窗邊與書架，兩種表面各有外觀、情境和保養說明。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[中文 1440 全頁](./liquid-forme-zh-Hant-1440-full.png)、[中文 HTML](./source/works/liquid-archive/index.html) |
| 商業完整度 | 產品決策資訊 | 1.9 | 三款均有材質、尺寸、用途與兩種表面價格。系列起價明示拉絲霧面，書擋以組計、每組兩件、尺寸為單件；卡片照片的表面辨識仍以替代文字及下一段的表面選擇補充。 [英文 1440 WebGPU 全頁](./liquid-forme-en-1440-webgpu-full.png)、[英文 1440 拉絲花器](./liquid-forme-en-1440-product.png)、[中文 390 無 JS](./liquid-forme-zh-Hant-390-no-js.png)、[中文下載原文](./liquid-forme-zh-Hant-download.txt) |
| 商業完整度 | 內容信任與真實性 | 1.8 | 中英頁尾標示概念品牌，商品價格皆為示意，清單及摘要明示不含運費，交付另待商家確認。完成提示與下載文件都限定為瀏覽器整理本地摘要。 [中文 1440 詢問完成](./liquid-forme-zh-Hant-1440-inquiry.png)、[英文 1440 詢問完成](./liquid-forme-en-1440-inquiry.png)、[英文下載原文](./liquid-forme-en-download.txt)、[英文 HTML](./source/en/works/liquid-archive/index.html)、[商業候選原始紀錄](./source/evidence/V002/COMMERCIAL.md) |
| 商業完整度 | 主要顧客流程 | 1.9 | 由系列卡直達該款設定，選表面與數量後可合併、修改、移除並下載。雙語桌面實際摘要合計 NT$17,680，390px 觸控清單正確顯示書擋一組 NT$3,380。 [英文 390 詢問清單](./liquid-forme-en-390-inquiry.png)、[中文 390 詢問清單](./liquid-forme-zh-Hant-390-inquiry.png)、[英文下載原文](./liquid-forme-en-download.txt)、[中文下載原文](./liquid-forme-zh-Hant-download.txt)、[瀏覽器結果](./results.json) |
| 商業完整度 | 完成與錯誤恢復 | 1.8 | 空清單與數量無效時停用下載，修正後可繼續。實際中英 UTF-8 文件可供留存。清單明示暫存在此頁，重新載入或換語前需先下載才能留存。 [英文 1440 詢問完成](./liquid-forme-en-1440-inquiry.png)、[英文下載原文](./liquid-forme-en-download.txt)、[中文下載原文](./liquid-forme-zh-Hant-download.txt)、[候選瀏覽器測試](./source/test/browser/verify.mjs)、[商業候選原始紀錄](./source/evidence/V002/COMMERCIAL.md) |

## 待驗項目

實體 GPU、真機手機及其耗電、完整讀屏流程為 NOT_RUN。正式部署後的雙語實際網址、同版畫面、網路與回返驗證待執行。發行交付 ZIP 與外部複核為 NOT_RUN。

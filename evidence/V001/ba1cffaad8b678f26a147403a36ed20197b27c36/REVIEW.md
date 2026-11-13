# 紙與光 / Paper & Light — M03 independent review

Candidate: ba1cffaad8b678f26a147403a36ed20197b27c36

Non-author reviewer: /root/v001_review. Author: 01a1d0b2-395e-72c2-8518-7e9a0b18ec11.

[Eight-lane verification](https://github.com/KYStr/glossquote-visuals/actions/runs/43384882948) · [Acceptance](acceptance.json)

| Category | Score |
|---|---:|
| artDirection | 9.2 |
| uiDesign | 9.3 |
| commercialCompleteness | 9.4 |

Scores are subjective commercial-v1 judgments, not measured conversion.

## artDirection

| Criterion | Score | Observation |
|---|---:|---|
| brandIdentity | 1.8 | 紙與光的弧形盲壓、暖紙色和朱紅從品牌標記一路延伸到商品圖、紙樣與訂製區，紙品工作室的識別在中英版一致。 |
| heroComposition | 1.9 | 桌面以斜切紙面、弧線與襯底陰影平衡左側標題及主 CTA。390px 改採直排，壓印和紙弧仍完整落在設計畫框。 |
| typography | 1.8 | 英文襯線展示字與中文標題都有清楚主次，按鈕和規格使用較樸素的文字。桌面部分短標、規格補充仍需更近看。 |
| materialImagery | 1.9 | 自然序列可見纖維、盲壓肩部、紙緣與陰影跟隨同一紙面曲率；角度變動時亮邊沿壓印和弧面移動。三款紙樣另讓棉紙、暖白卡紙與再生紙容易辨識。 |
| pageRhythm | 1.8 | 三款商品、紙樣比較、流程和朱紅訂製區的段落順序清楚。1100px 英文暫停後圖說保有一行，首屏高度與運作、續播相同。手機逐一列出三張完整商品卡，至表單的閱讀距離較長。 |

## uiDesign

| Criterion | Score | Observation |
|---|---:|---|
| informationHierarchy | 1.9 | 首屏行動、系列規格、紙材/加工、印製流程及需求摘要依序展開。表單與摘要重述示意尺寸、組成及交期，減少為選項來回找資料。 |
| navigationActions | 1.8 | 首屏開始訂製、各系列直達入口、頁內導覽、回到編輯及下載的去向清楚。手機導覽及材質控制標籤比主按鈕更緊湊。 |
| formsStates | 1.9 | 系列切換同步提供建議、數量單位與規格；自訂值保留、無效數量焦點及可回編已由中英操作驗證。摘要有明確下載、回編和完成狀態。 |
| responsiveAccessibility | 1.8 | 390px 有觸控完成畫面，雙語四寬與 200% 根文字尺寸、鍵盤和減少動態由同 SHA 測試驗證。1100px 暫停在 100%/200% 中英原圖都能讀到圖說與操作，頁面無橫向溢位。200% 英文圖說排為三行；部分狹窄的關閉選單只顯示選項開頭。 |
| interactionConsistency | 1.9 | 商品卡、表單、摘要與真實下載共用系列、規格、紙材、加工和數量單位。角度反饋與暫停、續播符合操作文字，1100px 英文狀態變化未拉長首屏。 |

## commercialCompleteness

| Criterion | Score | Observation |
|---|---:|---|
| positioningValue | 1.9 | 定位為有選材及加工工序的紙品訂製工作室，名片、婚禮邀請與禮盒對應不同用途，盲壓和紙材的觸感有對照。 |
| decisionInformation | 1.9 | 各系列列示尺寸、組成、起印量和參考交期，另有 300/350 g/m² 紙材、加工與印檔資訊。中文完成畫面與下載列明禮盒 250 組、校稿後 10–15 個工作天，以及「訂製數量超過 200，需另確認工期」。英文摘要的 sets 與工期條件一致。 |
| truthfulTrust | 1.8 | 產品頁交代紙樣、打樣、校稿與特殊工期，完成畫面和兩語文字檔清楚說明只是生成需求摘要、尚未下單。概念品牌的示意資料與實際履約仍有界線。 |
| customerJourney | 1.9 | 可從主行動或單款帶入系列，選紙/加工、填數量用途、檢查後下載。兩語實際下載都保留棉紙 350 g/m²、單色印刷＋盲壓、250 組與用途。 |
| completionRecovery | 1.9 | 錯誤有焦點與修正路徑，回編保留先前選擇。完成提示與兩語原 TXT 都明示已產生需求摘要、尚未送出訂單。數量超過 200 的工期提醒和加工打樣提醒分行列示。 |

## Motion and material

- desktop: 桌面六張自然原圖中，弧形盲壓、纖維和下緣一起隨曲面緩慢起伏；底色上的陰影沿紙緣改變。45° 至 180° 的明暗沿壓痕與紙緣移動，回 0° 恢復同方向掠光。暫停前、立即、保持全像素相同，續播恢復紙緣與光影變化。
- mobile: 手機完整保留紙緣、盲壓及接觸陰影。四秒附近可見下緣抬起，八秒附近回到初始形狀；調光時暖色亮區沿弧面移動。觸控及受控推進 1.6 秒後暫停原圖仍逐像素相同，續播後可見纖維與曲面明暗變化。

## Limits

- 實體 GPU、實體手機、耗電及發熱、完整人工讀屏為 NOT_RUN。原圖取自 GitHub-hosted Windows Server 2025 的 Chromium 軟體渲染與 WebGPU。
- 自然 PNG 是實測請求時間下的離散取樣。32.08 次 texture acquisition／秒是 runner 觀測，顯示 FPS 未測。
- 正式 HTTPS、交付 ZIP 及外部複核待主責確認。

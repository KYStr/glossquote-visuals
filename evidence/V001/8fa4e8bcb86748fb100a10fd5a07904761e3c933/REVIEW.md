# 紙與光 / Paper & Light — M03 independent review

Candidate: 8fa4e8bcb86748fb100a10fd5a07904761e3c933

Non-author reviewer: /root/v001_review. Author: 01a1d0b2-395e-72c2-8518-7e9a0b18ec11.

[Eight-lane verification](https://github.com/KYStr/glossquote-visuals/actions/runs/43375558737) · [Acceptance](acceptance.json)

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
| pageRhythm | 1.8 | 三款商品到紙樣比較，再到流程與朱紅訂製區，段落有視覺停頓。手機以直排保留同一閱讀次序，逐一列出三張完整商品卡使到達表單的距離較長。 |

## uiDesign

| Criterion | Score | Observation |
|---|---:|---|
| informationHierarchy | 1.9 | 首屏行動、系列規格、紙材/加工、印製流程及需求摘要依序展開。表單與摘要重述示意尺寸、組成及交期，減少為選項來回找資料。 |
| navigationActions | 1.8 | 首屏開始訂製、各系列直達入口、頁內導覽、回到編輯及下載的去向清楚。手機導覽及材質控制標籤比主按鈕更緊湊。 |
| formsStates | 1.9 | 系列切換同步提供建議、數量單位與規格；自訂值保留、無效數量焦點及可回編已由中英操作驗證。摘要有明確下載、回編和完成狀態。 |
| responsiveAccessibility | 1.8 | 390px 可用觸控完成，雙語四寬度與根文字 200%、鍵盤、主要觸控目標及減少動態經隔離 runner 斷言，抽測對比最低 6.83:1。較小的紙樣旁註和部分次要資訊仍可改善。 |
| interactionConsistency | 1.9 | 商品卡、訂製表單、摘要與文字下載共用系列、規格、紙材、加工、用途和數量單位。角度控制的實際亮暗回饋與暫停/續播符合控制文字。 |

## commercialCompleteness

| Criterion | Score | Observation |
|---|---:|---|
| positioningValue | 1.9 | 定位為有選材及加工工序的紙品訂製工作室，名片、婚禮邀請與禮盒對應不同用途，盲壓和紙材的觸感有對照。 |
| decisionInformation | 1.9 | 各系列列示尺寸、組成、起印量和參考交期，另有 300/350 g/m² 紙材、加工與印檔資訊。中文完成畫面與下載列明禮盒 250 組、校稿後 10–15 個工作天，以及「訂製數量超過 200，需另確認工期」。英文摘要的 sets 與工期條件一致。 |
| truthfulTrust | 1.8 | 產品頁交代紙樣、打樣、校稿與特殊工期，完成畫面和兩語文字檔清楚說明只是生成需求摘要、尚未下單。概念品牌的示意資料與實際履約仍有界線。 |
| customerJourney | 1.9 | 可從主行動或單款帶入系列，選紙/加工、填數量用途、檢查後下載。兩語實際下載都保留棉紙 350 g/m²、單色印刷＋盲壓、250 組與用途。 |
| completionRecovery | 1.9 | 錯誤有焦點與修正路徑，回編保留先前選擇。完成提示與兩語原 TXT 都明示已產生需求摘要、尚未送出訂單。數量超過 200 的工期提醒和加工打樣提醒分行列示。 |

## Motion and material

- desktop: 桌面自然影格的斜切紙面完整，細纖維和盲壓始終貼合紙面。紙緣沿弧線輕抬時，朱紅底上的接觸陰影跟著改變。0°→180° 的掠光穿過盲壓肩部與紙面，回 0° 恢復初始光向。暫停前、立即、保持原 PNG 位元一致，續播後紙緣和明暗重新改變。
- mobile: 手機自然影格保留完整盲壓、下紙緣與朱紅底。約半週期時紙緣與陰影一起起伏。45°/90° 的亮面擴開，180° 回到暗側，回 0° 恢復原光向。觸控與 1,600ms 受控推進後原圖維持相同，續播可見紙面變化。

## Limits

- 實體 GPU、實體手機、耗電及發熱、完整人工讀屏為 NOT_RUN。畫面取自 GitHub-hosted Windows Server 2025 的 Chromium 軟體渲染與 WebGPU。
- 自然 PNG 為實測時間下的離散取樣。畫面平順度和顯示 FPS 未測，32.99 次 texture acquisition／秒僅為此 runner 的觀測值。
- 正式 HTTPS、交付 ZIP 及外部複核待主責確認。

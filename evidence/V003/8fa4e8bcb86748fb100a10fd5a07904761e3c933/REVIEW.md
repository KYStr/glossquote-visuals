# 夜航訊號 / Night Signal — M03 independent review

Candidate: 8fa4e8bcb86748fb100a10fd5a07904761e3c933

Non-author reviewer: /root/signal_review. Author: 01a1d0b2-414c-7452-ad32-445d958fb8a1.

[Eight-lane verification](https://github.com/KYStr/glossquote-visuals/actions/runs/43375558737) · [Acceptance](acceptance.json)

| Category | Score |
|---|---:|
| artDirection | 9.1 |
| uiDesign | 9.2 |
| commercialCompleteness | 9.4 |

Scores are subjective commercial-v1 judgments, not measured conversion.

## artDirection

| Criterion | Score | Observation |
|---|---:|---|
| brandIdentity | 1.8 | 深藍、奶黃、壓縮海報字與金／紫／紅節目色彩形成一致電子音樂夜品牌；場地影像、節目列與票務區延續這個方向。 |
| heroComposition | 1.9 | 桌面大標與緞帶雕塑有清楚主次，主 CTA 不被材質搶去；手機先交代活動及入口，再提供有份量的主視覺，未遮蔽資訊。 |
| typography | 1.8 | 中英文標題、節目時間、演出者與票價層級清楚。320px／200% 首屏仍可讀且 CTA 能換行；英文手機暫停列較鬆，保留精緻度餘裕。 |
| materialImagery | 1.8 | 本候選的金色寬幅、冷紫密集及紅色細長緞帶可辨，網格與亮暗保留立體前後關係；48 張自然 GPU 原幀及三組受控轉場未見黑場或形體重置。最細手機邊緣仍略有點線感，維持 1.8。 |
| pageRhythm | 1.8 | 雙語全頁由深色主視覺、淺色節目、深色場地再到票務及 FAQ，節奏完整；390px 圖文順序及 768px 版面仍清楚。 |

## uiDesign

| Criterion | Score | Observation |
|---|---:|---|
| informationHierarchy | 1.9 | 日期、地點、活動時段與主行動在前，節目、交通與票種依決策次序展開，單場／全夜的選擇與總額易於辨識。 |
| navigationActions | 1.8 | 首屏三節目預覽與下方節目列同步；主 CTA、票種選擇、完成後下載與修改的目的清楚，鍵盤／touch 的流程由同 SHA 報告支持。 |
| formsStates | 1.9 | 單場、場次、數量、單價及總額均有明確標籤；實際選票與完成圖顯示三張單場 NT$1,440、三張全夜 NT$2,640，必填及無效數量依同 SHA 測試。 |
| responsiveAccessibility | 1.8 | 實看 390px 中英頁面、768px 與 320px／200% 首屏；票務與完成操作保持可讀。完整尺寸、鍵盤、touch、fallback 依本 SHA 執行報告，未把這些證據等同實體裝置或人工讀屏驗證。 |
| interactionConsistency | 1.8 | 預覽、節目選中狀態、單場建議與票務摘要一致；自訂選擇保留有本 SHA 測試。shared 桌面與手機 controlled quartet 確認真正同幀暫停、零提交及恢復動作。 |

## commercialCompleteness

| Criterion | Score | Observation |
|---|---:|---|
| positioningValue | 1.9 | 港灣電子音樂夜的日期、時間、場地及環境音／低頻／深夜 DJ 體驗明確，主視覺服務活動定位並連到選票流程。 |
| decisionInformation | 1.8 | 三場時間、18:30 開門、票價、數量及交通回程提示支持選擇；場地以觀眾口吻說明入口、站席與休息，且揭露概念場所。 |
| truthfulTrust | 2 | 頁尾、場地說明、票價及完成摘要皆明確揭露概念性質；兩語實際下載直接說明沒有付款或保留席位，沒有虛構交易成功或真實地址。 |
| customerJourney | 1.9 | 互動已形成商業活動流程：了解節目、選單場／全夜與張數、檢視摘要、修改及下載。兩語原始畫面、UTF-8 下載及同 SHA 測試相互一致。 |
| completionRecovery | 1.8 | 完成畫面及 TXT 含相同日期、18:30、三場時段、張數與 NT$2,640；可返回修改，無效數量、必填、選擇保留與單場入場時間由同 SHA 斷言覆蓋。 |

## Motion and material

- desktop: 已實看本候選三節目所有自然取樣，Carrier 寬幅金色、Echo 密集冷紫與 Dawn 細長紅色均跨完整名義週期維持輪廓、網格、高光與粒子空間，未見黑場或重置。商業全頁與轉場合成圖確認 shader 在原 CSS 中可見；controlled quartet 獨立證明同幀暫停，沒有用自然時鐘 before→click 充當同幀。
- mobile: 已實看本候選三節目所有自然取樣，Carrier 寬幅金色、Echo 密集冷紫與 Dawn 細長紅色均跨完整名義週期維持輪廓、網格、高光與粒子空間，未見黑場或重置。商業全頁與轉場合成圖確認 shader 在原 CSS 中可見；controlled quartet 獨立證明同幀暫停，沒有用自然時鐘 before→click 充當同幀。

## Limits

- {'status': 'LIMITATION', 'scope': 'natural-time', 'reason': '三節目的自然證據是 GPU texture 間隔取樣，不是連續錄影或顯示器呈現時間；以實際 submission 跨度覆蓋名義週期，不宣稱所有次級動作完全閉合。'}
- {'status': 'LIMITATION', 'scope': 'paired-capture-timing', 'reason': 'shared sample 的 GPU readback 在 100ms 區間前端、composite 在區間後取得；兩者按控制狀態配對，未宣稱同一提交幀。pause 只比較 controlled clock 的 composite，desktop 為 1100×850，mobile 為 390×844；自然 desktop 為 1440px。'}
- {'status': 'LIMITATION', 'scope': 'material-detail', 'reason': '手機 Dawn 最細左緣局部有輕微階梯／點線感；未影響主形、內容或操作，已反映在材質與美術分數，沒有新增 >9 阻擋。'}
- {'status': 'NOT_RUN', 'scope': 'physical-gpu-mobile-screen-reader', 'reason': '遠端 Windows WARP 原圖與自動鍵盤／touch／縮放證據，未驗實體 GPU、實體手機或人工讀屏。'}
- {'status': 'NOT_RUN', 'scope': 'live-deployment', 'reason': '本件接受固定候選與遠端測試產物，尚未驗證正式部署網址。'}

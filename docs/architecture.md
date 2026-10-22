# 処理フロー（いたずラッシュ）

本体は `index.html` 1ファイル。箱はファイルの中の区切り（`/* ---------- 名前 ---------- */`）で、下の図の「場所」はその区切りの名前。

```mermaid
flowchart TD
  subgraph PAGE["index.html"]
    IN["入力<br>場所: 入力<br>Pointer Events → st.down/move/up"]
    ST["ステージ（10種＋押すなボタン）<br>場所: ステージ1〜10・ボーナス<br>共通の形: init/update/draw/commit/bill"]
    FLOW["進行<br>場所: 進行<br>mode: title→prompt→play→flash→result<br>NORMAL・BONUS・ROUNDS・PLAY/PROMPT/FLASH"]
    TOT["集計 tot<br>（ステージの commit が足し込む）"]
    RES["結果 res<br>場所: 進行（buildResult）<br>rows・後始末の秒・損害額・怒られ度・判定"]
    ZK["いたずら図鑑<br>場所: いたずら図鑑<br>ZUKAN・checkZukan・unlock"]
    DRAW["描画<br>場所: 描画<br>ステージ画面・HUD・お題・結果カード"]
    SND["音・BGM<br>場所: 音・BGM<br>sfx / music → bus"]
    REC["録画<br>場所: 録画<br>録画用キャンバス＋録画用の音 → MediaRecorder"]
    SH["シェア・買い直し<br>場所: シェア・買い直し<br>X・コピー・挑戦状URL・紹介の行・Amazonリンク"]
    DOM["DOM（ボタンとパネル）<br>タイトル・中断・結果の帯・図鑑・買い直し"]
  end
  LS[("localStorage<br>音・録画のオンオフ、図鑑")]
  CH["c/0.html〜c/5.html<br>挑戦状の入口（判定ごとのカード画像）"]
  TEST["tests/*.test.js<br>#test で window.__itazu を使って操作・確認"]

  IN -- "指の位置（id, x, y）" --> ST
  FLOW -- "ステージの開始・時間切れ（up(null)）" --> ST
  ST -- "commit(tot)" --> TOT
  TOT -- "bill(tot)" --> RES
  FLOW -- "最後まで遊んだか" --> ZK
  RES --> ZK
  ZK -- "新しく登録された名前（res.newZ）" --> DRAW
  ST -- "draw()" --> DRAW
  RES --> DRAW
  ST -- "効果音" --> SND
  FLOW -- "BGM（ステージの曲・周回のテンポ）" --> SND
  DRAW -- "キャンバスの絵" --> REC
  SND -- "録画用の出力（音を出さない設定でも流れる）" --> REC
  REC -- "動画（recBlob）" --> SH
  RES -- "怒られ度・判定・損害額" --> SH
  SH -- "挑戦状のURL（?vs=）" --> CH
  CH -- "転送" --> FLOW
  DOM <--> FLOW
  ZK <--> LS
  DOM <--> LS
  TEST -. "操作・確認" .-> PAGE
```

## 受け渡しのメモ
- **ステージ → 集計**：`commit(tot)` で、そのステージの成果を `tot` に足す（`add`）。1回のステージでの最高は `mx` で記録する（図鑑の判定用）。
- **集計 → 結果**：各ステージの `bill(tot)` が `{ v, n, sec, yen, angry }` を返し、`buildResult` が合計して怒られ度と判定を出す。
- **成果を数えるのはプレイ中だけ**（`scoring()`）。時間切れのあと（結果フラッシュ）に増えないようにする。
- **音**：効果音と BGM は `bus` に集まり、リミッターを通って「スピーカー用（音オフならゲイン0）」と「録画用」に分かれる。
- **録画**：画面のキャンバスを横720pxの録画用キャンバスに毎フレーム写して録る。無限モードは録画をずらして足し、最後の70〜140秒だけ残す。
- **テスト**：`#test` のときだけ出る `window.__itazu` で、ステージ順の指定・ハプニングの強制・内部の値の読み取りをする。

# 処理フロー（いたずラッシュ／いたずラッシュ大盛り！）

ページは2つ（既存版 `index.html` と大盛り `oomori/index.html`）。中身のスタイルとスクリプトは `shared/` を共有する。
スクリプトは普通の `<script src>` を順に読み（base → stages → stages-extra → game）、トップレベルの `const` を共有する。
サイトごとの違いは各ページの設定 `window.ITAZU`（`shared/game.js` の `CONF`）に寄せる。既存版は設定なし＝既定値。
`shared/*.js` の中は `/* ---------- 名前 ---------- */` のコメントで区切ってあり、下の図の「場所」はその区切りの名前。

## ページと設定

```mermaid
flowchart TD
  P1["index.html（既存版）<br>設定なし：周回モード（10種×2周）・図鑑 itazurush-zukan"]
  P2["oomori/index.html（大盛り）<br>window.ITAZU：ランダム20本・既存10＋新規5種・図鑑 itazurush-oomori-zukan"]
  CSS["shared/game.css<br>スタイル"]
  BASE["shared/base.js<br>画面・小道具・音・BGM"]
  ST["shared/stages.js<br>既存10種・共通部品・押すなボタン<br>STAGE_LIST・ZUKAN_EXTRA"]
  EX["shared/stages-extra.js<br>新規5種（落書き・炭酸・プリン・シール・靴飛ばし）<br>STAGE_LIST と ZUKAN_EXTRA に足す"]
  GAME["shared/game.js<br>設定 CONF・進行・図鑑・描画・録画・シェア・入力"]
  CH1["c/0〜5.html（既存版の挑戦状）"]
  CH2["oomori/c/0〜5.html（大盛りの挑戦状）"]
  P1 --> CSS & BASE & ST & GAME
  P2 --> CSS & BASE & ST & EX & GAME
  GAME -- "挑戦状のURL（CONF.site + c/段階.html?vs=）" --> CH1 & CH2
  CH1 -- "転送 ../?vs=" --> P1
  CH2 -- "転送 ../?vs=" --> P2
```

## ゲームの中の流れ

```mermaid
flowchart TD
  subgraph JS["shared/*.js"]
    IN["入力<br>場所: game.js 入力<br>Pointer Events → st.down/move/up"]
    ST["ステージ（STAGE_LIST から CONF.stages で選ぶ＋押すなボタン）<br>場所: stages.js・stages-extra.js<br>共通の形: init/update/draw/commit/bill"]
    FLOW["進行<br>場所: game.js 進行<br>mode: title→prompt→play→flash→result<br>出し方 CONF.order: rounds（周回）／random（ランダム20本 randomPick・randomSet）"]
    TOT["集計 tot<br>（ステージの commit が足し込む）"]
    RES["結果 res<br>場所: game.js 進行（buildResult）<br>rows・後始末の秒・損害額・怒られ度・判定"]
    ZK["いたずら図鑑<br>場所: game.js いたずら図鑑<br>ZUKAN（＋ZUKAN_EXTRA）・checkZukan・unlock"]
    DRAW["描画<br>場所: game.js 描画<br>ステージ画面・HUD・お題・結果カード"]
    SND["音・BGM<br>場所: base.js 音・BGM<br>sfx / music → bus"]
    REC["録画<br>場所: game.js 録画<br>録画用キャンバス＋録画用の音 → MediaRecorder"]
    SH["シェア・買い直し<br>場所: game.js シェア・買い直し<br>X・コピー・挑戦状URL・紹介の行・Amazonリンク"]
    DOM["DOM（ボタンとパネル）<br>タイトル・中断・結果の帯・図鑑・買い直し"]
  end
  LS[("localStorage<br>音・録画のオンオフ（共通）、図鑑（CONF.store + zukan）")]
  CH["c/0〜5.html・oomori/c/0〜5.html<br>挑戦状の入口（判定ごとのカード画像）"]
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
  FLOW -- "BGM（ステージの曲・テンポ）" --> SND
  DRAW -- "キャンバスの絵" --> REC
  SND -- "録画用の出力（音を出さない設定でも流れる）" --> REC
  REC -- "動画（recBlob）" --> SH
  RES -- "怒られ度・判定・損害額" --> SH
  SH -- "挑戦状のURL（?vs=）" --> CH
  CH -- "転送" --> FLOW
  DOM <--> FLOW
  ZK <--> LS
  DOM <--> LS
  TEST -. "操作・確認" .-> JS
```

## 受け渡しのメモ
- **ページ → 設定**：`window.ITAZU` の項目（`title` `site` `store` `stages` `order` `total` `roundLen` `modeName` `intro`）が `CONF` の既定値を上書きする。既定値は既存版と同じ。
- **出し方**：`order:'rounds'` は今までどおり周ごとにシャッフルして `ROUNDS` 周。`order:'random'` は `total` 本の組（全種類を1回ずつ＋残りは別々の種類）をシャッフルして順に出す（直前と同じは続かない。無限モードは `total` 本ごとに作り直す）。テンポは `roundLen` 本ごとに上がる。
- **ステージ → 集計**：`commit(tot)` で、そのステージの成果を `tot` に足す（`add`）。1回のステージでの最高は `mx` で記録する（図鑑の判定用）。
- **集計 → 結果**：各ステージの `bill(tot)` が `{ v, n, sec, yen, angry }` を返し、`buildResult` が合計して怒られ度と判定を出す。
- **成果を数えるのはプレイ中だけ**（`scoring()`）。時間切れのあと（結果フラッシュ）に増えないようにする。
- **音**：効果音と BGM は `bus` に集まり、リミッターを通って「スピーカー用（音オフならゲイン0）」と「録画用」に分かれる。
- **録画**：画面のキャンバスを横720pxの録画用キャンバスに毎フレーム写して録る。無限モードは録画をずらして足し、最後の70〜140秒だけ残す。
- **テスト**：`#test` のときだけ出る `window.__itazu` で、ステージ順の指定・ハプニングの強制・内部の値の読み取り・ランダムの順番の取り出し（`sampleOrder`）をする。

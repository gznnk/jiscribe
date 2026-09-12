> 🌐 English version: [07-external-sync.md](./07-external-sync.md)

# 外部同期・VSCode 連携

canvas は VSCode 拡張の Webview として動くとき、ホスト（拡張側）が持つ
ファイル内容と双方向に同期する。ここでは「ホスト → キャンバス」の取り込みと、
「キャンバス → ホスト」保存の折り返しで起きる競合の扱いを説明する。

## 取り込み：useSyncExternalDoc / SYNC_EXTERNAL

親（ホスト）から最新の `CanvasDoc` が Props で渡る。`useSyncExternalDoc`
（`controllers/hooks/useSyncExternalDoc.ts`）がその変更を検知し、`canvasToState` で
State に変換して `SYNC_EXTERNAL` を dispatch する。

スキップ条件:

- **初回マウント**: reducer の初期化で同じ doc を使用済みなので skip
  （dispatch すると冗長な履歴エントリが生まれる）。
- **内容が同一の doc**: `isSameCanvasDocContent` で現在の `history.present` と比較し、
  同一なら skip。進行中のジェスチャー中断・UI state クリア・無意味な履歴エントリを避ける。

取り込み前に `resetGestureState()` で進行中のジェスチャーを破棄する。

`SYNC_EXTERNAL` を受けた reducer 側の扱い（履歴境界として past を直接積み、
選択・進行中操作をリセットし viewport のみ維持）は [状態更新フロー](./06-state-update-flow.ja.md) を参照。

## 別ドキュメントの読み込み：docLoadId / LOAD_DOCUMENT

`SYNC_EXTERNAL` は past を積む＝履歴を残すので、**別のドキュメント**を同じ経路で
入れると、直後の Ctrl+Z で前のドキュメントの内容が今の名前の下に戻ってしまう。
ホストは `docLoadId` プロップで「今 `doc` に載っているのはどの読み込みか」を宣言する。
値は任意の文字列（パスでも読み込みごとのカウンタでもよい）で、別のドキュメントを
載せたときだけ変える。同一ドキュメントへの外部編集や、ホスト側 undo/redo による
同じ doc の再送では変えない。

`useSyncExternalDoc` は docLoadId の変化を最初に見る。変化していれば
`LOAD_DOCUMENT` を dispatch し、reducer は past / future を捨てて取り込む。
自分の保存の折り返し判定も内容一致による skip も通さない（内容が同一でも、
ホストが読み込みだと言った以上は履歴を捨てなければならない）。
プロップを渡さないホストでは、届く doc はすべて `SYNC_EXTERNAL` になる。

canvas は `doc` プロップを検証し直さない。外部から入る doc は信頼できないため、ホストが
`createCanvasParser` の検証を通した doc を渡す（`Canvas` の `doc` プロップの契約。
[データモデルと永続化](./03-data-model-and-persistence.ja.md)、[設計思想](./01-design-philosophy.ja.md) 原則 4）。

## 保存通知：useNotifySaveRequest

コミットで履歴を記録するとき（`recordHistoryIfNeeded`）と、undo / redo などで履歴を復元するとき
（`controllers/utils/restoreHistorySnapshot.ts`）に、state の `saveRequest` が進む（`version` を 1 つ上げ、
新しい `nonce` を振る）。`useNotifySaveRequest`（`controllers/hooks/useNotifySaveRequest.ts`）はこれを受けて
親へ `onCommit(doc, saveNonce)` を通知する。

- **effect は `saveRequest.version` に依存する**。1 回の増加が 1 件の保存要求になる。
- **送る内容は、送る時点の最新の state から読む**。layout effect で更新する `stateRef` から読み、
  要求を出した render のクロージャの state は使わない。送信を遅らせても最後のコミットを送るため。
- **送る doc は `history.present` から作る**。state をもう一度変換しない。
- **送るタイミングは `createSaveRequestScheduler`（`controllers/hooks/support/`）が決める**。通常のコミットは
  すぐ送る。集約チェーン中のコミット（キーリピートのナッジなど）は保留し、keyup・ウィンドウの blur・
  アンマウントのどれかで送る（そうしたイベントが来ない経路のために、時間による保険もある）。
- **各 nonce は最大 1 回だけ送る**（`createNonceDeliveryGuard`）。境界イベントでの送信が、そのコミット自身の
  予約より先に走ることがあるため。
- `onCommit` は ref 経由で呼び、親が毎 render 新しい関数を渡しても再発火しないようにしている。

## saveNonce による折り返しの識別（#29）

問題: キャンバスが保存 → ホストがファイルを書き換え → その変更が `doc` として
**自分自身にエコーバック**される。これを通常の外部変更として扱うと、自分が今行った操作が
履歴境界として積み直され、UI state がリセットされてしまう。

対策: 保存時に `saveNonce` を発行して `onCommit` で渡し、ホストはそれをそのまま
`syncNonce` として返す。突き合わせは `useSelfSaveNonceTracker` が保持する
**未消化 nonce のセット**で行う（`controllers/hooks/support/createSelfSaveNonceTracker.ts`）。

- `useNotifySaveRequest` が配信した nonce を `register` する。
- `useSyncExternalDoc` は折り返しの `syncNonce` を `consumeIfSelfSave` で照合し、
  一致（自分の保存の折り返し）なら **dispatch せず破棄**する。エコーは新情報を
  持たず、キャンバス側が正本なので何も更新しない（進行中ジェスチャーも中断しない）。
- 未登録の nonce（外部からの本物の変更）は `SYNC_EXTERNAL` を dispatch し、
  reducer が履歴境界として処理する（past に積み、UI state リセット）。

単一値ではなくセットで持つのがポイント。保存が重なって折り返しが前後した場合
（例: リモート FS）、単一値だと後発コミットの nonce で上書きされ、先発の折り返しが
外部変更と誤判定される。直近 ≤64 件を保持することで順序の入れ替わりに頑健になる。

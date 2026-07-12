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

外部から入る doc は信頼できないため、本来は parser の二段検証を境界で通す
（[データモデルと永続化](./03-data-model-and-persistence.ja.md)、[設計思想](./01-design-philosophy.ja.md) 原則 4）。

## 保存通知：useNotifySaveRequest

コミット（commit / undo / redo）で `saveVersion` が進むと、`useNotifySaveRequest`
（`controllers/hooks/useNotifySaveRequest.ts`）が親へ `onCommit(doc, saveNonce)` を通知する。
この effect は `saveVersion` のみに依存するので、`saveVersion` が増えた**まさにその render の
state**（= 永続化すべき state）をクロージャで捕える。`onCommit` は ref 経由で呼び、
親が毎 render 新しい関数を渡しても再発火しないようにしている。

## saveNonce による折り返しの識別（#29）

問題: キャンバスが保存 → ホストがファイルを書き換え → その変更が `canvasDoc` として
**自分自身にエコーバック**される。これを通常の外部変更として扱うと、自分が今行った操作が
履歴境界として積み直され、UI state がリセットされてしまう。

対策: 保存時に `saveNonce` を発行して `onCommit` で渡し、ホストはそれをそのまま
`syncNonce` として返す。突き合わせは `useSelfSaveNonceTracker` が保持する
**未消化 nonce のセット**で行う（`controllers/utils/createSelfSaveNonceTracker.ts`）。

- `useNotifySaveRequest` が配信した nonce を `register` する。
- `useSyncExternalDoc` は折り返しの `syncNonce` を `consumeIfSelfSave` で照合し、
  一致（自分の保存の折り返し）なら **dispatch せず破棄**する。エコーは新情報を
  持たず、キャンバス側が正本なので何も更新しない（進行中ジェスチャーも中断しない）。
- 未登録の nonce（外部からの本物の変更）は `SYNC_EXTERNAL` を dispatch し、
  reducer が履歴境界として処理する（past に積み、UI state リセット）。

単一値ではなくセットで持つのがポイント。保存が重なって折り返しが前後した場合
（例: リモート FS）、単一値だと後発コミットの nonce で上書きされ、先発の折り返しが
外部変更と誤判定される。直近 ≤64 件を保持することで順序の入れ替わりに頑健になる。

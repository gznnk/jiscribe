# 外部同期・VSCode 連携

svg-canvas-2 は VSCode 拡張の Webview として動くとき、ホスト（拡張側）が持つ
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
選択・進行中操作をリセットし viewport のみ維持）は [状態更新フロー](./06-state-update-flow.md) を参照。

外部から入る doc は信頼できないため、本来は parser の二段検証を境界で通す
（[データモデルと永続化](./03-data-model-and-persistence.md)、[設計思想](./01-design-philosophy.md) 原則 4）。

## 保存通知：useNotifySaveRequest

コミット（commit / undo / redo）で `saveVersion` が進むと、`useNotifySaveRequest`
（`controllers/hooks/useNotifySaveRequest.ts`）が親へ `onCommit(doc, saveNonce)` を通知する。
この effect は `saveVersion` のみに依存するので、`saveVersion` が増えた**まさにその render の
state**（= 永続化すべき state）をクロージャで捕える。`onCommit` は ref 経由で呼び、
親が毎 render 新しい関数を渡しても再発火しないようにしている。

## saveNonce による折り返し競合の回避（#29）

問題: キャンバスが保存 → ホストがファイルを書き換え → その変更が `canvasDoc` として
**自分自身にエコーバック**される。これを通常の外部変更として扱うと、自分が今行った操作が
履歴境界として積み直され、UI state がリセットされてしまう。

対策: 保存時に `saveNonce` を発行して `onCommit` で渡し、ホストはそれをそのまま
`SYNC_EXTERNAL` の `saveNonce` として返す。reducer は

- `action.saveNonce === state.saveNonce`（自分の保存のエコーバック）
  → オブジェクト参照だけ更新し、`past` / `future`（履歴）は変更しない。
- 一致しない（外部からの本物の変更）
  → 履歴境界として処理（past に積み、UI state リセット）。

これにより、自己保存の折り返しと外部からの実変更を区別できる。

> **既知の課題（#29）**: saveNonce が一巡（折り返し）するタイミングでの競合。
> nonce の発行・突き合わせの境界ケースとして追跡中。
> </content>

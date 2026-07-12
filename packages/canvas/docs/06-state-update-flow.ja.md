> 🌐 English version: [06-state-update-flow.md](./06-state-update-flow.md)

# 状態更新フロー（Reducer）

`CanvasState` のすべての更新は `canvasReducer`（`controllers/reducer/canvasReducer.ts`）を
通る。各ジェスチャー・コマンドはここで純粋関数のハンドラへ振り分けられ、新しい state を返す。
この「全体の遷移を 1 か所で組み立てる」方針は [設計思想](./01-design-philosophy.ja.md) の原則 3 に基づく。

## アクション一覧

`CanvasAction`（`controllers/reducer/CanvasActions.ts`）は次のユニオン。

| アクション                           | 役割                                                           | 委譲先                                                            |
| ------------------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `GESTURE`                            | ポインタ/ホイール由来のジェスチャー                            | `handleGesture` → [ジェスチャシステム](./04-gesture-system.ja.md) |
| `COMMAND`                            | ショートカット/メニュー/ツールバーのコマンド（undo/redo 含む） | `handleCommand` → [コマンドシステム](./05-command-system.ja.md)   |
| `PASTE`                              | クリップボードデータの適用                                     | `handlePaste`                                                     |
| `MENU_PROPERTY_UPDATE`               | ObjectMenu の入力（プレビュー / コミット）                     | `handlePropertyUpdate`                                            |
| `SYNC_EXTERNAL`                      | 外部（ホスト）からの doc 取り込み                              | → [外部同期](./07-external-sync.ja.md)                            |
| `CONTAINER_RESIZE`                   | ビューポート寸法の更新                                         | （インライン）                                                    |
| `UPDATE_TEXT_EDIT` / `END_TEXT_EDIT` | テキスト編集中の更新 / 確定・キャンセル                        | `commitTextEditIfNeeded`                                          |
| `CLOSE_CONTEXT_MENU`                 | コンテキストメニューを閉じるだけ                               | （インライン）                                                    |

各ハンドラ（`handleGesture` / `handleCommand` / `handlePaste` …）は
**`(state) => state` の純粋関数**として実装され、副作用を持たない。
これがユニット／結合テストを node 環境で完結させる土台になる（[テスト](./09-testing.ja.md)）。

## 履歴記録（commitVersion）

「永続化・undo の対象になる変更」が起きたハンドラは、結果 state の `commitVersion` を
インクリメントする。`canvasReducer` は対象アクションの後に `recordHistoryIfNeeded` を呼び、
**`commitVersion` が前の state から変化していれば** 履歴を記録する（同時に `saveVersion` も進める）。

- ジェスチャーの場合、`handleGesture` が `dragEnd` 時に doc が実際に変化したときだけ
  `commitVersion` を進める。これにより「最小サイズ未満で描画をやめた」ような
  doc 変化のないドラッグで幽霊 undo エントリが生まれるのを防ぐ。
- `MENU_PROPERTY_UPDATE` は `commit: false`（プレビュー）なら履歴を記録せず、
  `commit: true`（blur / Enter）でのみ `commitVersion` を進める。

履歴は `state.history`（`past` / `present` / `future`）。`past` は直近 50 件に丸める。

## 連続操作の集約（coalescing）

矢印キーによる連続ナッジのような操作を 1 つの undo エントリにまとめるため、
履歴記録には集約のしくみがある。

- 各ハンドラは「この操作はまとめてよい」という意図を `state.historyCoalesce.pending`（集約キー）に立てる。
- `recordHistoryIfNeeded` は、直前コミットの識別子（`recorded`）と `pending` が
  **同一キーかつ一定時間内**（`HISTORY_COALESCE_WINDOW_MS = 1000ms`）であれば、
  `past` を増やさず `present` だけを差し替える。
- `pending` は履歴層がここで消費し、必ず `null` に戻す。

## SYNC_EXTERNAL と履歴境界

外部からの変更は履歴の境界として扱う。`recordHistoryIfNeeded` を通さずに
`past` を直接積み（`present` を `past` に移して新 doc を `present` に）、`future` をクリアする。
あわせて選択・進行中の操作など UI state も明示的にリセットする（viewport のみ維持）。
自分の保存の折り返し（fold-back）は reducer に届く前に除外されるため、ここに来る `SYNC_EXTERNAL` は
常に本物の外部変更である。折り返しの識別方法は [外部同期・VSCode 連携](./07-external-sync.ja.md) を参照。
</content>

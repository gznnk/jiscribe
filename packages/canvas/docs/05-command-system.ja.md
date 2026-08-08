> 🌐 English version: [05-command-system.md](./05-command-system.md)

# コマンドシステム

ショートカットキー・コンテキストメニュー・ツールバーから実行される操作を、
Command パターンで一元管理するしくみ。

## CommandRegistry：3 つの入口が同一経路を通る

操作ロジックを `Command` に集約し、ショートカット / メニュー / ツールバーのどれから呼ばれても
**同じ Command を `dispatch({ type: "COMMAND", commandId })` で実行する**。

```
ショートカットキー ┐
コンテキストメニュー ┼─ dispatch({type:"COMMAND", commandId}) ─→ canvasReducer
ツールバー         ┘        │
                            ▼
                  handleCommand(state, commandId)
                            │
                  commandRegistry.get(id) → Command.execute(state) ⇒ 新しい state
```

これにより操作ロジックの重複がなくなり（DRY）、`GESTURE` と同じ Reducer パターンに
統合される（[状態更新フロー](./06-state-update-flow.ja.md)）。

### Command 型

```ts
type Command = {
	id: string;
	label: string;
	category?: "edit" | "view" | "arrange" | "selection";
	canExecute: (state: CanvasState) => boolean; // メニューの有効/無効化に使用
	execute: (state: CanvasState) => CanvasState; // 純粋関数（副作用なし）
	shortcuts?: PlatformKeyBindings; // mac / win / default を個別指定可
};
```

`execute` が純粋関数なので、Command 単体でテストできる（[テスト](./09-testing.ja.md)）。
`canExecute` で実行可否を動的に判定し、メニュー項目の有効/無効や UI 表示に使う。

### 主要コンポーネント

- `CommandRegistry`（`commands/CommandRegistry.ts`）… `register` / `get` / `getAll` / `findByShortcut`
- `handleCommand`（`commands/handlers/handleCommand.ts`）… `get` → `canExecute` → `execute` を仲介
- `useKeyboardShortcuts`（`hooks/`）… keydown を `findByShortcut` で解決して dispatch（入力フィールド上では無効化）
- `CommandUtils`… プラットフォーム判定・`getPlatformShortcuts` / `formatShortcut`（`⌘A` ↔ `Ctrl+A`）
- 登録は `registries/`（`initializeCommands`）でまとめて行う

## カテゴリと収録コマンド

コマンドは目的別にディレクトリ分割されている（`controllers/commands/`）。

| ディレクトリ | コマンド                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `selection/` | SelectAll / DeselectAll（Ctrl+Shift+A）/ EscapeSelection（Escape）/ SelectNextTextSlot / SelectPreviousTextSlot（Tab / Shift+Tab）/ Delete / Cut / Copy / Duplicate |
| `arrange/`   | `MoveCommands`（矢印キーの nudge: 上下左右 × 通常/Shift の 8 コマンド）/ BringToFront / BringForward / SendBackward / SendToBack                                    |
| `arrow/`     | SwapArrows（コネクター端点の入れ替え）                                                                                                                              |
| `connector/` | SetRoutingStraight / SetRoutingOrthogonal（コネクターの経路切り替え）                                                                                               |
| `group/`     | Group / Ungroup                                                                                                                                                     |
| `history/`   | Undo / Redo                                                                                                                                                         |
| `text/`      | StartTextEdit                                                                                                                                                       |
| `view/`      | ZoomIn / ZoomOut / ZoomToFit / ZoomToSelection / ResetZoom                                                                                                          |

> なお `Command.category` フィールドが現状取り得る値は `selection` / `edit` / `arrange` / `view` の 4 つで、
> UI 上のグルーピングに使う。ディレクトリ構成（上表）の方が細かいのは、実装上の整理単位だからである。

## Undo / Redo（history）

履歴は `CanvasState` の `history`（`past` / `present` / `future`）として持つ。
コミットが必要な操作で `commitVersion` が進むと、`canvasReducer` が `present` を
`past` に積んで履歴を記録する。連続操作（連続ナッジ等）は時間ウィンドウ内で 1 エントリに
集約される。記録・集約の詳細は [状態更新フロー](./06-state-update-flow.ja.md) を参照。

`Undo` / `Redo` は通常のコマンドで、他のコマンドと同様に `COMMAND` アクション（`handleCommand`）
経由で実行され、その `execute` が `past` / `future` から `present` を復元する（専用の
`UNDO` / `REDO` アクションは存在しない）。

## クリップボード：copy / cut / paste / duplicate

`copy` / `cut` はシステムクリップボードへ書き出し（`useClipboardWrite`）、`paste` は
読み出して `PASTE` アクションで適用する（`useClipboardPaste` → `handlePaste`）。
`duplicate` はクリップボードを介さずに選択を複製する。

> **untrusted 入力の検証**: クリップボード経由で外部から入る JSON は信頼できないため、
> 貼り付け時に検証して不正なデータを弾く必要がある（[設計思想](./01-design-philosophy.ja.md) の
> 「境界での防御」）。関連 issue: **#40 / #46**。
> </content>

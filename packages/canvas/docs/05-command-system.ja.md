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
                  handleCommand(state, commandId, registries)
                            │
                  registries.command.get(id) → Command.execute(state, registries) ⇒ 新しい state
```

これにより操作ロジックの重複がなくなり（DRY）、`GESTURE` と同じ Reducer パターンに
統合される（[状態更新フロー](./06-state-update-flow.ja.md)）。

### Command 型

コマンドの定義は `Command`（`commands/CommandTypes.ts`）。ID・メニューに出すラベル・任意の
ショートカット（mac / win / 既定を個別に指定できる）に加えて、次の 2 つの関数を持つ。

- `canExecute` … 今の state で実行できるかを返す。メニュー項目の有効/無効や UI 表示に使う
- `execute` … 新しい state を返す純粋関数（副作用なし）。**省略できる**。クリップボードを非同期に
  読む Paste のように純粋な状態遷移にできないコマンドは、定義（ラベル・ショートカット）だけを
  登録し、実行は `useKeyboardShortcuts` の `callbacks` で配線する

どちらも state（`CanvasControllerState`）とキャンバスのレジストリ束（`ICanvasRegistries`）を受け取る。
`execute` が純粋関数なので、Command 単体でテストできる（[テスト](./09-testing.ja.md)）。

### 主要コンポーネント

- `CommandRegistry`（`commands/CommandRegistry.ts`）… キャンバスごとに 1 つあり、レジストリ束の `registries.command` として引く。ID で引く `get`、キーイベントから引く `findByShortcut` など
- `handleCommand`（`commands/handlers/handleCommand.ts`）… `get` で引いたコマンドが `execute` を持たないとき、または `canExecute` が偽のときは state をそのまま返し、それ以外は `execute` を呼ぶ
- `useKeyboardShortcuts`（`hooks/`）… keydown を `findByShortcut` で解決して dispatch（入力フィールド上では無効化）。`callbacks` に実行を渡されたコマンドはそちらを呼ぶ
- `CommandUtils`… プラットフォーム判定・`getPlatformShortcuts` / `formatShortcut`（`⌘A` ↔ `Ctrl+A`）
- 登録は `registries/`（`initializeCommands`）でまとめて行う

## カテゴリと収録コマンド

コマンドは目的別にディレクトリ分割されている（`controllers/commands/` 配下。例: `selection/`・`arrange/`・`view/`）。
キャンバスに登録されるコマンドの一覧は `ALL_COMMANDS`（`controllers/registries/initializeCommands.ts`）が正本。
`createCanvasRegistries` は既定でそのすべてを登録し、設定で有効なコマンドを絞った場合はその部分集合だけを登録する。

`Command.category` は UI 上のグルーピングに使う分類で、取りうる値は `CommandTypes.ts` にある。
ディレクトリ構成の方が細かいのは、実装上の整理単位だからである。

## Undo / Redo（history）

履歴は `CanvasControllerState`（`controllers/CanvasTypes.ts`）の `history`（`past` / `present` / `future`）として持つ。
コミットが必要な操作で `commitVersion` が進むと、`canvasReducer` が `present` を
`past` に積んで履歴を記録する。連続操作（連続ナッジ等）は時間ウィンドウ内で 1 エントリに
集約される。記録・集約の詳細は [状態更新フロー](./06-state-update-flow.ja.md) を参照。

`Undo` / `Redo` は通常のコマンドで、他のコマンドと同様に `COMMAND` アクション（`handleCommand`）
経由で実行され、その `execute` が `past` / `future` から `present` を復元する（専用の
`UNDO` / `REDO` アクションは存在しない）。

## クリップボード：copy / cut / paste / duplicate

`copy` / `cut` は選択を内部クリップボード（state の `internalClipboard`）へ書き、`useClipboardWrite` が
それをシステムクリップボードへ書き出す。`paste` はシステムクリップボードを読み出し（読めないか不正なら
内部クリップボードを使う）、`PASTE` アクションで適用する（`useClipboardPaste` → `handlePaste`）。
`duplicate` はクリップボードを介さずに選択を複製する。

> **untrusted 入力の検証**: クリップボード経由で外部から入る JSON は信頼できないため、貼り付けの
> 境界で検証する（[設計思想](./01-design-philosophy.ja.md) の「境界での防御」）。`useClipboardPaste` は
> 読み出した JSON を `isClipboardData`（`commands/selection/ClipboardData.ts`。各オブジェクトを
> `ObjectStateValidatorRegistry` で検証する）に通し、通らないものは採らない。`handlePaste` は貼り付ける
> オブジェクトの `features` を、運ばれてきた値ではなく自キャンバスのレジストリから付け直す。
> 関連 issue: **#40 / #46**。

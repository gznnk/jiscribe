# Commands アーキテクチャ

## 概要

ショートカットキーとコンテキストメニューから実行される操作を統一的に管理するための Command パターン実装。

## 設計思想

### 核となるアイデア

1. **Command レジストリ**で操作を一元管理
2. ショートカットキーとコンテキストメニューの両方から同じ Command を呼び出す
3. 既存の Reducer アクションパターン（GESTURE と同様）に統合

### アーキテクチャ図

```
┌─────────────────┐      ┌─────────────────┐
│ ショートカット  │      │ コンテキスト    │
│ キーハンドラー  │      │ メニュー        │
└────────┬────────┘      └────────┬────────┘
         │                        │
         │    dispatch({ type: "COMMAND", commandId })
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ canvasReducer   │
         │  case "COMMAND" │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ handleCommand() │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ CommandRegistry │
         │  .get(id)       │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Command.execute │
         │ (state) => state│
         └─────────────────┘
```

## ディレクトリ構造

```
packages/svg-canvas-2/src/
├── controllers/
│   ├── commands/
│   │   ├── CommandTypes.ts              # Command, KeyBinding型定義
│   │   ├── CommandRegistry.ts           # CommandRegistry クラス
│   │   ├── handlers/
│   │   │   └── handleCommand.ts         # COMMAND アクション処理
│   │   ├── selection/
│   │   │   ├── DeleteCommand.ts
│   │   │   ├── SelectAllCommand.ts
│   │   │   ├── DeselectAllCommand.ts
│   │   │   ├── CutCommand.ts
│   │   │   ├── CopyCommand.ts
│   │   │   └── PasteCommand.ts
│   │   ├── arrange/
│   │   │   ├── BringToFrontCommand.ts
│   │   │   ├── BringForwardCommand.ts
│   │   │   ├── SendBackwardCommand.ts
│   │   │   └── SendToBackCommand.ts
│   │   ├── edit/
│   │   │   ├── UndoCommand.ts
│   │   │   ├── RedoCommand.ts
│   │   │   └── DuplicateCommand.ts
│   │   └── view/
│   │       ├── ZoomInCommand.ts
│   │       ├── ZoomOutCommand.ts
│   │       ├── ZoomToFitCommand.ts
│   │       └── ZoomToSelectionCommand.ts
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts      # キーボードショートカット処理
│   │   └── ...
│   ├── ui/
│   │   ├── menu/
│   │   │   ├── ContextMenu/
│   │   │   │   ├── ContextMenu.tsx
│   │   │   │   ├── ContextMenuStyled.ts
│   │   │   │   └── index.ts
│   │   │   └── ...
│   │   └── ...
│   ├── setup/
│   │   └── index.ts                     # initializeCommands() を追加
│   └── reducer/
│       ├── CanvasActions.ts             # CommandAction を追加
│       └── canvasReducer.ts             # case "COMMAND" を追加
```

## 型定義

### Command

```typescript
export type Command = {
  id: string;                             // コマンドの一意識別子
  label: string;                          // メニュー表示用ラベル
  category?: "edit" | "view" | "arrange" | "selection";

  /**
   * コマンドが実行可能かどうかを判定
   * メニュー項目の有効/無効化に使用
   */
  canExecute: (state: CanvasState) => boolean;

  /**
   * コマンドを実行し、新しい CanvasState を返す
   * 純粋関数として実装（副作用なし）
   */
  execute: (state: CanvasState) => CanvasState;

  /**
   * キーボードショートカット（複数可）
   */
  shortcuts?: KeyBinding[];
};
```

### KeyBinding

```typescript
export type KeyBinding = {
  key: string;         // "Delete", "a", "z" など
  ctrl?: boolean;      // Ctrl キー
  shift?: boolean;     // Shift キー
  alt?: boolean;       // Alt キー
  meta?: boolean;      // Cmd キー (Mac)
};
```

### CommandAction

```typescript
export type CommandAction = {
  type: "COMMAND";
  commandId: string;
};
```

## 実装パターン

### 1. Command の実装

```typescript
// DeleteCommand.ts
export const DeleteCommand: Command = {
  id: "delete",
  label: "削除",
  category: "edit",
  shortcuts: [
    { key: "Delete" },
    { key: "Backspace" },
  ],

  canExecute: (state) => {
    return state.selectedIds.length > 0;
  },

  execute: (state) => {
    const updatedObjects = { ...state.objects };
    const updatedRootIds = [...state.rootIds];

    // 選択オブジェクトを削除
    for (const id of state.selectedIds) {
      delete updatedObjects[id];
      const index = updatedRootIds.indexOf(id);
      if (index !== -1) {
        updatedRootIds.splice(index, 1);
      }
    }

    return {
      ...state,
      objects: updatedObjects,
      rootIds: updatedRootIds,
      selectedIds: [],
      lastCommitTime: Date.now(), // コミットが必要な操作
    };
  },
};
```

### 2. CommandRegistry

```typescript
class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): this {
    this.commands.set(command.id, command);
    return this;
  }

  get(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  findByShortcut(event: KeyboardEvent): Command | undefined {
    return Array.from(this.commands.values()).find(cmd =>
      cmd.shortcuts?.some(binding =>
        binding.key.toLowerCase() === event.key.toLowerCase() &&
        !!binding.ctrl === event.ctrlKey &&
        !!binding.shift === event.shiftKey &&
        !!binding.alt === event.altKey &&
        !!binding.meta === event.metaKey
      )
    );
  }
}

export const commandRegistry = new CommandRegistry();
```

### 3. handleCommand

```typescript
export const handleCommand = (
  state: CanvasState,
  commandId: string,
): CanvasState => {
  const command = commandRegistry.get(commandId);

  if (!command) {
    console.warn(`Command not found: ${commandId}`);
    return state;
  }

  if (!command.canExecute(state)) {
    return state;
  }

  return command.execute(state);
};
```

### 4. Reducer への統合

```typescript
export const canvasReducer = (
  state: CanvasState,
  action: CanvasAction,
): CanvasState => {
  switch (action.type) {
    case "GESTURE":
      return handleGesture(state, action.gesture);

    case "COMMAND":
      return handleCommand(state, action.commandId);

    // ... その他のアクション
  }
};
```

### 5. ショートカットキーハンドラー

```typescript
export const useKeyboardShortcuts = (
  canvasState: CanvasState,
  dispatch: React.Dispatch<CanvasAction>,
  containerRef: React.RefObject<HTMLElement>
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 入力フィールドでは無効化
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const command = commandRegistry.findByShortcut(event);
      if (command && command.canExecute(canvasState)) {
        dispatch({ type: "COMMAND", commandId: command.id });
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const element = containerRef.current;
    if (!element) return;

    element.addEventListener("keydown", handleKeyDown);
    return () => {
      element.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasState, dispatch, containerRef]);
};
```

### 6. コンテキストメニュー

```typescript
export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  canvasState,
  dispatch,
  onClose,
}) => {
  const menuItems: CommandMenuItem[] = [
    { commandId: "cut" },
    { commandId: "copy" },
    { commandId: "paste" },
    { separator: true },
    { commandId: "delete" },
    { separator: true },
    { commandId: "bringToFront" },
    { commandId: "bringForward" },
    { commandId: "sendBackward" },
    { commandId: "sendToBack" },
  ];

  const handleMenuItemClick = (commandId: string) => {
    dispatch({ type: "COMMAND", commandId });
    onClose();
  };

  return (
    <Menu style={{ left: position.clientX, top: position.clientY }}>
      {menuItems.map((item, index) => {
        if (item.separator) {
          return <MenuSeparator key={`sep-${index}`} />;
        }

        const command = commandRegistry.get(item.commandId);
        if (!command) return null;

        const enabled = command.canExecute(canvasState);
        const shortcut = command.shortcuts?.[0];

        return (
          <MenuItem
            key={command.id}
            disabled={!enabled}
            onClick={() => handleMenuItemClick(command.id)}
          >
            <MenuItemLabel>{command.label}</MenuItemLabel>
            {shortcut && (
              <MenuItemShortcut>
                {formatKeyBinding(shortcut)}
              </MenuItemShortcut>
            )}
          </MenuItem>
        );
      })}
    </Menu>
  );
};
```

### 7. 初期化

```typescript
// setup/index.ts
export const initializeRegistries = () => {
  initializeObjectRegistry();
  initializeGestureHandlerRegistry();
  initializeCommands();
};

// setup/initializeCommands.ts
export const initializeCommands = () => {
  commandRegistry
    .register(DeleteCommand)
    .register(SelectAllCommand)
    .register(DeselectAllCommand)
    .register(BringForwardCommand)
    .register(SendBackwardCommand)
    .register(BringToFrontCommand)
    .register(SendToBackCommand)
    .register(CutCommand)
    .register(CopyCommand)
    .register(PasteCommand)
    .register(DuplicateCommand)
    .register(UndoCommand)
    .register(RedoCommand)
    .register(ZoomInCommand)
    .register(ZoomOutCommand)
    .register(ZoomToFitCommand)
    .register(ZoomToSelectionCommand);
};
```

## 実装予定のコマンド

### Selection（選択）

| コマンドID | ラベル | ショートカット |
|-----------|--------|---------------|
| `selectAll` | すべて選択 | Ctrl+A / Cmd+A |
| `deselectAll` | 選択解除 | Ctrl+Shift+A / Cmd+Shift+A |
| `delete` | 削除 | Delete / Backspace |

### Edit（編集）

| コマンドID | ラベル | ショートカット |
|-----------|--------|---------------|
| `cut` | 切り取り | Ctrl+X / Cmd+X |
| `copy` | コピー | Ctrl+C / Cmd+C |
| `paste` | 貼り付け | Ctrl+V / Cmd+V |
| `duplicate` | 複製 | Ctrl+D / Cmd+D |
| `undo` | 元に戻す | Ctrl+Z / Cmd+Z |
| `redo` | やり直す | Ctrl+Shift+Z / Cmd+Shift+Z |

### Arrange（配置）

| コマンドID | ラベル | ショートカット |
|-----------|--------|---------------|
| `bringToFront` | 最前面へ移動 | Ctrl+Shift+] |
| `bringForward` | 前面へ移動 | Ctrl+] |
| `sendBackward` | 背面へ移動 | Ctrl+[ |
| `sendToBack` | 最背面へ移動 | Ctrl+Shift+[ |

### View（表示）

| コマンドID | ラベル | ショートカット |
|-----------|--------|---------------|
| `zoomIn` | ズームイン | Ctrl++ / Cmd++ |
| `zoomOut` | ズームアウト | Ctrl+- / Cmd+- |
| `zoomToFit` | 全体を表示 | Ctrl+0 / Cmd+0 |
| `zoomToSelection` | 選択範囲を表示 | Ctrl+2 / Cmd+2 |

## 設計の利点

### 1. DRY原則の遵守

操作ロジックが Command に一箇所に集約され、ショートカットとメニューで重複がない。

### 2. 既存アーキテクチャとの一貫性

GESTURE と同じパターンで COMMAND を処理することで、既存の設計思想を維持。

### 3. 純粋関数による状態管理

Command.execute は `(state) => state` の純粋関数として実装され、副作用がない。

### 4. テスタビリティ

```typescript
// Command 単体でテスト可能
const initialState = createTestState();
const resultState = DeleteCommand.execute(initialState);
expect(resultState.selectedIds).toEqual([]);
```

### 5. 拡張性

新しいコマンドを追加しても、既存コードへの影響はレジストリへの登録のみ。

### 6. 状態依存の制御

`canExecute()` で実行可否を動的に判定し、UI の有効/無効化に活用。

### 7. キーボード操作の一元管理

すべてのショートカットが CommandRegistry で管理され、衝突の検出や一覧表示が容易。

## 実装上の注意点

### 1. lastCommitTime の更新

状態変更をコミット（永続化）する必要があるコマンドでは、`lastCommitTime` を更新する:

```typescript
execute: (state) => {
  // ... 状態更新処理 ...
  return {
    ...state,
    // ... 更新内容 ...
    lastCommitTime: Date.now(), // コミット必要
  };
}
```

### 2. グループ内オブジェクトの処理

グループに含まれるオブジェクトを削除する場合、親グループの `children` も更新する必要がある。

### 3. Undo/Redo の実装

将来的に履歴管理を実装する場合、`eventStartState` のような履歴スタックを追加する。

### 4. クリップボード操作

`cut`, `copy`, `paste` コマンドでは、`CanvasState` にクリップボード相当の状態を追加する:

```typescript
export type CanvasState = {
  // ...
  clipboard: ObjectState[] | null;
};
```

## 今後の拡張

### 1. コマンドパレット

すべてのコマンドを検索・実行できる UI を追加:

```typescript
const CommandPalette = () => {
  const commands = commandRegistry.getAll();
  // ... 検索・フィルタリング UI ...
};
```

### 2. カスタムショートカット

ユーザーがショートカットをカスタマイズできる機能:

```typescript
commandRegistry.setShortcut("delete", [{ key: "x" }]);
```

### 3. コマンド実行履歴

デバッグやアナリティクスのためのコマンド実行ログ:

```typescript
const commandHistory: Array<{ commandId: string; timestamp: number }> = [];
```

### 4. マクロ機能

複数のコマンドを組み合わせたマクロコマンド:

```typescript
const MacroCommand: Command = {
  id: "alignAndDistribute",
  execute: (state) => {
    let nextState = state;
    nextState = AlignLeftCommand.execute(nextState);
    nextState = DistributeVerticallyCommand.execute(nextState);
    return nextState;
  },
};
```

## 関連ドキュメント

- [architecture.md](./architecture.md) - 全体アーキテクチャ
- [gesture-handling.md](./gesture-handling.md) - ジェスチャー処理
- [state-management.md](./state-management.md) - 状態管理

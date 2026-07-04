> 🌐 日本語版: [05-command-system.ja.md](./05-command-system.ja.md)

# Command System

A mechanism that centrally manages the operations triggered from keyboard shortcuts,
context menus, and toolbars using the Command pattern.

## CommandRegistry: three entry points share the same path

Operation logic is consolidated into `Command` objects, and no matter whether it is invoked
from a shortcut, menu, or toolbar, **the same Command is executed via `dispatch({ type: "COMMAND", commandId })`**.

```
Keyboard shortcut  ┐
Context menu        ┼─ dispatch({type:"COMMAND", commandId}) ─→ canvasReducer
Toolbar            ┘        │
                            ▼
                  handleCommand(state, commandId)
                            │
                  commandRegistry.get(id) → Command.execute(state) ⇒ new state
```

This eliminates duplication of operation logic (DRY) and unifies the flow with the same Reducer
pattern used for `GESTURE` (see [State Update Flow](./06-state-update-flow.md)).

### Command type

```ts
type Command = {
	id: string;
	label: string;
	category?: "edit" | "view" | "arrange" | "selection";
	canExecute: (state: CanvasState) => boolean; // used to enable/disable menu items
	execute: (state: CanvasState) => CanvasState; // pure function (no side effects)
	shortcuts?: PlatformKeyBindings; // mac / win / default can be specified individually
};
```

Because `execute` is a pure function, each Command can be tested in isolation (see [Testing](./09-testing.md)).
`canExecute` dynamically determines whether a command can run and is used to enable/disable menu items and control UI display.

### Key components

- `CommandRegistry` (`commands/CommandRegistry.ts`) — `register` / `get` / `getAll` / `findByShortcut`
- `handleCommand` (`commands/handlers/handleCommand.ts`) — mediates `get` → `canExecute` → `execute`
- `useKeyboardShortcuts` (`hooks/`) — resolves keydown events via `findByShortcut` and dispatches (disabled while an input field is focused)
- `CommandUtils` — platform detection, `getPlatformShortcuts` / `formatShortcut` (`⌘A` ↔ `Ctrl+A`)
- Registration is done all at once in `setup/` (`initializeCommands`)

## Categories and included commands

Commands are split into directories by purpose (`controllers/commands/`).

| Directory    | Commands                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| `selection/` | SelectAll / DeselectAll / Delete / Cut / Copy / Paste / Duplicate        |
| `arrange/`   | BringToFront / BringForward / SendBackward / SendToBack (`MoveCommands`) |
| `arrow/`     | SwapArrows (swap connector endpoints)                                    |
| `group/`     | Group / Ungroup                                                          |
| `history/`   | Undo / Redo                                                              |
| `text/`      | StartTextEdit                                                            |
| `view/`      | ZoomIn / ZoomOut / ZoomToFit / ZoomToSelection                           |

> Note that the values `Command.category` can currently take are the four `selection` / `edit` / `arrange` / `view`,
> which are used for grouping in the UI. The directory structure (table above) is more fine-grained because it
> is the organizational unit at the implementation level.

## Undo / Redo (history)

History is held as `history` (`past` / `present` / `future`) within `CanvasState`.
When `commitVersion` advances on an operation that requires a commit, `canvasReducer` pushes `present`
onto `past` and records the history. Consecutive operations (such as repeated nudges) are collapsed into a
single entry within a time window. See [State Update Flow](./06-state-update-flow.md) for the details of
recording and collapsing.

`Undo` / `Redo` are ordinary commands: like every other command they run through the `COMMAND` action
(`handleCommand`), and their `execute` restores `present` from `past` / `future` (there is no dedicated
`UNDO` / `REDO` action).

## Clipboard: copy / cut / paste / duplicate

`copy` / `cut` write to the system clipboard (`useClipboardWrite`), while `paste` reads from it and applies
the content via the `PASTE` action (`useClipboardPaste` → `handlePaste`).
`duplicate` clones the selection without going through the clipboard.

> **Validating untrusted input**: JSON coming from outside via the clipboard cannot be trusted, so it must be
> validated on paste to reject malformed data (see "Defense at the boundary" in
> [Design Philosophy](./01-design-philosophy.md)). Related issues: **#40 / #46**.

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
                  handleCommand(state, commandId, registries)
                            │
                  registries.command.get(id) → Command.execute(state, registries) ⇒ new state
```

This eliminates duplication of operation logic (DRY) and unifies the flow with the same Reducer
pattern used for `GESTURE` (see [State Update Flow](./06-state-update-flow.md)).

### Command type

A command is defined as a `Command` (`commands/CommandTypes.ts`). Besides an ID, a label shown in menus,
and optional shortcuts (mac / win / default can be specified individually), it has two functions:

- `canExecute` — returns whether the command can run in the current state; used to enable/disable menu items and control UI display
- `execute` — a pure function (no side effects) returning the new state. **It may be omitted**: a command that
  cannot be a pure state transition, such as Paste with its asynchronous clipboard read, registers only its
  definition (label / shortcuts), and its execution is wired through the `callbacks` of `useKeyboardShortcuts`

Both receive the state (`CanvasControllerState`) and the canvas's registry bundle (`ICanvasRegistries`).
Because `execute` is a pure function, each Command can be tested in isolation (see [Testing](./09-testing.md)).

### Key components

- `CommandRegistry` (`commands/CommandRegistry.ts`) — one per canvas, reached as the registry bundle's `registries.command`; `get` looks a command up by ID and `findByShortcut` by key event, among others
- `handleCommand` (`commands/handlers/handleCommand.ts`) — returns the state unchanged when the command it got has no `execute` or its `canExecute` is false, and calls `execute` otherwise
- `useKeyboardShortcuts` (`hooks/`) — resolves keydown events via `findByShortcut` and dispatches (disabled while an input field is focused); a command whose execution is passed in `callbacks` is run through that instead
- `CommandUtils` — platform detection, `getPlatformShortcuts` / `formatShortcut` (`⌘A` ↔ `Ctrl+A`)
- Registration is done all at once in `registries/` (`initializeCommands`)

## Categories and included commands

Commands are split into directories by purpose (under `controllers/commands/`; e.g. `selection/`, `arrange/`, `view/`).
The list of commands registered on a canvas is `ALL_COMMANDS` (`controllers/registries/initializeCommands.ts`), which is the source of truth.
`createCanvasRegistries` registers all of them by default, or only a subset when the configuration restricts the enabled commands.

`Command.category` is a classification used for grouping in the UI; the values it can take are in `CommandTypes.ts`.
The directory structure is more fine-grained because it is the organizational unit at the implementation level.

## Undo / Redo (history)

History is held as `history` (`past` / `present` / `future`) within `CanvasControllerState` (`controllers/CanvasTypes.ts`).
When `commitVersion` advances on an operation that requires a commit, `canvasReducer` pushes `present`
onto `past` and records the history. Consecutive operations (such as repeated nudges) are collapsed into a
single entry within a time window. See [State Update Flow](./06-state-update-flow.md) for the details of
recording and collapsing.

`Undo` / `Redo` are ordinary commands: like every other command they run through the `COMMAND` action
(`handleCommand`), and their `execute` restores `present` from `past` / `future` (there is no dedicated
`UNDO` / `REDO` action).

## Clipboard: copy / cut / paste / duplicate

`copy` / `cut` write the selection to the internal clipboard (the state's `internalClipboard`), and `useClipboardWrite`
writes that out to the system clipboard. `paste` reads the system clipboard (falling back to the internal clipboard when
it cannot be read or is invalid) and applies the content via the `PASTE` action (`useClipboardPaste` → `handlePaste`).
`duplicate` clones the selection without going through the clipboard.

> **Validating untrusted input**: JSON coming from outside via the clipboard cannot be trusted, so it is validated
> at the paste boundary (see "Defense at the boundary" in [Design Philosophy](./01-design-philosophy.md)).
> `useClipboardPaste` passes the JSON it read through `isClipboardData` (`commands/selection/ClipboardData.ts`, which
> validates each object with the `ObjectStateValidatorRegistry`) and does not take anything that fails. `handlePaste`
> re-stamps each pasted object's `features` from the canvas's own registry instead of trusting the carried value.
> Related issues: **#40 / #46**.

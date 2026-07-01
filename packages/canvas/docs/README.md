> 🌐 日本語版: [README.ja.md](./README.ja.md)

# canvas Design Documentation

A set of documents that organize the design of `@workspace/canvas` into 9 pillars.
For a high-level overview, we recommend reading [Design Philosophy](./01-design-philosophy.md) and
[Architecture](./02-architecture.md) first.

For a map of the entire design documentation set (a mind map), see [00-overview.jis.json](./00-overview.jis.json).
It is in jiscribe format, so you can view it as a diagram by opening it in the VSCode extension or the demo app.

## Table of Contents

| #   | Document                                                         | Overview                                                                                                               |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | [Design Philosophy](./01-design-philosophy.md)                   | The four decision criteria: performance first, pure functions, handler responsibilities, and defense at the boundaries |
| 2   | [Architecture](./02-architecture.md)                             | Layer separation (schemas/states/controllers/presentations/registry) and unidirectional dependencies                   |
| 3   | [Data Model and Persistence](./03-data-model-and-persistence.md) | Doc ↔ State conversion via the Mapper, the `.jis.json` specification, and the parser's two-stage validation            |
| 4   | [Gesture System](./04-gesture-system.md)                         | GestureRecognizer, handler composition, and the `data-gesture` linking attribute                                       |
| 5   | [Command System](./05-command-system.md)                         | CommandRegistry, unification of shortcuts/menus/toolbar, and Undo/Redo                                                 |
| 6   | [State Update Flow (Reducer)](./06-state-update-flow.md)         | The `canvasReducer` actions and the mechanism for recording and aggregating history                                    |
| 7   | [External Sync / VSCode Integration](./07-external-sync.md)      | `useSyncExternalDoc` / `SYNC_EXTERNAL` and the saveNonce round-trip                                                    |
| 8   | [Presentation and Theme](./08-presentation-and-theme.md)         | Pure rendering in presentations, color usage conventions, and VSCode theme tokens                                      |
| 9   | [Testing](./09-testing.md)                                       | Unit / integration (vitest), E2E (Playwright), and circular dependency checks (madge)                                  |

## AI Reference

Materials intended for AI, such as the format specification and authoring procedures, are located under `../ai/` (a separate track from this design documentation).

- [Canvas Doc Reference](../ai/reference.md)
- [AI Authoring Guide](../ai/ai-guide.md)

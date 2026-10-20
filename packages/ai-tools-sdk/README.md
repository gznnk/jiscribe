# @jiscribe/ai-tools-sdk

The contract a plugin offers AI tools for its own shapes through; the host that
declares and applies them is `@jiscribe/ai-tools`. Plugins do not import this
package directly: they take it from `@jiscribe/canvas-sdk/tools`, which re-exports
it (authoring steps in `packages/canvas/docs/13-authoring-plugins.md`).

| Export                                    | What it is                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `defineObjectAiTool`                      | Declares one tool, typing `apply` / `read` against the arguments its `inputSchema` validates to |
| `ObjectAiToolDefinition`                  | One tool acting on the single object its call names by `id`, erased to plain arguments          |
| `ObjectAiWriteTool` / `ObjectAiReadTool`  | The two kinds of tool: one rebuilds its object (`apply`), the other only reads it (`read`)      |
| `ObjectAiToolChange` / `ObjectAiToolArgs` | What a writing tool hands back, and the arguments a tool receives once erased                   |
| `AiToolPlugin`                            | The tools one plugin offers, exported from its `./tools` entry                                  |
| `textSlotStyleSchema`                     | The typography of a whole body of text as zod schemas, the vocabulary `set_style` speaks        |
| `textMatchSchema`                         | Which characters to decorate (`match` / `occurrence`), the stretch `set_text_style` takes       |
| `inlineTextStyleSchema`                   | The typography a stretch carries on its own, the vocabulary `set_text_style` speaks             |
| `canonicalizeFontWeight`                  | The spelling a document keeps for a weight a tool accepted (`"700"` is stored as `"bold"`)      |
| `AI_FONT_WEIGHTS`                         | The weights a tool lets the model write, `"400"` / `"700"` included                             |

Arguments are written in zod, as a raw shape (the properties, not a `z.object`):
the host puts them into its declarations as they are, and the MCP SDK declares
tools from zod alone. zod is a peer dependency, so the plugin and the host read
the same zod; a plugin takes it as a peer and a dev dependency at the version the
workspace catalog pins. The shared vocabulary (`textSlotStyleSchema`,
`textMatchSchema`, `inlineTextStyleSchema`) is zod too, and the built-in
`set_style` / `set_text_style` declare their arguments from the same values, so a
plugin tool styling text cannot drift from them.

It is a package of its own because neither neighbour can hold it: `@jiscribe/doc`
is the document model, and `@jiscribe/ai-tools` develops against the shipped
plugins, so a plugin importing the contract from there would close a workspace
dependency cycle.

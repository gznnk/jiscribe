# DocOps

Programmatic editing of a `CanvasDoc`. This is what a caller with no canvas on screen
uses to build and rework a document: the VSCode extension, the MCP server, an AI agent's
tool layer, a script.

The public entry is [`src/doc.ts`](../doc.ts), not this directory. Consumers call
`createDocOps(config?)` and get a `DocOps` — one instance bound to a resolved set of
`ObjectDocDefinition`s, so built-in and plugin types are handled uniformly.

`DocOps` in [`createDocOps.ts`](./createDocOps.ts) is the authoritative list of ops. This
document covers the rules that hold across all of them, not the ops themselves.

## Layer boundary

This is the headless document layer. It must not import `react`, `react-dom`,
`@emotion/*`, or the presentation / controller / state layers — ESLint enforces it (see
`eslint.config.js`). It reads and writes the plain JSON `CanvasDoc` and nothing else.

## Directory structure

| Path              | Description                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `createDocOps.ts` | The `DocOps` type and its factory. Every op is bound to the resolved definitions here, and this is where a new op is wired |
| `index.ts`        | What the directory exports, re-exported in turn by `src/doc.ts`                                                            |
| `errors.ts`       | `DocOperationError` — the only exception these ops throw                                                                   |
| `ops/`            | The ops. Named for the group they belong to, not for one op, so adding an op does not make a file name a lie               |
| `utils/`          | What the ops share: id allocation, object lookup, geometry, endpoint building, style/transform field writing               |
| `__tests__/`      | One suite per `ops/` file plus `createDocOps.test.ts`, with shared fixtures in `__tests__/support/`                        |

## The contract every op holds

Every op mutates `doc` in place, and checks its arguments **before** it writes. A call that
throws `DocOperationError` therefore leaves the document exactly as it was — there is no
half-applied state to clean up and no need to snapshot before calling.

For a batch op this holds across the whole list, which is the reason to reach for one over
a loop: a bad element anywhere means nothing was written. Implementations achieve this by
splitting into two phases — resolve and validate everything, then write — rather than by
copying the doc. `translateObjects` ("measure every object first") and the
`plan…` / `apply…` pairs in `ops/text.ts` and `ops/connectors.ts` are the shape to follow.

`getObjectsBounds` is the only op that does not write.

## Tests

A suite calls `createDocOps()` and drives the ops through it, rather than importing an op
module. That is what lets the internals move: reorganising `ops/`, splitting an op into
validate-and-apply halves, and reordering internal arguments all left the suites untouched.

`__tests__/` mirrors `ops/` file for file, and a single op's single and batch forms sit
together — `setText` and `setTexts` are both in `text.test.ts`. `support/docFixtures.ts`
holds the doc-building helpers and the shared built-in `docOps` instance;
`support/pluginFixtures.ts` holds the fake plugin definitions a few suites need. A suite
that needs plugin types builds its own `createDocOps({ plugins })` locally, named for what
it is testing (`slotOps`, `factoryOps`).

## Naming rules

**The noun is the verb's direct object** — what is acted on, not what identifies it.
`deleteObjects(ids)` deletes objects, so the noun is `Objects`. `setStyle(ids, style)` sets
a style and the ids only say whose, so it is not `setObjectsStyle`. Every op follows this,
which is why some carry `Objects` and others do not.

**A batch op pluralises that noun**: `addObject` → `addObjects`, `updateConnector` →
`updateConnectors`. Where there is no noun to pluralise, or it is plural already, the op
takes `Many` instead — `connect` → `connectMany`, `setPoints` → `setPointsMany`.

**A batch op takes one of two shapes**, decided by the op rather than by preference. An
argument that means the same for every object is given once, beside a list of ids
(`setStyle(ids, style)`, `resizeObjects(ids, params)`). One that differs per object is
given as a list of entries (`addObjects(entries)`, `moveObjects(entries)`). The parameter
is named `ids` or `entries` accordingly, and that name appears verbatim in error messages.

**An entry type is the single op's name plus `Entry`** — `AddObjectEntry`,
`MoveObjectEntry`, `SetTextEntry` — pairing with the `Params` types the single ops take.
`connectMany` is the exception that proves it useful: its entries are exactly
`ConnectParams`, so it has no type of its own.

**A result type is the op's name plus `Result`**, and only exists where the return value
needs naming (`DeleteObjectsResult`, `RemoveObjectsFromGroupResult`). An op returning bare
ids returns `string[]`.

## Argument order

Op module functions take `(doc, what to act on, what to do, definitions)`. `definitions`
is always last, so an argument that `DocOps` exposes as optional is a `| undefined`
positional here — `setText`'s `slot`, `distributeObjects`' `spacing`,
`getObjectsBounds`' `ids`. The `DocOps` method hides `definitions` entirely, which is why
the two signatures differ in length.

Op modules export `const` arrow functions, not `function` declarations.

## Errors

Failures are `DocOperationError` with a message meant to be shown to whoever made the call,
including an AI agent reading it back as a tool result. A batch op wraps a per-element
failure through `utils/batchErrors.ts`:

```
entries[2] (rect-1): <reason> — the document was left unchanged
```

The subject in brackets is the id for an element already in the document, and the type name
for one being created (`entries[0] (rect)`), since there is no id yet. It is dropped where
the element has neither. Failures that name every offending id at once — a missing id in
`requireObjects`, a repeated id in `rejectIds` — are reported unwrapped, because listing
them together tells the caller more than pointing at the first index would.

## Adding an op

1. Put it in the `ops/` file for its group, beside the single or batch form it pairs with.
   Do not add a file per op
2. Follow the two-phase rule above if it is a batch op, reusing `requireObjects` from
   `utils/objectAccess.ts` to resolve every id before writing
3. Wire it into `DocOps` and `createDocOps` in `createDocOps.ts`, placing it next to its
   counterpart so the pairing reads down the type
4. Export any new parameter or entry type from `index.ts`, then from `src/doc.ts`
5. Cover it in the `__tests__/` file matching its `ops/` file, beside the counterpart it
   pairs with. For a batch op that means the happy path, atomicity on a mid-list failure,
   the empty list, a repeated id, and the error message
6. Allocate ids with `generateUniqueId` from `utils/ids.ts`. A batch that stages objects
   before pushing them must pass the ids it has already handed out as `reservedIds`, since
   the allocator only scans `doc.root`

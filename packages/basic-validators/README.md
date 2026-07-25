> 🌐 日本語版: [README.ja.md](./README.ja.md)

# @workspace/basic-validators

Runtime type guards shared across jiscribe. Dependency-free predicates that narrow
`unknown` at trust boundaries — parsed `.jis.json` documents, clipboard payloads, plugin
input — before the value reaches typed code.

## Usage

```typescript
import { isNumber, isObject, isEnum } from "@workspace/basic-validators";

const isAlign = isEnum(["start", "center", "end"] as const);

const isLabel = (value: unknown): value is Label =>
	isObject(value) && isNumber(value.fontSize) && isAlign(value.align);
```

Everything is re-exported from the package root, so import from
`@workspace/basic-validators` rather than reaching into `src/`.

## What is in here

Every export is a predicate returning `boolean` and narrowing its argument. Names starting
with `is` always mean a boolean guard, per the workspace naming rule; validators that
return diagnostics live in the packages that own the schema, not here.

| Guard                 | Passes when the value is                                              |
| --------------------- | --------------------------------------------------------------------- |
| `isString`            | a primitive string                                                    |
| `isNumber`            | a number other than `NaN`                                             |
| `isBoolean`           | `true` or `false`                                                     |
| `isObject`            | a non-null object that is not an array or function                    |
| `isArray`             | an array (elements unchecked)                                         |
| `isNonEmptyString`    | a string with non-whitespace content                                  |
| `isPositiveNumber`    | a number `> 0`                                                        |
| `isNonNegativeNumber` | a number `>= 0`                                                       |
| `isNumberInRange`     | a number inside the closed range — factory: `isNumberInRange(0, 100)` |
| `isEnum`              | a member of a fixed set — factory: `isEnum([...] as const)`           |
| `isCssColor`          | a string the browser's CSS parser accepts as a color                  |
| `isCssSafeValue`      | a string with no CSS breakout sequences                               |
| `isUrl`               | a string the WHATWG `URL` constructor parses                          |

`isNumberInRange` and `isEnum` are factories: call them once to build a guard, then reuse
it. The rest take the value directly.

Three contracts are worth knowing before writing against this package:

- **`isNumber` rejects `NaN`** but accepts `Infinity`, so the narrowed value is always
  comparable. `isPositiveNumber` / `isNonNegativeNumber` / `isNumberInRange` all build on
  it and inherit that behavior.
- **`isCssColor` is browser-only.** It calls `CSS.supports`, which is undefined under Node
  and throws a `ReferenceError` there. Reach for `isCssSafeValue` when the check has to run
  in both environments — it is a pure regex check that rejects injection vectors (`;` `{`
  `}` `<` `>` `\`, `url(`, `expression(`, comment delimiters) without asserting that the
  value is meaningful CSS.
- **`isUrl` is a parse check, not a safety check.** Any scheme parses, including
  `javascript:`; relative paths and bare hosts like `example.com` do not.

## Development

```bash
pnpm --filter @workspace/basic-validators typecheck
pnpm --filter @workspace/basic-validators lint
pnpm --filter @workspace/basic-validators test
```

Tests run under Node, so `isCssColor` has no unit test; the same limitation reaches its
callers in `@workspace/canvas` (see the note in `isTextStyleState.test.ts`).

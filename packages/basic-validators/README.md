> 🌐 日本語版: [README.ja.md](./README.ja.md)

# @workspace/basic-validators

Runtime type guards shared across jiscribe. Dependency-free predicates that narrow
`unknown` at trust boundaries — parsed `.jis.json` documents, clipboard payloads, plugin
input — before the value reaches typed code. Nothing here touches a browser global, so
every guard behaves the same in Node and the browser.

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
| `isCssSafeValue`      | a string with no CSS breakout sequences                               |
| `isUrl`               | a string the WHATWG `URL` constructor parses                          |

`isNumberInRange` and `isEnum` are factories: call them once to build a guard, then reuse
it. The rest take the value directly.

Three contracts are worth knowing before writing against this package:

- **`isNumber` rejects `NaN`** but accepts `Infinity`, so the narrowed value is always
  comparable. `isPositiveNumber` / `isNonNegativeNumber` / `isNumberInRange` all build on
  it and inherit that behavior.
- **`isCssSafeValue` checks safety, not validity.** It rejects the sequences that break out
  of a CSS declaration (`;` `{` `}` `<` `>` `\`, `url(`, `expression(`, comment delimiters),
  but a safe string need not be meaningful CSS. Strict color validity needs the browser's
  CSS parser and therefore lives in `@workspace/canvas` (`states/objects/utils/isCssColor`),
  not here.
- **`isUrl` is a parse check, not a safety check.** Any scheme parses, including
  `javascript:`; relative paths and bare hosts like `example.com` do not.

## Development

```bash
pnpm --filter @workspace/basic-validators typecheck
pnpm --filter @workspace/basic-validators lint
pnpm --filter @workspace/basic-validators test
```

Tests run under Node with no DOM, which the guards here are expected to tolerate: anything
needing `window`, `document` or `CSS` belongs to a consuming package, not to this one.

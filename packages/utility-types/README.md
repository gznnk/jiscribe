# @workspace/utility-types

Type-level helpers shared across jiscribe. Types only — the package has no
dependencies and emits no runtime code.

| Type          | What it does                                                                                |
| ------------- | ------------------------------------------------------------------------------------------- |
| `Brand<S>`    | Tags a type with a unique symbol so structurally identical types stop being interchangeable |
| `Prettify<T>` | Flattens an intersection into one object literal for readable editor tooltips               |

## Usage

```typescript
import type { Brand, Prettify } from "@workspace/utility-types";

declare const MetaDocBrand: unique symbol;

type MetaDoc = Prettify<
	{ name?: string; description?: string } & Brand<typeof MetaDocBrand>
>;
```

Both types are re-exported from the package root, so import from
`@workspace/utility-types` rather than reaching into `src/`.

One contract is worth knowing before writing against this package: a `Brand`ed
value cannot be written as a literal, because the brand key has type `never`.
Construct one with an assertion at the boundary that validates it.

## Development

```bash
pnpm --filter @workspace/utility-types typecheck
pnpm --filter @workspace/utility-types lint
```

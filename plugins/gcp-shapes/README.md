# @jiscribe/plugin-gcp-shapes

The shape a Google Cloud architecture diagram is drawn with. One object type.

- **`gcpIcon`** — a node drawing one Google Cloud product icon: a core
  product's own icon, or a category icon. Its label hangs under the box and it
  can be a connector endpoint. The `icon` property picks the picture

There is no frame shape: a project, region or VPC network is drawn with the
container plugin's frames.

## Mounting it on a host

```ts
import {
	gcpShapesPlugin,
	gcpStencilCategory,
} from "@jiscribe/plugin-gcp-shapes";

// Both are module-level constants: built anew each render they would remount the Canvas.
const initialConfig = { plugins: [gcpShapesPlugin] };
const stencilLibrarySections = [gcpStencilCategory];

<Canvas
	initialConfig={initialConfig}
	stencilLibrary={{ sections: stencilLibrarySections }}
/>;
```

That is for a host assembling its own set. Both are already in
`@jiscribe/standard-shapes`, so a host taking the shipped set
(`standardPlugins`, `standardStencilLibrarySections`) gets them without naming
this package, and must not add them again: a type registered twice throws.

A consumer that only takes part in parse-time validation (a server, a
diagnostic, the MCP) hands `gcpShapesDocPlugin` from
`@jiscribe/plugin-gcp-shapes/doc` to `createCanvasParser`; that entry pulls in
no react, and none of the drawings either: it loads the icon catalog (names,
labels, categories) alone.

## Icon names

Since 2025 Google draws its core products with icons of their own and every
other product with the icon of its category. The set is those 45 icons: 19
core products and 26 categories, each named after its asset folder in flat
kebab-case.

```
compute-engine         Unique Icons/Compute Engine
cloud-spanner          Unique Icons/Cloud Spanner (labelled "Spanner")
networking             Category Icons/Networking
ai-machine-learning    Category Icons/AI _ Machine Learning
```

`icon` takes the name of any other product too and draws its category's icon:
`pubsub`, `dataflow` → `data-analytics`, `cloud-functions` →
`serverless-computing`, `vpc` → `networking`, `iam` → `security-identity`. That
table, `src/schema/icon/generalProducts.ts`, holds every product of Google's
icon overview. The short names and Google's spellings that differ from the
folders' (`gce`, `gcs`, `spanner`, `scc`, `google-kubernetes-engine`) are in
`src/schema/icon/iconAliases.ts`. Write the product's own name in `text`: it is
what tells apart the products sharing one category icon. A name that resolves
to nothing is a validation error carrying candidates; Gemini is one, since the
packages carry no Gemini icon. `gcpIconCatalog`
(`src/schema/icon/gcpIconCatalog.ts`) is all of that lookup, built with
canvas-sdk's `createIconSetCatalog`.

## Regenerating the drawings

The icons live in two modules generated from Google's core products' icons and
category icons packages, both committed: the catalog
`src/schema/icon/iconCatalog.generated.ts` (names, labels, categories,
viewBoxes — what the headless entry reads) and the drawings
`src/drawing/iconDrawings.generated.ts`. To move to a new release:

1. Download and unpack both packages (the URLs are recorded in the header of
   both modules and in LICENSE-ICONS.md)
2. Point `ASSET_RELEASE` in `scripts/generateIconData.mjs` at the date of
   Google's icon overview, and add or change the folders in `CORE_FOLDERS` and
   `CATEGORY_FOLDERS`
3. Regenerate, from the repository root:

   ```bash
   pnpm --filter @jiscribe/plugin-gcp-shapes generate:icons <the unpacked "Unique Icons" directory> <the unpacked "Category Icons" directory>
   pnpm exec prettier --write plugins/gcp-shapes/src/schema/icon/iconCatalog.generated.ts plugins/gcp-shapes/src/drawing/iconDrawings.generated.ts
   pnpm --filter @jiscribe/plugin-gcp-shapes test
   ```

Every folder is listed by hand with its name, label and category; a folder the
tables do not list, a listed folder that is missing, or a folder whose `SVG/`
does not hold exactly one file stops the run. The conversion is
`@jiscribe/canvas-sdk/icon-set-generator`'s, which stops on any element,
attribute or style it has not been told about. If a palette, alias or product
name no longer matches the catalog, the tests say so.

## Attribution

The icon data is derived from the Google Cloud product icons (May 2026),
published by Google LLC for diagrams and technical documentation with no
license attached, and redistributed unmodified with attribution. This
repository's MIT license does not cover it, the icons must not be modified, and
they are not for marketing material. See [LICENSE-ICONS.md](./LICENSE-ICONS.md).

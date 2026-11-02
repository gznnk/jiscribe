# @jiscribe/plugin-azure-shapes

The shape an Azure architecture diagram is drawn with. One object type.

- **`azureIcon`** — a node drawing one Azure Architecture Icon, or Microsoft
  Entra ID from the Entra icon package. Its label hangs
  under the box and it can be a connector endpoint. The `icon` property picks
  the picture

There is no frame shape: a subscription, resource group or virtual network is
drawn with the container plugin's frames.

## Mounting it on a host

```ts
import {
	azureShapesPlugin,
	azureStencilCategory,
} from "@jiscribe/plugin-azure-shapes";

// Both are module-level constants: built anew each render they would remount the Canvas.
const initialConfig = { plugins: [azureShapesPlugin] };
const stencilLibrarySections = [azureStencilCategory];

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
diagnostic, the MCP) hands `azureShapesDocPlugin` from
`@jiscribe/plugin-azure-shapes/doc` to `createCanvasParser`; that entry pulls in
no react, and none of the drawings either: it loads the icon catalog (names,
labels, categories) alone.

## Icon names

Flat kebab-case, no category prefix: the file's stem, without its number.

```
virtual-machine        10021-icon-service-Virtual-Machine.svg
azure-cosmos-db        10121-icon-service-Azure-Cosmos-DB.svg
app-services           10035-icon-service-App-Services.svg
entra-id               Microsoft Entra ID color icon.svg (the Entra package)
```

The short names people say (`vm`, `aks`, `vnet`, `kv`, `entra`, `aad`) are resolved by the
table in `src/schema/icon/iconAliases.ts`. A spelling with the `azure-` /
`microsoft-` prefix dropped resolves too (`cosmos-db`, `service-bus`), wherever
it is unambiguous. A name that resolves to nothing is a validation error
carrying candidates. `azureIconCatalog` (`src/schema/icon/azureIconCatalog.ts`)
is all of that lookup, built with canvas-sdk's `createIconSetCatalog`.

## Regenerating the drawings

The icons live in two modules generated from Microsoft's Azure icon package
and, for Microsoft Entra ID alone, the Microsoft Entra architecture icons
package, both committed: the catalog `src/schema/icon/iconCatalog.generated.ts` (names,
labels, categories, viewBoxes — what the headless entry reads) and the drawings
`src/drawing/iconDrawings.generated.ts`. To move to a new release:

1. Download and unpack both packages (the URLs are recorded in the header of
   both modules and in LICENSE-ICONS.md)
2. Point `SOURCE_ZIP_URL` and `ASSET_RELEASE` (Azure) or `ENTRA_SOURCE_ZIP_URL`
   and `ENTRA_ASSET_RELEASE` (Entra) in `scripts/generateIconData.mjs` at the
   new release
3. Regenerate, from the repository root:

   ```bash
   pnpm --filter @jiscribe/plugin-azure-shapes generate:icons -- <the unpacked Azure Icons directory> <the unpacked "Microsoft Entra color icons SVG" directory>
   pnpm format   # the generator writes unformatted output
   pnpm --filter @jiscribe/plugin-azure-shapes test
   ```

The script collects the files, names the icons and folds the copies Microsoft
files under several folders into one entry; it stops on a folder its category
table does not list. The Entra files are listed by hand in `ENTRA_FILES`, each
taken or left out with a reason; a file the table does not list, a listed file
that is missing, or a taken name the Azure package already has stops the run. The conversion is `@jiscribe/canvas-sdk/icon-set-generator`'s,
which stops on any element, attribute or style it has not been told about. If a
palette or alias name changed on Microsoft's side, the tests say so.

## Attribution

The icon data is derived from the Microsoft Azure Architecture Icons (V24,
2026-07) and, for Microsoft Entra ID, the Microsoft Entra architecture icons
(Oct 2023), © Microsoft Corporation, used under Microsoft's icon terms and
redistributed unmodified. The Entra terms add that Microsoft product icons are
not to be used in marketing communications. This repository's MIT license does not cover it, and the icons must
not be modified. See [LICENSE-ICONS.md](./LICENSE-ICONS.md).

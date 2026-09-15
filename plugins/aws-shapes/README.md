# @jiscribe/plugin-aws-shapes

The shapes an AWS architecture diagram is drawn with. Two object types.

- **`awsIcon`** — a node drawing one AWS Architecture Icon. Its label hangs under
  the box and it can be a connector endpoint. The `icon` property picks the
  picture
- **`awsGroup`** — the VPC / subnet / region frame drawn around them. The `kind`
  property picks which one, and the border colour, the line style and the
  top-left corner badge all follow from it

## Mounting it on a host

```ts
import {
  awsShapesPlugin,
  awsStencilCategory,
  awsGroupStencilCategory,
} from "@jiscribe/plugin-aws-shapes";

// Both are module-level constants: built anew each render they would remount the Canvas.
const initialConfig = { plugins: [...standardPlugins, awsShapesPlugin] };
const stencilLibrarySections = [
  ...standardStencilLibrarySections,
  awsStencilCategory,
  awsGroupStencilCategory,
];

<Canvas
  initialConfig={initialConfig}
  stencilLibrary={{ sections: stencilLibrarySections }}
/>;
```

Both are already in `@jiscribe/standard-shapes`, so a host taking the shipped set
gets them without naming this package.

A consumer that only takes part in parse-time validation (a server, a
diagnostic, the MCP) hands `awsShapesDocPlugin` from
`@jiscribe/plugin-aws-shapes/doc` to `createCanvasParser`; that entry pulls in no
react.

## Icon names

Kebab-case behind a layer prefix.

```
service/aws-lambda                    Arch_AWS-Lambda_48.svg
resource/amazon-ec2/instance          Res_Amazon-EC2_Instance_48.svg
general/user                          Res_User_48_Light.svg
group/region                          Region_32.svg
```

The short names people say (`lambda`, `s3`, `alb`, `igw`) are resolved by the
table in `src/schema/icon/iconAliases.ts`. A spelling with the `amazon-` /
`aws-` prefix or the layer prefix dropped resolves too, wherever it is
unambiguous. A name that resolves to nothing is a validation error carrying
candidates.

## Light and dark

Most icons are drawn in AWS's category colours and read on either ground. For
the General icons, the two AWS Cloud group icons and AWS Marketplace, AWS ships a
separate Dark rendition, and this package keeps both: the drawing is chosen from
`CanvasTheme.colorScheme`, which is what a host says its theme's ground is.

## Regenerating the drawings

The drawings live in a data module generated from the asset zip, and it is
committed. To move to a new release of the assets:

1. Download and unpack AWS's asset package (the URL is recorded in the header of
   `src/schema/icon/iconData.generated.ts` and in LICENSE-ICONS.md)
2. Point `SOURCE_ZIP_URL` and `ASSET_RELEASE` in `scripts/generateIconData.mjs`
   at the new release
3. Regenerate, from the repository root:

   ```bash
   pnpm --filter @jiscribe/plugin-aws-shapes generate:icons -- <the unpacked directory>
   pnpm format   # the generator writes unformatted output
   pnpm --filter @jiscribe/plugin-aws-shapes test
   ```

If a tier-1 name (one the palette carries) changed on AWS's side, the tests say
so.

## Attribution

The icon data is derived from AWS Architecture Icons, © Amazon Web Services,
Inc. or its affiliates, used under AWS's terms and redistributed unmodified.
This repository's MIT license does not cover it, and the icons must not be
modified. See [LICENSE-ICONS.md](./LICENSE-ICONS.md).

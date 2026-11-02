# Third-party assets: Microsoft Azure Architecture Icons and Microsoft Entra architecture icons

The drawings this package ships in
`plugins/azure-shapes/src/drawing/iconDrawings.generated.ts` are generated
from Microsoft's **Azure Architecture Icons** package (V24, 2026-07), as are
the icon names and labels in
`plugins/azure-shapes/src/schema/icon/iconCatalog.generated.ts`. One drawing,
Microsoft Entra ID (`entra-id`), comes from Microsoft's **Microsoft Entra
architecture icons** package (Oct 2023) instead: Entra left Azure as a product
family of its own in 2023, and the Azure package does not carry it.

The Azure Architecture Icons are © Microsoft Corporation. **The MIT license
this repository is under does not cover them.** They are used under the terms
Microsoft publishes with them, at
<https://learn.microsoft.com/en-us/azure/architecture/icons/> and in the
package's `Microsoft_Terms_of_Use.pdf`:

> Microsoft permits the use of these icons in architectural diagrams, training
> materials, or documentation. You may copy, distribute, and display the icons
> only for the permitted use unless granted explicit permission by Microsoft.
> Microsoft reserves all other rights.

The Entra package states the same terms, word for word, at
<https://learn.microsoft.com/en-us/entra/architecture/architecture-icons> and
in its `Microsoft Terms of Use.docx`.

Both pages ask that the icons not be cropped, flipped, rotated, distorted or
otherwise changed in shape, and that the product name be placed close to the
icon; Microsoft's Azure icon FAQ requires the latter. The Entra page adds one
more: **"Don't use Microsoft product icons in marketing communications."**

The palette labels each icon it places with the product's official name, and
the `azureIcon` shape offers no stroke and no fill, so an icon cannot be
recoloured from the editor.

**The icons must not be modified.** Nothing in the pipeline that produced the
data modules changes what is drawn: no coordinate is rounded and no colour is
substituted. Only the technical embedding is adjusted:

- the root `<svg>`'s namespace, size, `id` and `data-name` attributes are
  dropped, and a `fill` on it moves onto a `<g>` wrapping the drawing
- where a root carries its viewBox misspelt as `xviewBox`, the viewBox is
  built from its `width` and `height`
- the one stylesheet in the set (`<style>` with `.cls-n` class rules) is
  expanded into attributes on the elements its classes name, and `class` is
  dropped
- `isolation: isolate`, as an attribute or a style, is dropped: it only
  affects blending, and nothing in the set blends
- `xlink:href` becomes `href`
- the ids that something refers to are rewritten so that several icons can
  share one document, their references following; ids nothing refers to are
  dropped, as are `<title>` elements and `data-name` attributes
- `clip-rule` where no clipPath can read it is dropped, and `<defs>` is
  unwrapped (its gradients, clipPaths and masks draw nothing wherever they sit)
- attribute names carry React's spelling

`plugins/azure-shapes/scripts/generateIconData.mjs` and the converter it calls,
`packages/canvas-sdk/icon-set-generator/index.mjs`, are the whole of that
pipeline.

Where the assets came from:

    https://arch-center.azureedge.net/icons/Azure_Public_Service_Icons_V24.zip
    https://download.microsoft.com/download/3/1/a/31a56038-856a-4489-88e4-ee5a1c4352be/Microsoft%20Entra%20architecture%20icons%20-%20Oct%202023.zip

Microsoft, Azure, Microsoft Entra, and the product names this package carries
as icon names and labels are trademarks of the Microsoft group of companies.

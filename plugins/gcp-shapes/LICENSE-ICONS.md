# Third-party assets: Google Cloud product icons

The drawings this package ships in
`plugins/gcp-shapes/src/drawing/iconDrawings.generated.ts` are generated from
Google's **Google Cloud product icons** (May 2026): the core products' icons
package, which carries the icons of the products Google draws with an icon of
their own, and the category icons package, whose icons every other product is
drawn with. The icon names, labels and categories in
`plugins/gcp-shapes/src/schema/icon/iconCatalog.generated.ts` are taken from
the same packages and from Google's product icon overview. The zips carry no
version; May 2026 is the date the overview gives ("Updated: May 2026").

The icons are Google's work. **The MIT license this repository is under does
not cover them.** Google publishes them at <https://cloud.google.com/icons> for
use in diagrams and technical documentation, but **no license text comes with
them**: neither that page nor either zip states terms. They are redistributed
here as Google publishes them, unmodified and with attribution, for that same
use. They are not open source.

Google's brand guidelines
(<https://partnermarketinghub.withgoogle.com/brands/google/branding-guidelines/how-to-show-googles-brand/>)
require approval for using Google's product icons in marketing. **Do not use
these icons in marketing material.**

Draw an icon as it is published: do not crop, recolour, distort or otherwise
change it, and place the product's name close to the icon. Where a product is
drawn with its category's icon, the name is what tells it apart. The palette
labels each icon it places with Google's official name, and the `gcpIcon`
shape offers no stroke and no fill, so an icon cannot be recoloured from the
editor.

**The icons must not be modified.** Nothing in the pipeline that produced the
data modules changes what is drawn: no coordinate is rounded and no colour is
substituted. Only the technical embedding is adjusted:

- the root `<svg>`'s namespace, `version` and `id` attributes are dropped
- the stylesheet some of the icons carry (`<style>` with `.stN` class rules,
  inside `<defs>`) is expanded into attributes on the elements its classes
  name, `class` is dropped, and the emptied `<defs>` is unwrapped
- `id` attributes are dropped (nothing in the set refers to one), as are
  `data-name` attributes, comments and the XML declaration; a `<g>` left with
  no attributes is unwrapped

`plugins/gcp-shapes/scripts/generateIconData.mjs` and the converter it calls,
`packages/canvas-sdk/icon-set-generator/index.mjs`, are the whole of that
pipeline.

Where the assets came from:

    https://cloud.google.com/icons
    https://services.google.com/fh/files/misc/core-products-icons.zip
    https://services.google.com/fh/files/misc/category-icons.zip
    https://services.google.com/fh/files/misc/google-cloud-product-icons.pdf

Google Cloud and the product names this package carries as icon names and
labels are trademarks of Google LLC.

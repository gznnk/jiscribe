# Third-party assets: AWS Architecture Icons

The drawings this package ships in
`plugins/aws-shapes/src/schema/icon/iconData.generated.ts` are
generated from the **AWS Architecture Icons** asset package (release
2026-07-31).

AWS Architecture Icons are © Amazon Web Services, Inc. or its affiliates, and
are used under the AWS terms published at
<https://aws.amazon.com/architecture/icons/>. **The MIT license this repository
is under does not cover them.** They are redistributed here the way AWS Labs
itself redistributes them (see `awslabs/aws-icons-for-plantuml`, whose icons are
made available under CC-BY-ND 2.0): unmodified, with attribution.

**The icons must not be modified.** Nothing in the pipeline that produced the
data module changes what is drawn: no coordinate is rounded, no fill is
substituted, and where AWS ships a light and a dark rendition of a drawing both
are kept and the theme picks between them. Only the technical embedding is
adjusted — `<title>` elements, `xmlns` attributes and clipPaths that clip the
whole viewBox (no-ops) are dropped, the ids that survive are rewritten so that
several icons can share one document, and attribute names carry React's
spelling. `plugins/aws-shapes/scripts/generateIconData.mjs` is the whole of that
pipeline.

The `awsIcon` shape offers no stroke and no fill for the same reason: an icon
cannot be recoloured from the editor.

Where the assets came from:

    https://d1.awsstatic.com/onedam/marketing-channels/website/public/shared/architecture-icon-release/Icon-package_07312026.5846e92413caa21490223536cc97f1269e44fa92.zip

Amazon Web Services, AWS, and the service names this package carries as icon
names are trademarks of Amazon.com, Inc. or its affiliates.

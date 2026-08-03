/**
 * Headless (UI-independent) counterpart of `.`: the whole of
 * `@workspace/canvas/unstable-doc` plus the doc-side parts only plugins use.
 */

export * from "@workspace/canvas/unstable-doc";

// Typography defaults for a shape whose drawing fills its box and so hangs its
// label underneath (calcBelowLabelTextRegion in `.`). Spread into that shape's
// doc defaults: the layout measures the label with these, so a shape that draws
// with different ones gets a box that does not fit its text.
export { BELOW_LABEL_STYLE_DEFAULTS } from "./schema/belowLabelStyleDefaults";

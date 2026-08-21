/**
 * Headless (UI-independent) counterpart of `.`: the whole of
 * `@jiscribe/doc/unstable` plus the doc-side parts only plugins use.
 */

export * from "@jiscribe/doc/unstable";

// One call per Frame-family shape in place of its factory / doc-validator files.
// The UI-side counterpart is createFrameObjectDefinition in `.`, which takes the
// ObjectDocDefinition this returns.
export { createFrameObjectDoc } from "./schema/createFrameObjectDoc";
export type { FrameObjectDocParams } from "./schema/createFrameObjectDoc";

// The text region of a shape whose region is a fixed ratio inset of its box.
// Headless, so the shape's doc definition and its UI definition register the very
// same function: `.` re-exports this one rather than declaring its own.
export { createInsetTextRegion } from "./schema/createInsetTextRegion";

// Typography defaults for a shape whose drawing fills its box and so hangs its
// label underneath (calcBelowLabelTextRegion in `.`). Spread into that shape's
// doc defaults: the layout measures the label with these, so a shape that draws
// with different ones gets a box that does not fit its text.
export { BELOW_LABEL_STYLE_DEFAULTS } from "./schema/belowLabelStyleDefaults";

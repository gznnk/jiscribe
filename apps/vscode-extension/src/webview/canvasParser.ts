// The shipped shape set comes from @jiscribe/standard-shapes
// (packages/canvas/docs/13-authoring-plugins.md). This webview already loads the whole
// Canvas, React included, so it takes the package's root entry rather than ./doc.
// `plugins` is shared with the `initialConfig` in index.tsx.
import { createCanvasParser } from "@jiscribe/doc";
import { standardPlugins } from "@jiscribe/standard-shapes";

export const plugins = standardPlugins;

export const canvasParser = createCanvasParser({ plugins });

// SVG-source-only entry point.
//
// The root index.ts exports Canvas (a React component), so importing it pulls
// UI dependencies such as react / @emotion into the bundle. Consumers that
// only need the `.jis.svg` <metadata> source extraction/replacement — like the
// Node side of the VSCode extension opening and saving `.jis.svg` documents —
// can use this entry to avoid bringing in those UI dependencies. Everything
// here operates on plain strings (no DOM) and runs in Node 18+ as well as
// browsers.
//
// Import example:
//   `import { extractCanvasSourceFromSvgText } from "@workspace/canvas/svg-source";`
export {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "./export/svgSourceText";
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";

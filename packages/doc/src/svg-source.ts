// SVG-source-only entry point.
//
// Narrower than the package root: consumers that only need the `.jis.svg`
// <metadata> source extraction/replacement — like the Node side of the VSCode
// extension opening and saving `.jis.svg` documents — take this entry and pull in
// neither the parser nor the doc-ops. Everything here operates on plain strings
// (no DOM) and runs in Node 18+ as well as browsers.
//
// Import example:
//   `import { extractCanvasSourceFromSvgText } from "@jiscribe/doc/svg-source";`
export {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "./file/svgSourceText";
export type { CanvasDoc } from "./model/canvas/CanvasDoc";

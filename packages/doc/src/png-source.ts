// PNG-source-only entry point.
//
// Narrower than the package root: consumers that only need the `.jis.png` iTXt
// embedding/extraction — like the Node side of the VSCode extension opening and
// saving `.jis.png` documents — take this entry and pull in neither the parser nor
// the doc-ops. Everything here operates on Blob/Uint8Array only and runs in
// Node 18+ as well as browsers.
//
// Import example:
//   `import { extractCanvasSourceFromPng } from "@jiscribe/doc/png-source";`
export {
	embedCanvasSourceInPng,
	extractCanvasSourceFromPng,
	PNG_SOURCE_KEYWORD,
} from "./file/pngCanvasSource";
// Synchronous byte-level primitives, for hosts that hold Uint8Array directly
// (e.g. VSCode extension host writing hot-exit backups synchronously).
export { insertPngTextChunk, readPngTextChunk } from "./file/pngChunks";
export type { CanvasDoc } from "./model/canvas/CanvasDoc";

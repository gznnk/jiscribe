// PNG-source-only entry point.
//
// The root index.ts exports Canvas (a React component), so importing it pulls
// UI dependencies such as react / @emotion into the bundle. Consumers that
// only need the `.jis.png` iTXt embedding/extraction — like the Node side of
// the VSCode extension opening and saving `.jis.png` documents — can use this
// entry to avoid bringing in those UI dependencies. Everything here operates
// on Blob/Uint8Array only and runs in Node 18+ as well as browsers.
//
// Import example:
//   `import { extractCanvasSourceFromPng } from "@jiscribe/canvas/png-source";`
export {
	embedCanvasSourceInPng,
	extractCanvasSourceFromPng,
	PNG_SOURCE_KEYWORD,
} from "./export/pngCanvasSource";
// Synchronous byte-level primitives, for hosts that hold Uint8Array directly
// (e.g. VSCode extension host writing hot-exit backups synchronously).
export { insertPngTextChunk, readPngTextChunk } from "./export/pngChunks";
export type { CanvasDoc } from "./schemas/canvas/CanvasDoc";

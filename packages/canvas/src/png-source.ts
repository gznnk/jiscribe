// Re-export shim for the `.jis.png` source embedding / extraction, which lives in its
// own package now (`@jiscribe/doc/png-source`). Kept for the Node side of the VSCode
// extension and the other consumers while they migrate.
//
// Listed rather than star-exported, for the reason spelled out in ./doc.ts.

export {
	embedCanvasSourceInPng,
	extractCanvasSourceFromPng,
	PNG_SOURCE_KEYWORD,
	insertPngTextChunk,
	readPngTextChunk,
} from "@jiscribe/doc/png-source";
export type { CanvasDoc } from "@jiscribe/doc/png-source";

// Re-export shim for the `.jis.svg` <metadata> source extraction / replacement, which
// lives in its own package now (`@jiscribe/doc/svg-source`). Kept for the Node side of
// the VSCode extension and the other consumers while they migrate.
//
// Listed rather than star-exported, for the reason spelled out in ./doc.ts.

export {
	extractCanvasSourceFromSvgText,
	replaceCanvasSourceInSvgText,
} from "@jiscribe/doc/svg-source";
export type { CanvasDoc } from "@jiscribe/doc/svg-source";

import { insertPngTextChunk, readPngTextChunk } from "./pngChunks";
import type { CanvasDoc } from "../schemas/canvas/CanvasDoc";

/** iTXt keyword under which the `.jis.json` source is stored in exported PNGs. */
export const PNG_SOURCE_KEYWORD = "jiscribe";

/**
 * Embeds a CanvasDoc (the `.jis.json` content) into a PNG as an `iTXt` chunk,
 * draw.io style: the PNG stays a plain image everywhere, while jiscribe can
 * reopen it for editing. Returns a new Blob.
 */
export const embedCanvasSourceInPng = async (
	png: Blob,
	doc: CanvasDoc,
): Promise<Blob> => {
	const bytes = new Uint8Array(await png.arrayBuffer());
	const embedded = insertPngTextChunk(
		bytes,
		PNG_SOURCE_KEYWORD,
		JSON.stringify(doc),
	);
	return new Blob([embedded], { type: "image/png" });
};

/**
 * Extracts the `.jis.json` text embedded by {@link embedCanvasSourceInPng}.
 * Returns the raw JSON text (not a parsed doc): a PNG is external input, so
 * hosts must run it through a `createCanvasParser` parser (two-stage validation at the
 * boundary) before handing it to Canvas. Returns null when the Blob is not a
 * PNG or carries no jiscribe source.
 */
export const extractCanvasSourceFromPng = async (
	png: Blob,
): Promise<string | null> => {
	const bytes = new Uint8Array(await png.arrayBuffer());
	return readPngTextChunk(bytes, PNG_SOURCE_KEYWORD);
};

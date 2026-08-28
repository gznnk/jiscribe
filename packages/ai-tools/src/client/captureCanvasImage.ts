// Turns the current canvas into a PNG and returns it as base64, for the AI's
// capture_canvas tool. It neither reads nor writes the document, the same as
// the other canvas operations (applyHandleOp), but capturing alone is async, so
// it is kept on a route of its own rather than mixed into either that or
// applyCanvasOp.

import type { CanvasPngExportOptions } from "@jiscribe/canvas";

import type { AiCanvasOpOutcome } from "../canvasOps";
import type { CapturePng } from "./types";

/**
 * The longest edge (px) of the image handed to the AI. It travels over IPC as
 * base64 and then rides into the model's input, so it is held down to what is
 * still readable (the API scales the long edge to some 1568px of its own)
 */
const MAX_CAPTURE_PIXEL_SIZE = 1400;

/**
 * The capture options. Size is held down by drawing at 1:1 with a cap on the
 * longest edge, and the .jis.json embedded for re-editing is left out (the AI
 * can read the document with describe_canvas, so carrying it twice buys
 * nothing)
 */
const CAPTURE_OPTIONS: CanvasPngExportOptions = {
	includeSource: false,
	scale: 1,
	maxPixelSize: MAX_CAPTURE_PIXEL_SIZE,
};

/** How many bytes go to btoa at a time; small enough not to touch the argument limit on a spread */
const BASE64_CHUNK_SIZE = 0x2000;

const toBase64 = (bytes: Uint8Array): string => {
	const chunks: string[] = [];
	for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
		chunks.push(
			String.fromCharCode(
				...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE),
			),
		);
	}
	return btoa(chunks.join(""));
};

/**
 * Captures the canvas and builds the PNG (base64) the tool result carries.
 *
 * @param capturePng - The image-making function received from the host
 *   application; it returns null while the canvas is not mounted
 * @returns The tool result; imagePngBase64 is filled in when ok=true
 */
export const captureCanvasImage = async (
	capturePng: CapturePng,
): Promise<AiCanvasOpOutcome> => {
	try {
		const pngBlob = await capturePng(CAPTURE_OPTIONS);
		if (pngBlob === null) {
			return { ok: false, text: "the canvas is not ready to be captured yet" };
		}
		return {
			ok: true,
			text: "captured the canvas: the image is the whole drawing fitted to its content and scaled to fit, so do not read coordinates or sizes off it — use describe_canvas for exact numbers",
			imagePngBase64: toBase64(new Uint8Array(await pngBlob.arrayBuffer())),
		};
	} catch (error) {
		return {
			ok: false,
			text: `failed to capture the canvas: ${error instanceof Error ? error.message : String(error)}`,
		};
	}
};

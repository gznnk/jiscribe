/**
 * The rendering half of a `.jis.png` / `.jis.svg` save, extracted from
 * index.tsx: it turns the mounted canvas's export handle into the payload an
 * imageExportResult carries, leaving the message round trip in index.tsx.
 */

import type { CanvasExportHandle } from "@jiscribe/canvas";

import { blobToBase64 } from "./blobToBase64";

/**
 * Renders the mounted canvas and encodes it for imageExportResult.
 *
 * Never rejects: the Extension blocks its save on this answer, and a null lets
 * it switch to its fallback (old image + re-embedded new source), so every
 * failure is logged and reported rather than thrown.
 *
 * @param exportHandle - the mounted Canvas's `export` namespace, or undefined
 *   when no canvas is mounted yet — which is answered with null, not an error
 * @param format - "svg" renders through toSvgString, "png" through capturePng;
 *   the result is base64 either way
 * @returns the base64 image bytes (source embedded), or null when nothing could
 *   be rendered
 */
export const exportImageAsBase64 = async (
	exportHandle: CanvasExportHandle | undefined,
	format: "png" | "svg",
): Promise<string | null> => {
	if (!exportHandle) {
		return null;
	}
	try {
		if (format === "svg") {
			const svg = await exportHandle.toSvgString();
			// base64-encode like PNG (via Blob so UTF-8 text survives) so
			// imageExportResult.data has a single encoding for both formats,
			// removing the utf8/base64 mismatch hazard (#182).
			return svg
				? await blobToBase64(new Blob([svg], { type: "image/svg+xml" }))
				: null;
		}
		const capture = await exportHandle.capturePng();
		return capture ? await blobToBase64(capture.blob) : null;
	} catch (err: unknown) {
		console.error(`[Jiscribe] ${format.toUpperCase()} export failed:`, err);
		return null;
	}
};

// Reads a capture_canvas answer back as pixels, for the specs that check what a
// picture shows rather than only that one came back.

import type { Page } from "@playwright/test";

import type { ToolCallResult } from "./mcpStdioClient";

/** The fill the specs paint a marker shape with, picked so no other pixel of the drawing is near it */
export const MARKER_FILL = "#ff0000";

/**
 * Counts the pixels of a captured PNG that are the marker's red.
 *
 * @param page Any page, used only to decode the image
 * @param captured What capture_canvas answered; an answer without an image throws, with the text as the reason
 */
export async function countMarkerPixels(
	page: Page,
	captured: ToolCallResult,
): Promise<number> {
	const imagePart = captured.parts.find((part) => part.type === "image");
	if (imagePart === undefined) {
		throw new Error(`capture_canvas answered with ${captured.text}`);
	}
	return await page.evaluate(async (pngBase64) => {
		const bytes = Uint8Array.from(atob(pngBase64), (char) =>
			char.charCodeAt(0),
		);
		const bitmap = await createImageBitmap(
			new Blob([bytes], { type: "image/png" }),
		);
		const surface = new OffscreenCanvas(bitmap.width, bitmap.height);
		const context = surface.getContext("2d");
		if (context === null) {
			throw new Error("no 2d context to decode the capture with");
		}
		context.drawImage(bitmap, 0, 0);
		const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
		let count = 0;
		for (let index = 0; index < data.length; index += 4) {
			if (data[index] > 200 && data[index + 1] < 60 && data[index + 2] < 60) {
				count += 1;
			}
		}
		return count;
	}, String(imagePart.data));
}

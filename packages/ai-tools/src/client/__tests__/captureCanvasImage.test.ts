import { describe, expect, it } from "vitest";

import { captureCanvasImage } from "../captureCanvasImage";

/** PNG bytes standing in for a capture (they need not be real data) */
const fakePngBytes = Uint8Array.from(
	{ length: 20_000 },
	(_, index) => index % 256,
);

describe("captureCanvasImage", () => {
	it("returns the PNG as base64 (encoding it in chunks does not break it)", async () => {
		const result = await captureCanvasImage(
			async () => new Blob([fakePngBytes]),
		);

		expect(result.ok).toBe(true);
		expect(result.imagePngBase64).toBeDefined();
		expect(Buffer.from(result.imagePngBase64 ?? "", "base64")).toEqual(
			Buffer.from(fakePngBytes),
		);
	});

	it("passes capture options of 1:1 scale, a cap on the longest edge, and no embedded source", async () => {
		let passedOptions: unknown;
		await captureCanvasImage(async (options) => {
			passedOptions = options;
			return new Blob([fakePngBytes]);
		});

		expect(passedOptions).toEqual({
			includeSource: false,
			scale: 1,
			maxPixelSize: 1400,
		});
	});

	it("returns ok:false while the canvas is not mounted (null)", async () => {
		const result = await captureCanvasImage(async () => null);

		expect(result.ok).toBe(false);
		expect(result.imagePngBase64).toBeUndefined();
	});

	it("turns an export that throws into ok:false, rather than losing the turn", async () => {
		const result = await captureCanvasImage(async () => {
			throw new Error("2D context unavailable");
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("2D context unavailable");
	});
});

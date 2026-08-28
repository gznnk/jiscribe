import { describe, expect, it } from "vitest";

import { captureCanvasImage } from "../captureCanvasImage";

/** 撮影結果を模した PNG バイト列（実データである必要はない） */
const fakePngBytes = Uint8Array.from(
	{ length: 20_000 },
	(_, index) => index % 256,
);

describe("captureCanvasImage", () => {
	it("PNG を base64 にして返す（分割エンコードで壊れない）", async () => {
		const result = await captureCanvasImage(
			async () => new Blob([fakePngBytes]),
		);

		expect(result.ok).toBe(true);
		expect(result.imagePngBase64).toBeDefined();
		expect(Buffer.from(result.imagePngBase64 ?? "", "base64")).toEqual(
			Buffer.from(fakePngBytes),
		);
	});

	it("撮影オプションは等倍・最長辺の上限つき・source 埋め込み無しで渡す", async () => {
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

	it("キャンバス未マウント（null）は ok:false で返す", async () => {
		const result = await captureCanvasImage(async () => null);

		expect(result.ok).toBe(false);
		expect(result.imagePngBase64).toBeUndefined();
	});

	it("書き出しが投げても ok:false に落とす（ターンを落とさない）", async () => {
		const result = await captureCanvasImage(async () => {
			throw new Error("2D context unavailable");
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain("2D context unavailable");
	});
});

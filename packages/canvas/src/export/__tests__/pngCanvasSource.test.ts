import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";
import { parseCanvasText } from "../../schemas/canvas/validators";
import {
	embedCanvasSourceInPng,
	extractCanvasSourceFromPng,
} from "../pngCanvasSource";

/** 1x1 透過 PNG（実エンコーダ出力） */
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const tinyPngBlob = (): Blob =>
	new Blob([Buffer.from(TINY_PNG_BASE64, "base64")], { type: "image/png" });

/** 入力境界と同じ 2 段階バリデーションを通して正規の CanvasDoc を作る */
const sampleDoc = (): CanvasDoc => {
	const result = parseCanvasText(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "rect-1",
					type: "rect",
					x: 0,
					y: 0,
					width: 100,
					height: 60,
					text: "日本語ラベル",
				},
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid sample doc: ${result.kind}`);
	}
	return result.doc;
};

describe("embedCanvasSourceInPng / extractCanvasSourceFromPng", () => {
	it("CanvasDoc を PNG に埋め込み、parseCanvasText で復元できる", async () => {
		const doc = sampleDoc();
		const embedded = await embedCanvasSourceInPng(tinyPngBlob(), doc);
		const text = await extractCanvasSourceFromPng(embedded);
		expect(text).not.toBeNull();

		// ホスト境界の 2 段階バリデーションをそのまま通す
		const parsed = parseCanvasText(text as string);
		expect(parsed.kind).toBe("ok");
		if (parsed.kind === "ok") {
			expect(parsed.doc).toEqual(doc);
		}
	});

	it("埋め込みの無い PNG からの抽出は null", async () => {
		expect(await extractCanvasSourceFromPng(tinyPngBlob())).toBeNull();
	});

	it("PNG でない Blob からの抽出は null", async () => {
		const blob = new Blob(["not a png"], { type: "text/plain" });
		expect(await extractCanvasSourceFromPng(blob)).toBeNull();
	});
});

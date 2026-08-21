import { describe, expect, it } from "vitest";

import type { CanvasDoc } from "../../model/canvas/CanvasDoc";
import { createCanvasParser } from "../../parse";
import {
	embedCanvasSourceInPng,
	extractCanvasSourceFromPng,
} from "../pngCanvasSource";

/** 1x1 transparent PNG (real encoder output) */
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const tinyPngBlob = (): Blob =>
	new Blob([Buffer.from(TINY_PNG_BASE64, "base64")], { type: "image/png" });

/** Builds a valid CanvasDoc through the same two-stage validation as the input boundary */
const sampleDoc = (): CanvasDoc => {
	const result = createCanvasParser().parse(
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
	it("embeds a CanvasDoc into a PNG and restores it via the parser", async () => {
		const doc = sampleDoc();
		const embedded = await embedCanvasSourceInPng(tinyPngBlob(), doc);
		const text = await extractCanvasSourceFromPng(embedded);
		expect(text).not.toBeNull();

		// run it through the host boundary's two-stage validation as-is
		const parsed = createCanvasParser().parse(text as string);
		expect(parsed.kind).toBe("ok");
		if (parsed.kind === "ok") {
			expect(parsed.doc).toEqual(doc);
		}
	});

	it("returns null when extracting from a PNG with no embedded source", async () => {
		expect(await extractCanvasSourceFromPng(tinyPngBlob())).toBeNull();
	});

	it("returns null when extracting from a non-PNG Blob", async () => {
		const blob = new Blob(["not a png"], { type: "text/plain" });
		expect(await extractCanvasSourceFromPng(blob)).toBeNull();
	});
});

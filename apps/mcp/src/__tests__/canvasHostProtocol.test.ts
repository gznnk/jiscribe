// The only thing standing between a frame off the network and the host's state. A
// frame that gets through is trusted: a "handleOpResult" settles a request the AI
// is waiting on, and a "flushed" lets a file switch go ahead.

import { describe, expect, it } from "vitest";

import { isCanvasHostClientMessage } from "../shared/canvasHostProtocol";

/** A frame the guard accepts, to vary one field at a time from */
const flushedFrame = {
	type: "flushed",
	requestId: "66666666-7777-8888-9999-000000000000",
};

/** As above, for the round-trip answer */
const handleOpResultFrame = {
	type: "handleOpResult",
	requestId: "11111111-2222-3333-4444-555555555555",
	ok: true,
	text: "captured",
};

/** A measureText's numbers the guard accepts, to vary one field at a time from */
const textMeasurement = {
	textSlotId: "body",
	bounds: { x: 0, y: 0, width: 200, height: 80 },
	textSize: { width: 188, height: 132.5 },
	regionSize: { width: 188, height: 76 },
	lineCount: null,
	isOverflowing: true,
};

describe("isCanvasHostClientMessage", () => {
	it.each([
		["a flushed frame", flushedFrame],
		["a handleOpResult frame", handleOpResultFrame],
		["a failed handleOpResult frame", { ...handleOpResultFrame, ok: false }],
		[
			"a handleOpResult frame carrying a PNG",
			{ ...handleOpResultFrame, imagePngBase64: "iVBORw0KGgo=" },
		],
		[
			"a handleOpResult frame carrying an exported image",
			{ ...handleOpResultFrame, exportedImageBase64: "PHN2Zy8+" },
		],
		[
			"a handleOpResult frame carrying a block-laid measurement",
			{ ...handleOpResultFrame, textMeasurement },
		],
		[
			"a handleOpResult frame carrying a measurement with a line count",
			{
				...handleOpResultFrame,
				textMeasurement: { ...textMeasurement, lineCount: 3 },
			},
		],
		[
			"a frame carrying properties nobody asked for",
			{ ...flushedFrame, unknownField: 1 },
		],
	])("accepts %s", (_label, frame) => {
		expect(isCanvasHostClientMessage(frame)).toBe(true);
	});

	it.each([
		["null", null],
		["undefined", undefined],
		["a string", '{"type":"flushed"}'],
		["a number", 1],
		["an array", [flushedFrame]],
		["a frame with no type", { requestId: "r1" }],
		["a frame of an unknown type", { ...flushedFrame, type: "openCanvas" }],
		["a frame whose type is not a string", { ...flushedFrame, type: 1 }],
		[
			"a save frame, which no longer travels this way",
			{ type: "saved", relPath: "a.jis.json", docText: "" },
		],
		["a flushed frame with no requestId", { type: "flushed" }],
		[
			"a flushed frame whose requestId is not a string",
			{ ...flushedFrame, requestId: 1 },
		],
		[
			"a handleOpResult frame with no requestId",
			{ type: "handleOpResult", ok: true, text: "" },
		],
		[
			"a handleOpResult frame with no ok",
			{ type: "handleOpResult", requestId: "r1", text: "" },
		],
		[
			"a handleOpResult frame with no text",
			{ type: "handleOpResult", requestId: "r1", ok: true },
		],
		[
			"a handleOpResult frame whose requestId is not a string",
			{ ...handleOpResultFrame, requestId: 1 },
		],
		[
			"a handleOpResult frame whose ok is not a boolean",
			{ ...handleOpResultFrame, ok: "true" },
		],
		[
			"a handleOpResult frame whose text is not a string",
			{ ...handleOpResultFrame, text: 1 },
		],
		[
			"a handleOpResult frame whose measurement is missing a field",
			{
				...handleOpResultFrame,
				textMeasurement: { ...textMeasurement, isOverflowing: undefined },
			},
		],
		[
			"a handleOpResult frame whose PNG is not a string",
			{ ...handleOpResultFrame, imagePngBase64: 123 },
		],
		[
			"a handleOpResult frame whose PNG is null",
			{ ...handleOpResultFrame, imagePngBase64: null },
		],
		[
			"a handleOpResult frame whose exported image is not a string",
			{ ...handleOpResultFrame, exportedImageBase64: 123 },
		],
		[
			"a handleOpResult frame whose exported image is null",
			{ ...handleOpResultFrame, exportedImageBase64: null },
		],
	])("rejects %s", (_label, frame) => {
		expect(isCanvasHostClientMessage(frame)).toBe(false);
	});

	it.each([
		["textSlotId", { textSlotId: 1 }],
		["bounds.x", { bounds: { ...textMeasurement.bounds, x: "0" } }],
		[
			"bounds.width",
			{ bounds: { ...textMeasurement.bounds, width: Number.NaN } },
		],
		[
			"textSize.height",
			{ textSize: { width: 188, height: Number.POSITIVE_INFINITY } },
		],
		["regionSize", { regionSize: null }],
		["lineCount", { lineCount: "3" }],
		["isOverflowing", { isOverflowing: "true" }],
	] as [string, Record<string, unknown>][])(
		"rejects a handleOpResult frame whose measurement's %s is malformed",
		(_field, override) => {
			expect(
				isCanvasHostClientMessage({
					...handleOpResultFrame,
					textMeasurement: { ...textMeasurement, ...override },
				}),
			).toBe(false);
		},
	);
});

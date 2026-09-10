// The only thing standing between a frame off the network and the host's state.
// A frame that gets through is trusted: a "saved" one overwrites the text the
// host believes the file holds, and a "handleOpResult" settles a request the AI
// is waiting on.

import { describe, expect, it } from "vitest";

import { isCanvasHostClientMessage } from "../shared/canvasHostProtocol";

/** A frame the guard accepts, to vary one field at a time from */
const savedFrame = {
	type: "saved",
	relPath: "diagram.jis.json",
	docText: '{"version":1,"root":[]}',
};

/** As above, for the round-trip answer */
const handleOpResultFrame = {
	type: "handleOpResult",
	requestId: "11111111-2222-3333-4444-555555555555",
	ok: true,
	text: "captured",
};

describe("isCanvasHostClientMessage", () => {
	it.each([
		["a saved frame", savedFrame],
		["a saved frame with an empty doc", { ...savedFrame, docText: "" }],
		["a handleOpResult frame", handleOpResultFrame],
		["a failed handleOpResult frame", { ...handleOpResultFrame, ok: false }],
		[
			"a handleOpResult frame carrying a PNG",
			{ ...handleOpResultFrame, imagePngBase64: "iVBORw0KGgo=" },
		],
		[
			"a frame carrying properties nobody asked for",
			{ ...savedFrame, unknownField: 1 },
		],
	])("accepts %s", (_label, frame) => {
		expect(isCanvasHostClientMessage(frame)).toBe(true);
	});

	it.each([
		["null", null],
		["undefined", undefined],
		["a string", '{"type":"saved"}'],
		["a number", 1],
		["an array", [savedFrame]],
		["a frame with no type", { relPath: "a.jis.json", docText: "" }],
		["a frame of an unknown type", { ...savedFrame, type: "openCanvas" }],
		["a frame whose type is not a string", { ...savedFrame, type: 1 }],
		["a saved frame with no relPath", { type: "saved", docText: "" }],
		["a saved frame with no docText", { type: "saved", relPath: "a.jis.json" }],
		[
			"a saved frame whose relPath is not a string",
			{ ...savedFrame, relPath: 1 },
		],
		[
			"a saved frame whose docText is not a string",
			{ ...savedFrame, docText: null },
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
			"a handleOpResult frame whose PNG is not a string",
			{ ...handleOpResultFrame, imagePngBase64: 123 },
		],
		[
			"a handleOpResult frame whose PNG is null",
			{ ...handleOpResultFrame, imagePngBase64: null },
		],
	])("rejects %s", (_label, frame) => {
		expect(isCanvasHostClientMessage(frame)).toBe(false);
	});
});

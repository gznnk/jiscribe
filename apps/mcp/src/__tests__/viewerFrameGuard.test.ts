// The viewer's guard on what the host sends. What it decides is which frames the
// page acts on, so the checks that matter are the ones a frame is read for after
// it gets through — above all the revision a write has to quote back.

import { describe, expect, it } from "vitest";

import { isCanvasHostServerMessage } from "../viewer/viewerFrameGuard";

describe("isCanvasHostServerMessage", () => {
	it.each([
		[
			"openCanvas",
			{
				type: "openCanvas",
				relPath: "diagram.jis.json",
				docText: "{}",
				revision: "a1",
			},
		],
		[
			"docChanged",
			{
				type: "docChanged",
				relPath: "diagram.jis.json",
				docText: "{}",
				revision: "a1",
			},
		],
		[
			"docError",
			{ type: "docError", relPath: "diagram.jis.json", message: "broken" },
		],
		[
			"handleOpRequest",
			{
				type: "handleOpRequest",
				requestId: "1",
				op: { kind: "captureCanvas" },
			},
		],
		["flushEdits", { type: "flushEdits", requestId: "1" }],
		["closeViewer", { type: "closeViewer" }],
	])("accepts a complete %s frame", (_label, frame) => {
		expect(isCanvasHostServerMessage(frame)).toBe(true);
	});

	it.each([
		["a doc frame without a revision", { type: "docChanged", docText: "{}" }],
		[
			"a doc frame whose revision is not a string",
			{
				type: "openCanvas",
				relPath: "diagram.jis.json",
				docText: "{}",
				revision: 1,
			},
		],
		[
			"a doc frame without its text",
			{ type: "openCanvas", relPath: "diagram.jis.json", revision: "a1" },
		],
		[
			"a docError without a message",
			{ type: "docError", relPath: "diagram.jis.json" },
		],
		[
			"a handleOpRequest without an op",
			{ type: "handleOpRequest", requestId: "1" },
		],
		[
			"a handleOpRequest whose op is null",
			{ type: "handleOpRequest", requestId: "1", op: null },
		],
		["a flushEdits without a request id", { type: "flushEdits" }],
		["an unknown type", { type: "somethingElse" }],
		["a frame with no type at all", { relPath: "diagram.jis.json" }],
	])("rejects %s", (_label, frame) => {
		expect(isCanvasHostServerMessage(frame)).toBe(false);
	});

	it.each([
		["null", null],
		["an array", []],
		["a string", "docChanged"],
		["undefined", undefined],
	])("rejects %s, which is not a frame at all", (_label, value) => {
		expect(isCanvasHostServerMessage(value)).toBe(false);
	});
});

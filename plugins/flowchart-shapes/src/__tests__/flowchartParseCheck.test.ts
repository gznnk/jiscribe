import { createCanvasParser } from "@workspace/canvas/parser";
import { describe, expect, it } from "vitest";

import { flowchartPlugin } from "../plugin";

// Parse through a plugin-aware parser so the flowchart shapes are known to
// parse-time structure/semantic validation (they no longer live in the core
// default extensions).
const parser = createCanvasParser({ plugins: [flowchartPlugin] });

const doc = {
	version: 1,
	root: [
		{
			id: "md-1",
			type: "multiDocument",
			x: 0,
			y: 0,
			width: 140,
			height: 100,
			text: "reports",
		},
		{
			id: "sd-1",
			type: "storedData",
			x: 200,
			y: 0,
			width: 140,
			height: 80,
			text: "cache",
		},
		{
			id: "ll-1",
			type: "loopLimit",
			x: 400,
			y: 0,
			width: 140,
			height: 80,
			text: "for each",
		},
		{
			id: "ll-2",
			type: "loopLimit",
			x: 400,
			y: 200,
			width: 140,
			height: 80,
			text: "end loop",
			flipY: true,
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "md-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "sd-1" }, anchor: { kind: "center" } },
			points: [],
		},
		{
			id: "c-2",
			type: "connector",
			source: { owner: { id: "sd-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "ll-1" }, anchor: { kind: "center" } },
			points: [],
		},
	],
};

describe("new flowchart shapes (multiDocument / storedData / loopLimit)", () => {
	it("parses and accepts connector endpoints on the new shapes", () => {
		const result = parser.parse(JSON.stringify(doc));
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});
});

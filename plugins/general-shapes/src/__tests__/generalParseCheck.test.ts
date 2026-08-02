import { createCanvasParser } from "@workspace/canvas/doc";
import { describe, expect, it } from "vitest";

import { generalDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shapes are known to
// parse-time structure/semantic validation (they no longer live in the core
// built-in definitions). The headless `generalDocPlugin` carries no React deps.
const parser = createCanvasParser({ plugins: [generalDocPlugin] });

const doc = {
	version: 1,
	root: [
		{
			id: "user-1",
			type: "actor",
			x: 0,
			y: 0,
			width: 80,
			height: 100,
			text: "Customer",
		},
		{
			id: "internet-1",
			type: "cloud",
			x: 0,
			y: 200,
			width: 160,
			height: 100,
			text: "Internet",
		},
		{
			id: "system-1",
			type: "rect",
			x: 240,
			y: 0,
			width: 140,
			height: 80,
			text: "Order service",
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "user-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "system-1" }, anchor: { kind: "center" } },
			points: [],
		},
		{
			id: "c-2",
			type: "connector",
			source: { owner: { id: "internet-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "system-1" }, anchor: { kind: "center" } },
			points: [],
		},
	],
};

describe("general shapes", () => {
	it("parses and accepts connector endpoints on the actor and the cloud", () => {
		const result = parser.parse(JSON.stringify(doc));
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});
});

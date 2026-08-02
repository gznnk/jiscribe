import { createCanvasParser } from "@workspace/canvas/doc";
import { describe, expect, it } from "vitest";

import { generalDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shapes are known to
// parse-time structure/semantic validation (they no longer live in the core
// built-in definitions). The headless `generalDocPlugin` carries no React deps.
const parser = createCanvasParser({ plugins: [generalDocPlugin] });

/** Every type this package registers, so a new one cannot be added unparsed. */
const SHAPE_TYPES = Object.keys(generalDocPlugin.objects ?? {});

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

/** One object of every registered type, laid out in a row, plus a chain of connectors. */
const everyShapeDoc = {
	version: 1,
	root: [
		...SHAPE_TYPES.map((type, index) => ({
			id: `shape-${index}`,
			type,
			x: index * 200,
			y: 0,
			width: 120,
			height: 100,
			text: type,
		})),
		...SHAPE_TYPES.slice(1).map((_, index) => ({
			id: `link-${index}`,
			type: "connector",
			source: { owner: { id: `shape-${index}` }, anchor: { kind: "center" } },
			target: {
				owner: { id: `shape-${index + 1}` },
				anchor: { kind: "center" },
			},
			points: [],
		})),
	],
};

describe("general shapes", () => {
	it("parses and accepts connector endpoints on the actor and the cloud", () => {
		const result = parser.parse(JSON.stringify(doc));
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});

	it("parses every registered type and accepts connectors between them", () => {
		expect(SHAPE_TYPES.length).toBeGreaterThan(1);
		const result = parser.parse(JSON.stringify(everyShapeDoc));
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});
});

import { createCanvasParser } from "@workspace/canvas/doc";
import { describe, expect, it } from "vitest";

import { umlDocPlugin } from "../doc";

// Parse through a plugin-aware parser so the record shape is known to parse-time
// structure/semantic validation. The headless `umlDocPlugin` carries no React deps.
const parser = createCanvasParser({ plugins: [umlDocPlugin] });

const makeDoc = (text: unknown) => ({
	version: 1,
	root: [
		{
			id: "r-1",
			type: "record",
			x: 0,
			y: 0,
			width: 180,
			height: 100,
			text,
		},
		{
			id: "r-2",
			type: "record",
			x: 300,
			y: 0,
			width: 180,
			height: 100,
			text: { name: { text: "Order" }, attributes: { text: ["id: string"] } },
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "r-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "r-2" }, anchor: { kind: "center" } },
			points: [],
		},
	],
});

describe("record shape", () => {
	it("parses the keyed text and accepts connector endpoints on it", () => {
		const result = parser.parse(
			JSON.stringify(
				makeDoc({
					name: { text: "User" },
					attributes: { text: ["id: string", "name"] },
					operations: { text: ["save()"] },
				}),
			),
		);
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});

	it("diagnoses the single-body form, which a record does not take", () => {
		const result = parser.parse(JSON.stringify(makeDoc("User")));
		const diagnostics = "diagnostics" in result ? result.diagnostics : [];
		expect(diagnostics.map((entry) => entry.path)).toContain("root[0].text");
	});
});

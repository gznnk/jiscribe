import { createCanvasParser } from "@workspace/canvas/doc";
import { describe, expect, it } from "vitest";

import { annotationDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shapes are known to
// parse-time structure/semantic validation (they do not live in the core
// built-in definitions). The headless `annotationDocPlugin` carries no React deps.
const parser = createCanvasParser({ plugins: [annotationDocPlugin] });

const doc = {
	version: 1,
	root: [
		{
			id: "brace-1",
			type: "brace",
			x: 0,
			y: 0,
			width: 24,
			height: 160,
			direction: "left",
			tipPosition: 0.5,
			text: "doc 層",
		},
		{
			id: "task-1",
			type: "rect",
			x: 60,
			y: 0,
			width: 140,
			height: 80,
			text: "Parser",
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "brace-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
			points: [],
		},
	],
};

describe("annotation shapes", () => {
	it("parses and accepts a connector endpoint on the brace", () => {
		const result = parser.parse(JSON.stringify(doc));
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});

	/**
	 * The counterpart of the above: a host that forgets to wire the plugin does
	 * not get an error, it silently loses the braces — unknown types parse to a
	 * warning and are dropped from the doc. Pinned here so the cost of missing the
	 * wiring stays visible.
	 */
	it("drops the brace with a warning when the plugin is not wired", () => {
		const result = createCanvasParser().parse(JSON.stringify(doc));
		expect(result.kind).toBe("ok");
		if (result.kind !== "ok") {
			return;
		}
		expect(result.doc.root.map((object) => object.id)).not.toContain("brace-1");
		expect(result.warnings?.map((warning) => warning.path)).toContain(
			"root[0].type",
		);
	});
});

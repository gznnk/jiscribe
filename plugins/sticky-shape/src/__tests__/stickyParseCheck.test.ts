import { createCanvasParser } from "@workspace/canvas/doc";
import { describe, expect, it } from "vitest";

import { stickyDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time structure/semantic validation (it no longer lives in the core
// built-in definitions). The headless `stickyDocPlugin` carries no React deps.
const parser = createCanvasParser({ plugins: [stickyDocPlugin] });

const doc = {
	version: 1,
	root: [
		{
			id: "note-1",
			type: "sticky",
			x: 0,
			y: 0,
			width: 200,
			height: 150,
			fill: "#fef9c3",
			text: "外から編集できる",
		},
		{
			id: "task-1",
			type: "rect",
			x: 300,
			y: 0,
			width: 140,
			height: 80,
			text: "Order service",
		},
		{
			id: "c-1",
			type: "connector",
			source: { owner: { id: "note-1" }, anchor: { kind: "center" } },
			target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
			points: [],
		},
	],
};

describe("sticky shape", () => {
	it("parses and accepts a connector endpoint on the sticky", () => {
		const result = parser.parse(JSON.stringify(doc));
		expect("diagnostics" in result ? result.diagnostics : []).toEqual([]);
		expect(result.kind).toBe("ok");
	});

	/**
	 * The counterpart of the above: a host that forgets to wire the plugin does
	 * not get an error, it silently loses the notes — unknown types parse to a
	 * warning and are dropped from the doc. Pinned here so the cost of missing the
	 * wiring stays visible.
	 */
	it("drops the sticky with a warning when the plugin is not wired", () => {
		const result = createCanvasParser().parse(JSON.stringify(doc));
		expect(result.kind).toBe("ok");
		if (result.kind !== "ok") {
			return;
		}
		expect(result.doc.root.map((object) => object.id)).not.toContain("note-1");
		expect(result.warnings?.map((warning) => warning.path)).toContain(
			"root[0].type",
		);
	});
});

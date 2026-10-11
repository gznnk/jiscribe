import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";
import { createCanvasParser } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { tableDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time structure/semantic validation. A type the wiring forgets is not an
// error — the parse still says `ok` and the object is dropped from `root` — so
// this suite is what tells the two apart.
createParseCheckSuite({
	name: "table shape",
	plugin: tableDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "grid-1",
				type: "table",
				x: 0,
				y: 0,
				columns: [{ width: 120 }, { width: 90 }],
				rows: [{ height: 36 }, {}],
				cells: [
					["項目", "担当"],
					[{ text: "設計", textAlign: "left", fill: "#fef3c7" }, "中川"],
				],
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
				source: { owner: { id: "grid-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "task-1" }, anchor: { kind: "center" } },
				points: [],
			},
		],
	},
	rejects: [
		{
			name: "diagnoses a grid that does not fill its own axes",
			doc: {
				version: 1,
				root: [
					{
						id: "grid-1",
						type: "table",
						x: 0,
						y: 0,
						columns: [{ width: 120 }, { width: 90 }],
						rows: [{}, {}],
						// One cell short of the two columns the table declares.
						cells: [["項目"], ["設計", "中川"]],
					},
				],
			},
			diagnosticPaths: ["root[0].cells[0]"],
		},
		{
			name: "diagnoses text styling written on the table rather than a cell",
			doc: {
				version: 1,
				root: [
					{
						id: "grid-1",
						type: "table",
						x: 0,
						y: 0,
						columns: [{ width: 120 }],
						rows: [{}],
						cells: [["項目"]],
						fontSize: 18,
					},
				],
			},
			diagnosticPaths: ["root[0].fontSize"],
		},
	],
});

describe("a table written with a stored size", () => {
	// The natural mistake for anyone who has written any other shape. It is not an
	// error: `width` is a name a table does not carry, so the parser drops it with
	// the warning it gives any unknown key, and the table itself parses.
	const parsed = createCanvasParser({ plugins: [tableDocPlugin] }).parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "grid-1",
					type: "table",
					x: 0,
					y: 0,
					width: 210,
					height: 72,
					columns: [{ width: 120 }, { width: 90 }],
					rows: [{}],
					cells: [["項目", "担当"]],
				},
			],
		}),
	);

	it("parses, and says so about the two names it dropped", () => {
		expect(parsed.kind).toBe("ok");
		if (parsed.kind !== "ok") {
			return;
		}
		const warned = parsed.warnings.map((warning) => warning.path);
		expect(warned).toContain("root[0].width");
		expect(warned).toContain("root[0].height");
	});

	it("keeps no size on the table it parsed", () => {
		if (parsed.kind !== "ok") {
			return;
		}
		const table = parsed.doc.root[0] as Record<string, unknown>;
		expect(table.width).toBeUndefined();
		expect(table.height).toBeUndefined();
		expect(table.columns).toHaveLength(2);
	});
});

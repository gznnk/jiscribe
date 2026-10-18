import { createParseCheckSuite } from "@jiscribe/canvas-sdk/testing";
import { createCanvasParser } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";

import { erDocPlugin } from "../doc";

// Parse through a plugin-aware parser so this package's shape is known to
// parse-time validation. A type the wiring forgets is not an error — the parse
// still says `ok` and the object is dropped from `root` — so this suite is what
// tells the two apart.
createParseCheckSuite({
	name: "ER shapes",
	plugin: erDocPlugin,
	sampleDoc: {
		version: 1,
		root: [
			{
				id: "users",
				type: "erEntity",
				x: 100,
				y: 80,
				nameWidth: 96,
				typeWidth: 104,
				name: "users",
				columns: [
					{ key: "PK", name: "id", type: "bigint" },
					{ key: "FK", name: "org_id", type: "bigint" },
					{ name: "email", type: "varchar(255)" },
				],
			},
			{
				id: "orgs",
				type: "erEntity",
				x: 400,
				y: 80,
				keyWidth: 30,
				name: "orgs",
				columns: [
					{ key: "PK", name: { text: "id", fontSize: 16 }, type: "bigint" },
				],
			},
			{
				id: "c-1",
				type: "connector",
				source: {
					owner: { id: "users" },
					anchor: { kind: "connectPoint", id: "col:1:right" },
				},
				target: {
					owner: { id: "orgs" },
					anchor: { kind: "connectPoint", id: "col:0:left" },
				},
				points: [],
			},
		],
	},
	accepts: [
		{
			name: "accepts an entity with no columns yet",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "",
						columns: [],
					},
				],
			},
		},
		{
			name: "accepts a text written as a styled slot",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: { text: "users", fontColor: "#ff0000" },
						columns: [
							{
								key: { text: "PK", fontSize: 10 },
								name: { text: "id", fontStyle: "italic" },
								type: { text: "bigint", textAlign: "right" },
							},
						],
					},
				],
			},
		},
	],
	rejects: [
		{
			name: "diagnoses a column without a name",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "users",
						columns: [{ key: "PK", type: "int" }],
					},
				],
			},
			diagnosticPaths: ["root[0].columns[0].name"],
		},
		{
			name: "diagnoses a field a column does not have",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "users",
						columns: [{ name: "id", types: "int" }],
					},
				],
			},
			diagnosticPaths: ["root[0].columns[0].types"],
		},
		{
			name: "diagnoses a type width under the minimum",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						typeWidth: 40,
						name: "users",
						columns: [],
					},
				],
			},
			diagnosticPaths: ["root[0].typeWidth"],
		},
		{
			name: "diagnoses a text written in place of name and columns",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "users",
						columns: [],
						text: "users",
					},
				],
			},
			diagnosticPaths: ["root[0].text"],
		},
		{
			name: "diagnoses per-slot typography written at the root",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "users",
						columns: [],
						textAlign: "left",
					},
				],
			},
			diagnosticPaths: ["root[0].textAlign"],
		},
		{
			name: "diagnoses a malformed style on a styled text",
			doc: {
				version: 1,
				root: [
					{
						id: "e-1",
						type: "erEntity",
						x: 0,
						y: 0,
						name: "users",
						columns: [{ name: { text: "id", fontSize: "big" } }],
					},
				],
			},
			diagnosticPaths: ["root[0].columns[0].name.fontSize"],
		},
	],
});

describe("an entity written with a box", () => {
	// The width is the slots summed and the height derived, so a stored one is a
	// name the type does not carry: reported with the warning any unknown key gets
	// and dropped, the entity itself parsing.
	const parsed = createCanvasParser({ plugins: [erDocPlugin] }).parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "e-1",
					type: "erEntity",
					x: 0,
					y: 0,
					width: 220,
					height: 141,
					name: "users",
					columns: [{ key: "PK", name: "id" }],
				},
			],
		}),
	);

	it("parses, says so about the width and the height, and keeps neither", () => {
		expect(parsed.kind).toBe("ok");
		if (parsed.kind !== "ok") {
			return;
		}
		expect(parsed.warnings.map((warning) => warning.path)).toEqual(
			expect.arrayContaining(["root[0].width", "root[0].height"]),
		);
		const entity = parsed.doc.root[0] as Record<string, unknown>;
		expect(entity.height).toBeUndefined();
		expect(entity.width).toBeUndefined();
	});
});

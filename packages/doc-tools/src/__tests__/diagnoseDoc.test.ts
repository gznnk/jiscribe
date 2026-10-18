import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CanvasDoc, ObjectDocDefinition } from "@jiscribe/doc";
import { isMissingBounds } from "@jiscribe/doc";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { afterEach, describe, expect, it, vi } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { validateDoc } from "../validateDoc";

/**
 * Parse a document written out here, failing the test when it does not parse: the
 * checks read a parsed doc, and a hand-built one would skip the very validation
 * that decides what reaches them.
 *
 * @param source - The document, as its file text or as the object it parses to
 * @param label - Named in the failure so a broken document is identified
 */
const parseDoc = (source: string | object, label: string): CanvasDoc => {
	const text = typeof source === "string" ? source : JSON.stringify(source);
	const result = validateDoc(text);
	if (result.doc === undefined) {
		throw new Error(
			`${label} does not parse: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
		);
	}
	return result.doc;
};

const readFixture = (name: string): CanvasDoc =>
	parseDoc(
		readFileSync(
			fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)),
			"utf8",
		),
		name,
	);

afterEach(() => {
	vi.restoreAllMocks();
});

describe("diagnoseDoc", () => {
	it("reports nothing for shapes their text fits in", () => {
		expect(diagnoseDoc(readFixture("fitting.jis.json"))).toEqual([]);
	});

	it("reports the object whose text does not fit, and only that one", () => {
		const diagnostics = diagnoseDoc(readFixture("overflowing.jis.json"));
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({
			severity: "error",
			objectId: "cramped",
		});
		// The message carries the numbers behind the verdict, so a caller reading one
		// line knows how much bigger the box has to be.
		expect(diagnostics[0].message).toMatch(/text overflows rect 60x40/);
	});

	it("checks the children of a group along with the objects at the root", () => {
		const doc = readFixture("overflowing.jis.json");
		const [cramped, roomy] = doc.root;
		const grouped: CanvasDoc = {
			version: 1,
			root: [
				{ id: "group1", type: "group", children: [cramped, roomy] } as never,
			],
		};
		expect(diagnoseDoc(grouped)).toHaveLength(1);
	});

	it("passes over a shape whose label is drawn outside its outline", () => {
		const doc: CanvasDoc = {
			version: 1,
			root: [
				{
					id: "person",
					type: "actor",
					x: 0,
					y: 0,
					width: 40,
					height: 60,
					text: "ずっと長い名前のついた登場人物",
					fontSize: 14,
				} as never,
			],
		};
		expect(diagnoseDoc(doc)).toEqual([]);
	});

	describe("markdown, whose body the shape lays out itself", () => {
		const markdown = (id: string, text: string) =>
			({
				id,
				type: "markdown",
				x: 0,
				y: 0,
				width: 40,
				height: 20,
				text,
			}) as never;

		it("names every markdown object with text in one warning instead of measuring it", () => {
			// Far more text than 40x20 holds as plain text: no overflow error is
			// reported, since plain-text metrics do not describe rendered Markdown.
			const long = `# Heading\n\n${"a line of body copy\n".repeat(30)}`;
			const doc: CanvasDoc = {
				version: 1,
				root: [
					markdown("md-1", long),
					{
						id: "group1",
						type: "group",
						children: [markdown("md-2", "short")],
					} as never,
				],
			};
			const diagnostics = diagnoseDoc(doc);
			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].severity).toBe("warning");
			expect(diagnostics[0].objectId).toBeUndefined();
			expect(diagnostics[0].message).toMatch(
				/^text in markdown md-1, md-2 is not checked for overflow/,
			);
		});

		it("says nothing about a markdown object with no text", () => {
			const doc: CanvasDoc = {
				version: 1,
				root: [markdown("md-1", "")],
			};
			expect(diagnoseDoc(doc)).toEqual([]);
		});
	});

	describe("connector labels", () => {
		/** The fitting fixture with the two shapes moved to leave `gap` between them. */
		const docWithGap = (gap: number): CanvasDoc => {
			const doc = readFixture("labelFitting.jis.json");
			const [source, target] = doc.root as (CanvasDoc["root"][number] & {
				x: number;
				width: number;
			})[];
			target.x = source.x + source.width + gap;
			return doc;
		};

		it("warns when the label is wider than the space between the shapes", () => {
			const diagnostics = diagnoseDoc(readFixture("labelOverflowing.jis.json"));
			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]).toMatchObject({
				severity: "warning",
				objectId: "o2",
			});
			// Both numbers behind the verdict, so a caller reading one line knows how
			// much further apart the shapes have to be.
			expect(diagnostics[0].message).toMatch(
				/label "マイクロタスクが尽きる" is 142\.5px wide but only 120px is free between s2 and s3/,
			);
		});

		it("reports nothing when the label fits between the shapes", () => {
			expect(diagnoseDoc(readFixture("labelFitting.jis.json"))).toEqual([]);
		});

		it("reports nothing for a label exactly as wide as the gap", () => {
			expect(diagnoseDoc(docWithGap(142.5))).toEqual([]);
			expect(diagnoseDoc(docWithGap(142))).toHaveLength(1);
		});

		it("passes over shapes that do not stand across from each other", () => {
			// Moved down past the source's bottom edge: neither axis overlaps, so the
			// connector is routed as an elbow and no single gap describes its run.
			const doc = docWithGap(120);
			const target = doc.root[1] as CanvasDoc["root"][number] & { y: number };
			target.y = 600;
			expect(diagnoseDoc(doc)).toEqual([]);
		});

		it("passes over a connector whose route the author stored", () => {
			const doc = docWithGap(120);
			const connector = doc.root[2] as CanvasDoc["root"][number] & {
				points: unknown[];
			};
			connector.points = [{ x: 760, y: 200 }];
			expect(diagnoseDoc(doc)).toEqual([]);
		});

		it("passes over a connector with an endpoint attached to nothing", () => {
			const doc = docWithGap(120);
			const connector = doc.root[2] as CanvasDoc["root"][number] & {
				target: unknown;
			};
			connector.target = {
				anchor: { kind: "free", point: { x: 900, y: 308 } },
			};
			expect(diagnoseDoc(doc)).toEqual([]);
		});

		it("passes over a label pushed off the path by an offset", () => {
			const doc = docWithGap(120);
			const connector = doc.root[2] as CanvasDoc["root"][number] & {
				label: { offset?: number };
			};
			connector.label.offset = -40;
			expect(diagnoseDoc(doc)).toEqual([]);
		});
	});

	describe("text styling a type declares", () => {
		/**
		 * A sticky holding six full-width characters, whose type declares
		 * `fontSize: 14` (STICKY_DOC_DEFAULTS): they wrap to one line at 14 and to
		 * two at the canvas-wide 16, which is more than the 40px box holds.
		 */
		const stickyDoc = (fontSize?: number): CanvasDoc => ({
			version: 1,
			root: [
				{
					id: "s1",
					type: "sticky",
					x: 0,
					y: 0,
					width: 100,
					height: 40,
					text: "あいうえおか",
					...(fontSize === undefined ? undefined : { fontSize }),
				} as never,
			],
		});

		it("measures a body at the type's own size where the document sets none", () => {
			expect(diagnoseDoc(stickyDoc())).toEqual([]);
		});

		it("measures a body at the size the document sets over its type's", () => {
			const diagnostics = diagnoseDoc(stickyDoc(16));
			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].message).toMatch(
				/text overflows sticky 100x40: 2 line\(s\) need 48px .*font 16px/,
			);
		});

		/**
		 * A note placed on its whole height, whose type declares
		 * `verticalAlign: "top"` (NOTE_DOC_DEFAULTS): the block is 72px tall, so a
		 * top-placed one reaches 8px past the region — past the tolerance — while a
		 * centred one splits the same excess between the two edges and stays inside.
		 */
		const noteDoc = (verticalAlign?: string): CanvasDoc => ({
			version: 1,
			root: [
				{
					id: "n1",
					type: "note",
					x: 0,
					y: 0,
					width: 120,
					height: 66,
					text: "あいうえおかきくけこさしすせそ",
					textVerticalBasis: "frame",
					...(verticalAlign === undefined ? undefined : { verticalAlign }),
				} as never,
			],
		});

		it("places a body where its type declares where the document sets no verticalAlign", () => {
			const overlap = diagnoseDoc(noteDoc()).filter(
				(diagnostic) => diagnostic.severity === "warning",
			);
			expect(overlap).toHaveLength(1);
			expect(overlap[0].message).toMatch(/reaches 8px past the region/);
		});

		it("places a body where the document says over where its type does", () => {
			expect(
				diagnoseDoc(noteDoc("middle")).every(
					(diagnostic) => diagnostic.severity === "error",
				),
			).toBe(true);
		});
	});

	it("warns rather than passes over a text-bearing type that declares no region", () => {
		// Unreachable with the shipped set — every `text: "body"` type declares one
		// — so the gap is staged here, which is what the warning is a guard against.
		const rect = standardObjectDocDefinitions.get(
			"rect",
		) as ObjectDocDefinition;
		vi.spyOn(standardObjectDocDefinitions, "get").mockImplementation((type) =>
			type === "rect" ? { ...rect, textRegion: undefined } : undefined,
		);

		const diagnostics = diagnoseDoc(readFixture("overflowing.jis.json"));
		expect(diagnostics.every((one) => one.severity === "warning")).toBe(true);
		expect(diagnostics[0].message).toMatch(/rect declares no text region/);
	});

	describe("a point-geometry type that declares no box", () => {
		/** A document holding one text, the shipped type whose doc stores no size. */
		const textDoc = (): CanvasDoc =>
			parseDoc(
				{
					version: 1,
					root: [{ id: "label", type: "text", x: 0, y: 0, text: "hi" }],
				},
				"the one-text doc",
			);

		it("is warned about rather than passed over", () => {
			// Unreachable with the shipped set (see the case below), so the gap is
			// staged here — which is what the warning is a guard against.
			const text = standardObjectDocDefinitions.get(
				"text",
			) as ObjectDocDefinition;
			vi.spyOn(standardObjectDocDefinitions, "get").mockImplementation(
				(type) =>
					type === "text" ? { ...text, bounds: undefined } : undefined,
			);

			const diagnostics = diagnoseDoc(textDoc());

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0]).toMatchObject({
				severity: "warning",
				objectId: "label",
			});
			expect(diagnostics[0].message).toMatch(/text stores no size/);
		});

		it("is not in the shipped set: every point type declares its own box", () => {
			const undeclared = [...standardObjectDocDefinitions]
				.filter(([, definition]) => isMissingBounds(definition))
				.map(([type]) => type);

			expect(undeclared).toEqual([]);
			expect(diagnoseDoc(textDoc())).toEqual([]);
		});
	});

	it("reports what any type's declared overflow check returns, as errors on the object", () => {
		// No shipped type but the record declares one, so the check is staged on a
		// type that otherwise has nothing to report.
		const rect = standardObjectDocDefinitions.get(
			"rect",
		) as ObjectDocDefinition;
		const diagnoseOverflow = vi.fn(() => ["first overflow", "second overflow"]);
		vi.spyOn(standardObjectDocDefinitions, "get").mockImplementation((type) =>
			type === "rect" ? { ...rect, diagnoseOverflow } : undefined,
		);

		const doc = parseDoc(
			{
				version: 1,
				root: [{ id: "box", type: "rect", x: 0, y: 0, width: 80, height: 40 }],
			},
			"the one-rect doc",
		);
		expect(diagnoseDoc(doc)).toEqual([
			{ severity: "error", objectId: "box", message: "first overflow" },
			{ severity: "error", objectId: "box", message: "second overflow" },
		]);
		expect(diagnoseOverflow).toHaveBeenCalledWith(
			expect.objectContaining({ id: "box", width: 80, height: 40 }),
		);
	});

	describe("a record too short for its compartments", () => {
		/**
		 * A record titled "User" over the given attribute rows. A band is one 14px
		 * line box (21px) plus 7px of padding, and a compartment its rows' line
		 * boxes — at least one — plus 4px, so three rows need 28 + 67 = 95px.
		 */
		const recordDoc = (height: number, attributes: string[]): CanvasDoc =>
			parseDoc(
				{
					version: 1,
					root: [
						{
							id: "user",
							type: "record",
							x: 0,
							y: 0,
							width: 180,
							height,
							text: {
								name: { text: "User" },
								attributes: { text: attributes },
							},
						},
					],
				},
				"record",
			);
		const threeRows = ["- id: string", "- name: string", "- email: string"];

		it("reports nothing for a record exactly as tall as its rows need", () => {
			expect(diagnoseDoc(recordDoc(95, threeRows))).toEqual([]);
		});

		it("reports the shortfall and the two ways to fix it", () => {
			const diagnostics = diagnoseDoc(recordDoc(60, threeRows));
			expect(diagnostics).toEqual([
				{
					severity: "error",
					objectId: "user",
					message:
						"rows overflow record 180x60: its compartments need 95px but the box is 60px tall, 35px short, so the bottom rows are drawn past its edge; record_set_compartments refits the height to them, or resize_object it to height 95",
				},
			]);
		});

		it("counts an empty compartment as one row's worth", () => {
			expect(diagnoseDoc(recordDoc(53, []))).toEqual([]);
			expect(diagnoseDoc(recordDoc(40, []))).toMatchObject([
				{ severity: "error", objectId: "user" },
			]);
		});

		it("passes over a record taller than its rows need", () => {
			expect(diagnoseDoc(recordDoc(300, threeRows))).toEqual([]);
		});
	});
});

describe("diagnoseDoc on an erEntity", () => {
	/**
	 * An entity whose stated name and type widths are far narrower than its texts:
	 * the shape widens a slot to its text on its own, so nothing is drawn past an
	 * edge however short the stated widths are.
	 */
	const crampedEntity = {
		id: "users",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 24,
		typeWidth: 60,
		name: { text: "a_rather_long_entity_name", fontSize: 28 },
		columns: [
			{ key: "PK", name: "id", type: "bigint" },
			{
				key: "FK",
				name: "a_rather_long_column_name_for_the_slot",
				type: "varchar(255) not null default 'unknown'",
			},
			{ name: { text: "email", fontSize: 24 }, type: "text" },
		],
	};

	it("reports no overflow for texts wider than the stated slot widths", () => {
		const doc = parseDoc({ version: 1, root: [crampedEntity] }, "entity");

		expect(diagnoseDoc(doc)).toEqual([]);
	});

	it("leaves typography written at the root to the validation, as an error on the field", () => {
		const result = validateDoc(
			JSON.stringify({
				version: 1,
				root: [{ ...crampedEntity, fontSize: 18 }],
			}),
		);

		expect(
			result.diagnostics
				.filter((diagnostic) => diagnostic.severity === "error")
				.map((diagnostic) => diagnostic.path),
		).toEqual(["root[0].fontSize"]);
		expect(result.doc).toBeUndefined();
	});
});

describe("diagnoseDoc on connector ends naming connect points", () => {
	const entity = {
		id: "users",
		type: "erEntity",
		x: 0,
		y: 0,
		name: "users",
		columns: [
			{ key: "PK", name: "id", type: "bigint" },
			{ name: "email", type: "text" },
		],
	};
	const box = { id: "box", type: "rect", x: 400, y: 0, width: 120, height: 80 };
	/** A connector from `sourceId`'s `sourcePointId` to the box's left edge. */
	const connectorFrom = (
		id: string,
		sourceId: string,
		sourcePointId: string,
	) => ({
		id,
		type: "connector",
		source: {
			owner: { id: sourceId },
			anchor: { kind: "connectPoint", id: sourcePointId },
		},
		target: {
			owner: { id: "box" },
			anchor: { kind: "connectPoint", id: "leftCenter" },
		},
		points: [],
	});

	it("passes over ends on edge midpoints and on the points the owner's type declares", () => {
		const doc = parseDoc(
			{
				version: 1,
				root: [
					entity,
					box,
					connectorFrom("toColumn", "users", "col:1:right"),
					connectorFrom("toEdge", "users", "bottomCenter"),
				],
			},
			"declared points",
		);

		expect(diagnoseDoc(doc)).toEqual([]);
	});

	it("warns about an end on a point the owner no longer offers, which is drawn at its center", () => {
		const doc = parseDoc(
			{
				version: 1,
				root: [
					entity,
					box,
					connectorFrom("toGoneColumn", "users", "col:2:right"),
					connectorFrom("toRectColumn", "box", "col:0:left"),
				],
			},
			"undeclared points",
		);

		expect(diagnoseDoc(doc)).toEqual([
			{
				severity: "warning",
				objectId: "toGoneColumn",
				message:
					'the source end names connect point "col:2:right", which users (erEntity) does not offer, so it is drawn at the center of users: the part of users it belonged to is gone (on an erEntity, a column deleted since); re-anchor it with update_connector',
			},
			{
				severity: "warning",
				objectId: "toRectColumn",
				message:
					'the source end names connect point "col:0:left", which box (rect) does not offer, so it is drawn at the center of box: rect offers only topCenter, rightCenter, bottomCenter, leftCenter; re-anchor it with update_connector',
			},
		]);
	});
});

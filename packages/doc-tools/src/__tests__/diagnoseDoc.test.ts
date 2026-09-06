import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { CanvasDoc, ObjectDocDefinition } from "@jiscribe/doc";
import { standardObjectDocDefinitions } from "@jiscribe/standard-shapes/doc";
import { afterEach, describe, expect, it, vi } from "vitest";

import { diagnoseDoc } from "../diagnoseDoc";
import { validateDoc } from "../validateDoc";

const readFixture = (name: string): CanvasDoc => {
	const path = fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
	const result = validateDoc(readFileSync(path, "utf8"));
	if (result.doc === undefined) {
		throw new Error(
			`${name} does not parse: ${result.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
		);
	}
	return result.doc;
};

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
});

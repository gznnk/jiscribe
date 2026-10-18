import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";
import { erDocPlugin } from "@jiscribe/plugin-er-shapes/doc";
import { beforeAll, describe, expect, it } from "vitest";

import type { AiDocOp } from "../../canvasOps";
import { createCanvasToolSet } from "../../canvasToolSet";
import { applyCanvasOp } from "../applyCanvasOp";
import { createCanvasOpHistory } from "../canvasOpHistory";
import type { AiDocBridge } from "../docBridge";

const docOps = createDocOps({ plugins: [erDocPlugin] });

/** The built-in tools alone; an entity is written through add_object and extraProps, never a plugin tool */
const builtinToolSet = createCanvasToolSet(null, []);

// An entity's height is laid out from its texts; a proportional answer is enough
// for ops that only read the width.
beforeAll(() => {
	offerTextMeasurement(createEstimateTextMeasurement());
});

/** A docBridge holding one document, applying ops the way a host does. */
const createFakeDocBridge = () => {
	let doc: CanvasDoc = { version: 1, root: [] };
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	return {
		currentDoc: () => doc,
		apply: (op: AiDocOp) =>
			applyCanvasOp(op, bridge, history, docOps, builtinToolSet),
	};
};

const entityColumns = [
	{ key: "PK", name: "id", type: "bigint" },
	{ name: "email", type: "varchar(255)" },
];

/** The one entity in the document, as stored. */
const readEntity = (doc: CanvasDoc): Record<string, unknown> =>
	doc.root[0] as unknown as Record<string, unknown>;

/** The entity's box width as the doc ops measure it: its three slot widths summed. */
const readEntityWidth = (doc: CanvasDoc): number => {
	const bounds = docOps.getObjectBounds(doc, String(readEntity(doc).id));
	if (bounds === null) {
		throw new Error("the entity has no bounds");
	}
	return bounds.width;
};

describe("erEntity through the AI ops", () => {
	it.each([
		{ label: "a width", size: { width: 300 } },
		{ label: "a height", size: { height: 140 } },
		{ label: "both", size: { width: 220, height: 140 } },
	])(
		"refuses $label on creation the way a table does, its box being its content",
		({ size }) => {
			const fake = createFakeDocBridge();
			const result = fake.apply({
				kind: "addObject",
				type: "erEntity",
				x: 0,
				y: 0,
				...size,
				extraProps: { name: "users", columns: entityColumns },
			});

			expect(result.ok).toBe(false);
			expect(result.text).toContain(
				'object type "erEntity" sizes itself from its content and takes no width/height',
			);
			expect(fake.currentDoc().root).toHaveLength(0);
		},
	);

	it("is created at the slot widths extraProps names", () => {
		const fake = createFakeDocBridge();
		const result = fake.apply({
			kind: "addObject",
			type: "erEntity",
			x: 40,
			y: 60,
			extraProps: {
				name: "users",
				columns: entityColumns,
				nameWidth: 140,
				typeWidth: 160,
			},
		});

		expect(result.ok).toBe(true);
		const entity = readEntity(fake.currentDoc());
		expect(entity).toMatchObject({
			x: 40,
			y: 60,
			nameWidth: 140,
			typeWidth: 160,
		});
		expect(entity).not.toHaveProperty("width");
		expect(entity).not.toHaveProperty("height");
		expect(readEntityWidth(fake.currentDoc())).toBeGreaterThanOrEqual(300);
	});

	it.each([
		{ label: "a width", size: { width: 400 } },
		{ label: "a height", size: { height: 200 } },
	])(
		"refuses a resize to $label, leaving the slot widths as they were",
		({ size }) => {
			const fake = createFakeDocBridge();
			fake.apply({
				kind: "addObject",
				type: "erEntity",
				x: 0,
				y: 0,
				extraProps: {
					name: "users",
					columns: entityColumns,
					nameWidth: 120,
					typeWidth: 120,
				},
			});

			const refused = fake.apply({
				kind: "resizeObject",
				id: "erEntity-1",
				...size,
			});

			expect(refused.ok).toBe(false);
			expect(refused.text).toContain("has no size of its own to set");
			const entity = readEntity(fake.currentDoc());
			expect(entity).toMatchObject({ nameWidth: 120, typeWidth: 120 });
			expect(entity).not.toHaveProperty("width");
			expect(entity).not.toHaveProperty("height");
		},
	);

	it("takes new slot widths and new columns through set_extra_props, but no box width", () => {
		const fake = createFakeDocBridge();
		fake.apply({
			kind: "addObject",
			type: "erEntity",
			x: 0,
			y: 0,
			extraProps: { name: "users", columns: entityColumns },
		});

		const result = fake.apply({
			kind: "setExtraProps",
			id: "erEntity-1",
			extraProps: {
				nameWidth: 140,
				columns: [{ key: "PK", name: "user_id" }],
			},
		});
		expect(result.ok).toBe(true);
		expect(readEntity(fake.currentDoc())).toMatchObject({
			nameWidth: 140,
			columns: [{ key: "PK", name: "user_id" }],
		});

		expect(
			fake.apply({
				kind: "setExtraProps",
				id: "erEntity-1",
				extraProps: { width: 240 },
			}).ok,
		).toBe(false);
	});

	it.each([
		{ label: "a null column", columns: [null] },
		{ label: "a column whose name is a number", columns: [{ name: 5 }] },
	])(
		"refuses malformed columns ($label) with the type's own message, not an internal error",
		({ columns }) => {
			const fake = createFakeDocBridge();
			const result = fake.apply({
				kind: "addObject",
				type: "erEntity",
				x: 0,
				y: 0,
				extraProps: { name: "users", columns },
			});

			expect(result.ok).toBe(false);
			expect(result.text).toContain('cannot create "erEntity"');
			expect(result.text).not.toContain("internal error");
			expect(fake.currentDoc().root).toHaveLength(0);
		},
	);

	// Known gap (private #327): set_style styles a slots type's texts under `text`,
	// and an entity keeps its texts in `name` / `columns`, so the typography lands
	// nowhere and is reported back. Pinned so a fix (or a regression to writing it
	// at the root) is noticed.
	it("reports set_style typography as ignored, writing it nowhere", () => {
		const fake = createFakeDocBridge();
		fake.apply({
			kind: "addObject",
			type: "erEntity",
			x: 0,
			y: 0,
			extraProps: { name: "users", columns: entityColumns },
		});
		const before = structuredClone(readEntity(fake.currentDoc()));

		const result = fake.apply({
			kind: "setStyle",
			ids: ["erEntity-1"],
			style: { fontSize: 22, fontColor: "#ff0000" },
		});

		expect(result.text).toContain("not supported");
		expect(result.text).toContain("fontSize");
		expect(result.text).toContain("fontColor");
		expect(readEntity(fake.currentDoc())).toEqual(before);
	});

	it("refuses add_object typography, which a new entity has no place for", () => {
		const fake = createFakeDocBridge();
		const result = fake.apply({
			kind: "addObject",
			type: "erEntity",
			x: 0,
			y: 0,
			fontSize: 18,
			extraProps: { name: "users", columns: entityColumns },
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain('"fontSize"');
		expect(fake.currentDoc().root).toHaveLength(0);
	});
});

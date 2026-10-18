import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import {
	createEstimateTextMeasurement,
	offerTextMeasurement,
} from "@jiscribe/doc/unstable";
import { erDocPlugin } from "@jiscribe/plugin-er-shapes/doc";
import { erAiToolPlugin } from "@jiscribe/plugin-er-shapes/tools";
import { beforeAll, describe, expect, it } from "vitest";

import type { AiDocOp } from "../../canvasOps";
import { createCanvasToolSet, type CanvasToolSet } from "../../canvasToolSet";
import { toCanvasCapabilities } from "../../capabilities";
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

/** The built-ins plus the entity's own tools, the way the shipped hosts offer them */
const erToolSet = createCanvasToolSet(toCanvasCapabilities([erDocPlugin]), [
	erAiToolPlugin,
]);

/** The entity's own tools as the pointers name them, in tool-set order */
const erToolNames = erAiToolPlugin.tools.map((tool) => tool.name);

/** A docBridge holding one document, applying ops the way a host does. */
const createFakeDocBridge = (toolSet: CanvasToolSet = builtinToolSet) => {
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
		apply: (op: AiDocOp) => applyCanvasOp(op, bridge, history, docOps, toolSet),
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

describe("an erEntity's own tools, as the generic ops point at them", () => {
	/** A fake holding one entity "erEntity-1" and one rect "rect-1". */
	const createEntityDoc = (toolSet: CanvasToolSet) => {
		const fake = createFakeDocBridge(toolSet);
		fake.apply({
			kind: "addObject",
			type: "erEntity",
			x: 0,
			y: 0,
			extraProps: { name: "users", columns: entityColumns },
		});
		fake.apply({ kind: "addObject", type: "rect", x: 400, y: 0 });
		return fake;
	};

	/** The pointer the entity's refusals end in */
	const erPointer = `erEntity has tools of its own for what the generic ops do not reach: ${erToolNames.join(", ")}`;

	it("lists them under tools on the entity's list_types entry, and on no type without any", () => {
		const result = createFakeDocBridge(erToolSet).apply({ kind: "listTypes" });

		const typeSummaries = JSON.parse(
			result.text.slice(result.text.indexOf("\n") + 1),
		) as { type: string; tools?: string[] }[];
		expect(
			typeSummaries.find((summary) => summary.type === "erEntity")?.tools,
		).toEqual(erToolNames);
		expect(
			typeSummaries.filter((summary) => summary.tools !== undefined),
		).toHaveLength(1);
	});

	it.each([
		{ label: "get_text", op: { kind: "getText", id: "erEntity-1" } },
		{
			label: "set_text",
			op: { kind: "setText", id: "erEntity-1", text: "accounts" },
		},
		{
			label: "set_texts",
			op: { kind: "setTexts", entries: [{ id: "erEntity-1", text: "x" }] },
		},
		{
			label: "set_text_style",
			op: {
				kind: "setTextStyle",
				id: "erEntity-1",
				match: "users",
				fontWeight: "bold",
			},
		},
		{
			label: "set_text_styles",
			op: {
				kind: "setTextStyles",
				entries: [{ id: "erEntity-1", match: "users", fontWeight: "bold" }],
			},
		},
	] satisfies { label: string; op: AiDocOp }[])(
		"ends a $label refusal with a pointer to them",
		({ op }) => {
			const result = createEntityDoc(erToolSet).apply(op);

			expect(result.ok).toBe(false);
			expect(result.text).toContain(
				"this type keeps its texts in fields of its own, which the text ops do not reach",
			);
			expect(result.text.endsWith(`; ${erPointer}`)).toBe(true);
		},
	);

	it("adds nothing to the refusal when the set offers the type no tools", () => {
		const result = createEntityDoc(builtinToolSet).apply({
			kind: "getText",
			id: "erEntity-1",
		});

		expect(result).toEqual({
			ok: false,
			text: 'erEntity-1 ("erEntity") holds no text under `text` to be read: this type keeps its texts in fields of its own, which the text ops do not reach',
		});
	});

	it("points set_style's ignored note at them once, and at nothing for a type without any", () => {
		const fake = createEntityDoc(erToolSet);
		fake.apply({
			kind: "addObject",
			type: "erEntity",
			x: 0,
			y: 300,
			extraProps: { name: "orders", columns: entityColumns },
		});

		const result = fake.apply({
			kind: "setStyle",
			ids: ["erEntity-1", "rect-1", "erEntity-2"],
			style: { fontWeight: "bold" },
		});

		expect(result).toEqual({
			ok: true,
			text: `styled "rect-1" (not supported by their type: "erEntity-1" fontWeight; "erEntity-2" fontWeight; ${erPointer})`,
		});
	});

	it("leaves set_style's ignored note as it was when the set offers the type no tools", () => {
		const result = createEntityDoc(builtinToolSet).apply({
			kind: "setStyle",
			ids: ["erEntity-1"],
			style: { fontWeight: "bold" },
		});

		expect(result.text).toBe(
			'nothing to style: none of "erEntity-1" takes these properties (not supported by their type: "erEntity-1" fontWeight)',
		);
	});
});

describe("connecting to an erEntity's column points", () => {
	/** Two two-column entities, `erEntity-1` and `erEntity-2`. */
	const twoEntities = () => {
		const fake = createFakeDocBridge();
		for (const [name, x] of [
			["users", 0],
			["orders", 400],
		] as const) {
			fake.apply({
				kind: "addObject",
				type: "erEntity",
				x,
				y: 0,
				extraProps: { name, columns: entityColumns },
			});
		}
		return fake;
	};
	const readEnds = (doc: CanvasDoc) =>
		doc.root
			.filter((object) => object.type === "connector")
			.map((object) => {
				const { source, target } = object as unknown as Record<
					string,
					{ anchor: unknown }
				>;
				return [source.anchor, target.anchor];
			});

	it("attaches the ends to the columns the anchor strings name", () => {
		const fake = twoEntities();

		const result = fake.apply({
			kind: "connect",
			sourceId: "erEntity-2",
			targetId: "erEntity-1",
			sourceAnchor: "col:1:left",
			targetAnchor: "col:0:right",
		});

		expect(result.ok).toBe(true);
		expect(readEnds(fake.currentDoc())).toEqual([
			[
				{ kind: "connectPoint", id: "col:1:left" },
				{ kind: "connectPoint", id: "col:0:right" },
			],
		]);
	});

	it("refuses a column the entity does not have, writing nothing", () => {
		const fake = twoEntities();
		const before = structuredClone(fake.currentDoc());

		const result = fake.apply({
			kind: "connect",
			sourceId: "erEntity-2",
			targetId: "erEntity-1",
			sourceAnchor: "col:2:left",
		});

		expect(result.ok).toBe(false);
		expect(result.text).toContain(
			'"col:2:left" is not a connect point of "erEntity-2" (erEntity); it offers topCenter, rightCenter, bottomCenter, leftCenter and the 4 its type declares: col:0:left, col:0:right, col:1:left, col:1:right',
		);
		expect(fake.currentDoc()).toEqual(before);
	});
});

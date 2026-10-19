// The entity's tools run the way a host runs them: declared and resolved by
// createCanvasToolSet, their arguments parsed by the declared schema, and applied
// by applyCanvasOp, whose write goes through docOps.replaceObject — so every
// result below has also passed the entity's validateDoc and the unknown-key check.
// The connect point remap a write hands back is checked on the tool's own `apply`,
// the host's rewrite of the connectors being the host's to test.

import {
	createCanvasToolSet,
	isAiDocOp,
	toCanvasCapabilities,
	type AiCanvasOpOutcome,
	type CanvasToolArgs,
} from "@jiscribe/ai-tools";
import {
	applyCanvasOp,
	createCanvasOpHistory,
	type AiDocBridge,
} from "@jiscribe/ai-tools/apply";
import type { ObjectAiToolDefinition } from "@jiscribe/canvas-sdk/tools";
import { createDocOps, type CanvasDoc } from "@jiscribe/doc";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { erDocPlugin } from "../../doc";
import type { ErEntityDoc } from "../../schema/ErEntityDoc";
import { erAiToolPlugin } from "../../tools";

const docOps = createDocOps({ plugins: [erDocPlugin] });
const toolSet = createCanvasToolSet(toCanvasCapabilities([erDocPlugin]), [
	erAiToolPlugin,
]);

/** Three columns, the second's name styled, so a renumbering or a dropped style is visible */
const makeEntityDoc = (): ErEntityDoc =>
	({
		id: "e1",
		type: "erEntity",
		x: 0,
		y: 0,
		nameWidth: 96,
		typeWidth: 104,
		name: "users",
		columns: [
			{ key: "PK", name: "id", type: "bigint" },
			{ name: { text: "email", fontWeight: "bold" }, type: "text" },
			{ key: "FK", name: "org_id", type: "bigint" },
		],
	}) as ErEntityDoc;

/** A document holding the entity, and a call that goes the whole way a host's does */
const setUp = () => {
	let doc: CanvasDoc = {
		version: 1,
		root: [makeEntityDoc(), { id: "box", type: "rect", x: 300, y: 0 }],
	} as CanvasDoc;
	const bridge: AiDocBridge = {
		getDoc: () => doc,
		replaceDoc: (nextDoc) => {
			doc = nextDoc;
		},
	};
	const history = createCanvasOpHistory();
	const callTool = (name: string, args: CanvasToolArgs): AiCanvasOpOutcome => {
		const descriptor = toolSet.descriptors.find(
			(candidate) => candidate.name === name,
		);
		if (descriptor === undefined) {
			throw new Error(`tool ${name} is not declared`);
		}
		const parsedArgs = z.object(descriptor.inputSchema).strict().parse(args);
		const op = descriptor.toOp(parsedArgs);
		if (!isAiDocOp(op)) {
			throw new Error(`tool ${name} did not build a document op`);
		}
		return applyCanvasOp(op, bridge, history, docOps, toolSet);
	};
	const readEntity = (): ErEntityDoc =>
		docOps.getObject(doc, "e1") as Readonly<ErEntityDoc>;
	return {
		callTool,
		readEntity,
		currentDoc: () => doc,
		undo: () =>
			applyCanvasOp({ kind: "undo" }, bridge, history, docOps, toolSet),
	};
};

/** One tool's own `apply`, called on the entity as the host would after parsing. */
const applyTool = (name: string, args: Record<string, unknown>) => {
	const tool: ObjectAiToolDefinition | undefined = erAiToolPlugin.tools.find(
		(candidate) => candidate.name === name,
	);
	if (tool?.apply === undefined) {
		throw new Error(`${name} is not a writing tool`);
	}
	return tool.apply(makeEntityDoc(), args);
};

describe("the entity's tool bundle", () => {
	it("declares its six tools, each taking the target id", () => {
		const entityToolNames = toolSet.descriptors
			.map((descriptor) => descriptor.name)
			.filter((name) => name.startsWith("er_entity_"));

		expect(entityToolNames).toEqual([
			"er_entity_read",
			"er_entity_insert_columns",
			"er_entity_delete_columns",
			"er_entity_move_columns",
			"er_entity_set_texts",
			"er_entity_set_text_style",
		]);
	});

	it("refuses an object that is not an entity", () => {
		const { callTool } = setUp();

		expect(callTool("er_entity_read", { id: "box" })).toEqual({
			ok: false,
			text: 'er_entity_read acts on erEntity objects only, but "box" is of type rect',
		});
	});
});

describe("er_entity_read", () => {
	it("lists the title, the slot widths and every column, a styled text with what it sets", () => {
		const { callTool, currentDoc } = setUp();
		const before = structuredClone(currentDoc());

		const outcome = callTool("er_entity_read", { id: "e1" });

		expect(outcome.ok).toBe(true);
		const lines = outcome.text.split("\n");
		expect(lines[0]).toBe('erEntity "e1": title users');
		expect(lines[1]).toMatch(
			/^slot widths in px \(stated, drawn\): keyWidth unset \(widest key\), drawn \d+; nameWidth 96, drawn \d+; typeWidth 104, drawn \d+; box \d+ x 103$/,
		);
		expect(lines.slice(2, 6)).toEqual([
			"3 columns (0-2), each key | name | type:",
			"col 0: PK | id | bigint",
			"col 1: (no key) | email {fontWeight=bold} | text",
			"col 2: FK | org_id | bigint",
		]);
		expect(lines[6]).toContain('"col:<index>:left" or "col:<index>:right"');
		expect(currentDoc()).toEqual(before);
	});

	it("notes a text held as styled runs", () => {
		const entity = makeEntityDoc();
		entity.columns[0].name = [{ text: "i" }, { text: "d", fontWeight: "bold" }];
		const readTool = erAiToolPlugin.tools[0];

		expect(readTool.read?.(entity, {})).toContain(
			"col 0: PK | id {styled runs} | bigint",
		);
	});
});

describe("er_entity_insert_columns", () => {
	it("inserts plain columns at a position, an empty key or type left out", () => {
		const { callTool, readEntity } = setUp();

		const outcome = callTool("er_entity_insert_columns", {
			id: "e1",
			at: 1,
			columns: [
				{ key: "UK", name: "handle", type: "text" },
				{ key: "", name: "bio" },
			],
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'inserted 2 columns into erEntity "e1" (now columns 1-2); it has 5 columns: 0 id [PK], 1 handle [UK], 2 bio, 3 email, 4 org_id [FK]',
		});
		expect(readEntity().columns.slice(1, 4)).toEqual([
			{ key: "UK", name: "handle", type: "text" },
			{ name: "bio" },
			{ name: { text: "email", fontWeight: "bold" }, type: "text" },
		]);
	});

	it("appends when at is omitted, moving no connect point", () => {
		const change = applyTool("er_entity_insert_columns", {
			columns: [{ name: "created_at" }],
		});

		expect(change.doc).toMatchObject({
			columns: [{}, {}, {}, { name: "created_at" }],
		});
		expect(change.connectPointRemap).toBeUndefined();
	});

	it("hands back the points of the columns it moved down", () => {
		const change = applyTool("er_entity_insert_columns", {
			at: 2,
			columns: [{ name: "a" }, { name: "b" }],
		});

		expect(change.connectPointRemap).toEqual({
			"col:2:left": { kind: "connectPoint", id: "col:4:left" },
			"col:2:right": { kind: "connectPoint", id: "col:4:right" },
		});
	});

	it("refuses a position past the end and a newline", () => {
		const { callTool } = setUp();

		expect(
			callTool("er_entity_insert_columns", {
				id: "e1",
				at: 4,
				columns: [{ name: "x" }],
			}),
		).toEqual({
			ok: false,
			text: 'at 4 is past the end: entity "e1" has 3 columns, so columns can be inserted at 0 to 3',
		});
		expect(
			callTool("er_entity_insert_columns", {
				id: "e1",
				columns: [{ name: "x" }, { name: "a\nb" }],
			}),
		).toEqual({
			ok: false,
			text: "columns[1].name contains a newline: an entity's texts are one line each",
		});
	});

	it("is taken back by undo", () => {
		const { callTool, readEntity, undo } = setUp();
		const before = structuredClone(readEntity());

		callTool("er_entity_insert_columns", {
			id: "e1",
			at: 0,
			columns: [{ name: "x" }],
		});

		expect(undo().ok).toBe(true);
		expect(readEntity()).toEqual(before);
	});
});

describe("er_entity_delete_columns", () => {
	it("deletes a run of columns, the rest moving up", () => {
		const { callTool, readEntity } = setUp();

		const outcome = callTool("er_entity_delete_columns", {
			id: "e1",
			column: 0,
			count: 2,
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'deleted columns 0-1 (id, email) from erEntity "e1"; it has 1 column: 0 org_id [FK]',
		});
		expect(readEntity().columns).toEqual([
			{ key: "FK", name: "org_id", type: "bigint" },
		]);
	});

	it("sends a deleted column's points to the edge and moves the later ones up", () => {
		const change = applyTool("er_entity_delete_columns", { column: 1 });

		expect(change.connectPointRemap).toEqual({
			"col:1:left": { kind: "edge", side: "left", t: 0.8397 },
			"col:1:right": { kind: "edge", side: "right", t: 0.8397 },
			"col:2:left": { kind: "connectPoint", id: "col:1:left" },
			"col:2:right": { kind: "connectPoint", id: "col:1:right" },
		});
	});

	it("refuses a run reaching past the end", () => {
		const { callTool } = setUp();

		expect(
			callTool("er_entity_delete_columns", { id: "e1", column: 2, count: 2 }),
		).toEqual({
			ok: false,
			text: 'columns 2-3 would reach past the end: entity "e1" has 3 columns (0-2)',
		});
	});
});

describe("er_entity_move_columns", () => {
	it("moves a column to the top, the ones above shifting down", () => {
		const { callTool, readEntity } = setUp();

		const outcome = callTool("er_entity_move_columns", {
			id: "e1",
			column: 2,
			to: 0,
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'moved column 2 of erEntity "e1" to column 0; it has 3 columns: 0 org_id [FK], 1 id [PK], 2 email',
		});
		expect(readEntity().columns.map((column) => column.type)).toEqual([
			"bigint",
			"bigint",
			"text",
		]);
	});

	it("hands back every column that moved, the run and the shifted ones", () => {
		const change = applyTool("er_entity_move_columns", {
			column: 0,
			count: 2,
			to: 1,
		});

		expect(change.connectPointRemap).toEqual({
			"col:0:left": { kind: "connectPoint", id: "col:1:left" },
			"col:0:right": { kind: "connectPoint", id: "col:1:right" },
			"col:1:left": { kind: "connectPoint", id: "col:2:left" },
			"col:1:right": { kind: "connectPoint", id: "col:2:right" },
			"col:2:left": { kind: "connectPoint", id: "col:0:left" },
			"col:2:right": { kind: "connectPoint", id: "col:0:right" },
		});
	});

	it("refuses a move to where the run already starts, and one past the end", () => {
		const { callTool } = setUp();

		expect(
			callTool("er_entity_move_columns", { id: "e1", column: 1, to: 1 }),
		).toEqual({
			ok: false,
			text: "column 1 already starts at 1; nothing was changed",
		});
		expect(
			callTool("er_entity_move_columns", {
				id: "e1",
				column: 0,
				count: 2,
				to: 2,
			}),
		).toEqual({
			ok: false,
			text: "to 2 is past the end: columns 0-1 can start at 0 to 1",
		});
	});
});

describe("er_entity_set_texts", () => {
	it("rewrites texts keeping their typography, null removing a key", () => {
		const { callTool, readEntity } = setUp();

		const outcome = callTool("er_entity_set_texts", {
			id: "e1",
			name: "accounts",
			columns: [
				{ column: 1, name: "mail", type: "varchar(80) null" },
				{ column: 2, key: null },
			],
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'rewrote the title and columns 1, 2 of erEntity "e1"; it has 3 columns: 0 id [PK], 1 mail, 2 org_id',
		});
		expect(readEntity().name).toBe("accounts");
		expect(readEntity().columns.slice(1)).toEqual([
			{
				name: { text: "mail", fontWeight: "bold" },
				type: "varchar(80) null",
			},
			{ name: "org_id", type: "bigint" },
		]);
	});

	it("keeps an emptied key that carries typography, and drops a plain one", () => {
		const entity = makeEntityDoc();
		entity.columns[2].key = { text: "FK", fontColor: "#f00" };
		const tool = erAiToolPlugin.tools.find(
			(candidate) => candidate.name === "er_entity_set_texts",
		);

		const change = tool?.apply?.(entity, {
			columns: [
				{ column: 0, key: "" },
				{ column: 2, key: "" },
			],
		});

		expect(change?.doc).toMatchObject({
			columns: [
				{ name: "id", type: "bigint" },
				{},
				{ key: { text: "", fontColor: "#f00" } },
			],
		});
		expect((change?.doc as ErEntityDoc).columns[0]).not.toHaveProperty("key");
		expect(change?.connectPointRemap).toBeUndefined();
	});

	it("refuses a no-op, a column named twice, a column past the end and a newline", () => {
		const { callTool } = setUp();

		expect(
			callTool("er_entity_set_texts", {
				id: "e1",
				name: "users",
				columns: [{ column: 0, name: "id" }],
			}),
		).toEqual({
			ok: false,
			text: 'erEntity "e1" already holds those texts; nothing was changed',
		});
		expect(
			callTool("er_entity_set_texts", {
				id: "e1",
				columns: [
					{ column: 0, name: "a" },
					{ column: 0, type: "b" },
				],
			}).text,
		).toBe(
			"column 0 is named twice in columns: give each column once, with every text it changes",
		);
		expect(
			callTool("er_entity_set_texts", {
				id: "e1",
				columns: [{ column: 3, name: "a" }],
			}).text,
		).toContain("columns[0].column 3 is past the end");
		expect(
			callTool("er_entity_set_texts", { id: "e1", name: "a\nb" }).text,
		).toBe("name contains a newline: an entity's texts are one line each");
	});
});

describe("er_entity_set_text_style", () => {
	it("styles the title and the named fields of a run of columns, leaving absent keys absent", () => {
		const { callTool, readEntity } = setUp();

		const outcome = callTool("er_entity_set_text_style", {
			id: "e1",
			title: true,
			column: 0,
			count: 2,
			fields: ["key", "name"],
			fontWeight: "700",
		});

		expect(outcome).toEqual({
			ok: true,
			text: 'set fontWeight on the title and key / name of columns 0-1 of erEntity "e1"; it has 3 columns: 0 id [PK], 1 email, 2 org_id [FK]',
		});
		const entity = readEntity();
		expect(entity.name).toEqual({ text: "users", fontWeight: "bold" });
		expect(entity.columns[0]).toEqual({
			key: { text: "PK", fontWeight: "bold" },
			name: { text: "id", fontWeight: "bold" },
			type: "bigint",
		});
		expect(entity.columns[1]).toEqual({
			name: { text: "email", fontWeight: "bold" },
			type: "text",
		});
		expect(entity.columns[2]).toEqual(makeEntityDoc().columns[2]);
	});

	it("merges into a text's own typography", () => {
		const { callTool, readEntity } = setUp();

		callTool("er_entity_set_text_style", {
			id: "e1",
			column: 1,
			fields: ["name"],
			fontColor: "#1565c0",
		});

		expect(readEntity().columns[1].name).toEqual({
			text: "email",
			fontWeight: "bold",
			fontColor: "#1565c0",
		});
	});

	it("refuses a call with no style, no target, or nothing to change", () => {
		const { callTool } = setUp();

		expect(
			callTool("er_entity_set_text_style", { id: "e1", title: true }).text,
		).toMatch(/^no style given: pass at least one of fontColor, fontSize/);
		expect(
			callTool("er_entity_set_text_style", { id: "e1", fontSize: 16 }).text,
		).toContain("no text named");
		expect(
			callTool("er_entity_set_text_style", {
				id: "e1",
				fields: ["name"],
				title: true,
				fontSize: 16,
			}).text,
		).toBe("count and fields pick texts of columns: pass column with them");
		expect(
			callTool("er_entity_set_text_style", {
				id: "e1",
				column: 1,
				fields: ["key"],
				fontSize: 16,
			}).text,
		).toContain("nothing was changed");
	});
});

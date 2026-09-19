// Checks that the tools which rewrite a file work as expected against real
// files.
//
// What add_object / set_height_mode do is held by the @jiscribe/ai-tools
// declarations and by its applyCanvasOp (this server only adds a path and joins
// the two). So the wording of the reply is not pinned down;
// success or failure and the contents of the file decide.
// add_rect is this server's own tool, so its default size is checked too.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

const emptyDoc: CanvasFileContent = { version: 1, root: [] };

/**
 * A document holding one rect that can be switched to an automatic height, and
 * one ellipse that cannot.
 */
const heightModeDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "box",
			type: "rect",
			x: 0,
			y: 0,
			width: 160,
			height: 80,
			text: "自動高さに切り替える矩形",
		},
		{
			id: "oval",
			type: "ellipse",
			cx: 280,
			cy: 40,
			rx: 80,
			ry: 40,
			text: "箱が文字を縛らない型",
		},
	],
};

let client: McpTestClient;
let workspace: TempCanvasWorkspace;
/**
 * The target rewritten by each test. The names are kept apart so that no test
 * writes back to another's file.
 */
let targetPath: string;
let testIndex = 0;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

describe("add_object", () => {
	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`add-${testIndex++}.jis.json`,
			emptyDoc,
		);
	});

	it("writes a shape given a width / height at exactly those dimensions", async () => {
		const result = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 40,
			y: 40,
			width: 200,
			height: 90,
			text: "ふつうの箱",
		});
		expect(result.text).toBe('added rect "rect-1" at (40, 40)');

		const [object] = (await workspace.readDoc(targetPath)).root;
		expect(object).toMatchObject({
			id: "rect-1",
			type: "rect",
			x: 40,
			y: 40,
			width: 200,
			height: 90,
			text: "ふつうの箱",
		});
	});

	it("writes no height to the file for autoHeight: true", async () => {
		await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 40,
			y: 200,
			width: 200,
			autoHeight: true,
			text: "テキストの量に合わせて高さが決まる箱",
		});

		const [object] = (await workspace.readDoc(targetPath)).root;
		expect(object).toMatchObject({ type: "rect", width: 200 });
		expect(object).not.toHaveProperty("height");
	});

	it('gives a textLayout: "block" text a width, which is its wrapping width', async () => {
		await client.callTool("add_object", {
			path: targetPath,
			type: "text",
			x: 40,
			y: 360,
			width: 260,
			textLayout: "block",
			text: "本文として折り返させたい、そこそこ長い説明文をひとまとまりで置く",
		});

		const [object] = (await workspace.readDoc(targetPath)).root;
		expect(object).toMatchObject({
			id: "text-1",
			type: "text",
			textLayout: "block",
			width: 260,
		});
		// The height of a text is always measured, so it is never written to the
		// document.
		expect(object).not.toHaveProperty("height");
	});

	it("refuses autoHeight for a type that draws outside its box, and leaves the file alone", async () => {
		const result = await client.callTool("add_object", {
			path: targetPath,
			type: "ellipse",
			x: 0,
			y: 0,
			width: 100,
			autoHeight: true,
			text: "だめな組み合わせ",
		});
		expect(result.text).toBe(
			'error: object type "ellipse" does not support a text-derived height; only box shapes holding one body of text inside their box, and not opted out of it, do',
		);
		expect((await workspace.readDoc(targetPath)).root).toEqual([]);
	});

	// set_text / get_text already call these types textless; creating one with a
	// text wrote a field the schema rejects.
	it.each(["lucideIcon", "polygon", "polyline"])(
		"refuses text on %s, which holds none, and leaves the file alone",
		async (type) => {
			const result = await client.callTool("add_object", {
				path: targetPath,
				type,
				x: 0,
				y: 0,
				text: "hi",
			});
			expect(result.text).toMatch(
				new RegExp(
					`^error: object type "${type}" holds no text of its own and takes no text`,
				),
			);
			expect((await workspace.readDoc(targetPath)).root).toEqual([]);
		},
	);

	it("refuses an add_objects batch with one textless entry given text", async () => {
		const result = await client.callTool("add_objects", {
			path: targetPath,
			objects: [
				{ type: "rect", x: 0, y: 0, text: "kept out too" },
				{ type: "lucideIcon", x: 200, y: 0, text: "hi" },
			],
		});
		expect(result.text).toMatch(
			/^error: entries\[1\] \(lucideIcon\): object type "lucideIcon" holds no text/,
		);
		expect((await workspace.readDoc(targetPath)).root).toEqual([]);
	});
});

describe("set_text_style", () => {
	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`text-style-${testIndex++}.jis.json`,
			emptyDoc,
		);
	});

	// A markdown body is source text: the schema holds it to a string, which a
	// run array is not.
	it("refuses styling part of a markdown body, and leaves the file alone", async () => {
		await client.callTool("add_object", {
			path: targetPath,
			type: "markdown",
			x: 0,
			y: 0,
		});
		await client.callTool("set_text", {
			path: targetPath,
			id: "markdown-1",
			text: "hello world",
		});
		const before = await workspace.readDoc(targetPath);

		const result = await client.callTool("set_text_style", {
			path: targetPath,
			id: "markdown-1",
			match: "world",
			fontWeight: "bold",
		});

		expect(result.text).toMatch(
			/^error: markdown-1 \("markdown"\) holds its text as a plain string/,
		);
		expect(await workspace.readDoc(targetPath)).toEqual(before);
		expect(before.root[0]).toMatchObject({ text: "hello world" });
	});
});

describe("add_rect", () => {
	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`rect-${testIndex++}.jis.json`,
			emptyDoc,
		);
	});

	it("falls back to the tool's default 160x80 when width / height are omitted", async () => {
		const result = await client.callTool("add_rect", {
			path: targetPath,
			x: 400,
			y: 40,
		});
		expect(result.text).toBe('added rect "rect-1" at (400, 40)');

		const [object] = (await workspace.readDoc(targetPath)).root;
		expect(object).toMatchObject({ type: "rect", width: 160, height: 80 });
	});
});

describe("add_ellipse", () => {
	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`ellipse-${testIndex++}.jis.json`,
			emptyDoc,
		);
	});

	it("falls back to the tool's default radii and keeps the center it was given", async () => {
		const result = await client.callTool("add_ellipse", {
			path: targetPath,
			cx: 200,
			cy: 100,
		});
		// ai-tools names the top-left corner the document holds; the center the
		// tool took is added so the reply reads back what was asked
		expect(result.text).toBe(
			'added ellipse "ellipse-1" at (120, 50), center (200, 100)',
		);

		const [object] = (await workspace.readDoc(targetPath)).root;
		expect(object).toMatchObject({
			type: "ellipse",
			cx: 200,
			cy: 100,
			rx: 80,
			ry: 50,
		});
	});
});

describe("undo after the tools of this server's own", () => {
	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`undo-${testIndex++}.jis.json`,
			emptyDoc,
		);
	});

	it("takes back an add_rect, the same history holding both tool families", async () => {
		await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 50,
		});
		await client.callTool("add_rect", { path: targetPath, x: 200, y: 0 });

		const undone = await client.callTool("undo", { path: targetPath });

		expect(undone.text).not.toMatch(/^error:/);
		const doc = await workspace.readDoc(targetPath);
		expect(doc.root).toHaveLength(1);
		expect(doc.root[0]).toMatchObject({ x: 0, y: 0 });
	});

	it("takes back an add_ellipse", async () => {
		await client.callTool("add_ellipse", {
			path: targetPath,
			cx: 100,
			cy: 100,
		});

		const undone = await client.callTool("undo", { path: targetPath });

		expect(undone.text).not.toMatch(/^error:/);
		expect((await workspace.readDoc(targetPath)).root).toEqual([]);
	});
});

describe("set_height_mode", () => {
	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`height-${testIndex++}.jis.json`,
			heightModeDoc,
		);
	});

	it('"auto" removes the height from the file', async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["box"],
			mode: "auto",
		});
		// The wording belongs to the ai-tools declaration, so only success or
		// failure and the contents of the file are checked here
		expect(result.text).not.toMatch(/^error:/);

		const [box] = (await workspace.readDoc(targetPath)).root;
		expect(box).not.toHaveProperty("height");
	});

	it('"fixed" writes back the height it was given', async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["box"],
			mode: "fixed",
			height: 120,
		});
		expect(result.text).not.toMatch(/^error:/);

		const [box] = (await workspace.readDoc(targetPath)).root;
		expect(box).toMatchObject({ id: "box", height: 120 });
	});

	it('"fixed" without a height is refused before the doc is touched', async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["box"],
			mode: "fixed",
		});
		expect(result.text).toMatch(/^error:/);
		expect(await workspace.readDoc(targetPath)).toEqual(heightModeDoc);
	});

	it("refuses the whole call when even one unsupported type is mixed in, and leaves the file alone", async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["box", "oval"],
			mode: "auto",
		});
		expect(result.text).toContain(
			'error: ids[1] (oval): oval ("ellipse") does not support a text-derived height',
		);
		expect(await workspace.readDoc(targetPath)).toEqual(heightModeDoc);
	});

	it("makes an id that does not exist an error, and leaves the file alone", async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["nope"],
			mode: "auto",
		});
		expect(result.text).toBe("error: object not found: nope");
		expect(await workspace.readDoc(targetPath)).toEqual(heightModeDoc);
	});
});

describe("a file holding an object of a type this build does not know", () => {
	/**
	 * A shape from a plugin this server does not ship, written between two rects
	 * with a connector to it. The schema rejects its type, so the file fails
	 * diagnose_canvas before any tool touches it.
	 */
	const unknownObject = {
		id: "gadget-1",
		type: "gadget",
		x: 200,
		y: 0,
		width: 60,
		height: 40,
		gearCount: 3,
	};
	const docWithUnknownObject: CanvasFileContent = {
		version: 1,
		root: [
			{ id: "rect-1", type: "rect", x: 0, y: 0, width: 100, height: 60 },
			unknownObject,
			{ id: "rect-2", type: "rect", x: 400, y: 0, width: 100, height: 60 },
			{
				id: "connector-1",
				type: "connector",
				points: [],
				source: { owner: { id: "rect-1" }, anchor: { kind: "center" } },
				target: { owner: { id: "gadget-1" }, anchor: { kind: "center" } },
			},
		],
	};

	const rootIdsOf = (doc: CanvasFileContent): unknown[] =>
		doc.root.map((object) => object.id);

	beforeEach(async () => {
		targetPath = await workspace.writeDoc(
			`unknown-${testIndex++}.jis.json`,
			docWithUnknownObject,
		);
	});

	it("keeps it where it was, as written, when add_rect writes the file back", async () => {
		const result = await client.callTool("add_rect", {
			path: targetPath,
			x: 0,
			y: 200,
		});
		// The schema error the file already carried is not held against the edit.
		expect(result.text).toBe('added rect "rect-3" at (0, 200)');

		const written = await workspace.readDoc(targetPath);
		expect(rootIdsOf(written)).toEqual([
			"rect-1",
			"gadget-1",
			"rect-2",
			"connector-1",
			"rect-3",
		]);
		expect(written.root[1]).toEqual(unknownObject);
		expect(written.root[3]).toEqual(docWithUnknownObject.root[3]);
	});

	it("keeps it through undo too", async () => {
		await client.callTool("add_rect", { path: targetPath, x: 0, y: 200 });

		const undone = await client.callTool("undo", { path: targetPath });
		expect(undone.text).not.toMatch(/^error:/);

		expect(await workspace.readDoc(targetPath)).toEqual(docWithUnknownObject);
	});

	it("deletes it by id with delete_objects, taking its connector", async () => {
		const result = await client.callTool("delete_objects", {
			path: targetPath,
			ids: ["gadget-1"],
		});
		expect(result.text).not.toMatch(/^error:/);

		expect(rootIdsOf(await workspace.readDoc(targetPath))).toEqual([
			"rect-1",
			"rect-2",
		]);
	});

	it("shows it in list_objects, flagged as a type this build does not know", async () => {
		const result = await client.callTool("list_objects", { path: targetPath });

		expect(result.text).toContain("flagged unknownType");
		expect(result.text).toContain(
			'{"id":"gadget-1","type":"gadget","bounds":{"x":200,"y":0,"width":60,"height":40},"parentId":null,"text":null,"unknownType":true}',
		);
	});

	it("is reported by diagnose_canvas as kept, not as dropped", async () => {
		const result = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});

		expect(result.text).toContain(
			'Object type "gadget" is not a type this build knows: the object is kept as it is but not drawn.',
		);
		expect(result.text).not.toContain("dropped on save");
	});
});

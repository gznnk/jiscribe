// Checks that the tools which rewrite a file work as expected against real
// files.
//
// What add_object / set_height_mode do is held by the @jiscribe/ai-tools
// declarations and by canvas-agent's applyCanvasOp (this server only adds a
// path and joins the two). So the wording of the reply is not pinned down;
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

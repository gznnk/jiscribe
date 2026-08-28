// ファイルを書き換えるツールが、実ファイルに対して期待どおり働くかを見る。
//
// add_object / set_height_mode の中身は @jiscribe/ai-tools の宣言と
// canvas-agent の applyCanvasOp が持つ（このサーバーは path を足して繋いでいるだけ）。
// そのため応答の文言までは固定せず、成否とファイルの中身で判定する。
// add_rect はこのサーバー自身のツールなので、既定サイズまで見る。

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

const emptyDoc: CanvasFileContent = { version: 1, root: [] };

/** 自動高さに切り替えられる rect と、切り替えられない ellipse を 1 つずつ持つ文書。 */
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
/** テストごとに書き直す変更対象。名前を分けるのは書き戻し先を取り違えないため。 */
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

	it("width / height を渡した図形はその寸法のまま書き込まれる", async () => {
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

	it("autoHeight: true なら height をファイルに書かない", async () => {
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

	it('textLayout: "block" の text は折り返し幅として width を持つ', async () => {
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
		// text の高さは常に実測なので、文書には書かれない。
		expect(object).not.toHaveProperty("height");
	});

	it("箱の外に描く型への autoHeight は断り、ファイルを変えない", async () => {
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

	it("width / height を省くとツール既定の 160x80 になる", async () => {
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

	it('"auto" は height をファイルから消す', async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["box"],
			mode: "auto",
		});
		// 文言は ai-tools の宣言側が持つので、ここでは成否とファイルの中身だけ見る
		expect(result.text).not.toMatch(/^error:/);

		const [box] = (await workspace.readDoc(targetPath)).root;
		expect(box).not.toHaveProperty("height");
	});

	it('"fixed" は渡した height を書き戻す', async () => {
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

	it('"fixed" で height を欠くと doc へ触れる前に断る', async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["box"],
			mode: "fixed",
		});
		expect(result.text).toMatch(/^error:/);
		expect(await workspace.readDoc(targetPath)).toEqual(heightModeDoc);
	});

	it("対象外の型が 1 つでも混ざれば全体を断り、ファイルを変えない", async () => {
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

	it("存在しない id はエラーにして、ファイルを変えない", async () => {
		const result = await client.callTool("set_height_mode", {
			path: targetPath,
			ids: ["nope"],
			mode: "auto",
		});
		expect(result.text).toBe("error: object not found: nope");
		expect(await workspace.readDoc(targetPath)).toEqual(heightModeDoc);
	});
});

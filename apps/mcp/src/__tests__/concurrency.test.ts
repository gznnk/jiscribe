import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let client: McpTestClient;
let workspace: TempCanvasWorkspace;

beforeAll(async () => {
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
});

beforeEach(async () => {
	workspace = await createTempCanvasWorkspace();
});

afterEach(async () => {
	await workspace.remove();
});

const emptyDoc = { version: 1, root: [] };

describe("同じファイルへの同時呼び出し", () => {
	it("並んで届いた追加を 1 つも取りこぼさない", async () => {
		// ツールは読み込み → 変更 → 書き戻しでファイルを更新する。間に別の手が
		// 割り込むと、後の書き戻しが先の変更ごと消す（lost update）。
		const targetPath = await workspace.writeDoc("parallel.jis.json", emptyDoc);
		const callCount = 8;

		const results = await Promise.all(
			Array.from({ length: callCount }, (_, index) =>
				client.callTool("add_rect", {
					path: targetPath,
					x: index * 40,
					y: 0,
					text: `r${index}`,
				}),
			),
		);

		expect(
			results.filter((result) => result.text.startsWith("error:")),
		).toEqual([]);
		const doc = await workspace.readDoc(targetPath);
		expect(doc.root).toHaveLength(callCount);
	});

	it("追加と移動が混ざっても、最後の姿に全部の手が残る", async () => {
		const targetPath = await workspace.writeDoc("mixed.jis.json", {
			version: 1,
			root: [{ id: "seed", type: "rect", x: 0, y: 0, width: 100, height: 50 }],
		});

		await Promise.all([
			client.callTool("add_rect", {
				path: targetPath,
				x: 200,
				y: 0,
				text: "a",
			}),
			client.callTool("set_position", {
				path: targetPath,
				id: "seed",
				x: 500,
				y: 500,
			}),
			client.callTool("add_rect", {
				path: targetPath,
				x: 400,
				y: 0,
				text: "b",
			}),
		]);

		const doc = await workspace.readDoc(targetPath);
		expect(doc.root).toHaveLength(3);
		expect(doc.root.find((object) => object.id === "seed")).toMatchObject({
			x: 500,
			y: 500,
		});
	});

	it("別々のファイルへの手は互いを待たない（直列化はパスごと）", async () => {
		const first = await workspace.writeDoc("a.jis.json", emptyDoc);
		const second = await workspace.writeDoc("b.jis.json", emptyDoc);

		await Promise.all([
			client.callTool("add_rect", { path: first, x: 0, y: 0, text: "a" }),
			client.callTool("add_rect", { path: second, x: 0, y: 0, text: "b" }),
		]);

		expect((await workspace.readDoc(first)).root).toHaveLength(1);
		expect((await workspace.readDoc(second)).root).toHaveLength(1);
	});
});

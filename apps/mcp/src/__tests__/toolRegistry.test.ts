import {
	createCanvasToolDescriptors,
	type CanvasToolDescriptor,
} from "@jiscribe/ai-tools";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { canvasCapabilities } from "../canvasDefinitions";
import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";

let client: McpTestClient;

beforeAll(async () => {
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
});

describe("createJiscribeMcpServer", () => {
	it("このサーバー独自のツールを、順序込みで登録する", async () => {
		// 登録漏れは AI 側から見た機能欠落そのものなので、自前のものは順序まで固定する。
		// ai-tools 由来のものは向こうの増減で変わるため、下の 2 つで数と重複だけを見る
		const names = await client.listToolNames();
		expect(names.slice(0, 7)).toEqual([
			"open_canvas",
			"close_canvas",
			"validate_canvas",
			"diagnose_canvas",
			"measure_text",
			"add_rect",
			"add_ellipse",
		]);
	});

	it("ai-tools の宣言を doc 側・画面側とも取りこぼさず登録する", async () => {
		const names = await client.listToolNames();
		const descriptors = createCanvasToolDescriptors(canvasCapabilities);
		const needsCanvas = (descriptor: CanvasToolDescriptor): boolean =>
			descriptor.drives.some((ref) => ref.startsWith("handle."));

		// 自前と名前がぶつかる measure_text だけは改名して入る
		const expectedNames = descriptors.map((descriptor) =>
			descriptor.name === "measure_text" && needsCanvas(descriptor)
				? "measure_rendered_text"
				: descriptor.name,
		);
		expect(names).toEqual(expect.arrayContaining(expectedNames));
		expect(descriptors.filter(needsCanvas)).toHaveLength(16);
	});

	it("同じ名前のツールを二度登録しない", async () => {
		const names = await client.listToolNames();
		expect(new Set(names).size).toBe(names.length);
	});

	it("add_object は 1 手作成の引数（autoHeight / textLayout）まで公開する", async () => {
		const schema = await client.getToolInputProperties("add_object");
		expect(Object.keys(schema)).toEqual(
			expect.arrayContaining([
				"path",
				"type",
				"x",
				"y",
				"width",
				"height",
				"autoHeight",
				"textLayout",
				"text",
			]),
		);
	});
});

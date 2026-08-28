import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";

let client: McpTestClient;

beforeAll(async () => {
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
});

describe("measure_text", () => {
	it("箱が文字を縛る型は content box と収まり判定まで返す", async () => {
		const result = await client.callTool("measure_text", {
			text: "とても長い説明文をわざと狭い矩形に押し込む",
			shape: "rect",
			width: 60,
			height: 40,
			fontSize: 13,
		});
		expect(result.text.split("\n")).toEqual([
			"shape rect 60x40",
			"lines 7",
			"text 39x136.5",
			"content 48x36",
			"fits no",
		]);
	});

	it("箱に収まるなら fits yes を返す", async () => {
		const result = await client.callTool("measure_text", {
			text: "チャットアシスタント",
			shape: "stadium",
			width: 240,
			height: 80,
			fontSize: 13,
		});
		expect(result.text).toContain("shape stadium 240x80");
		expect(result.text).toContain("fits yes");
	});

	it("箱の外にラベルを描く型は判定を出さず note を添える", async () => {
		const result = await client.callTool("measure_text", {
			text: "分岐点のラベル",
			shape: "cross",
			width: 240,
			height: 80,
			fontSize: 13,
		});
		expect(result.text.split("\n")).toEqual([
			"shape cross 240x80",
			"lines 1",
			"text 91x19.5",
			"note: shape cross draws its label outside the box; the box size does not constrain the text",
		]);
		expect(result.text).not.toContain("fits");
	});

	it("rect 以外で height を省くとエラーにする", async () => {
		const result = await client.callTool("measure_text", {
			text: "ラベル",
			shape: "stadium",
			width: 240,
			fontSize: 13,
		});
		expect(result.text).toBe("error: height is required for shape stadium");
	});

	it("rect は height を省いても幅だけで測れる", async () => {
		const result = await client.callTool("measure_text", {
			text: "ラベル",
			shape: "rect",
			width: 240,
			fontSize: 13,
		});
		expect(result.text).toContain("shape rect 240x-");
		expect(result.text).toContain("content 228x-");
		expect(result.text).toContain("fits yes");
	});

	it("出荷図形セットに無い型はエラーにする", async () => {
		const result = await client.callTool("measure_text", {
			text: "x",
			shape: "nosuchshape",
			width: 240,
			height: 80,
			fontSize: 13,
		});
		expect(result.text).toBe(
			'error: unknown shape type "nosuchshape" (not in the standard set)',
		);
	});
});

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
	it("returns the content box and whether it fits for a type whose box constrains its text", async () => {
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

	it("returns fits yes when it fits in the box", async () => {
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

	it("gives no verdict and adds a note for a type that draws its label outside the box", async () => {
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

	it("makes an omitted height an error for anything but a rect", async () => {
		const result = await client.callTool("measure_text", {
			text: "ラベル",
			shape: "stadium",
			width: 240,
			fontSize: 13,
		});
		expect(result.text).toBe("error: height is required for shape stadium");
	});

	it("measures a rect from its width alone even with the height omitted", async () => {
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

	it("makes a type outside the standard shape set an error", async () => {
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

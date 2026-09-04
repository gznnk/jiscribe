import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

const fittingDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "roomy",
			type: "rect",
			x: 0,
			y: 0,
			width: 240,
			height: 120,
			text: "収まる文",
			fontSize: 13,
		},
	],
};

const overflowingDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "narrow",
			type: "rect",
			x: 0,
			y: 0,
			width: 60,
			height: 40,
			text: "とても長い説明文をわざと狭い矩形に押し込んで、はみ出しが検出されることを確かめる",
			fontSize: 13,
		},
	],
};

/**
 * A connector whose label is wider than the gap between the two shapes
 * (doc-tools' labelOverflowing).
 */
const labelOverflowingDoc: CanvasFileContent = {
	version: 1,
	root: [
		{
			id: "s2",
			type: "rect",
			x: 448,
			y: 264,
			width: 264,
			height: 88,
			text: "② マイクロタスクを\nすべて処理 — 出力: B",
			fontSize: 16,
		},
		{
			id: "s3",
			type: "rect",
			x: 832,
			y: 264,
			width: 264,
			height: 88,
			text: "③ タスクを 1 つ処理\n出力: C",
			fontSize: 16,
		},
		{
			id: "o2",
			type: "connector",
			points: [],
			source: {
				owner: { id: "s2" },
				anchor: { kind: "connectPoint", id: "rightCenter" },
			},
			target: {
				owner: { id: "s3" },
				anchor: { kind: "connectPoint", id: "leftCenter" },
			},
			label: { text: "マイクロタスクが尽きる", fontSize: 13 },
		},
	],
};

let client: McpTestClient;
let workspace: TempCanvasWorkspace;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

describe("diagnose_canvas", () => {
	it("reports nothing for a document that fits", async () => {
		const path = await workspace.writeDoc("fitting.jis.json", fittingDoc);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toBe("valid: true");
	});

	it("lists an overflowing shape as a single error", async () => {
		const path = await workspace.writeDoc(
			"overflowing.jis.json",
			overflowingDoc,
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n1 issue\(s\):\n/);
		expect(result.text).toContain("- error narrow: text overflows rect 60x40");
	});

	it("lists an overflowing connector label while staying valid: true, it being a warning", async () => {
		const path = await workspace.writeDoc(
			"labelOverflowing.jis.json",
			labelOverflowingDoc,
		);
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: true\n1 issue\(s\):\n/);
		expect(result.text).toContain(
			'- warning o2: label "マイクロタスクが尽きる" is 142.5px wide but only 120px is free between s2 and s3',
		);
	});

	it("returns valid: false and the missing property for a schema violation", async () => {
		const path = await workspace.writeDoc("incomplete.jis.json", {
			version: 1,
			root: [{ id: "r", type: "rect", x: 0, y: 0 }],
		});
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n/);
		expect(result.text).toContain("must have required property 'width'");
	});

	it("returns a syntax error when the file is broken as JSON", async () => {
		const path = await workspace.writeText("broken.jis.json", "{");
		const result = await client.callTool("diagnose_canvas", { path });
		expect(result.text).toMatch(/^valid: false\n/);
		expect(result.text).toContain("JSON syntax error");
	});

	it("returns a file it cannot read as error text, not as an exception", async () => {
		const result = await client.callTool("diagnose_canvas", {
			path: "/nonexistent/jiscribe-mcp/missing.jis.json",
		});
		expect(result.isError).toBe(false);
		expect(result.text).toContain("error: failed to read file:");
	});
});

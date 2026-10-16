// A plugin's object tool reaches the AI as one more path-addressed tool: its
// declaration and its applying both come from canvasToolSet, so a call writes the
// file and undo takes it back like any other edit.
//
// The standard bundle is stood in for with one tool acting on the built-in rect, so
// the wiring is held apart from any shipped plugin's tools (the table's own run
// unmocked in tableTools.test.ts).

import type * as standardToolsModule from "@jiscribe/standard-shapes/tools";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

vi.mock(
	"@jiscribe/standard-shapes/tools",
	async (): Promise<typeof standardToolsModule> => {
		const { defineObjectAiTool } = await import("@jiscribe/ai-tools-sdk");
		const { z } = await import("zod");
		return {
			standardAiToolPlugins: [
				{
					id: "rect-tools",
					tools: [
						defineObjectAiTool({
							name: "rect_set_width",
							description: "Set the width of a rect.",
							objectType: "rect",
							inputSchema: { width: z.number() },
							apply: (objectDoc, { width }) => ({
								doc: { ...objectDoc, width } as typeof objectDoc,
								text: `"${objectDoc.id}" is now ${width} wide`,
							}),
						}),
					],
				},
			],
		};
	},
);

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

describe("a plugin's object tool", () => {
	it("writes the file it names, and undo takes the write back", async () => {
		const targetPath = await workspace.writeDoc("object-tool.jis.json", {
			version: 1,
			root: [{ id: "box", type: "rect", x: 0, y: 0, width: 100, height: 50 }],
		});

		expect(
			Object.keys(await client.getToolInputProperties("rect_set_width")),
		).toEqual(["path", "id", "width"]);

		const result = await client.callTool("rect_set_width", {
			path: targetPath,
			id: "box",
			width: 240,
		});
		expect(result).toEqual({ text: '"box" is now 240 wide', isError: false });
		expect((await workspace.readDoc(targetPath)).root[0]?.width).toBe(240);

		await client.callTool("undo", { path: targetPath });
		expect((await workspace.readDoc(targetPath)).root[0]?.width).toBe(100);
	});
});

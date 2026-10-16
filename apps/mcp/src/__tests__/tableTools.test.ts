// The table's tools as the shipped server offers them: the real standard set,
// nothing mocked, so a table added by add_object is edited, read, taken back and
// diagnosed through the same file.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

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

describe("the table tools", () => {
	it("edit a table add_object placed, undo takes the last edit back, and the file diagnoses clean", async () => {
		const targetPath = await workspace.writeDoc("table.jis.json", {
			version: 1,
			root: [],
		});

		const added = await client.callTool("add_object", {
			path: targetPath,
			type: "table",
			x: 0,
			y: 0,
		});
		expect(added.isError).toBe(false);
		const tableId = (await workspace.readDoc(targetPath)).root[0]?.id;
		expect(tableId).toEqual(expect.any(String));

		const inserted = await client.callTool("table_insert_tracks", {
			path: targetPath,
			id: tableId,
			axis: "row",
			at: 2,
		});
		expect(inserted).toEqual({
			text: "inserted 1 row (now row 2, empty); the table is now 3 rows (0-2) x 2 columns (0-1)",
			isError: false,
		});

		const filled = await client.callTool("table_fill_cells", {
			path: targetPath,
			id: tableId,
			row: 0,
			column: 0,
			values: [
				["Name", "Role"],
				["Ada", "Engineer"],
			],
		});
		expect(filled.isError).toBe(false);

		const read = await client.callTool("table_read", {
			path: targetPath,
			id: tableId,
		});
		expect(read.text).toContain('row 0: "Name" | "Role"');
		expect(read.text).toContain('row 1: "Ada" | "Engineer"');
		expect(read.text).toContain('row 2: "" | ""');

		await client.callTool("undo", { path: targetPath });
		expect((await workspace.readDoc(targetPath)).root[0]?.cells).toEqual([
			["", ""],
			["", ""],
			["", ""],
		]);

		const diagnosed = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});
		expect(diagnosed.text).toBe("valid: true");
	});
});

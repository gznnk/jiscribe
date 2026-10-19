// The record's tool as the shipped server offers it: the real standard set,
// nothing mocked, so a record add_object placed is given compartments through the
// host's own path (createCanvasToolSet + applyCanvasOp) and diagnosed in the same
// file.

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

describe("record_set_compartments", () => {
	it("gives a record add_object placed its operations, fitted so diagnose_canvas passes it, and a box shrunk by hand is reported", async () => {
		const targetPath = await workspace.writeDoc("record.jis.json", {
			version: 1,
			root: [],
		});

		const added = await client.callTool("add_object", {
			path: targetPath,
			type: "record",
			x: 0,
			y: 0,
		});
		expect(added.isError).toBe(false);
		const recordId = (await workspace.readDoc(targetPath)).root[0]?.id;
		expect(recordId).toEqual(expect.any(String));

		// A band is 28px and a compartment its rows' 21px each plus 4px, at least one
		// row's worth: the fresh record's empty attributes take 25px, and the two
		// operations 46px more.
		const set = await client.callTool("record_set_compartments", {
			path: targetPath,
			id: recordId,
			operations: ["+ save(): void", "+ delete(): void"],
		});
		expect(set).toEqual({
			text: `record "${recordId}": added operations; now has name, attributes (empty), operations (2 rows); height 95 → 99`,
			isError: false,
		});
		expect((await workspace.readDoc(targetPath)).root[0]?.height).toBe(99);

		const diagnosed = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});
		expect(diagnosed.text).toBe("valid: true");

		const resized = await client.callTool("resize_object", {
			path: targetPath,
			id: recordId,
			height: 60,
		});
		expect(resized.isError).toBe(false);

		const shortDiagnosis = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});
		expect(shortDiagnosis.text).toContain("valid: false");
		expect(shortDiagnosis.text).toContain(
			"rows overflow record 180x60: its compartments need 99px but the box is 60px tall, 39px short",
		);
		expect(shortDiagnosis.text).toContain("record_set_compartments");
	});
});

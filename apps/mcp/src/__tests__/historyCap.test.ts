// The undo history is kept per file, up to a cap of files. Only a file that was
// written holds a step to take back, so reading files must not take up places in
// that cap: an AI that reads its way through a workspace would otherwise push the
// history of the file it is drawing out of reach.

import { afterAll, beforeAll, expect, it } from "vitest";

import { connectMcpTestClient, type McpTestClient } from "./mcpTestClient";
import {
	createTempCanvasWorkspace,
	type TempCanvasWorkspace,
} from "./tempCanvasWorkspace";

/** One past the cap in server.ts, so that reads alone would fill it */
const READ_FILE_COUNT = 65;

const emptyDocText = '{"version":1,"root":[]}\n';

let workspace: TempCanvasWorkspace;
let client: McpTestClient;

beforeAll(async () => {
	workspace = await createTempCanvasWorkspace();
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

it("keeps a written file's undo history however many other files are read", async () => {
	const drawnPath = await workspace.writeText("drawn.jis.json", emptyDocText);
	await client.callTool("add_rect", { path: drawnPath, x: 0, y: 0 });

	for (let index = 0; index < READ_FILE_COUNT; index += 1) {
		const readPath = await workspace.writeText(
			`read-${index}.jis.json`,
			emptyDocText,
		);
		const described = await client.callTool("describe_canvas", {
			path: readPath,
		});
		expect(described.text).not.toMatch(/^error:/);
	}

	const undone = await client.callTool("undo", { path: drawnPath });

	expect(undone.text).not.toMatch(/^error:/);
	expect((await workspace.readDoc(drawnPath)).root).toEqual([]);
});

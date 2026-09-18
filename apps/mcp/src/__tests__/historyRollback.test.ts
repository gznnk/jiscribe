// The undo history must not move ahead of the file.
//
// applyCanvasOp pushes its entry before the write-back happens, so a write that
// fails used to leave an entry describing a document that was never written.
// Every later undo was then refused as "someone else's work", the file no longer
// matching what the newest entry recorded.

import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import type * as canvasStoreModule from "../canvasStore";
import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

/** Flipped on by a test to make the next write-back fail, whatever the machine allows */
const injection = vi.hoisted(() => ({ shouldFailNextSave: false }));

vi.mock("../canvasStore", async (importActual) => {
	const actual = await importActual<typeof canvasStoreModule>();
	return {
		...actual,
		saveCanvasFile: async (
			...args: Parameters<typeof actual.saveCanvasFile>
		): Promise<void> => {
			if (injection.shouldFailNextSave) {
				injection.shouldFailNextSave = false;
				throw new actual.CanvasFileError("failed to write file: injected");
			}
			await actual.saveCanvasFile(...args);
		},
	};
});

let client: McpTestClient;
let workspace: TempCanvasWorkspace;
let targetPath: string;
let testIndex = 0;

const emptyDoc = { version: 1, root: [] };

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

beforeEach(async () => {
	injection.shouldFailNextSave = false;
	targetPath = await workspace.writeDoc(
		`rollback-${testIndex++}.jis.json`,
		emptyDoc,
	);
});

describe("a write-back that fails", () => {
	it("leaves undo able to take back the last change that did get written", async () => {
		await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 50,
		});

		injection.shouldFailNextSave = true;
		const refused = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 200,
			y: 0,
			width: 100,
			height: 50,
		});
		expect(refused.text).toMatch(/^error: failed to write file:/);
		expect((await workspace.readDoc(targetPath)).root).toHaveLength(1);

		const undone = await client.callTool("undo", { path: targetPath });

		expect(undone.text).not.toMatch(/^error:/);
		expect((await workspace.readDoc(targetPath)).root).toEqual([]);
	});

	it("leaves an undo that could not be written to be tried again", async () => {
		await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 50,
		});

		injection.shouldFailNextSave = true;
		const refused = await client.callTool("undo", { path: targetPath });
		expect(refused.text).toMatch(/^error: failed to write file:/);
		expect((await workspace.readDoc(targetPath)).root).toHaveLength(1);

		const retried = await client.callTool("undo", { path: targetPath });

		expect(retried.text).not.toMatch(/^error:/);
		expect((await workspace.readDoc(targetPath)).root).toEqual([]);
	});
});

// The real shape of the failure: a directory the process may not write to. It
// needs a uid that permissions actually bind, so root and win32 sit it out
const isPermissionEnforced =
	process.platform !== "win32" && process.getuid?.() !== 0;

describe.skipIf(!isPermissionEnforced)(
	"a directory that cannot be written to",
	() => {
		it("lets undo work again once the permissions are back", async () => {
			const readOnlyDir = join(dirname(targetPath), `locked-${testIndex++}`);
			await mkdir(readOnlyDir);
			const lockedPath = join(readOnlyDir, "locked.jis.json");
			await writeFile(lockedPath, `${JSON.stringify(emptyDoc)}\n`, "utf8");
			await client.callTool("add_rect", { path: lockedPath, x: 0, y: 0 });

			await chmod(readOnlyDir, 0o500);
			let refused: { text: string };
			try {
				refused = await client.callTool("add_rect", {
					path: lockedPath,
					x: 200,
					y: 0,
				});
			} finally {
				// Put back whatever happened, or the teardown cannot remove the directory
				await chmod(readOnlyDir, 0o700);
			}
			expect(refused.text).toMatch(/^error: failed to write file:/);

			const undone = await client.callTool("undo", { path: lockedPath });

			expect(undone.text).not.toMatch(/^error:/);
			expect((await workspace.readDoc(lockedPath)).root).toEqual([]);
		});
	},
);

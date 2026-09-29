import { mkdir, symlink } from "node:fs/promises";
import { join } from "node:path";

import {
	afterAll,
	afterEach,
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

const mocked = vi.hoisted(() => ({
	/**
	 * How long each resolution of a tool's path argument is held back, taken from
	 * the front one call at a time. Empty lets every one through at once
	 */
	resolveDelaysMs: [] as number[],
}));

// Only the resolution a tool does before taking the lock is held back: the
// store's own reads and writes call the function inside the module, which this
// export does not reach
vi.mock("../canvasStore", async (importActual) => {
	const actual = await importActual<typeof canvasStoreModule>();
	return {
		...actual,
		toCanvasFilePath: async (path: string) => {
			const delayMs = mocked.resolveDelaysMs.shift() ?? 0;
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			return await actual.toCanvasFilePath(path);
		},
	};
});

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
	mocked.resolveDelaysMs = [];
	await workspace.remove();
});

const emptyDoc = { version: 1, root: [] };

describe("concurrent calls against one file", () => {
	it("drops not one of the additions that arrived side by side", async () => {
		// The tools update a file by reading it, changing it and writing it back.
		// Another call cutting in between makes the later write-back erase the
		// earlier change along with it (lost update).
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

	it("keeps every call in the final state even with additions and a move mixed together", async () => {
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

	it("lets calls on separate files run without waiting on each other, the serialisation being per path", async () => {
		const first = await workspace.writeDoc("a.jis.json", emptyDoc);
		const second = await workspace.writeDoc("b.jis.json", emptyDoc);

		await Promise.all([
			client.callTool("add_rect", { path: first, x: 0, y: 0, text: "a" }),
			client.callTool("add_rect", { path: second, x: 0, y: 0, text: "b" }),
		]);

		expect((await workspace.readDoc(first)).root).toHaveLength(1);
		expect((await workspace.readDoc(second)).root).toHaveLength(1);
	});
	it("serialises calls naming one file through a linked directory and directly, dropping none", async () => {
		// The lock is keyed by path, so two spellings of one file used to be two
		// locks: every call reported success and about half the additions were gone
		await mkdir(join(workspace.dirPath, "real"));
		await symlink(
			join(workspace.dirPath, "real"),
			join(workspace.dirPath, "alias"),
			"dir",
		);
		const realPath = await workspace.writeDoc(join("real", "b.jis"), emptyDoc);
		const aliasPath = join(workspace.dirPath, "alias", "b.jis");
		const callCount = 60;

		const results = await Promise.all(
			Array.from({ length: callCount }, (_, index) =>
				client.callTool("add_rect", {
					path: index % 2 === 0 ? realPath : aliasPath,
					x: index * 40,
					y: 0,
				}),
			),
		);

		expect(
			results.filter((result) => result.text.startsWith("error:")),
		).toEqual([]);
		expect((await workspace.readDoc(realPath)).root).toHaveLength(callCount);
	});

	it("runs the calls on one file in the order they arrived, however long each path takes to resolve", async () => {
		const targetPath = await workspace.writeDoc("ordered.jis", emptyDoc);
		const callCount = 8;
		// The first call resolves last, which reverses the order whenever a call is
		// queued on the lock as its resolution finishes
		mocked.resolveDelaysMs = Array.from(
			{ length: callCount },
			(_, index) => (callCount - index) * 10,
		);

		await Promise.all(
			Array.from({ length: callCount }, (_, index) =>
				client.callTool("add_rect", {
					path: targetPath,
					x: index * 40,
					y: 0,
					text: String(index),
				}),
			),
		);

		const doc = await workspace.readDoc(targetPath);
		expect(doc.root.map((object) => object.text)).toEqual(
			Array.from({ length: callCount }, (_, index) => String(index)),
		);
	});

	it("runs a deletion before the addition sent after it, so the addition takes the id it freed", async () => {
		const targetPath = await workspace.writeDoc("delete-add.jis", emptyDoc);
		const seeded = await client.callTool("add_rect", {
			path: targetPath,
			x: 0,
			y: 0,
			text: "seed",
		});
		expect(seeded.text).not.toMatch(/^error:/);
		const [seedObject] = (await workspace.readDoc(targetPath)).root;
		mocked.resolveDelaysMs = [30, 0];

		const [deleted, added] = await Promise.all([
			client.callTool("delete_objects", {
				path: targetPath,
				ids: [seedObject?.id],
			}),
			client.callTool("add_rect", {
				path: targetPath,
				x: 100,
				y: 0,
				text: "fresh",
			}),
		]);

		expect(deleted.text).not.toMatch(/^error:/);
		expect(added.text).not.toMatch(/^error:/);
		const doc = await workspace.readDoc(targetPath);
		expect(doc.root.map((object) => object.text)).toEqual(["fresh"]);
		// A freed id goes to the next addition, so an id the AI goes on to name
		// means the object it expects only when the two ran in the order sent
		expect(doc.root[0]?.id).toBe(seedObject?.id);
	});
});

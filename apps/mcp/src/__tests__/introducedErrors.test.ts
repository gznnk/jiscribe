// A write-back refuses a document the edit left failing diagnose_canvas, judged
// against the file as it was loaded rather than against a clean one.
//
// The tools themselves no longer write anything the schema rejects, so the
// write that trips the check is forced: docOps is built with markdown declared
// as an ordinary `"body"` text, which lets set_style put an emphasis field on a
// markdown card. The parser passes over a field the type's features do not
// imply, so the write reaches the check, and the schema is what refuses it.

import type { CanvasDocPlugin } from "@jiscribe/doc";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type * as canvasDefinitionsModule from "../canvasDefinitions";
import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

vi.mock("../canvasDefinitions", async (importActual) => {
	const actual = await importActual<typeof canvasDefinitionsModule>();
	const { createDocOps } = await import("@jiscribe/doc");
	const { standardDocPlugins } = await import("@jiscribe/standard-shapes/doc");
	const lenientPlugins: CanvasDocPlugin[] = standardDocPlugins.map((plugin) => {
		const markdownDefinition = plugin.objects?.markdown;
		return markdownDefinition === undefined
			? plugin
			: {
					...plugin,
					objects: {
						...plugin.objects,
						markdown: {
							...markdownDefinition,
							features: { ...markdownDefinition.features, text: "body" },
						},
					},
				};
	});
	return { ...actual, docOps: createDocOps({ plugins: lenientPlugins }) };
});

/** A markdown card the forced write puts an emphasis field on. */
const markdownCard = {
	id: "md",
	type: "markdown",
	x: 0,
	y: 0,
	width: 300,
	height: 200,
	text: "hello world",
};

/**
 * A rect carrying a key the schema does not know. The file still opens — the
 * parser reports the key as a warning rather than refusing — but the key is gone
 * from what the next write puts back.
 */
const rectWithUnknownKey = {
	id: "odd",
	type: "rect",
	x: 400,
	y: 0,
	width: 100,
	height: 60,
	customKey: "kept",
};

let client: McpTestClient;
let workspace: TempCanvasWorkspace;
let testIndex = 0;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

const writeTarget = (doc: CanvasFileContent): Promise<string> =>
	workspace.writeDoc(`introduced-${testIndex++}.jis.json`, doc);

const styleMarkdown = (path: string) =>
	client.callTool("set_style", { path, ids: ["md"], fontWeight: "bold" });

describe("a write-back that would introduce a diagnose_canvas error", () => {
	it("is refused, and the file keeps what it held", async () => {
		const targetPath = await writeTarget({ version: 1, root: [markdownCard] });

		const result = await styleMarkdown(targetPath);

		expect(result.text).toMatch(
			/^error: refused to write \(the edit would leave the file failing diagnose_canvas, which it did not before\):\nvalid: false\n1 issue\(s\):\n- error md: schema: \/root\/0 must NOT have additional properties/,
		);
		expect((await workspace.readDoc(targetPath)).root).toEqual([markdownCard]);
	});

	it("leaves nothing for undo to take back", async () => {
		const targetPath = await writeTarget({ version: 1, root: [markdownCard] });
		await styleMarkdown(targetPath);

		const undone = await client.callTool("undo", { path: targetPath });

		expect(undone.text).toBe("error: nothing of yours left to undo");
	});

	it("is refused in a file already failing the schema for another reason", async () => {
		const targetPath = await writeTarget({
			version: 1,
			root: [rectWithUnknownKey, markdownCard],
		});

		const result = await styleMarkdown(targetPath);

		expect(result.text).toMatch(/^error: refused to write/);
		expect(result.text).toMatch(
			/- error md: schema: \/root\/1 must NOT have additional properties/,
		);
		expect(result.text).not.toMatch(/odd/);
	});
});

describe("a file already failing the schema for a reason of its own", () => {
	it("still takes an edit that adds no error", async () => {
		const targetPath = await writeTarget({
			version: 1,
			root: [rectWithUnknownKey],
		});

		const result = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
		});

		expect(result.text).not.toMatch(/^error:/);
		const { root } = await workspace.readDoc(targetPath);
		expect(root).toHaveLength(2);
		// The write puts back what the parser read, and what it read no longer has
		// the key: an unknown property is dropped on the first save after it is seen.
		expect(root[0]).not.toHaveProperty("customKey");
	});

	// The error keeps its object's id, not its index, so moving that object is not
	// mistaken for a new error at the index it moved to.
	it("still takes a restacking that moves the offending object", async () => {
		const targetPath = await writeTarget({
			version: 1,
			root: [
				rectWithUnknownKey,
				{ id: "plain", type: "rect", x: 0, y: 0, width: 100, height: 60 },
			],
		});

		const result = await client.callTool("reorder_objects", {
			path: targetPath,
			ids: ["odd"],
			placement: "front",
		});

		expect(result.text).not.toMatch(/^error:/);
		expect(
			(await workspace.readDoc(targetPath)).root.map((object) => object.id),
		).toEqual(["plain", "odd"]);
	});

	it("still takes an edit with a document-level key the schema does not know", async () => {
		const targetPath = await workspace.writeText(
			`introduced-${testIndex++}.jis.json`,
			'{"version":1,"__proto__":{"polluted":true},"root":[]}\n',
		);

		const result = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
		});

		expect(result.text).not.toMatch(/^error:/);
		expect((await workspace.readDoc(targetPath)).root).toHaveLength(1);
		// A key the document frame does not hold goes the way an object's does: the
		// parser reports it and drops it, so the write leaves a file the schema takes.
		const diagnosis = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});
		expect(diagnosis.text).not.toMatch(/must NOT have additional properties/);
	});
});

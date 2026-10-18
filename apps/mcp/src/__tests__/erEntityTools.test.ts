// The ER entity's tools as the shipped server offers them: the real standard set,
// nothing mocked, so a column edit reaches the file — and the connectors attached
// to the entity's columns — through the host's own path (createCanvasToolSet +
// applyCanvasOp).

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
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

/** Two entities, a relationship line from orders.user_id (column 1) to users.id (column 0). */
const makeErDoc = (): CanvasFileContent => ({
	version: 1,
	root: [
		{
			id: "users",
			type: "erEntity",
			x: 0,
			y: 0,
			name: "users",
			columns: [
				{ key: "PK", name: "id", type: "bigint" },
				{ name: "email", type: "text" },
			],
		},
		{
			id: "orders",
			type: "erEntity",
			x: 400,
			y: 0,
			name: "orders",
			columns: [
				{ key: "PK", name: "id", type: "bigint" },
				{ key: "FK", name: "user_id", type: "bigint" },
			],
		},
		{
			id: "rel",
			type: "connector",
			points: [],
			source: {
				owner: { id: "orders" },
				anchor: { kind: "connectPoint", id: "col:1:left" },
			},
			target: {
				owner: { id: "users" },
				anchor: { kind: "connectPoint", id: "col:0:right" },
			},
		},
	],
});

/** The object of `id` in a written-back document. */
const findObject = (
	doc: CanvasFileContent,
	id: string,
): Record<string, unknown> | undefined =>
	doc.root.find((object) => object.id === id);

describe("er_entity_* tools", () => {
	it("reads an entity, then rewrites and styles its texts in the file", async () => {
		const targetPath = await workspace.writeDoc(
			"er-texts.jis.json",
			makeErDoc(),
		);

		const read = await client.callTool("er_entity_read", {
			path: targetPath,
			id: "users",
		});
		expect(read.isError).toBe(false);
		expect(read.text).toContain("col 0: PK | id | bigint");
		expect(read.text).toContain("col 1: (no key) | email | text");

		const rewritten = await client.callTool("er_entity_set_texts", {
			path: targetPath,
			id: "users",
			columns: [{ column: 1, key: "UK", type: "varchar(80)" }],
		});
		expect(rewritten).toEqual({
			text: 'rewrote column 1 of erEntity "users"; it has 2 columns: 0 id [PK], 1 email [UK]',
			isError: false,
		});

		const styled = await client.callTool("er_entity_set_text_style", {
			path: targetPath,
			id: "users",
			title: true,
			fontWeight: "bold",
		});
		expect(styled.isError).toBe(false);

		const users = findObject(await workspace.readDoc(targetPath), "users");
		expect(users?.name).toEqual({ text: "users", fontWeight: "bold" });
		expect(users?.columns).toEqual([
			{ key: "PK", name: "id", type: "bigint" },
			{ key: "UK", name: "email", type: "varchar(80)" },
		]);

		const diagnosed = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});
		expect(diagnosed.text).toBe("valid: true");
	});

	it("moves a relationship line along with its column when a column is inserted above it", async () => {
		const targetPath = await workspace.writeDoc(
			"er-insert.jis.json",
			makeErDoc(),
		);

		const inserted = await client.callTool("er_entity_insert_columns", {
			path: targetPath,
			id: "orders",
			at: 1,
			columns: [{ name: "created_at", type: "timestamp" }],
		});
		expect(inserted.isError).toBe(false);
		expect(inserted.text).toContain(
			"3 columns: 0 id [PK], 1 created_at, 2 user_id [FK]",
		);

		const doc = await workspace.readDoc(targetPath);
		expect(findObject(doc, "rel")?.source).toEqual({
			owner: { id: "orders" },
			anchor: { kind: "connectPoint", id: "col:2:left" },
		});
		// An end on another entity is not touched
		expect(findObject(doc, "rel")?.target).toEqual({
			owner: { id: "users" },
			anchor: { kind: "connectPoint", id: "col:0:right" },
		});

		const undone = await client.callTool("undo", { path: targetPath });
		expect(undone.isError).toBe(false);
		const restored = await workspace.readDoc(targetPath);
		expect(findObject(restored, "rel")?.source).toEqual({
			owner: { id: "orders" },
			anchor: { kind: "connectPoint", id: "col:1:left" },
		});
		expect((findObject(restored, "orders")?.columns as unknown[]).length).toBe(
			2,
		);
	});

	it("connects two entities column to column through the anchor strings", async () => {
		const unconnected = makeErDoc();
		unconnected.root = unconnected.root.filter((object) => object.id !== "rel");
		const targetPath = await workspace.writeDoc(
			"er-connect.jis.json",
			unconnected,
		);

		const connected = await client.callTool("connect", {
			path: targetPath,
			sourceId: "orders",
			targetId: "users",
			sourceAnchor: "col:1:left",
			targetAnchor: "col:0:right",
		});
		expect(connected.isError).toBe(false);

		const connector = (await workspace.readDoc(targetPath)).root.find(
			(object) => object.type === "connector",
		);
		expect(connector?.source).toEqual({
			owner: { id: "orders" },
			anchor: { kind: "connectPoint", id: "col:1:left" },
		});
		expect(connector?.target).toEqual({
			owner: { id: "users" },
			anchor: { kind: "connectPoint", id: "col:0:right" },
		});

		const refused = await client.callTool("connect", {
			path: targetPath,
			sourceId: "orders",
			targetId: "users",
			sourceAnchor: "col:2:left",
		});
		expect(refused.text).toMatch(
			/^error: "col:2:left" is not a connect point of "orders" \(erEntity\)/,
		);
	});

	it("reports an end left on a column that no longer exists in diagnose_canvas", async () => {
		const stale = makeErDoc();
		const rel = findObject(stale, "rel") as Record<string, unknown>;
		rel.source = {
			owner: { id: "orders" },
			anchor: { kind: "connectPoint", id: "col:5:left" },
		};
		const targetPath = await workspace.writeDoc("er-stale.jis.json", stale);

		const diagnosed = await client.callTool("diagnose_canvas", {
			path: targetPath,
		});
		expect(diagnosed.text).toContain(
			'the source end names connect point "col:5:left", which orders (erEntity) does not offer, so it is drawn at the center of orders',
		);
	});
});

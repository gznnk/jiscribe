// Checks over a real `tools/call` round trip that the argument schemas do not
// silently drop unknown keys.
//
// Back on zod's default (strip), a misspelled argument and an argument the type
// does not have both vanish, along with a reply saying it succeeded. When this
// file fails, strict has come off.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type {
	CanvasFileContent,
	TempCanvasWorkspace,
} from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

const emptyDoc: CanvasFileContent = { version: 1, root: [] };

/**
 * A sample value satisfying the declaration, for each style key a refusal
 * message may name.
 */
const STYLE_SAMPLE_VALUES: Record<string, unknown> = {
	fill: "#e3f2fd",
	stroke: "#1565c0",
	strokeWidth: 2,
	strokeDashType: "dashed",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#102a43",
	fontSize: 16,
	fontFamily: '"Source Serif 4", "Noto Serif JP", serif',
	fontWeight: "bold",
	fontStyle: "italic",
	textDecoration: "underline",
};

let client: McpTestClient;
let workspace: TempCanvasWorkspace;
/**
 * The target rewritten by each test. The names are kept apart so that no test
 * writes back to another's file.
 */
let targetPath: string;
let testIndex = 0;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	await client.close();
	await workspace.remove();
});

beforeEach(async () => {
	targetPath = await workspace.writeDoc(
		`strict-${testIndex++}.jis.json`,
		emptyDoc,
	);
});

describe("unknown keys on an array element", () => {
	it("fails without creating a shape when an add_objects entry carries the document's own coordinates", async () => {
		// The accident that actually happened. The tool places every type by its
		// bounding rect, so cx / cy / ry were silently dropped and four ellipses
		// piled up at the origin at the default size
		const result = await client.callTool("add_objects", {
			path: targetPath,
			objects: [{ type: "ellipse", x: 0, y: 0, cx: 39, cy: 126, rx: 5, ry: 5 }],
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain("Unrecognized keys");
		expect(result.text).toContain("cx");
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	it("fails the same way for an unknown key on a connect_many entry", async () => {
		const result = await client.callTool("connect_many", {
			path: targetPath,
			entries: [{ sourceId: "a", targetId: "b", arrow: "end" }],
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "arrow" at entries[0]');
	});
});

describe("a style key the type cannot hold", () => {
	it("fails without creating a shape when add_objects writes rx on an ellipse", async () => {
		// rx is a proper key of styleSchema, so it passes strict untouched. Only
		// the doc layer, which knows the type's features, can say an ellipse has
		// no corners to round
		const result = await client.callTool("add_objects", {
			path: targetPath,
			objects: [
				{ type: "rect", x: 0, y: 0 },
				{ type: "ellipse", x: 200, y: 0, rx: 5 },
			],
		});

		// The schema lets it through, so the doc layer is what refuses. The reply
		// comes back as "error:" rather than as isError
		expect(result.text).toContain(
			'entries[1] (ellipse): object type "ellipse" cannot be styled with "rx"',
		);
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	// The doc layer has a wider style vocabulary than ai-tools, so a name the
	// refusal message lists may not exist on the tool. The AI then rewrites the
	// call as it was told to and fails a second time. The refusal is a signpost,
	// so every name it points at must go through
	it("takes every name the refusal message lists, exactly as given", async () => {
		const refused = await client.callTool("add_object", {
			path: targetPath,
			type: "ellipse",
			x: 0,
			y: 0,
			rx: 5,
		});
		const advertised = [...refused.text.matchAll(/"([a-zA-Z]+)"/g)]
			.map(([, name]) => name)
			.filter((name) => name !== "ellipse" && name !== "rx");
		expect(advertised.length).toBeGreaterThan(0);

		for (const name of advertised) {
			const value = STYLE_SAMPLE_VALUES[name];
			// A name with no sample is a hole in the test. This failure is how a key
			// newly added to doc gets noticed
			expect(value, `no sample value for "${name}"`).toBeDefined();
			const result = await client.callTool("add_object", {
				path: targetPath,
				type: "ellipse",
				x: 0,
				y: 0,
				[name]: value,
			});

			expect(result.text, name).not.toContain("Unrecognized key");
			expect(result.text, name).not.toContain("cannot be styled with");
		}
	});
});

describe("unknown keys at the top level", () => {
	it("fails on our own tools", async () => {
		const result = await client.callTool("add_rect", {
			path: targetPath,
			x: 0,
			y: 0,
			w: 200,
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "w"');
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	it("fails on the doc tools that come from ai-tools", async () => {
		const result = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
			cy: 40,
		});

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "cy"');
		expect(await workspace.readDoc(targetPath)).toEqual(emptyDoc);
	});

	it("fails on a tool that needs a canvas before it ever looks for a viewer", async () => {
		const result = await client.callTool("capture_canvas", { zoom: 2 });

		expect(result.isError).toBe(true);
		expect(result.text).toContain('Unrecognized key: "zoom"');
	});
});

describe("arguments that are correct", () => {
	it("lets arguments that match the declaration through as before", async () => {
		const added = await client.callTool("add_objects", {
			path: targetPath,
			objects: [
				{ type: "ellipse", x: 39, y: 126, width: 10, height: 10 },
				{ type: "rect", x: 0, y: 0, width: 160, height: 80, text: "箱" },
			],
		});

		expect(added.isError).toBe(false);
		const doc = await workspace.readDoc(targetPath);
		expect(doc.root).toHaveLength(2);
		expect(doc.root[0]).toMatchObject({
			type: "ellipse",
			cx: 44,
			cy: 131,
			rx: 5,
			ry: 5,
		});
	});

	it("carries the properties a type declares for itself through extraProps", async () => {
		const added = await client.callTool("add_object", {
			path: targetPath,
			type: "lucideIcon",
			x: 0,
			y: 0,
			width: 40,
			height: 40,
			extraProps: { icon: "star" },
		});

		expect(added.isError).toBe(false);
		expect((await workspace.readDoc(targetPath)).root[0]).toMatchObject({
			type: "lucideIcon",
			icon: "star",
		});
	});
});

describe("JSON Schema", () => {
	it("carries additionalProperties: false, so the AI reads the contract before calling", async () => {
		expect(await client.getToolInputSchema("add_objects")).toMatchObject({
			additionalProperties: false,
			properties: { objects: { items: { additionalProperties: false } } },
		});
	});
});

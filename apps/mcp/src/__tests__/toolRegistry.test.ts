import { isCanvasHandleTool } from "@jiscribe/ai-tools";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { canvasToolSet } from "../canvasDefinitions";
import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";

let client: McpTestClient;

beforeAll(async () => {
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
});

describe("createJiscribeMcpServer", () => {
	it("registers this server's own tools, in order", async () => {
		// A missing registration is a missing feature as far as the AI is
		// concerned, so the ones we own are pinned down to their order. The
		// ai-tools ones move as that side grows or shrinks, so the two tests below
		// only look at their count and at duplicates
		const names = await client.listToolNames();
		expect(names.slice(0, 8)).toEqual([
			"read_drawing_guide",
			"open_canvas",
			"close_canvas",
			"diagnose_canvas",
			"measure_text",
			"add_rect",
			"add_ellipse",
			"export_image",
		]);
	});

	it("registers every ai-tools declaration, doc-side and screen-side alike, plugin tools included", async () => {
		const names = await client.listToolNames();
		const descriptors = canvasToolSet.descriptors;

		// measure_text alone clashes with one of our own and goes in renamed
		const expectedNames = descriptors.map((descriptor) =>
			descriptor.name === "measure_text" && isCanvasHandleTool(descriptor)
				? "measure_rendered_text"
				: descriptor.name,
		);
		expect(names).toEqual(expect.arrayContaining(expectedNames));
		expect(descriptors.filter(isCanvasHandleTool)).toHaveLength(16);
	});

	it("never registers the same tool name twice", async () => {
		const names = await client.listToolNames();
		expect(new Set(names).size).toBe(names.length);
	});

	it("says of a tool that needs a canvas that its target is the open one", async () => {
		// The doc operations pick a file by path, while these only ever look at
		// the single open one. That difference in addressing is not in the
		// declaration's own description and shows up only as the presence or
		// absence of an argument, so it is filled in here
		const descriptors = canvasToolSet.descriptors;
		const handleNames = descriptors
			.filter(isCanvasHandleTool)
			.map((descriptor) =>
				descriptor.name === "measure_text"
					? "measure_rendered_text"
					: descriptor.name,
			);
		const descriptions = await Promise.all(
			handleNames.map((name) => client.getToolDescription(name)),
		);
		for (const description of descriptions) {
			expect(description).toContain("it takes no path");
		}
	});

	it("does not add that sentence to a tool a document alone can answer", async () => {
		expect(await client.getToolDescription("add_object")).not.toContain(
			"it takes no path",
		);
	});

	it("goes on to tell measure_rendered_text apart from our own measure_text", async () => {
		const description = await client.getToolDescription(
			"measure_rendered_text",
		);
		expect(description).toContain("it takes no path");
		expect(description).toContain("use measure_text instead");
	});

	it("exposes the one-shot creation arguments (autoHeight / textLayout) on add_object", async () => {
		const schema = await client.getToolInputProperties("add_object");
		expect(Object.keys(schema)).toEqual(
			expect.arrayContaining([
				"path",
				"type",
				"x",
				"y",
				"width",
				"height",
				"autoHeight",
				"textLayout",
				"text",
			]),
		);
	});
});

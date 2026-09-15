import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";

let client: McpTestClient;

beforeAll(async () => {
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
});

describe("read_drawing_guide", () => {
	it("hands back the drawing guide in full", async () => {
		const result = await client.callTool("read_drawing_guide", {
			guide: "drawing",
		});
		expect(result.isError).toBe(false);
		// Headings from the composed canvas-prompt.md. A staging failure returns
		// `error: ...` here rather than a short answer
		expect(result.text).toContain("# Drawing on a Jiscribe canvas");
		expect(result.text).toContain("## Object quick reference");
		expect(result.text.length).toBeGreaterThan(1000);
	});

	it("hands back the file-format guide in full", async () => {
		const result = await client.callTool("read_drawing_guide", {
			guide: "json-format",
		});
		expect(result.isError).toBe(false);
		expect(result.text).toContain("# The Jiscribe file format");
		expect(result.text).toContain("## Geometry by type");
		expect(result.text.length).toBeGreaterThan(1000);
	});

	it("rejects a guide name that is not one of the two", async () => {
		const result = await client.callTool("read_drawing_guide", {
			guide: "shapes",
		});
		expect(result.isError).toBe(true);
	});

	it("says when to read each guide", async () => {
		const description = await client.getToolDescription("read_drawing_guide");
		expect(description).toContain("before you start drawing");
		expect(description).toContain("read one once");
	});
});

describe("server instructions", () => {
	it("tells the client how this server is addressed", async () => {
		const instructions = client.getInstructions() ?? "";
		expect(instructions).toContain("single source of truth");
		expect(instructions).toContain("read_drawing_guide");
		// It rides in the context for the whole session, so the prose that belongs
		// in the guides must not leak into it
		expect(instructions.length).toBeLessThan(2048);
	});
});

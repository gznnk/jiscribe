import { standardCanvasToolSet } from "@jiscribe/doc-tools/canvas-tools";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runToolsCommand } from "../toolsCommand";

/** Runs `body` with both streams captured, and hands back what it wrote. */
const capture = (
	body: () => number,
): { code: number; stdout: string; stderr: string } => {
	let stdout = "";
	let stderr = "";
	vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		stdout += String(chunk);
		return true;
	});
	vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
		stderr += String(chunk);
		return true;
	});
	const code = body();
	vi.restoreAllMocks();
	return { code, stdout, stderr };
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("tools", () => {
	it("lists exactly the declarations a document alone answers, undo left out", () => {
		const expectedNames = standardCanvasToolSet.descriptors
			.filter(
				(descriptor) =>
					!descriptor.drives.some((ref) => ref.startsWith("handle.")) &&
					descriptor.name !== "undo",
			)
			.map((descriptor) => descriptor.name);
		const { code, stdout } = capture(() => runToolsCommand(["--json"]));
		expect(code).toBe(0);
		const { tools } = JSON.parse(stdout) as {
			tools: { name: string; summary: string }[];
		};
		expect(tools.map((tool) => tool.name)).toEqual(expectedNames);
		expect(expectedNames).toContain("add_object");
		expect(expectedNames).not.toContain("capture_canvas");
	});

	it("summarises each tool with the first sentence of its description", () => {
		const { stdout } = capture(() => runToolsCommand([]));
		const addObjectLine = stdout
			.split("\n")
			.find((line) => line.startsWith("add_object "));
		expect(addObjectLine).toMatch(
			/^add_object +Add one object to the canvas; placing several at once is add_objects instead\.$/,
		);
	});

	it("describes one tool with its full description and a closed JSON Schema", () => {
		const { code, stdout } = capture(() =>
			runToolsCommand(["connect", "--json"]),
		);
		expect(code).toBe(0);
		const described = JSON.parse(stdout) as {
			name: string;
			description: string;
			inputSchema: {
				type: string;
				additionalProperties: unknown;
				properties: Record<string, unknown>;
			};
		};
		expect(described.name).toBe("connect");
		expect(described.description).toBe(
			standardCanvasToolSet.descriptors.find(
				(descriptor) => descriptor.name === "connect",
			)?.description,
		);
		expect(described.inputSchema.type).toBe("object");
		expect(described.inputSchema.additionalProperties).toBe(false);
		expect(described.inputSchema.properties).toHaveProperty("sourceId");
		expect(described.inputSchema.properties).not.toHaveProperty("path");
	});

	it("describes one tool in text: name, description, then the schema", () => {
		const { code, stdout } = capture(() => runToolsCommand(["connect"]));
		expect(code).toBe(0);
		const [name, blank, description, blankAgain, heading, ...schemaLines] =
			stdout.split("\n");
		expect([name, blank, blankAgain, heading]).toEqual([
			"connect",
			"",
			"",
			"arguments (JSON Schema):",
		]);
		expect(description).toBe(
			standardCanvasToolSet.descriptors.find(
				(descriptor) => descriptor.name === "connect",
			)?.description,
		);
		expect(JSON.parse(schemaLines.join("\n"))).toMatchObject({
			type: "object",
			additionalProperties: false,
		});
	});

	it("refuses a screen tool, saying it needs jiscribe-mcp's viewer", () => {
		const { code, stderr } = capture(() => runToolsCommand(["capture_canvas"]));
		expect(code).toBe(1);
		expect(stderr).toMatch(/needs a viewer.*jiscribe-mcp/);
	});

	it("refuses undo and an unknown name", () => {
		expect(capture(() => runToolsCommand(["undo"])).code).toBe(1);
		const unknown = capture(() => runToolsCommand(["no_such_tool"]));
		expect(unknown.code).toBe(1);
		expect(unknown.stderr).toMatch(/unknown tool: no_such_tool/);
	});
});

// A reply says once whether it failed. applyCanvasOp writes `internal error:` in
// front of a failure that is not the AI's doing, and wrapping that in another
// `error:` would leave the AI reading two verdicts in one line.
//
// An internal error cannot be provoked through a real operation, so the applying
// side is stood in for here.

import type * as aiToolsApplyModule from "@jiscribe/ai-tools/apply";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

/** What the stand-in applyCanvasOp answers with; null lets the real one run */
const injection = vi.hoisted(() => ({
	outcome: null as { ok: boolean; text: string } | null,
}));

vi.mock("@jiscribe/ai-tools/apply", async (importActual) => {
	const actual = await importActual<typeof aiToolsApplyModule>();
	return {
		...actual,
		applyCanvasOp: (
			...args: Parameters<typeof actual.applyCanvasOp>
		): ReturnType<typeof actual.applyCanvasOp> =>
			injection.outcome ?? actual.applyCanvasOp(...args),
	};
});

let client: McpTestClient;
let workspace: TempCanvasWorkspace;
let targetPath: string;
let testIndex = 0;

beforeAll(async () => {
	client = await connectMcpTestClient();
	workspace = await createTempCanvasWorkspace();
});

afterAll(async () => {
	injection.outcome = null;
	await client.close();
	await workspace.remove();
});

beforeEach(async () => {
	injection.outcome = null;
	targetPath = await workspace.writeDoc(`prefix-${testIndex++}.jis.json`, {
		version: 1,
		root: [],
	});
});

describe("the prefix a failed operation is reported with", () => {
	it("leaves an internal error to say so once", async () => {
		injection.outcome = { ok: false, text: "internal error: boom" };

		const fromDocTool = await client.callTool("add_object", {
			path: targetPath,
			type: "rect",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
		});
		const fromOwnTool = await client.callTool("add_rect", {
			path: targetPath,
			x: 0,
			y: 0,
		});

		expect(fromDocTool.text).toBe("internal error: boom");
		expect(fromOwnTool.text).toBe("internal error: boom");
	});

	it("puts error: in front of a failure the AI can act on", async () => {
		injection.outcome = { ok: false, text: "object not found: nope" };

		const result = await client.callTool("add_rect", {
			path: targetPath,
			x: 0,
			y: 0,
		});

		expect(result.text).toBe("error: object not found: nope");
	});
});

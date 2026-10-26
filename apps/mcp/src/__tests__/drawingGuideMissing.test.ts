// A guide the installation lacks comes back as an `error:` reply carrying the
// reader's own wording, not as an empty answer or an internal error.

import { DrawingGuideError } from "@jiscribe/doc-tools/guides";
import type * as DocToolsGuides from "@jiscribe/doc-tools/guides";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

import type { McpTestClient } from "./mcpTestClient";
import { connectMcpTestClient } from "./mcpTestClient";

vi.mock("@jiscribe/doc-tools/guides", async (importOriginal) => ({
	...(await importOriginal<typeof DocToolsGuides>()),
	readDrawingGuide: () => {
		throw new DrawingGuideError(
			'the "drawing" guide at @jiscribe/doc-schema/canvas-prompt is empty, so this installation is incomplete',
		);
	},
}));

let client: McpTestClient;

beforeAll(async () => {
	client = await connectMcpTestClient();
});

afterAll(async () => {
	await client.close();
});

it("replies error: with the reason when the guide cannot be handed out", async () => {
	const result = await client.callTool("read_drawing_guide", {
		guide: "drawing",
	});
	expect(result.text).toBe(
		'error: the "drawing" guide at @jiscribe/doc-schema/canvas-prompt is empty, so this installation is incomplete',
	);
});

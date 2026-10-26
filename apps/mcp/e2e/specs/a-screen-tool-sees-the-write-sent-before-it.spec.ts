import { SECOND_RECT, SINGLE_RECT, twoRectDoc } from "../support/canvasDocs";
import { countMarkerPixels, MARKER_FILL } from "../support/capturedPng";
import { expect, objectCenter, test } from "../support/fixtures";

// A regression for a screen tool answering against the drawing from before a write
// sent ahead of it. The page used to learn of a tool's write only when the host's
// file watch next polled (every 300 ms), and a screen tool sent right after the
// write — or in the same batch, as a client is free to — was answered before that.

test("captures a fill set just before the capture", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const styled = await mcp.callTool("set_style", {
		path: filePath,
		ids: [SINGLE_RECT.id],
		fill: MARKER_FILL,
	});
	expect(styled.text).not.toContain("error:");
	const captured = await mcp.callTool("capture_canvas", {});

	expect(await countMarkerPixels(page, captured)).toBeGreaterThan(0);
});

test("captures a fill set in the same batch as the capture", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const [styled, captured] = await Promise.all([
		mcp.callTool("set_style", {
			path: filePath,
			ids: [SINGLE_RECT.id],
			fill: MARKER_FILL,
		}),
		mcp.callTool("capture_canvas", {}),
	]);

	expect(styled.text).not.toContain("error:");
	expect(await countMarkerPixels(page, captured)).toBeGreaterThan(0);
});

test("finds a shape added in the same batch as the query", async ({
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const [added, hit] = await Promise.all([
		mcp.callTool("add_rect", {
			path: filePath,
			x: 240,
			y: 300,
			width: 100,
			height: 60,
		}),
		mcp.callTool("hit_test", { point: { x: 290, y: 330 } }),
	]);

	expect(added.text).not.toContain("error:");
	const addedId = String((await workspace.readDoc(filePath)).root[2].id);
	expect(hit.text).toContain(`"${addedId}"`);
});

test("says the drawing is not current rather than answering from it while a person holds a drag", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);

	const from = await objectCenter(canvas, SINGLE_RECT.id);
	const halfway = { x: from.x + 60, y: from.y + 40 };
	await canvas.dragInspecting(from, halfway, async () => {
		const moved = await mcp.callTool("set_position", {
			path: filePath,
			id: SECOND_RECT.id,
			x: 700,
			y: 400,
		});
		expect(moved.text).not.toContain("error:");
		const viewed = await mcp.callTool("get_view", {});
		expect(viewed.text).toContain("a person is in the middle of an edit");
	});

	// Once they let go, the write is drawn and the same question is answered
	await expect
		.poll(async () => (await mcp.callTool("get_view", {})).text)
		.not.toContain("error:");
	await expect(page.locator(`[data-id="${SECOND_RECT.id}"]`)).toBeVisible();
});

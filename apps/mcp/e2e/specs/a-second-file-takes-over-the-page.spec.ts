import { join } from "node:path";

import {
	expect,
	expectFileOnDisplay,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

// A regression for the echo detection: the page recognises its own write coming
// back by comparing the text alone, so two new files in one directory — both empty,
// so both carrying the very same text — used to leave the page believing it was
// already showing the second one. It then kept drawing and saving the first.
test("moves to the second new file in the same directory, and edits then follow it", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	// Named but not written: open_canvas creates each as an empty canvas, which is
	// what makes the two files indistinguishable by their text
	const firstPath = join(workspace.dirPath, "a.jis.json");
	const secondPath = join(workspace.dirPath, "b.jis.json");

	await openInViewer(firstPath);
	await openInViewer(secondPath);
	await expectFileOnDisplay(page, "b.jis.json");

	const added = await mcp.callTool("add_rect", {
		path: secondPath,
		x: 40,
		y: 40,
		width: 120,
		height: 80,
		text: "second",
	});
	expect(added.isError).toBe(false);
	const addedId = String((await workspace.readDoc(secondPath)).root[0].id);
	await expect(page.locator(`[data-id="${addedId}"]`)).toBeVisible();

	await selectObject(canvas, addedId);
	await canvas.nudge("right", { large: true });

	await expect
		.poll(async () => (await workspace.readDoc(secondPath)).root[0].x, {
			message: "the nudge lands in the file on display",
		})
		.toBe(40 + NUDGE_STEP);
	// The first file is the one the page would have written to had it mistaken the
	// second for its own echo
	expect((await workspace.readDoc(firstPath)).root).toHaveLength(0);
	await expectNoViewerError(page);
});

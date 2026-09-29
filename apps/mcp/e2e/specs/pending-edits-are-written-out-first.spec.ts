import { join } from "node:path";

import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectFileOnDisplay,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

// A regression for the flush handshake: a write is only accepted for the file on
// display, so edits still sitting on the save debounce when another file is put up
// would be refused (409) and lost. The host asks the windows to write out first,
// and waits for them.
//
// The edit is made and the next file opened without waiting for the debounce. If it
// elapsed first the file would hold the edit anyway and this would pass without
// having exercised the handshake, but it can only fail the way the bug failed: with
// the edit gone.
test("writes out a pending edit before putting another file on display", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "b.jis.json");

	await openInViewer(firstPath);
	await selectObject(canvas, SINGLE_RECT.id);
	const placedTransform = await canvas
		.objectById(SINGLE_RECT.id)
		.getAttribute("transform");
	await canvas.nudge("right", { large: true });
	// Waiting on the drawn result rather than on time: the shape having moved is
	// what says the edit is committed and buffered, which is the state the
	// handshake has to catch
	await expect
		.poll(async () =>
			canvas.objectById(SINGLE_RECT.id).getAttribute("transform"),
		)
		.not.toBe(placedTransform);

	const opened = await mcp.callTool("open_canvas", { path: secondPath });
	expect(opened.isError).toBe(false);

	await expectFileOnDisplay(page, "b.jis.json");
	expect((await workspace.readDoc(firstPath)).root[0].x).toBe(
		SINGLE_RECT.x + NUDGE_STEP,
	);
	await expectNoViewerError(page);
});

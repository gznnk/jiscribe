import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

/** What Ctrl+S answers with once the page holds nothing the file does not */
const AUTO_SAVE_NOTICE = "変更は自動で保存されます";

// A regression for the page's notion of which document it holds: it went by the
// workspace-relative path alone, so a file of the same name in another directory —
// where the host restarts and the page reconnects on its own — was taken for the
// one already drawn. The canvas was never told a new document had loaded, and
// Ctrl+Z took back the previous file's edit on top of the new one, writing the
// previous file's content into it.
test("an undo after switching to a same-named file in another directory does not reach back into the previous file", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	await mkdir(join(workspace.dirPath, "one"));
	await mkdir(join(workspace.dirPath, "two"));
	const firstPath = await workspace.writeDoc(
		join("one", "a.jis.json"),
		singleRectDoc(),
	);
	const secondPath = await workspace.writeDoc(join("two", "a.jis.json"), {
		version: 1,
		root: [
			{
				type: "rect",
				id: "z1",
				x: 400,
				y: 300,
				width: 100,
				height: 60,
				text: "second",
			},
		],
	});

	await openInViewer(firstPath);
	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	await expect
		.poll(async () => (await workspace.readDoc(firstPath)).root[0].x, {
			message: "the nudge lands in the first file, leaving an undo step behind",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);

	// Not through openInViewer, which navigates: the undo history lives in the page,
	// so the page has to be the one that follows the host over on its own
	const opened = await mcp.callTool("open_canvas", { path: secondPath });
	expect(opened.isError).toBe(false);
	await expect(page.locator('[data-id="z1"]')).toBeVisible();

	await canvas.deselect();
	await canvas.undo();
	// Ctrl+S writes out whatever the undo committed right away, and its notice says
	// the write is done, so the file is read only once anything that was coming has
	// arrived
	await page.keyboard.press("Control+s");
	await expect(page.getByRole("status")).toHaveText(AUTO_SAVE_NOTICE);

	const secondDoc = await workspace.readDoc(secondPath);
	expect(secondDoc.root.map((object) => object.id)).toEqual(["z1"]);
	await expect(page.locator(`[data-id="${SINGLE_RECT.id}"]`)).toHaveCount(0);
	await expectNoViewerError(page);
});

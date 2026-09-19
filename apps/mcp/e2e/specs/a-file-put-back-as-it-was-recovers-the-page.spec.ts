import { readFile, rm, writeFile } from "node:fs/promises";

import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

/**
 * What the viewer puts under the parse error while the file cannot be read
 * (BROKEN_FILE_NOTE in src/viewer/useDocSync.ts). Repeated here rather than
 * imported, since it belongs to the module the page is built from
 */
const BROKEN_FILE_NOTE =
	"ファイルが壊れています。読めるようになるまで、この画面の編集は保存されません";

/**
 * Longer than the viewer's save debounce (SAVE_DEBOUNCE_MS, 500 ms), so that an
 * edit made while the file is broken has run into the block on saving rather than
 * still sitting on the timer when the file comes back
 */
const PAST_SAVE_DEBOUNCE_MS = 1_000;

// A regression for recovery being taken for an echo. Put back byte for byte, the
// file holds the very text the page last synced, which is also what a save of the
// page's own coming back looks like; the page took it for that, and so kept the
// broken-file or missing-file error up — and, for a broken one, kept refusing to
// save — until some other change came along and threw the unsaved edits away.

test("clears the broken-file error and saves again once the file is put back as it was", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	const originalText = await readFile(filePath, "utf8");
	await openInViewer(filePath);

	await writeFile(filePath, "{ not json", "utf8");
	await expect(page.locator(".viewer-error")).toContainText(BROKEN_FILE_NOTE);

	await writeFile(filePath, originalText, "utf8");
	await expectNoViewerError(page);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			message: "an edit after the recovery reaches the file",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);
	await expectNoViewerError(page);
});

test("saves an edit made while the file was broken once it is put back as it was", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	const originalText = await readFile(filePath, "utf8");
	await openInViewer(filePath);

	await writeFile(filePath, "{ not json", "utf8");
	await expect(page.locator(".viewer-error")).toContainText(BROKEN_FILE_NOTE);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	// Waited out on time: a blocked save sends nothing, so there is nothing to wait on
	await page.waitForTimeout(PAST_SAVE_DEBOUNCE_MS);
	expect(await readFile(filePath, "utf8")).toBe("{ not json");

	// The file is back to the text the edit was made on, so the edit is still an
	// edit of this file and nothing outside is overwritten by writing it
	await writeFile(filePath, originalText, "utf8");
	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			message: "the edit held through the broken file reaches it",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);
	await expectNoViewerError(page);
});

test("clears the missing-file error once the file is put back as it was", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	const originalText = await readFile(filePath, "utf8");
	await openInViewer(filePath);

	await rm(filePath);
	await expect(page.locator(".viewer-error")).toContainText("ENOENT");

	await writeFile(filePath, originalText, "utf8");
	await expectNoViewerError(page);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			message: "an edit after the recovery reaches the file",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);
	await expectNoViewerError(page);
});

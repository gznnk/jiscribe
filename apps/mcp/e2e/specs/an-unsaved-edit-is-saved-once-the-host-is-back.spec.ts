import { FILE_API_PATHNAME } from "../../src/shared/fileApiRoute";
import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	lostEditsNotice,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

/**
 * The start of what the viewer puts in the error bar for a write that did not
 * reach the host (src/viewer/useDocSync.ts). Repeated here rather than imported,
 * since it belongs to the module the page is built from
 */
const SAVE_FAILED_PREFIX = "保存に失敗しました";

/**
 * What the viewer's notice says when a newer file changed the object an edit it
 * has not saved yet was made to, the object's name following it
 * (MERGE_CONFLICT_MESSAGE_PREFIX in src/viewer/mergeConflictMessage.ts)
 */
const MERGE_CONFLICT_PREFIX =
	"他の編集で更新されたため、次の変更は保存されませんでした: ";

/**
 * How long the edit is given to reach the file once the host can be reached again.
 * Longer than the viewer's retry backoff tops out at (SAVE_RETRY_MAX_DELAY_MS,
 * 10 s), so that the test waits on the retry and not on anything it does itself
 */
const RESENT_WITHIN_MS = 15_000;

// A regression for a write that failed on the way being given up for good. The
// edit stayed on screen and out of the file, nothing sent it again once the host
// could be reached, and the next frame for the same file drew over it and cleared
// the error bar — so the edit went without a word.

test("sends an edit again once its write stops being cut off", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	let isWriteCutOff = true;
	await page.route(
		(url) => url.pathname === FILE_API_PATHNAME,
		async (route) => {
			if (route.request().method() === "PUT" && isWriteCutOff) {
				await route.abort();
				return;
			}
			await route.continue();
		},
	);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	await expect(page.locator(".viewer-error")).toContainText(SAVE_FAILED_PREFIX);
	expect((await workspace.readDoc(filePath)).root[0].x).toBe(SINGLE_RECT.x);

	isWriteCutOff = false;

	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			timeout: RESENT_WITHIN_MS,
			message: "the edit reaches the file with nothing more done in the page",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);
	await expectNoViewerError(page);
});

test("saves an edit made just before going offline once back online", async ({
	page,
	context,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	// Inside the save debounce, so that the write goes out with the network gone
	await context.setOffline(true);
	await expect(page.locator(".viewer-error")).toContainText(SAVE_FAILED_PREFIX);

	await context.setOffline(false);

	await expect
		.poll(async () => (await workspace.readDoc(filePath)).root[0].x, {
			timeout: RESENT_WITHIN_MS,
			message: "the edit reaches the file once the network is back",
		})
		.toBe(SINGLE_RECT.x + NUDGE_STEP);
	await expectNoViewerError(page);
});

test("says so when a tool's write to the same object wins over an edit that could not be saved", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	await page.route(
		(url) => url.pathname === FILE_API_PATHNAME,
		async (route) => {
			if (route.request().method() === "PUT") {
				await route.abort();
				return;
			}
			await route.continue();
		},
	);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	await expect(page.locator(".viewer-error")).toContainText(SAVE_FAILED_PREFIX);

	const edited = await mcp.callTool("set_text", {
		path: filePath,
		id: SINGLE_RECT.id,
		text: "from the AI",
	});
	expect(edited.isError).toBe(false);

	// Named by the text the tool gave it, which is what the page now draws. The
	// failed write is no longer owed, so the error bar goes with it
	await expect(lostEditsNotice(page)).toHaveText(
		`${MERGE_CONFLICT_PREFIX}「from the AI」`,
	);
	await expect(page.locator(".viewer-error")).toHaveCount(0);
});

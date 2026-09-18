import { FILE_API_PATHNAME } from "../../src/shared/fileApiRoute";
import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import { expect, selectObject, test } from "../support/fixtures";

/**
 * What the viewer puts in the error bar when the host refused a write over a newer
 * file (SAVE_CONFLICT_MESSAGE in src/viewer/useDocSync.ts). Repeated here rather
 * than imported, since it belongs to the module the page is built from
 */
const SAVE_CONFLICT_MESSAGE =
	"他の編集で更新されたため、この変更は保存されませんでした";

// The 412 path, arranged by holding the page's write in the browser while a tool
// rewrites the same file underneath it.
//
// The write has to be in the air already: a tool's write that lands before the save
// debounce elapses is simply redrawn, and the page then has nothing left to save.
// So the order is driven off the requests themselves rather than off time — the
// write is let go only once the page has drawn the tool's shape, which is proof the
// revision it quotes is no longer the file's.
test("says so in the page when a tool's write overtakes an unsaved edit", async ({
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

	let releaseWrite = (): void => {};
	const writeReleased = new Promise<void>((resolve) => {
		releaseWrite = resolve;
	});
	let reportWriteSent = (): void => {};
	const writeSent = new Promise<void>((resolve) => {
		reportWriteSent = resolve;
	});
	await page.route(
		(url) => url.pathname === FILE_API_PATHNAME,
		async (route) => {
			if (route.request().method() !== "PUT") {
				await route.continue();
				return;
			}
			reportWriteSent();
			await writeReleased;
			await route.continue();
		},
	);

	await selectObject(canvas, SINGLE_RECT.id);
	await canvas.nudge("right", { large: true });
	await writeSent;

	const added = await mcp.callTool("add_rect", {
		path: filePath,
		x: 240,
		y: 40,
		width: 100,
		height: 60,
		text: "from the AI",
	});
	expect(added.isError).toBe(false);
	const addedId = String((await workspace.readDoc(filePath)).root[1].id);
	await expect(page.locator(`[data-id="${addedId}"]`)).toBeVisible();

	releaseWrite();

	await expect(page.locator(".viewer-error")).toHaveText(SAVE_CONFLICT_MESSAGE);
	// The refused write is the person's, so the file keeps the tool's version of the
	// rectangle: where it was placed, not where it was nudged to
	const doc = await workspace.readDoc(filePath);
	expect(doc.root).toHaveLength(2);
	expect(doc.root[0].x).toBe(SINGLE_RECT.x);
});

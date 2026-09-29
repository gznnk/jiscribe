import { FILE_API_PATHNAME } from "../../src/shared/fileApiRoute";
import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	selectObject,
	test,
} from "../support/fixtures";

/** One large nudge, which the canvas moves the selection by */
const NUDGE_STEP = 10;

// The 412 path, arranged by holding the page's write in the browser while a tool
// rewrites the same file underneath it. The refused edit is not given up: the newer
// file arrives, the edit is merged onto it, and the merge is written under the
// newer revision.
//
// The write has to be in the air already: a tool's write that lands before the save
// debounce elapses is simply redrawn, and the page then has nothing left to save.
// So the order is driven off the requests themselves rather than off time — the
// write is let go only once the page has drawn the tool's shape, which is proof the
// revision it quotes is no longer the file's.
test("merges an edit whose write a tool's write overtook onto the newer file", async ({
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

	await expect
		.poll(
			async () => {
				const doc = await workspace.readDoc(filePath);
				return doc.root.map((object) => [object.id, object.x]);
			},
			{ message: "the file holds the nudge and the tool's shape both" },
		)
		.toEqual([
			[SINGLE_RECT.id, SINGLE_RECT.x + NUDGE_STEP],
			[addedId, 240],
		]);
	await expectNoViewerError(page);
});

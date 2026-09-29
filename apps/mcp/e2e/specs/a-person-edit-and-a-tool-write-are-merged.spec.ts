import type { Page } from "@playwright/test";

import { FILE_API_PATHNAME } from "../../src/shared/fileApiRoute";
import { SECOND_RECT, SINGLE_RECT, twoRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectNoViewerError,
	LOST_EDITS_NOTICE_DURATION_MS,
	lostEditsNotice,
	objectCenter,
	test,
} from "../support/fixtures";

/** How far the person drags the first rectangle, well past any snap distance */
const DRAG_DELTA = { x: 150, y: 100 } as const;

/** Where the tool puts whichever rectangle it moves */
const TOOL_POSITION = { x: 700, y: 400 } as const;

/**
 * What the viewer's notice says of a change of the person's that lost to one made
 * elsewhere, the object's name following it (MERGE_CONFLICT_MESSAGE_PREFIX in
 * src/viewer/mergeConflictMessage.ts). Repeated here rather than imported, since
 * it belongs to the module the page is built from
 */
const MERGE_CONFLICT_PREFIX =
	"他の編集で更新されたため、次の変更は保存されませんでした: ";

/**
 * Holds the page's writes until `release` is called. It is what makes "the tool
 * wrote while the person's edit was still unsaved" hold whatever the timing: the
 * edit is either still on the debounce when the tool writes, or its write is in the
 * air and meets the file the tool changed — the two ways the edit used to be lost.
 *
 * @param page The viewer page
 * @returns The call that lets the held writes go
 */
async function holdWrites(page: Page): Promise<() => void> {
	let release = (): void => {};
	const released = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route(
		(url) => url.pathname === FILE_API_PATHNAME,
		async (route) => {
			if (route.request().method() === "PUT") {
				await released;
			}
			await route.continue();
		},
	);
	return release;
}

// A regression for an edit still on the save debounce being drawn over. The tool's
// write arrived for the same file, the page replaced its doc with it, and the drag
// the person had just made went without ever reaching the file.

test("keeps both a drag and a tool's write to another object", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);
	const releaseWrites = await holdWrites(page);

	const from = await objectCenter(canvas, SINGLE_RECT.id);
	await canvas.drag(from, {
		x: from.x + DRAG_DELTA.x,
		y: from.y + DRAG_DELTA.y,
	});
	const moved = await mcp.callTool("set_position", {
		path: filePath,
		id: SECOND_RECT.id,
		...TOOL_POSITION,
	});
	expect(moved.text).not.toContain("error:");
	releaseWrites();

	await expect
		.poll(
			async () => {
				const [dragged, toolMoved] = (await workspace.readDoc(filePath)).root;
				return {
					isDragged: Number(dragged.x) > SINGLE_RECT.x + DRAG_DELTA.x / 2,
					toolX: toolMoved.x,
					toolY: toolMoved.y,
				};
			},
			{ message: "the file holds the drag and the tool's move both" },
		)
		.toEqual({
			isDragged: true,
			toolX: TOOL_POSITION.x,
			toolY: TOOL_POSITION.y,
		});
	await expectNoViewerError(page);
});

test("lets a tool's write win over a drag of the same object, and says so", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);
	const releaseWrites = await holdWrites(page);

	const from = await objectCenter(canvas, SINGLE_RECT.id);
	await canvas.drag(from, {
		x: from.x + DRAG_DELTA.x,
		y: from.y + DRAG_DELTA.y,
	});
	const moved = await mcp.callTool("set_position", {
		path: filePath,
		id: SINGLE_RECT.id,
		...TOOL_POSITION,
	});
	expect(moved.text).not.toContain("error:");
	releaseWrites();

	// Named by the text on it, which is what the person sees
	await expect(lostEditsNotice(page)).toHaveText(
		`${MERGE_CONFLICT_PREFIX}「hello」`,
	);
	await expect(page.locator(".viewer-error")).toHaveCount(0);
	// The file is the tool's, and the page draws it rather than the drag: the tool
	// put the first rectangle right of the second
	const doc = await workspace.readDoc(filePath);
	expect(doc.root[0]).toMatchObject({ id: SINGLE_RECT.id, ...TOOL_POSITION });
	const secondBox = await canvas.objectById(SECOND_RECT.id).boundingBox();
	await expect
		.poll(
			async () =>
				(await canvas.objectById(SINGLE_RECT.id).boundingBox())?.x ?? 0,
			{ message: "the page draws the tool's position, not the drag" },
		)
		.toBeGreaterThan(secondBox?.x ?? Infinity);
});

// A regression for the notice of a dropped change staying up for good. It was put
// in the error bar and cleared only by the person's next edit or the next change
// to the file, so once both sides had settled it went on standing there, not to be
// told apart from a failure still going on.
test("the notice of a change lost to a tool's write goes on its own", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc("drawing.jis.json", twoRectDoc());
	await openInViewer(filePath);
	const releaseWrites = await holdWrites(page);

	const from = await objectCenter(canvas, SINGLE_RECT.id);
	await canvas.drag(from, {
		x: from.x + DRAG_DELTA.x,
		y: from.y + DRAG_DELTA.y,
	});
	const moved = await mcp.callTool("set_position", {
		path: filePath,
		id: SINGLE_RECT.id,
		...TOOL_POSITION,
	});
	expect(moved.text).not.toContain("error:");
	releaseWrites();

	await expect(lostEditsNotice(page)).toHaveText(
		`${MERGE_CONFLICT_PREFIX}「hello」`,
	);
	await expect(lostEditsNotice(page)).toHaveCount(0, {
		timeout: LOST_EDITS_NOTICE_DURATION_MS + 1_000,
	});
	await expectNoViewerError(page);
});

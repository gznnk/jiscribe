import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { Page } from "@playwright/test";

import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectFileOnDisplay,
	expectNoViewerError,
	objectCenter,
	test,
} from "../support/fixtures";

/** How far the rectangle is dragged, in screen pixels */
const DRAG_DX = 70;

/**
 * How long the button stays down after open_canvas is called: well inside the
 * stretch the page waits for a drag to be let go before it answers the flush
 */
const RELEASE_AFTER_MS = 300;

/** The error bar's text for what a switch took from under the person's hands */
const lostInHandPattern = (fileName: string, whatWasLost: string): RegExp =>
	new RegExp(`^${fileName}: .*${whatWasLost}.*保存されませんでした$`);

/** What the page leaves on its window for the cross-directory spec to read */
type ErrorBarLogWindow = Window & { errorBarTexts: string[] };

/**
 * Records every text the error bar shows, so that a message replaced a moment
 * later still counts
 */
const installErrorBarLog = (): void => {
	const logWindow = window as unknown as ErrorBarLogWindow;
	logWindow.errorBarTexts = [];
	new MutationObserver(() => {
		const text = document.querySelector(".viewer-error")?.textContent ?? null;
		if (text !== null && logWindow.errorBarTexts.at(-1) !== text) {
			logWindow.errorBarTexts.push(text);
		}
	}).observe(document, { subtree: true, childList: true, characterData: true });
};

/** Presses the rectangle and drags it, leaving the button down */
async function dragWithoutReleasing(page: Page): Promise<void> {
	const rect = page.locator(`[data-id="${SINGLE_RECT.id}"]`).first();
	const placedTransform = await rect.getAttribute("transform");
	const box = await rect.boundingBox();
	if (box === null) {
		throw new Error(`${SINGLE_RECT.id} is not drawn, so it cannot be dragged`);
	}
	const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
	await page.mouse.move(center.x, center.y);
	await page.mouse.down();
	await page.mouse.move(center.x + DRAG_DX, center.y, { steps: 6 });
	await expect
		.poll(async () => rect.getAttribute("transform"))
		.not.toBe(placedTransform);
}

// A regression for work a person had in hand when open_canvas moved the page to
// another file: the canvas drops a drag in progress and closes the text editor when
// it takes a new document, so neither ever reached the file, and nothing said so.

test("a drag let go shortly after open_canvas lands in the file it was made on", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "c.jis.json");
	await openInViewer(firstPath);

	await dragWithoutReleasing(page);
	const opening = mcp.callTool("open_canvas", { path: secondPath });
	// There is no event to wait on: the point is the button staying down while the
	// host asks for the flush
	await page.waitForTimeout(RELEASE_AFTER_MS);
	await page.mouse.up();
	expect((await opening).isError).toBe(false);
	await expectFileOnDisplay(page, "c.jis.json");

	expect((await workspace.readDoc(firstPath)).root[0].x).toBeGreaterThan(
		SINGLE_RECT.x,
	);
	expect((await workspace.readDoc(secondPath)).root).toEqual([]);
	await expectNoViewerError(page);
});

test("a drag still held when the file switches is said to be lost", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "c.jis.json");
	await openInViewer(firstPath);

	await dragWithoutReleasing(page);
	expect(
		(await mcp.callTool("open_canvas", { path: secondPath })).isError,
	).toBe(false);
	await expectFileOnDisplay(page, "c.jis.json");
	await page.mouse.up();

	await expect(page.locator(".viewer-error")).toHaveText(
		lostInHandPattern("a.jis.json", "ドラッグ中の操作"),
	);
	expect((await workspace.readDoc(firstPath)).root[0].x).toBe(SINGLE_RECT.x);
	expect((await workspace.readDoc(secondPath)).root).toEqual([]);
});

test("text still being typed when the file switches is said to be lost", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "c.jis.json");
	await openInViewer(firstPath);

	await canvas.typeTextAt(await objectCenter(canvas, SINGLE_RECT.id), " typed");
	expect(
		(await mcp.callTool("open_canvas", { path: secondPath })).isError,
	).toBe(false);
	await expectFileOnDisplay(page, "c.jis.json");

	await expect(page.locator(".viewer-error")).toHaveText(
		lostInHandPattern("a.jis.json", "入力中のテキスト"),
	);
	expect((await workspace.readDoc(firstPath)).root[0].text).toBe("hello");
	expect((await workspace.readDoc(secondPath)).root).toEqual([]);
});

// Across directories the host restarts, and the page stays on the previous file
// until it has reconnected. An edit finished in that stretch is written with the
// previous host's token, which the new host refuses: that refusal is the same edit
// lost to the switch, and was shown as a raw "invalid session token" on top of it.
test("an edit refused by the host of another directory is said to be lost once, in plain words", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	await page.addInitScript(installErrorBarLog);
	await mkdir(join(workspace.dirPath, "one"));
	await mkdir(join(workspace.dirPath, "two"));
	const firstPath = await workspace.writeDoc(
		join("one", "a.jis.json"),
		singleRectDoc(),
	);
	const secondPath = join(workspace.dirPath, "two", "b.jis.json");
	// The page's second socket — the one to the new host — is held off the host
	// until the edit has been refused, which keeps the page on the previous file for
	// it. A route only takes the sockets of a page loaded after it is in place
	let socketCount = 0;
	let releaseSocket = (): void => {};
	let resolveSocketHeld = (): void => {};
	const isSocketHeld = new Promise<void>((resolveHeld) => {
		resolveSocketHeld = resolveHeld;
	});
	await page.routeWebSocket(/\/ws\b/, (socketRoute) => {
		socketCount += 1;
		if (socketCount === 1) {
			socketRoute.connectToServer();
			return;
		}
		releaseSocket = () => {
			socketRoute.connectToServer();
		};
		resolveSocketHeld();
	});
	await openInViewer(firstPath);

	await canvas.typeTextAt(await objectCenter(canvas, SINGLE_RECT.id), " typed");
	const opening = mcp.callTool("open_canvas", { path: secondPath });
	await isSocketHeld;
	await canvas.commitText();
	await expect(page.locator(".viewer-error")).toHaveText(
		lostInHandPattern("a.jis.json", "直前の変更"),
	);

	releaseSocket();
	expect((await opening).isError).toBe(false);
	await expectFileOnDisplay(page, "b.jis.json");
	await expect(page.locator(".viewer-error")).toHaveText(
		lostInHandPattern("a.jis.json", "直前の変更"),
	);
	const errorBarTexts = await page.evaluate(
		() => (window as unknown as ErrorBarLogWindow).errorBarTexts,
	);
	expect(errorBarTexts).toHaveLength(1);
	expect((await workspace.readDoc(firstPath)).root[0].text).toBe("hello");
});

test("text still being typed when the page moves to another directory is said to be lost once", async ({
	page,
	canvas,
	mcp,
	workspace,
	openInViewer,
}) => {
	await page.addInitScript(installErrorBarLog);
	await mkdir(join(workspace.dirPath, "one"));
	await mkdir(join(workspace.dirPath, "two"));
	const firstPath = await workspace.writeDoc(
		join("one", "a.jis.json"),
		singleRectDoc(),
	);
	const secondPath = join(workspace.dirPath, "two", "b.jis.json");
	await openInViewer(firstPath);

	await canvas.typeTextAt(await objectCenter(canvas, SINGLE_RECT.id), " typed");
	expect(
		(await mcp.callTool("open_canvas", { path: secondPath })).isError,
	).toBe(false);
	await expectFileOnDisplay(page, "b.jis.json");

	await expect(page.locator(".viewer-error")).toHaveText(
		lostInHandPattern("a.jis.json", "入力中のテキスト"),
	);
	const errorBarTexts = await page.evaluate(
		() => (window as unknown as ErrorBarLogWindow).errorBarTexts,
	);
	expect(errorBarTexts).toHaveLength(1);
	expect((await workspace.readDoc(firstPath)).root[0].text).toBe("hello");
});

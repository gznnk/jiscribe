import { join } from "node:path";

import type { Page } from "@playwright/test";

import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectFileOnDisplay,
	expectNoViewerError,
	test,
} from "../support/fixtures";

/** How far the rectangle is dragged, in screen pixels */
const DRAG_DX = 70;

/**
 * How long the host is made to take before it asks for the flush: longer than the
 * stretch that first lost an edit this way (the server's one-time schema compile,
 * about a quarter of a second)
 */
const HOST_DELAY_MS = 300;

/** What Ctrl+S answers with once the page holds nothing the file does not */
const AUTO_SAVE_NOTICE = "変更は自動で保存されます";

/** The frames of the host the page is told about, as far as these specs read them */
type HostFrame = { type: string; relPath?: string };

/** What the init script below leaves on the page's window */
type FrameControlWindow = Window & {
	/** Animation-frame callbacks held back while this is an array */
	heldFrames: FrameRequestCallback[] | null;
	/** Runs after the page's own listener has taken a frame from the host */
	afterHostFrame: ((frame: HostFrame) => void) | null;
};

// The canvas takes pointer input up on an animation frame, and hands a commit over
// in an effect after it has drawn it — so a drag released just before a file switch
// reaches the page only after the switch has begun. Holding the frames back is how
// these specs put the release at an exact point in the host's handshake: the
// frames are let go from inside the page's own handling of one host frame, in the
// same task, which no timing of real input can be relied on to hit.
const installFrameControl = (): void => {
	const controlWindow = window as unknown as FrameControlWindow;
	controlWindow.heldFrames = null;
	controlWindow.afterHostFrame = null;
	const requestFrame = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (callback) => {
		if (controlWindow.heldFrames === null) {
			return requestFrame(callback);
		}
		controlWindow.heldFrames.push(callback);
		return 0;
	};
	const addListener = WebSocket.prototype.addEventListener;
	WebSocket.prototype.addEventListener = function (
		this: WebSocket,
		type: string,
		listener: EventListenerOrEventListenerObject,
		options?: boolean | AddEventListenerOptions,
	): void {
		if (type !== "message" || typeof listener !== "function") {
			addListener.call(this, type, listener, options);
			return;
		}
		addListener.call(
			this,
			type,
			(event: Event) => {
				listener(event);
				controlWindow.afterHostFrame?.(
					JSON.parse(String((event as MessageEvent).data)) as HostFrame,
				);
			},
			options,
		);
	};
};

/**
 * Presses the rectangle and drags it, leaving the button down. The drag has to be
 * drawn before the frames are held, or the release would carry the whole move.
 */
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

/**
 * Holds the frames back, releases the button — whose commit now waits on them —
 * and lets them go right after the page has taken the first host frame matching
 * `release` (its type, and its file when one is named).
 */
async function releaseOnHostFrame(
	page: Page,
	release: { type: string; relPath?: string },
): Promise<void> {
	await page.evaluate((releaseFrame) => {
		const controlWindow = window as unknown as FrameControlWindow;
		controlWindow.heldFrames = [];
		controlWindow.afterHostFrame = (frame) => {
			if (
				frame.type !== releaseFrame.type ||
				(releaseFrame.relPath !== undefined &&
					frame.relPath !== releaseFrame.relPath)
			) {
				return;
			}
			controlWindow.afterHostFrame = null;
			const heldFrames = controlWindow.heldFrames ?? [];
			controlWindow.heldFrames = null;
			for (const callback of heldFrames) {
				callback(performance.now());
			}
		};
	}, release);
	await page.mouse.up();
}

/**
 * Waits out two frames, after which a commit let go earlier has reached the page's
 * save debounce, if it was going to
 */
async function waitForFrames(page: Page): Promise<void> {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						resolve();
					});
				});
			}),
	);
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(installFrameControl);
});

// A regression for an edit landing in the wrong file: a drag released as
// open_canvas switched to another file in the same directory was committed after
// the page had taken the new file, and the debounced write sent the previous
// file's objects to the new one — with the same host and token, nothing refused it.
// The edit cannot reach its own file any more (the host takes writes for the file
// on display only), so what is asked of the page is to keep it out of the new file
// and to say it was lost.
test("an edit committed after another file arrived is not written into that file", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "c.jis.json");
	await openInViewer(firstPath);

	await dragWithoutReleasing(page);
	await releaseOnHostFrame(page, {
		type: "openCanvas",
		relPath: "c.jis.json",
	});
	const opened = await mcp.callTool("open_canvas", { path: secondPath });
	expect(opened.isError).toBe(false);
	await expectFileOnDisplay(page, "c.jis.json");

	await waitForFrames(page);
	// Ctrl+S writes out whatever is on the debounce now, and its notice says the
	// write is done, so the file is read only once anything that was coming has
	// arrived
	await page.keyboard.press("Control+s");
	await expect(page.getByRole("status")).toHaveText(AUTO_SAVE_NOTICE);

	expect((await workspace.readDoc(secondPath)).root).toEqual([]);
	expect((await workspace.readDoc(firstPath)).root[0].x).toBe(SINGLE_RECT.x);
	await expect(page.locator(`[data-id="${SINGLE_RECT.id}"]`)).toHaveCount(0);
	await expect(page.locator(".viewer-error")).toContainText("a.jis.json");
});

// The same release, let go as the host asks for pending edits to be written out:
// the page waits for the canvas to hand over what it is still holding before it
// answers, so the edit lands in its own file ahead of the switch.
test("an edit the canvas is still holding when the host asks for a flush reaches its own file", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "c.jis.json");
	await openInViewer(firstPath);

	await dragWithoutReleasing(page);
	await releaseOnHostFrame(page, { type: "flushEdits" });
	const opened = await mcp.callTool("open_canvas", { path: secondPath });
	expect(opened.isError).toBe(false);
	await expectFileOnDisplay(page, "c.jis.json");

	expect((await workspace.readDoc(firstPath)).root[0].x).toBeGreaterThan(
		SINGLE_RECT.x,
	);
	expect((await workspace.readDoc(secondPath)).root).toEqual([]);
	await expectNoViewerError(page);
});

// The same, with the flush arriving well after the release, as it does from a host
// busy with something first (a large file to read, a slow disk). The page has drawn
// no frame in the meantime, and the first one after such a stretch runs ahead of the
// render the release queued — so counting frames answered the flush before the canvas
// handed the edit over, and it was lost to the switch.
test("an edit the canvas is still holding reaches its own file when the flush comes late", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	const firstPath = await workspace.writeDoc("a.jis.json", singleRectDoc());
	const secondPath = join(workspace.dirPath, "c.jis.json");
	await openInViewer(firstPath);

	await dragWithoutReleasing(page);
	await releaseOnHostFrame(page, { type: "flushEdits" });
	// A stretch with nothing drawn, which is what a slow host leaves the page with.
	// There is no event to wait on: the point is time passing without one
	await page.waitForTimeout(HOST_DELAY_MS);
	const opened = await mcp.callTool("open_canvas", { path: secondPath });
	expect(opened.isError).toBe(false);
	await expectFileOnDisplay(page, "c.jis.json");

	expect((await workspace.readDoc(firstPath)).root[0].x).toBeGreaterThan(
		SINGLE_RECT.x,
	);
	expect((await workspace.readDoc(secondPath)).root).toEqual([]);
	await expectNoViewerError(page);
});

// The host menu in the toolbar exists for the actions the process owning the host
// offers (the desktop app's open and quit). The stdio server offers none, so the
// offered case is set up by answering the viewer's session request in its place —
// the page is what is under test here, and this is what it reads the offer from.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { Page } from "@playwright/test";

import {
	SESSION_API_PATHNAME,
	SESSION_TOKEN_HEADER,
} from "../../src/shared/fileApiRoute";
import {
	HOST_ACTION_API_PATHNAME,
	type HostActionName,
} from "../../src/shared/hostActionsRoute";
import { SINGLE_RECT, singleRectDoc } from "../support/canvasDocs";
import {
	expect,
	expectFileOnDisplay,
	expectNoViewerError,
	selectObject,
	test,
	warningNotice,
} from "../support/fixtures";

/** The button the menu opens from; absent when nothing is offered */
const menuButton = (page: Page) => page.getByTestId("host-menu");

/** The open dropdown, which is in the DOM only while open */
const openDropdown = (page: Page) => page.locator(".viewer-host-menu-dropdown");

/** One action request as the page sent it */
type ActionRequest = {
	method: string;
	token: string | null;
	body: string | null;
};

/** Where the page keeps the count {@link countMenuButtonRemovals} runs up */
type MenuRemovalCountingWindow = Window & { hostMenuRemovalCount?: number };

/**
 * Answers the viewer's session request with what the host said plus the actions
 * given, so the page sees a host offering them. The real token is kept, since it
 * is what the page has to put on an action request.
 *
 * @returns Reads the token the host handed out, null until the page asked
 */
async function announceHostActions(
	page: Page,
	actions: unknown,
): Promise<() => string | null> {
	let announcedToken: string | null = null;
	await page.route(`**${SESSION_API_PATHNAME}`, async (route) => {
		const response = await route.fetch();
		const body = (await response.json()) as { token: string };
		announcedToken = body.token;
		await route.fulfill({ response, json: { ...body, actions } });
	});
	return () => announcedToken;
}

/**
 * Answers every action request as a host offering the action would (204), and
 * keeps what the page sent for the asserts. The host under test takes no actions,
 * so without this the page would be told 404.
 *
 * @returns The requests so far, in the order they arrived
 */
async function recordActionRequests(page: Page): Promise<ActionRequest[]> {
	const actionRequests: ActionRequest[] = [];
	await page.route(`**${HOST_ACTION_API_PATHNAME}`, async (route) => {
		const request = route.request();
		actionRequests.push({
			method: request.method(),
			token: request.headers()[SESSION_TOKEN_HEADER.toLowerCase()] ?? null,
			body: request.postData(),
		});
		await route.fulfill({ status: 204 });
	});
	return actionRequests;
}

/**
 * Starts counting, in the page, every time the menu button on screen now leaves
 * the DOM, whether on its own or inside something unmounted around it. A menu
 * that is dropped and drawn again looks the same afterwards, and this is what
 * tells the two apart.
 *
 * @param page The viewer page, with the menu button drawn
 */
async function countMenuButtonRemovals(page: Page): Promise<void> {
	await menuButton(page).evaluate((button) => {
		const countingWindow = window as MenuRemovalCountingWindow;
		countingWindow.hostMenuRemovalCount = 0;
		new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const removed of mutation.removedNodes) {
					if (removed === button || removed.contains(button)) {
						countingWindow.hostMenuRemovalCount =
							(countingWindow.hostMenuRemovalCount ?? 0) + 1;
					}
				}
			}
		}).observe(document.body, { childList: true, subtree: true });
	});
}

/** How often the button {@link countMenuButtonRemovals} watched has left the DOM */
async function readMenuButtonRemovals(page: Page): Promise<number> {
	return page.evaluate(
		() => (window as MenuRemovalCountingWindow).hostMenuRemovalCount ?? -1,
	);
}

test("draws no host menu against a host offering no action", async ({
	page,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await openInViewer(filePath);

	await expect(menuButton(page)).toHaveCount(0);
	await expect(page.locator(".viewer-file-name")).toBeVisible();
	// Not only no button: no slot for one either. The toolbar wraps every slot in a
	// flex item with a gap, so an empty slot would still push the name over
	const isFileLabelFirstInSection = await page
		.locator(".viewer-file-label")
		.evaluate((label) => {
			const labelSlot = label.parentElement;
			return labelSlot?.parentElement?.firstElementChild === labelSlot;
		});
	expect(isFileLabelFirstInSection).toBe(true);
});

test("draws the offered actions and asks the host for the one chosen", async ({
	page,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	const offeredActions: HostActionName[] = ["openFile", "quit"];
	const readAnnouncedToken = await announceHostActions(page, offeredActions);
	const actionRequests = await recordActionRequests(page);

	await openInViewer(filePath);

	await expect(menuButton(page)).toBeVisible();
	await expect(openDropdown(page)).toHaveCount(0);

	await menuButton(page).click();
	await expect(openDropdown(page).locator(".viewer-host-menu-item")).toHaveText(
		["開く…", "終了"],
	);

	await page.getByTestId("host-menu-item:openFile").click();

	await expect.poll(() => actionRequests.length).toBe(1);
	expect(actionRequests[0]).toEqual({
		method: "POST",
		token: readAnnouncedToken(),
		body: JSON.stringify({ action: "openFile" }),
	});
	expect(readAnnouncedToken()).not.toBeNull();
	await expect(openDropdown(page)).toHaveCount(0);
	await expectNoViewerError(page);
});

test("closes the menu on a press outside it, asking for nothing", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await announceHostActions(page, ["openFile", "quit"]);
	const actionRequests = await recordActionRequests(page);

	await openInViewer(filePath);
	await menuButton(page).click();
	await expect(openDropdown(page)).toBeVisible();

	// Empty canvas, which is where a person presses to put a menu away
	await canvas.deselect();

	await expect(openDropdown(page)).toHaveCount(0);
	expect(actionRequests).toEqual([]);
	await expectNoViewerError(page);
});

test("closes the menu on Escape and leaves the selection as it was", async ({
	page,
	canvas,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await announceHostActions(page, ["openFile", "quit"]);
	const actionRequests = await recordActionRequests(page);

	await openInViewer(filePath);
	// The canvas reads Escape as deselect, so something has to be selected for the
	// key reaching it to show
	await selectObject(canvas, SINGLE_RECT.id);
	await menuButton(page).click();
	await expect(openDropdown(page)).toBeVisible();

	await page.keyboard.press("Escape");

	await expect(openDropdown(page)).toHaveCount(0);
	expect(await canvas.hasAnyControl()).toBe(true);
	expect(actionRequests).toEqual([]);
	await expectNoViewerError(page);
});

test("keeps the menu up while the page follows the host across a restart", async ({
	page,
	mcp,
	workspace,
	openInViewer,
}) => {
	// A file in another directory moves the host, which closes and starts again on
	// the same port; the page's socket drops and it finds the new host on its own
	await mkdir(join(workspace.dirPath, "one"));
	await mkdir(join(workspace.dirPath, "two"));
	const firstPath = await workspace.writeDoc(
		join("one", "a.jis.json"),
		singleRectDoc(),
	);
	const secondPath = await workspace.writeDoc(
		join("two", "b.jis.json"),
		singleRectDoc(),
	);
	await announceHostActions(page, ["openFile"]);

	await openInViewer(firstPath);
	await expect(menuButton(page)).toBeVisible();
	await countMenuButtonRemovals(page);

	// Not through openInViewer, which navigates: the drop and the reconnect are
	// what is under test, so the page has to be the one that follows the host over
	const opened = await mcp.callTool("open_canvas", { path: secondPath });
	expect(opened.isError).toBe(false);
	await expectFileOnDisplay(page, "b.jis.json");

	await expect(menuButton(page)).toBeVisible();
	expect(await readMenuButtonRemovals(page)).toBe(0);
	await expectNoViewerError(page);
});

test("says so in a notice when the host refuses the action", async ({
	page,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await announceHostActions(page, ["openFile"]);
	await page.route(`**${HOST_ACTION_API_PATHNAME}`, async (route) => {
		await route.fulfill({ status: 404 });
	});

	await openInViewer(filePath);
	await menuButton(page).click();
	await page.getByTestId("host-menu-item:openFile").click();

	await expect(warningNotice(page)).toContainText(
		"ファイルを開くダイアログを出せませんでした: 404",
	);
	await expect(page.locator(".viewer-error")).toHaveCount(0);
});

test("draws the announced actions it knows and leaves out a name it does not", async ({
	page,
	workspace,
	openInViewer,
}) => {
	const filePath = await workspace.writeDoc(
		"drawing.jis.json",
		singleRectDoc(),
	);
	await announceHostActions(page, ["openFile", "reboot"]);

	await openInViewer(filePath);

	await expect(menuButton(page)).toBeVisible();
	await menuButton(page).click();
	await expect(openDropdown(page).locator(".viewer-host-menu-item")).toHaveText(
		["開く…"],
	);
});

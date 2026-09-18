// The fixture the specs are written against: an MCP client on the real server, a
// temporary workspace holding the .jis files, and a browser page showing the viewer
// that server put up.
//
// What the browser adds is the half the vitest suite cannot reach — the page that
// draws the file, writes a person's edits back, and answers the tools only a drawn
// canvas can answer. Everything in front of it is the shipped server: the tool
// registration, the host, the file watch and the write-back are the ones a real
// client talks to (./mcpStdioClient explains why it is a process of its own).

import { basename } from "node:path";

import { CanvasDriver } from "@jiscribe/canvas/testing";
import { test as base, expect, type Page } from "@playwright/test";

import { connectMcpStdioClient, type McpStdioClient } from "./mcpStdioClient";
import {
	createTempCanvasWorkspace,
	type TempCanvasWorkspace,
} from "../../src/__tests__/tempCanvasWorkspace";

/**
 * The URL `open_canvas` reports, which is the page to navigate to. It closes the
 * sentence, so the match runs to the first space after it
 */
const VIEWER_URL_PATTERN = /viewer: (\S+)/;

/**
 * How long to wait for the host to give its port back once the page is gone. It
 * covers the WebSocket close reaching the host and nothing else: the host's own
 * hour-long grace is not on this path, since `close_canvas` folds it outright
 */
const HOST_STOP_TIMEOUT_MS = 10_000;

/**
 * Waits until the toolbar names this file. It is the one place the viewer says
 * which file it is drawing, so reaching it also means the document frame arrived.
 *
 * @param page The viewer page
 * @param fileName The file's base name, which is all the label draws (the whole
 *   path is only in its tooltip)
 */
export async function expectFileOnDisplay(
	page: Page,
	fileName: string,
): Promise<void> {
	await expect(page.locator(".viewer-file-name")).toHaveText(fileName);
}

/**
 * Asserts the viewer is showing no error bar. Worth stating wherever a test drives
 * an edit through the page: a write that was refused leaves the canvas looking
 * right and says so only here.
 *
 * @param page The viewer page
 */
export async function expectNoViewerError(page: Page): Promise<void> {
	await expect(page.locator(".viewer-error")).toHaveCount(0);
}

/**
 * Clicks one drawn object in the middle to select it.
 *
 * The driver works in content coordinates and converts them against the canvas
 * origin it measured last, so a box read straight out of the DOM cannot be handed
 * back to it until the driver has measured once. `deselect` is the cheapest call
 * that measures, and what it asserts — that nothing is selected — already holds on
 * a page just opened.
 *
 * @param canvas The driver over the viewer page
 * @param id The object's `data-id`, which is the id the .jis file gives it
 */
export async function selectObject(
	canvas: CanvasDriver,
	id: string,
): Promise<void> {
	await canvas.deselect();
	const box = await canvas.objectById(id).boundingBox();
	if (box === null) {
		throw new Error(`${id} is not drawn, so it cannot be selected`);
	}
	await canvas.selectAt(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
	);
}

/**
 * Closes the window and folds the host, so the next test finds the default port
 * free.
 *
 * `close_canvas` closes a window by asking the page to close itself, and Chromium
 * refuses that for a page it was navigated to rather than opened by script — so the
 * first call reports the window as still open and deliberately leaves the host up
 * for it. Closing the page from here is what drops the socket, and the call after
 * it finds nothing left to close.
 */
async function closeViewerAndHost(
	mcp: McpStdioClient,
	page: Page,
): Promise<void> {
	await mcp.callTool("close_canvas", {});
	if (!page.isClosed()) {
		await page.close();
	}
	await expect
		.poll(async () => (await mcp.callTool("close_canvas", {})).text, {
			timeout: HOST_STOP_TIMEOUT_MS,
			message: "the canvas host gives its port back once no window is left",
		})
		.not.toContain("error:");
}

export type ViewerOptions = {
	/**
	 * Environment entries for the server process, on top of this one's. Declared as
	 * an option so a spec needing a different server (`JISCRIBE_MCP_BROWSER` for the
	 * headless viewer) sets it with `test.use` rather than reaching into
	 * `process.env`, which would outlive the spec
	 */
	mcpEnv: Record<string, string>;
};

export type ViewerFixtures = {
	/** A temporary directory of its own per test, with the .jis files in it */
	workspace: TempCanvasWorkspace;
	/** A client on the built server, with the real host behind `open_canvas` */
	mcp: McpStdioClient;
	/**
	 * The canvas kit's driver over the viewer page. Built without its `goto`, which
	 * expects a harness dev server at the base URL; here the page belongs to the
	 * host, and `openInViewer` is what navigates to it
	 */
	canvas: CanvasDriver;
	/**
	 * Opens a file through `open_canvas` and points the browser at the viewer it
	 * reports, returning once the canvas is drawing that file.
	 *
	 * @param filePath Absolute path of the .jis file. One that is not there yet is
	 *   created as an empty canvas, which is what the tool does for the AI
	 */
	openInViewer: (filePath: string) => Promise<void>;
};

export const test = base.extend<ViewerOptions & ViewerFixtures>({
	mcpEnv: [{}, { option: true }],

	// Playwright reads a fixture's dependencies off this destructuring pattern, so
	// it stays even with nothing in it
	// eslint-disable-next-line no-empty-pattern
	workspace: async ({}, use) => {
		const workspace = await createTempCanvasWorkspace();
		await use(workspace);
		await workspace.remove();
	},

	mcp: async ({ page, mcpEnv }, use) => {
		const mcp = await connectMcpStdioClient(mcpEnv);
		await use(mcp);
		await closeViewerAndHost(mcp, page);
		await mcp.close();
	},

	canvas: async ({ page }, use) => {
		await use(new CanvasDriver(page));
	},

	openInViewer: async ({ page, mcp }, use) => {
		await use(async (filePath: string) => {
			const { text, isError } = await mcp.callTool("open_canvas", {
				path: filePath,
			});
			if (isError || text.startsWith("error:")) {
				throw new Error(`open_canvas refused ${filePath}: ${text}`);
			}
			const matched = VIEWER_URL_PATTERN.exec(text);
			if (matched === null) {
				throw new Error(`open_canvas answered without a viewer URL: ${text}`);
			}
			await page.goto(matched[1]);
			await expectFileOnDisplay(page, basename(filePath));
		});
	},
});

export { expect } from "@playwright/test";

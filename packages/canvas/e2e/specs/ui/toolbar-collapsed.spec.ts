import type { Locator } from "@playwright/test";

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The two forms of the top toolbar, switched by whether a sidebar is open.
 *
 * - Collapsed (both sidebars closed), the bar is two pills floating over the
 *   canvas's top corners, each section in the pill its `collapsedAlign` names;
 *   the help section is hidden, and the canvas area reaches the top of the
 *   root.
 * - Expanded (either sidebar open), the full-width bar is back above the
 *   canvas, help included, and the pills are gone.
 * - Switching forms moves the canvas area's top edge, and the drawing stays put
 *   on screen across it, as it does across the shape library's left edge.
 *
 * The harness bar is the kit's: the shape library toggle and the spec category
 * at the start, then history, view, help, the properties toggle and the switch
 * for both sidebars.
 */

/** Every data-action inside `container`, in document order. */
const readActions = (container: Locator): Promise<(string | null)[]> =>
	container
		.locator("[data-action]")
		.evaluateAll((elements) =>
			elements.map((element) => element.getAttribute("data-action")),
		);

/** Screen box of an element that must be laid out. */
async function screenBox(locator: Locator) {
	const box = await locator.boundingBox();
	if (!box) {
		throw new Error("the element has no box");
	}
	return box;
}

/**
 * Screen box of the canvas root and of the drawing region inside it. The root
 * is the region's grandparent: the region sits in the body row, the root's
 * child.
 */
async function readCanvasBoxes(canvas: CanvasDriver) {
	const viewport = canvas.page.locator('[data-kind="canvas"]');
	return {
		root: await screenBox(viewport.locator("xpath=../..")),
		viewport: await screenBox(viewport),
	};
}

const START_PILL_ACTIONS = [
	"command:toggleStencilLibrary",
	"toggle:spec",
	"command:toggleSidebars",
];

const END_PILL_ACTIONS = [
	"command:undo",
	"command:redo",
	"command:zoomOut",
	"command:resetZoom",
	"command:zoomIn",
	"command:zoomToFit",
	"command:togglePropertyPanel",
];

test.describe("collapsed toolbar", () => {
	test("is two corner pills holding their sections, with no help", async ({
		canvas,
	}) => {
		const startPill = canvas.page.locator(selectors.toolbarPill("start"));
		const endPill = canvas.page.locator(selectors.toolbarPill("end"));

		// Both elements carrying the bar's data-kind / data-id are the pills.
		await expect(canvas.page.locator(selectors.toolbar)).toHaveCount(2);
		expect(await readActions(startPill)).toEqual(START_PILL_ACTIONS);
		expect(await readActions(endPill)).toEqual(END_PILL_ACTIONS);
		await expect(
			canvas.page.locator(selectors.toolbarCommand("shortcutHelp")),
		).toHaveCount(0);
	});

	test("floats the pills over the top corners of a canvas that fills the root", async ({
		canvas,
	}) => {
		const { root, viewport } = await readCanvasBoxes(canvas);
		expect(viewport.y).toBe(root.y);
		expect(viewport.height).toBe(root.height);

		const startBox = await screenBox(
			canvas.page.locator(selectors.toolbarPill("start")),
		);
		const endBox = await screenBox(
			canvas.page.locator(selectors.toolbarPill("end")),
		);
		// One inset, inside the canvas area, on the top and the outer side of both.
		const inset = startBox.x - viewport.x;
		expect(inset).toBeGreaterThan(0);
		expect(startBox.y - viewport.y).toBe(inset);
		expect(viewport.x + viewport.width - (endBox.x + endBox.width)).toBe(inset);
		expect(endBox.y - viewport.y).toBe(inset);
	});

	test("turns back into the full-width bar with help while a sidebar is open, and into pills again", async ({
		canvas,
	}) => {
		const toolbar = canvas.page.locator(selectors.toolbar);
		const help = canvas.page.locator(selectors.toolbarCommand("shortcutHelp"));
		const collapsedViewport = (await readCanvasBoxes(canvas)).viewport;

		await canvas.toggleSidebars();
		await expect(toolbar).toHaveCount(1);
		await expect(
			canvas.page.locator('[data-testid^="toolbar-pill:"]'),
		).toHaveCount(0);
		await expect(help).toBeVisible();
		expect(await readActions(toolbar)).toEqual([
			"command:toggleStencilLibrary",
			"toggle:spec",
			"command:undo",
			"command:redo",
			"command:zoomOut",
			"command:resetZoom",
			"command:zoomIn",
			"command:zoomToFit",
			"command:shortcutHelp",
			"command:togglePropertyPanel",
			"command:toggleSidebars",
		]);
		// The bar takes its row above the canvas area rather than covering it.
		const { root, viewport } = await readCanvasBoxes(canvas);
		const barBox = await screenBox(toolbar);
		expect(barBox.y).toBe(root.y);
		expect(viewport.y).toBe(barBox.y + barBox.height);

		await canvas.toggleSidebars();
		await expect(toolbar).toHaveCount(2);
		await expect(help).toHaveCount(0);
		expect((await readCanvasBoxes(canvas)).viewport).toEqual(collapsedViewport);
	});

	/**
	 * A host restoring the shape library alone open (as the web editor does)
	 * mounts straight into the full-width bar. Its first measurement has to see
	 * that bar already, or the camera is compensated for a toolbar row that was
	 * never on screen without it and the restored view slides down.
	 */
	test("mounts with the shape library alone open without moving the camera", async ({
		canvas,
	}) => {
		const collapsedViewBox = await canvas.getViewBox();

		await canvas.goto("?libraryOpen");
		await expect(
			canvas.page.locator(selectors.stencilLibraryPanel),
		).toBeVisible();
		await expect(canvas.page.locator(selectors.toolbar)).toHaveCount(1);

		const [collapsedMinX, collapsedMinY] = (collapsedViewBox ?? "")
			.split(/\s+/)
			.map(Number);
		const [minX, minY] = ((await canvas.getViewBox()) ?? "")
			.split(/\s+/)
			.map(Number);
		expect(minY).toBe(collapsedMinY);
		expect(minX).toBe(collapsedMinX);
	});

	/**
	 * The properties sidebar takes no space on the left, so opening it alone
	 * moves the canvas area's top edge only: the case the top-edge compensation
	 * carries by itself.
	 */
	test("keeps the drawing in place as the full-width bar comes and goes", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 300 },
			{ x: 520, y: 380 },
		);
		const shape = canvas.objectById(id);
		const drawnBox = await screenBox(shape);

		await canvas.openPropertyPanel();
		expect(await screenBox(shape)).toEqual(drawnBox);

		await canvas.closePropertyPanel();
		expect(await screenBox(shape)).toEqual(drawnBox);
	});
});

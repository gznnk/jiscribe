import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The bottom tool bar (`bottomToolbar`): the floating bar centred over the
 * canvas at its bottom edge, where this harness pins its presets.
 *
 * - Its presets are the same `item:<presetId>` contract as the top bar's: a
 *   click arms drawing and a drag onto the canvas places the shape.
 * - It floats over the canvas without shrinking it, and stays centred over the
 *   visible canvas while a sidebar takes its width off one side.
 * - Its "Other shapes" button is a placeholder: pressing it, or dragging off
 *   it, changes nothing.
 */

/** Screen rectangle of an element, as boundingBox() reports it. */
type ScreenBox = { x: number; y: number; width: number; height: number };

/** The canvas area, the flex child the sidebars take their width from. */
const CANVAS_AREA = '[data-kind="canvas"]';

async function boxOf(
	canvas: CanvasDriver,
	selector: string,
): Promise<ScreenBox> {
	const box = await canvas.page.locator(selector).boundingBox();
	if (!box) {
		throw new Error(`cannot get the box of ${selector}`);
	}
	return box;
}

/** Asserts the bar's centre line is the canvas area's, allowing 1px for rounding. */
async function expectCentredOverCanvas(canvas: CanvasDriver, hint: string) {
	const barBox = await boxOf(canvas, selectors.bottomToolbar);
	const canvasBox = await boxOf(canvas, CANVAS_AREA);
	const barCentreX = barBox.x + barBox.width / 2;
	const canvasCentreX = canvasBox.x + canvasBox.width / 2;
	expect(
		Math.abs(barCentreX - canvasCentreX),
		`${hint}: bar centre ${barCentreX} vs canvas centre ${canvasCentreX}`,
	).toBeLessThanOrEqual(1);
	expect(barBox.y + barBox.height).toBeLessThanOrEqual(
		canvasBox.y + canvasBox.height,
	);
}

test.describe("bottom tool bar", () => {
	test("pins the presets with the stencil item contract, then Other shapes", async ({
		canvas,
	}) => {
		const bar = canvas.page.locator(selectors.bottomToolbar);
		await expect(bar).toBeVisible();
		const rectItem = bar.locator('[data-action="item:rect"]');
		await expect(rectItem).toHaveAttribute("data-kind", "menu");
		await expect(rectItem).toHaveAttribute("data-id", "stencil-library");
		await expect(rectItem).toHaveAttribute("title", "Rectangle");
		await expect(
			canvas.page.locator(selectors.bottomToolbarOtherShapes),
		).toHaveAttribute("title", "Other shapes");
		// The harness pins every preset here, so none is left on the top bar.
		await expect(
			canvas.page.locator(`${selectors.toolbar} [data-action^="item:"]`),
		).toHaveCount(0);
	});

	test("draws a shape from a preset clicked on the bar", async ({ canvas }) => {
		await expect(
			canvas.page.locator(
				`${selectors.bottomToolbar} button[title="Rectangle"]`,
			),
		).toBeVisible();
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 200 },
			{ x: 460, y: 300 },
		);
		await expect(canvas.objectById(id)).toBeVisible();
	});

	test("places a shape dragged off the bar onto the canvas", async ({
		canvas,
	}) => {
		const before = (await canvas.captureObjects()).length;
		const item = canvas.page.locator(selectors.shapeItem("rect"));
		// Well inside the canvas and clear of the edge zones (auto-scroll)
		const to = canvas.toScreen({ x: 500, y: 320 });

		await item.hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
		} finally {
			await canvas.page.mouse.up();
		}

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "a new shape is created by the D&D off the bottom bar",
			})
			.toBe(before + 1);
	});

	test("floats over the canvas without taking its height", async ({
		canvas,
	}) => {
		const canvasBox = await boxOf(canvas, CANVAS_AREA);
		const viewportHeight = canvas.page.viewportSize()?.height;
		expect(canvasBox.y + canvasBox.height).toBe(viewportHeight);
		await expectCentredOverCanvas(canvas, "no sidebar open");
	});

	test("stays centred over the visible canvas with sidebars open", async ({
		canvas,
	}) => {
		// The library alone narrows the canvas from one side only, so the canvas's
		// centre and the page's part ways.
		await canvas.openStencilLibrary();
		const canvasBox = await boxOf(canvas, CANVAS_AREA);
		const pageWidth = canvas.page.viewportSize()?.width ?? 0;
		expect(canvasBox.x + canvasBox.width / 2).not.toBe(pageWidth / 2);
		await expectCentredOverCanvas(canvas, "shape library open");

		await canvas.closeStencilLibrary();
		await canvas.toggleSidebars();
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
		await expectCentredOverCanvas(canvas, "both sidebars open");
	});

	test("does nothing when Other shapes is pressed or dragged off", async ({
		canvas,
	}) => {
		const pageErrors: Error[] = [];
		canvas.page.on("pageerror", (error) => pageErrors.push(error));
		const before = await canvas.captureObjects();
		const otherShapes = canvas.page.locator(selectors.bottomToolbarOtherShapes);

		// The open context menu is what makes the press observable: a press on the
		// bar dismisses it, so its closing proves the press was handled.
		await canvas.openContextMenu({ x: 600, y: 400 });
		await otherShapes.click();
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
		expect(await canvas.isDrawingMode()).toBe(false);

		await canvas.openContextMenu({ x: 600, y: 400 });
		const to = canvas.toScreen({ x: 500, y: 320 });
		await otherShapes.hover();
		await canvas.page.mouse.down();
		try {
			await canvas.page.mouse.move(to.x, to.y, { steps: 12 });
		} finally {
			await canvas.page.mouse.up();
		}
		await expect.poll(() => canvas.contextMenuVisible()).toBe(false);
		await expect(canvas.page.locator(selectors.drawingPreview)).toHaveCount(0);

		// Arming a tool afterwards is handled after the drag's end, so once it shows,
		// whatever the drag was going to do has been done.
		await canvas.page.click(selectors.toolButton("Rectangle"));
		await expect.poll(() => canvas.isDrawingMode()).toBe(true);
		expect(await canvas.captureObjects()).toEqual(before);
		expect(pageErrors).toEqual([]);
	});
});

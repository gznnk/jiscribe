import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Core behavior of the properties sidebar (`propertyPanel`).
 *
 * - The toolbar toggle opens and closes it, and carries the open state on
 *   aria-expanded; its own close button closes it too, and the ellipsis at the
 *   end of the floating menu opens it as well.
 * - It takes its width out of the viewport, so the canvas area narrows by exactly
 *   the panel's width.
 * - Opening it must not move the drawing: unlike the shape library it sits on the
 *   right, so the viewport's left edge stays put and no camera compensation is
 *   involved — a shape that moves means the wrong edge was measured.
 *
 * The body carries the property sections of what is selected: the accordions the
 * selected types share, the fields that state the frame, and the controls that
 * write a style through the same gesture route the floating menu uses.
 */

/**
 * The canvas area, the flex child the sidebars take their width from. Spelled out
 * here rather than in `selectors` because this is the only spec that measures it.
 */
const CANVAS_AREA = '[data-kind="canvas"]';

/** Screen rectangle of an element, as boundingBox() reports it. */
type ScreenBox = { x: number; y: number; width: number; height: number };

async function boxOf(canvas: CanvasDriver, selector: string) {
	const box = await canvas.page.locator(selector).first().boundingBox();
	if (!box) {
		throw new Error(`cannot get the box of ${selector}`);
	}
	return box;
}

async function shapeScreenBox(
	canvas: CanvasDriver,
	id: string,
): Promise<ScreenBox> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`cannot get the position of the shape ${id}`);
	}
	return box;
}

/**
 * Asserts two screen boxes are the same place and size, allowing 1px: the drawn
 * viewport is snapped to device pixels, so a camera move can land half a pixel off.
 */
function expectSameBox(actual: ScreenBox, expected: ScreenBox, hint: string) {
	for (const key of ["x", "y", "width", "height"] as const) {
		expect(
			Math.abs(actual[key] - expected[key]),
			`${hint}: ${key} ${actual[key]} vs ${expected[key]}`,
		).toBeLessThanOrEqual(1);
	}
}

test.describe("Properties sidebar", () => {
	test("opens and closes from the toolbar toggle", async ({ canvas }) => {
		const panel = canvas.page.locator(selectors.propertyPanel);
		const toggle = canvas.page.locator(selectors.propertyPanelToggle);

		// It starts closed (not in the DOM at all)
		await expect(panel).toHaveCount(0);
		await expect(toggle).toHaveAttribute("aria-expanded", "false");

		await toggle.click();
		await expect(panel).toBeVisible();
		await expect(toggle).toHaveAttribute("aria-expanded", "true");

		await toggle.click();
		await expect(panel).toHaveCount(0);
		await expect(toggle).toHaveAttribute("aria-expanded", "false");
	});

	test("closes from the panel's close button", async ({ canvas }) => {
		await canvas.openPropertyPanel();

		await canvas.closePropertyPanel();
		await expect(
			canvas.page.locator(selectors.propertyPanelToggle),
		).toHaveAttribute("aria-expanded", "false");
	});

	test("holds the canvas section while nothing is selected, and the object sections once something is", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 120, y: 150 }, { x: 240, y: 240 });
		await canvas.openPropertyPanel();
		// Drawing leaves the shape selected, so the object sections are what shows
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("canvas")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("fill")),
		).toBeVisible();

		await canvas.deselect();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("canvas")),
			"the canvas section is the panel's empty state",
		).toBeVisible();
		for (const sectionId of ["layout", "fill", "stroke", "text"]) {
			await expect(
				canvas.page.locator(selectors.propertyPanelSection(sectionId)),
				`the ${sectionId} section is gone with the selection`,
			).toHaveCount(0);
		}

		await canvas.selectAll();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("canvas")),
			"and it gives way again as soon as something is selected",
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("fill")),
		).toBeVisible();
	});

	test("paints the canvas from the background field, and undo puts the surface back", async ({
		canvas,
	}) => {
		await canvas.openPropertyPanel();
		const before = await canvas.canvasSurfaceColor();

		await canvas.page
			.locator(`${selectors.propertyPanel} [aria-label="Background"]`)
			.click();
		await canvas.page.click(
			selectors.propertyPanelSet("background", "#dc2626"),
		);

		const expected = await canvas.normalizeColor("#dc2626");
		await expect.poll(() => canvas.canvasSurfaceColor()).toBe(expected);
		expect(before).not.toBe(expected);

		await canvas.page.keyboard.press("Control+z");
		await expect.poll(() => canvas.canvasSurfaceColor()).toBe(before);
	});

	test("stands in for the floating menu while open", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 120, y: 150 }, { x: 240, y: 240 });
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();

		// The sidebar states everything the menu does, so the menu is withdrawn
		// rather than shown twice
		await canvas.openPropertyPanel();
		await expect(objectMenu).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("fill")),
		).toBeVisible();

		await canvas.closePropertyPanel();
		await expect(objectMenu).toBeVisible();
	});

	test("opens from the ellipsis at the end of the floating menu", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 120, y: 150 }, { x: 240, y: 240 });
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();

		// The same command the toolbar toggle fires, reached from the menu; the
		// menu withdraws once the sidebar stands in for it
		await canvas.page.click(
			`${selectors.objectMenu} ${selectors.objectMenuCommand("togglePropertyPanel")}`,
		);
		await expect(canvas.page.locator(selectors.propertyPanel)).toBeVisible();
		await expect(objectMenu).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("fill")),
		).toBeVisible();
	});

	test("narrows the viewport by its own width", async ({ canvas }) => {
		const before = await boxOf(canvas, CANVAS_AREA);

		await canvas.openPropertyPanel();
		const panelBox = await boxOf(canvas, selectors.propertyPanel);
		const opened = await boxOf(canvas, CANVAS_AREA);

		expect(
			Math.abs(before.width - opened.width - panelBox.width),
			"the viewport gives up exactly the panel's width",
		).toBeLessThanOrEqual(1);
		// The panel takes the space on the right, so the viewport keeps its left edge
		expect(Math.abs(opened.x - before.x)).toBeLessThanOrEqual(1);
	});

	test("keeps the drawing in place while it opens and closes", async ({
		canvas,
	}) => {
		// Drawn clear of the panel's own width, so what is asserted is a shape the
		// open panel does not sit over (getBoundingClientRect ignores clipping and
		// would report a covered shape as being right where it belongs).
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: 150 },
			{ x: 240, y: 240 },
		);
		const drawnBox = await shapeScreenBox(canvas, id);

		await canvas.openPropertyPanel();
		expectSameBox(
			await shapeScreenBox(canvas, id),
			drawnBox,
			"the shape stays put once the panel is open",
		);

		await canvas.closePropertyPanel();
		expectSameBox(
			await shapeScreenBox(canvas, id),
			drawnBox,
			"the shape stays put once the panel is closed",
		);
	});

	test("shows the sections a selected rectangle has", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", { x: 120, y: 150 }, { x: 240, y: 240 });
		await canvas.openPropertyPanel();

		for (const sectionId of ["layout", "fill", "stroke", "text"]) {
			await expect(
				canvas.page.locator(selectors.propertyPanelSection(sectionId)),
				`the ${sectionId} section is offered for a rectangle`,
			).toBeVisible();
		}
	});

	test("resizes the shape to a width typed into the field", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: 150 },
			{ x: 240, y: 240 },
		);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);
		const before = await rect.getAttribute("width");

		const width = canvas.page.locator(selectors.propertyPanelField("width"));
		await width.fill("300");
		await width.press("Enter");

		await expect
			.poll(() => rect.getAttribute("width"), {
				message: "the width the field states reaches the shape",
			})
			.toBe("300");
		expect(before).not.toBe("300");
	});

	test("fills the shape from the color field, and undo puts the fill back", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: 150 },
			{ x: 240, y: 240 },
		);
		await canvas.openPropertyPanel();
		const before = await canvas.computedColor(id, "fill");

		// The field opens its picker in place, and the swatch then writes through
		// the gesture system exactly as it does from the floating menu.
		await canvas.page
			.locator(`${selectors.propertyPanel} [aria-label="Background Color"]`)
			.click();
		await canvas.page.click(selectors.propertyPanelSet("fill", "#dc2626"));

		const expected = await canvas.normalizeColor("#dc2626");
		await expect.poll(() => canvas.computedColor(id, "fill")).toBe(expected);

		await canvas.page.keyboard.press("Control+z");
		await expect.poll(() => canvas.computedColor(id, "fill")).toBe(before);
	});

	test("says the fill is mixed for a selection whose shapes disagree, and writes to all of them", async ({
		canvas,
	}) => {
		const first = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: 150 },
			{ x: 240, y: 240 },
		);
		const second = await canvas.drawShape(
			"Rectangle",
			{ x: 300, y: 150 },
			{ x: 420, y: 240 },
		);
		await canvas.openPropertyPanel();

		// Only the first is recolored, so the two disagree about their face
		await canvas.selectAt({ x: 180, y: 195 });
		const fillField = canvas.page.locator(
			`${selectors.propertyPanel} [aria-label="Background Color"]`,
		);
		await fillField.click();
		await canvas.page.click(selectors.propertyPanelSet("fill", "#dc2626"));
		const red = await canvas.normalizeColor("#dc2626");
		await expect.poll(() => canvas.computedColor(first, "fill")).toBe(red);
		const secondBefore = await canvas.computedColor(second, "fill");
		expect(secondBefore).not.toBe(red);
		// The picker stays open on a pick, so it is closed by hand before the next one
		await fillField.click();
		await expect(fillField).toHaveAttribute("aria-expanded", "false");

		await canvas.selectAll();
		await expect(
			fillField,
			"the row states the disagreement rather than one of the two colors",
		).toContainText("Mixed");

		// The panel writes to the whole selection, which is what ends the disagreement
		await fillField.click();
		await canvas.page.click(selectors.propertyPanelSet("fill", "#3b82f6"));
		const blue = await canvas.normalizeColor("#3b82f6");
		await expect.poll(() => canvas.computedColor(first, "fill")).toBe(blue);
		await expect.poll(() => canvas.computedColor(second, "fill")).toBe(blue);
		await expect(fillField).not.toContainText("Mixed");

		// One press takes both shapes back, the write having been one history entry
		await canvas.page.keyboard.press("Control+z");
		await expect.poll(() => canvas.computedColor(first, "fill")).toBe(red);
		await expect
			.poll(() => canvas.computedColor(second, "fill"))
			.toBe(secondBefore);

		// The undo keeps the selection the write was made from, so the row reads
		// the two shapes again without re-selecting them
		await expect(
			fillField,
			"the two disagree again, so the row says so again",
		).toContainText("Mixed");
	});

	test("reorders the selection from the Arrange section's named buttons", async ({
		canvas,
	}) => {
		// DOM order follows creation order: a (backmost) -> b (frontmost)
		const a = await canvas.drawShape(
			"Rectangle",
			{ x: 120, y: 150 },
			{ x: 240, y: 240 },
		);
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 420, y: 240 });
		await canvas.deselect();
		await canvas.openPropertyPanel();

		await canvas.selectAt({ x: 180, y: 195 });
		const bringToFront = canvas.page.locator(
			selectors.propertyPanelCommand("bringToFront"),
		);
		await expect(bringToFront).toBeEnabled();
		await bringToFront.click();
		await expect.poll(() => canvas.objectIndex(a)).toBe(1);

		// The selection it acted on is still there, so the next press needs no
		// re-selection
		await canvas.page.click(selectors.propertyPanelCommand("sendToBack"));
		await expect.poll(() => canvas.objectIndex(a)).toBe(0);
	});

	test("keeps a collapsed section collapsed across close and reopen", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 120, y: 150 }, { x: 240, y: 240 });
		await canvas.openPropertyPanel();

		const layout = canvas.page.locator(
			selectors.propertyPanelSection("layout"),
		);
		await expect(layout).toHaveAttribute("aria-expanded", "true");
		await layout.click();
		await expect(layout).toHaveAttribute("aria-expanded", "false");

		await canvas.closePropertyPanel();
		await canvas.openPropertyPanel();

		await expect(
			canvas.page.locator(selectors.propertyPanelSection("layout")),
			"the collapse survives the panel being closed",
		).toHaveAttribute("aria-expanded", "false");
	});
});

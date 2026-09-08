import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The dropdown fields of the properties sidebar (PropertyDropdownField).
 *
 * The panel is portalled to the sidebar's root and placed by measurement, so it
 * floats over the rows under the trigger instead of pushing them down, and flips
 * above the trigger when it would run past the sidebar's bottom edge. It stays
 * open while choices are tried and closes on a press outside it or on the rows
 * scrolling away under it.
 */

/** The box every test drags out, clear of the panel's own width. */
const SHAPE_FROM = { x: 100, y: 120 };
const SHAPE_TO = { x: 260, y: 220 };

/**
 * Viewport short enough that the sidebar's body scrolls and the last rows of a
 * line's panel have less room under them than a dropdown needs, which is what
 * the flip and the scroll rest on.
 */
const SHORT_VIEWPORT = { width: 1000, height: 400 };

/** Screen rectangle of an element, as boundingBox() reports it. */
type ScreenBox = { x: number; y: number; width: number; height: number };

async function boxOf(
	canvas: CanvasDriver,
	selector: string,
): Promise<ScreenBox> {
	const box = await canvas.page.locator(selector).first().boundingBox();
	if (!box) {
		throw new Error(`cannot get the box of ${selector}`);
	}
	return box;
}

/** The fill row's trigger, the one every test opens unless it needs a low row. */
const FILL_TRIGGER = `${selectors.propertyPanel} [aria-label="Background Color"]`;

/**
 * The last dropdown of a polyline's panel. A line's rows are what leaves a
 * dropdown with no room under it: below this one sit only the Arrange buttons,
 * fewer pixels than the panel it opens.
 */
const END_ARROW_TRIGGER = `${selectors.propertyPanel} [aria-label="End Arrow"]`;

/** Scrolls the sidebar's rows to their end, so the last of them sit at the bottom edge. */
async function scrollPanelToBottom(canvas: CanvasDriver) {
	await canvas.page.locator(selectors.propertyPanelBody).evaluate((el) => {
		el.scrollTop = el.scrollHeight;
	});
}

test.describe("Properties sidebar dropdowns", () => {
	test("floats over the rows rather than pushing them down", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await canvas.openPropertyPanel();
		const borderHeader = await boxOf(
			canvas,
			selectors.propertyPanelSection("stroke"),
		);
		const trigger = await boxOf(canvas, FILL_TRIGGER);

		await canvas.page.locator(FILL_TRIGGER).click();

		const panel = canvas.page.locator(selectors.propertyPanelDropdown);
		await expect(panel).toBeVisible();
		expect(
			Math.abs(
				(await boxOf(canvas, selectors.propertyPanelSection("stroke"))).y -
					borderHeader.y,
			),
			"the row under the field stays where it was",
		).toBeLessThanOrEqual(1);

		const panelBox = await boxOf(canvas, selectors.propertyPanelDropdown);
		expect(panelBox.y).toBeGreaterThan(trigger.y + trigger.height);
	});

	test("closes on a press outside it, keeping the selection it was opened for", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await canvas.openPropertyPanel();
		await canvas.page.locator(FILL_TRIGGER).click();
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toBeVisible();

		// The panel's own title row: inside the sidebar, so the selection survives
		// the press, and outside both the trigger and the panel, so it closes them.
		await canvas.page
			.locator(selectors.propertyPanelHeader)
			.click({ position: { x: 10, y: 10 } });

		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("fill")),
			"the sections are still those of the selection",
		).toBeVisible();
	});

	test("closes on Escape without dropping the selection", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await canvas.openPropertyPanel();
		await canvas.page.locator(FILL_TRIGGER).click();
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toBeVisible();

		// Escape on the canvas is "deselect"; taken by the open panel it is only
		// "close", so the sections stay those of the selection.
		await canvas.page.keyboard.press("Escape");

		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toHaveCount(0);
		await expect(canvas.page.locator(FILL_TRIGGER)).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("fill")),
		).toBeVisible();
	});

	test("stays open on a pick, so several colors can be tried in a row", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await canvas.openPropertyPanel();
		const trigger = canvas.page.locator(FILL_TRIGGER);
		await trigger.click();

		await canvas.page.click(selectors.propertyPanelSet("fill", "#dc2626"));
		await expect
			.poll(() => canvas.computedColor(id, "fill"))
			.toBe(await canvas.normalizeColor("#dc2626"));
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
			"the pick leaves the grid up",
		).toBeVisible();

		await trigger.click();
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toHaveCount(0);
	});

	test("opens above a row with no room under it", async ({ canvas }) => {
		await canvas.page.setViewportSize(SHORT_VIEWPORT);
		await canvas.drawShape("Polyline", SHAPE_FROM, SHAPE_TO);
		await canvas.openPropertyPanel();
		await scrollPanelToBottom(canvas);

		const triggerBox = await boxOf(canvas, END_ARROW_TRIGGER);
		await canvas.page.locator(END_ARROW_TRIGGER).click();

		const panelBox = await boxOf(canvas, selectors.propertyPanelDropdown);
		const sidebar = await boxOf(canvas, selectors.propertyPanel);
		expect(
			panelBox.y + panelBox.height,
			"the panel is placed above the trigger",
		).toBeLessThanOrEqual(triggerBox.y + 1);
		// Above rather than merely pinned to the sidebar's bottom edge, which is
		// where a panel that fits neither way ends up.
		expect(panelBox.y).toBeGreaterThanOrEqual(sidebar.y - 1);
	});

	test("closes when the rows it covers scroll away", async ({ canvas }) => {
		await canvas.page.setViewportSize(SHORT_VIEWPORT);
		await canvas.drawShape("Rectangle", SHAPE_FROM, SHAPE_TO);
		await canvas.openPropertyPanel();
		await canvas.page.locator(FILL_TRIGGER).click();
		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toBeVisible();

		const body = canvas.page.locator(selectors.propertyPanelBody);
		expect(
			await body.evaluate((el) => el.scrollHeight - el.clientHeight),
			"the body has somewhere to scroll to",
		).toBeGreaterThan(0);
		await body.evaluate((el) => {
			el.scrollTop += 40;
		});

		await expect(
			canvas.page.locator(selectors.propertyPanelDropdown),
		).toHaveCount(0);
	});
});

import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * The Text, Border and Opacity rows of the properties sidebar (TextItems /
 * ShapeStyleItems), checked by what the canvas ends up drawing.
 *
 * The sidebar is its own component with its own parts, so a write from here
 * takes a different route to the document than the same write from the floating
 * menu: the row reads the selection through readSelectionTextStyle /
 * readSelectionShapeStyle, and the press travels control -> gesture -> property
 * update -> re-render. Only the real DOM runs that end to end, so each test
 * states a value and then reads the drawn result out of computed style.
 *
 * The opacity rows are the exception: they are read back through the row itself,
 * having been dropped and taken up again by a re-selection. The row states the
 * percent of what readSelectionShapeStyle finds on the object, so the number
 * coming back is the 0..1 value the object now carries.
 */

/** The rectangle the tests draw, kept clear of the sidebar's own width. */
const RECT_FROM = { x: 120, y: 150 };
const RECT_TO = { x: 320, y: 280 };
const RECT_CENTER = { x: 220, y: 215 };

/**
 * Draws a rectangle carrying text, leaves it selected and opens the sidebar.
 * Text rows state a style the TextOverlay draws, and there is no overlay to read
 * until the shape holds something.
 */
async function drawLabeledRect(canvas: CanvasDriver): Promise<string> {
	const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
	await canvas.typeTextAt(RECT_CENTER, "Label");
	// commitText clicks empty space, which also drops the selection
	await canvas.commitText();
	await canvas.selectAt(RECT_CENTER);
	await canvas.openPropertyPanel();
	return id;
}

/**
 * A drawn style of the shape element itself, resolved by the browser. Read this
 * way rather than off the attribute because a shape states some of its stroke in
 * emotion CSS and some as an SVG presentation attribute, and computed style is
 * the one answer that covers both.
 */
async function computedShapeStyle(
	canvas: CanvasDriver,
	id: string,
	property: "stroke-width" | "stroke-dasharray",
): Promise<string> {
	return canvas
		.objectById(id)
		.evaluate(
			(el, name) => getComputedStyle(el).getPropertyValue(name),
			property,
		);
}

test.describe("Properties sidebar Text rows", () => {
	test("draws the text at the size the Size field states", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);
		expect((await canvas.textStyleOf(id))?.fontSize).not.toBe("32px");

		const fontSize = canvas.page.locator(
			selectors.propertyPanelField("fontSize"),
		);
		await fontSize.fill("32");
		await fontSize.press("Enter");

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("32px");
	});

	test("draws the text in the ink the Color field picks, and undo puts it back", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);
		const before = (await canvas.textStyleOf(id))?.color;

		await canvas.page
			.locator(`${selectors.propertyPanel} [aria-label="Font Color"]`)
			.click();
		await canvas.page.click(selectors.propertyPanelSet("fontColor", "#dc2626"));

		const expected = await canvas.normalizeColor("#dc2626");
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.color)
			.toBe(expected);
		expect(before).not.toBe(expected);

		await canvas.undo();
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.color)
			.toBe(before);
	});

	test("turns the text bold from the Style segments and back off again", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);
		const bold = canvas.page.locator(
			`${selectors.propertyPanel} [aria-label="Bold"]`,
		);
		await expect(bold).toHaveAttribute("aria-pressed", "false");

		await bold.click();

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
			.toBe("700");
		await expect(
			bold,
			"the segment reads back what the text is now drawn with",
		).toHaveAttribute("aria-pressed", "true");

		// The segment writes the value the press should land on, not a toggle
		// command, so the second press has to state "normal" from the lit state.
		await bold.click();
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontWeight)
			.toBe("400");
	});

	test("moves the text to the side the Horizontal segments state", async ({
		canvas,
	}) => {
		const id = await drawLabeledRect(canvas);
		expect((await canvas.textStyleOf(id))?.textAlign).not.toBe("right");

		await canvas.page.click(selectors.propertyPanelSet("textAlign", "right"));

		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.textAlign)
			.toBe("right");
	});
});

test.describe("Properties sidebar Border rows", () => {
	test("draws the border in the color the Color field picks", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const before = await canvas.computedColor(id, "stroke");

		await canvas.page
			.locator(`${selectors.propertyPanel} [aria-label="Stroke Color"]`)
			.click();
		await canvas.page.click(selectors.propertyPanelSet("stroke", "#dc2626"));

		const expected = await canvas.normalizeColor("#dc2626");
		await expect.poll(() => canvas.computedColor(id, "stroke")).toBe(expected);
		expect(before).not.toBe(expected);

		await canvas.undo();
		await expect.poll(() => canvas.computedColor(id, "stroke")).toBe(before);
	});

	test("draws the border at the thickness the Width field states", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		expect(await computedShapeStyle(canvas, id, "stroke-width")).not.toBe(
			"6px",
		);

		const strokeWidth = canvas.page.locator(
			selectors.propertyPanelField("strokeWidth"),
		);
		await strokeWidth.fill("6");
		await strokeWidth.press("Enter");

		await expect
			.poll(() => computedShapeStyle(canvas, id, "stroke-width"))
			.toBe("6px");
	});

	test("breaks the border into dashes from the Type segments and makes it whole again", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		expect(
			await computedShapeStyle(canvas, id, "stroke-dasharray"),
			"an unset dash type draws an unbroken border",
		).toBe("none");

		await canvas.page.click(
			selectors.propertyPanelSet("strokeDashType", "dashed"),
		);

		// A dashed border is an equal on/off pair; dotted is 1:2 (see border-dash.spec)
		await expect
			.poll(async () => {
				const [on, off] = (
					await computedShapeStyle(canvas, id, "stroke-dasharray")
				)
					.split(/[\s,]+/)
					.map(Number.parseFloat);
				return on > 0 && on === off;
			})
			.toBe(true);

		await canvas.page.click(
			selectors.propertyPanelSet("strokeDashType", "solid"),
		);
		await expect
			.poll(() => computedShapeStyle(canvas, id, "stroke-dasharray"))
			.toBe("none");
	});
});

test.describe("Properties sidebar Opacity rows", () => {
	test("keeps the percent typed into the Fill opacity, the shape carrying it as 0..1", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const fillOpacity = canvas.page.locator(
			selectors.propertyPanelField("fillOpacity"),
		);
		await expect(
			fillOpacity,
			"an opacity nobody declared is drawn fully opaque",
		).toHaveValue("100");

		await fillOpacity.fill("40");
		await fillOpacity.press("Enter");

		// Dropped and taken up again, so the number is read off the object rather
		// than left over from what was typed.
		await canvas.deselect();
		await canvas.selectAt(RECT_CENTER);
		await expect(fillOpacity).toHaveValue("40");
	});

	test("offers a faceless shape its stroke opacity alone", async ({
		canvas,
	}) => {
		await canvas.drawShape("Polyline", { x: 150, y: 400 }, { x: 380, y: 400 });
		await canvas.openPropertyPanel();

		await expect(
			canvas.page.locator(selectors.propertyPanelField("strokeOpacity")),
		).toHaveValue("100");
		await expect(
			canvas.page.locator(selectors.propertyPanelField("fillOpacity")),
			"a shape with no face has no fill section to state an opacity under",
		).toHaveCount(0);
	});

	test("says the opacity is mixed for a selection whose shapes disagree", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.drawShape("Rectangle", { x: 380, y: 150 }, { x: 500, y: 280 });
		await canvas.openPropertyPanel();
		const fillOpacity = canvas.page.locator(
			selectors.propertyPanelField("fillOpacity"),
		);

		// Only the first is faded, so the two disagree about their face
		await canvas.selectAt(RECT_CENTER);
		await fillOpacity.fill("40");
		await fillOpacity.press("Enter");

		await canvas.selectAll();
		await expect(
			fillOpacity,
			"no one shape's opacity is shown as the selection's",
		).toHaveValue("");
		await expect(fillOpacity).toHaveAttribute("placeholder", "—");
	});
});

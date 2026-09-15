import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The Meta section of the properties sidebar: the name and description the
 * selected object carries in the document.
 *
 * Nothing is drawn from a note, so what a typed name landed on the object is
 * read back the only way the drawing can show it — by leaving the selection and
 * coming back, which redraws the rows off the object rather than off what the
 * field is holding.
 */

/** The rectangle the tests draw: 200 x 130, clear of the panel's own width. */
const RECT_FROM = { x: 120, y: 150 };
const RECT_TO = { x: 320, y: 280 };

/** A point inside the drawn rectangle, for selecting it back. */
const RECT_INSIDE = { x: 220, y: 215 };

test.describe("Properties sidebar meta section", () => {
	test("writes a typed name onto the selected object, and one undo takes it back", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const name = canvas.page.locator(selectors.propertyPanelField("metaName"));
		await expect(name).toHaveValue("");

		await name.fill("Server");
		// The blur is what commits, so the focus has to leave the field first.
		await canvas.page.locator(selectors.propertyPanelHeader).click();

		// Off the selection and back, so the row is drawn from the object's own
		// meta rather than from the text the field was left holding.
		await canvas.deselect();
		await expect(
			canvas.page.locator(selectors.propertyPanelSection("meta")),
			"the section goes with the selection",
		).toHaveCount(0);
		await canvas.selectAt(RECT_INSIDE);
		await expect(name).toHaveValue("Server");

		await canvas.undo();
		await expect(name).toHaveValue("");
	});

	test("stands only for a selection naming one object", async ({ canvas }) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.drawShape("Rectangle", { x: 380, y: 150 }, { x: 480, y: 240 });
		await canvas.openPropertyPanel();
		const section = canvas.page.locator(selectors.propertyPanelSection("meta"));
		await expect(section, "one object, one note").toBeVisible();

		await canvas.selectAll();
		await expect(
			section,
			"a note belongs to one object, so a multi-selection has none",
		).toHaveCount(0);

		await canvas.deselect();
		await expect(
			section,
			"and the canvas section is what stands with nothing selected",
		).toHaveCount(0);
	});
});

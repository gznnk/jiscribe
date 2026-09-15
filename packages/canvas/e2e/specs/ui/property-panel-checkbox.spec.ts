import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

/**
 * The checkbox rows of the properties sidebar (PropertyCheckbox): the flags that
 * have no value to type — the aspect-ratio lock, the height that follows the
 * text, the width the text wraps in.
 *
 * Each writes through the gesture system like the floating menu's own toggles,
 * so a press lands one history entry, and the `data-part` it carries names the
 * state the *next* press moves to (`set:lockAspectRatio:false` while it is
 * locked). What they set is read off the shape rather than off the row: the
 * lock through the axis a typed width carries along, the layout switch through
 * the handles the block layout offers.
 */

/** The rectangle the layout tests draw: 200 x 130 at (100, 150). */
const RECT_FROM = { x: 100, y: 150 };
const RECT_TO = { x: 300, y: 280 };
const RECT_WIDTH = "200";
const RECT_HEIGHT = "130";

const LOCK_ON = selectors.propertyPanelSet("lockAspectRatio", "true");
const LOCK_OFF = selectors.propertyPanelSet("lockAspectRatio", "false");
const AUTO_HEIGHT = selectors.propertyPanelCommand("toggleAutoHeight");
const TEXT_LAYOUT = selectors.propertyPanelCommand("toggleTextLayout");

test.describe("Properties sidebar checkboxes", () => {
	test("carries the other axis along once the aspect ratio is locked", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const rect = canvas.objectById(id);

		const unlocked = canvas.page.locator(LOCK_ON);
		await expect(unlocked).toHaveAttribute("aria-checked", "false");
		await unlocked.click();
		// The part names the press that follows, so the locked row is the "false" one.
		await expect(canvas.page.locator(LOCK_OFF)).toHaveAttribute(
			"aria-checked",
			"true",
		);
		// The press lands one entry of its own, which is what one undo takes back.
		await canvas.undo();
		await expect(canvas.page.locator(LOCK_ON)).toHaveAttribute(
			"aria-checked",
			"false",
		);

		await canvas.page.locator(LOCK_ON).click();
		await expect(canvas.page.locator(LOCK_OFF)).toHaveAttribute(
			"aria-checked",
			"true",
		);
		const width = canvas.page.locator(selectors.propertyPanelField("width"));
		await width.fill("400");
		await width.press("Enter");
		await expect.poll(() => rect.getAttribute("width")).toBe("400");
		await expect
			.poll(() => rect.getAttribute("height"), {
				message: "the height follows the width the ratio ties it to",
			})
			.toBe("260");

		// One entry for the resize, both axes of it together.
		await canvas.undo();
		await expect.poll(() => rect.getAttribute("width")).toBe(RECT_WIDTH);
		await expect.poll(() => rect.getAttribute("height")).toBe(RECT_HEIGHT);
	});

	test("switches the height between following the text and being stated", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();

		const autoHeight = canvas.page.locator(AUTO_HEIGHT);
		await expect(autoHeight).toHaveAttribute("aria-checked", "false");
		await autoHeight.click();
		await expect(autoHeight).toHaveAttribute("aria-checked", "true");
		await autoHeight.click();
		await expect(autoHeight).toHaveAttribute("aria-checked", "false");
	});

	test("a stated height stops the height following the text", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape("Rectangle", RECT_FROM, RECT_TO);
		await canvas.openPropertyPanel();
		const autoHeight = canvas.page.locator(AUTO_HEIGHT);
		await autoHeight.click();
		await expect(autoHeight).toHaveAttribute("aria-checked", "true");

		const height = canvas.page.locator(selectors.propertyPanelField("height"));
		await height.fill("180");
		await height.press("Enter");

		await expect
			.poll(() => canvas.objectById(id).getAttribute("height"))
			.toBe("180");
		await expect(
			autoHeight,
			"a height the document states is no longer the text's",
		).toHaveAttribute("aria-checked", "false");
	});

	test("wraps a text in a fixed width, which is the width its handles then change", async ({
		canvas,
	}) => {
		await canvas.placeShape("Text");
		await canvas.openPropertyPanel();

		const textLayout = canvas.page.locator(TEXT_LAYOUT);
		await expect(textLayout).toHaveAttribute("aria-checked", "false");
		await textLayout.click();
		await expect(textLayout).toHaveAttribute("aria-checked", "true");

		// Block layout stores a width and measures the height back from the wrapped
		// lines, so only the two handles that change that width are offered
		// (shapes/text-block reads the switch the same way).
		for (const handle of ["leftCenter", "rightCenter"] as const) {
			await expect(
				canvas.page.locator(selectors.transformControl(handle)),
			).toBeVisible();
		}
		for (const handle of ["bottomRight", "bottomCenter", "topLeft"] as const) {
			await expect(
				canvas.page.locator(selectors.transformControl(handle)),
			).toHaveCount(0);
		}

		await textLayout.click();
		await expect(textLayout).toHaveAttribute("aria-checked", "false");
		await expect(
			canvas.page.locator(selectors.transformControl("bottomRight")),
			"a text measured from its own content has no size to drag",
		).toHaveCount(0);
	});
});

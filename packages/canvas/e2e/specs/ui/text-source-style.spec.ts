import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Styling a body written in a source language (`features.text: "source"`, the
 * spec plugin's `memo`). Such a body is a plain string the shape renders itself,
 * so two things that hold for every other text must not hold here: a stretch of
 * it cannot be styled on its own, and the emphasis typography the syntax already
 * carries (bold / italic / the decoration lines) is not offered at all.
 *
 * The saved body is read through what is drawn: the overlay draws one element per
 * run, so a single element is the evidence that the text is still one plain
 * string rather than the run list a per-range write would have made of it.
 */
test.describe("styling a source-language body", () => {
	/** Places a memo, types `text` into it and leaves the editor open on it. */
	async function placeAndEdit(
		canvas: CanvasDriver,
		text: string,
	): Promise<{ id: string; center: { x: number; y: number } }> {
		const id = await canvas.placeShape("Memo");
		// The menu shown right after placing would sit over the shape's own center.
		await canvas.deselect();
		const box = await canvas.objectById(id).boundingBox();
		if (!box) {
			throw new Error("cannot locate the Memo");
		}
		const center = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});
		await canvas.typeTextAt(center, text);
		return { id, center };
	}

	/** Selects the first `length` characters of the open editor. */
	async function selectFromStart(canvas: CanvasDriver, length: number) {
		await canvas.page.keyboard.press("Home");
		for (let i = 0; i < length; i++) {
			await canvas.page.keyboard.press("Shift+ArrowRight");
		}
	}

	test("leaves the body plain when bold is pressed over a stretch of it", async ({
		canvas,
	}) => {
		const { id } = await placeAndEdit(canvas, "# Title");
		await selectFromStart(canvas, 2);

		await canvas.page.keyboard.press("ControlOrMeta+b");
		await canvas.commitText();

		// One element, at the weight it had: neither a run was made of the stretch
		// nor was the slot itself bolded.
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "# Title", fontWeight: "400" }),
		]);
	});

	test("offers no format toggles while the body is edited, the ground items staying", async ({
		canvas,
	}) => {
		await placeAndEdit(canvas, "# Title");
		await selectFromStart(canvas, 2);

		await expect(canvas.page.locator(selectors.objectMenu)).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("font-size")),
		).toBeVisible();
		// The four buttons are laid out flat while text is edited, so their absence
		// is the absence of the `set:` parts themselves.
		await expect(
			canvas.page.locator(
				'[data-id="object-menu"][data-part^="set:fontWeight:"]',
			),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("text-format")),
		).toHaveCount(0);
	});

	test("offers no format row in the properties sidebar, the other text rows staying", async ({
		canvas,
	}) => {
		const { id, center } = await placeAndEdit(canvas, "# Title");
		await canvas.commitText();
		await canvas.selectAt(center);
		await canvas.openPropertyPanel();

		await expect(
			canvas.page.locator(selectors.propertyPanelField("fontSize")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.propertyPanelSet("fontWeight", "bold")),
		).toHaveCount(0);
		await expect(
			canvas.page.locator(selectors.propertyPanelSet("textAlign", "left")),
		).toBeVisible();
		// The shape is the one the rows are reading.
		expect(await canvas.objectById(id).count()).toBe(1);
	});

	test("resizes the whole body from the menu even with a stretch selected", async ({
		canvas,
	}) => {
		const { id } = await placeAndEdit(canvas, "# Title");
		await selectFromStart(canvas, 2);

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 40);

		// The size lands on the slot rather than on the selected characters, so the
		// body is still one element and all of it is drawn at the new size.
		await expect
			.poll(async () => await canvas.drawnTextRuns(id))
			.toEqual([
				expect.objectContaining({ text: "# Title", fontSize: "40px" }),
			]);
		await canvas.commitText();
		expect(await canvas.drawnTextRuns(id)).toEqual([
			expect.objectContaining({ text: "# Title", fontSize: "40px" }),
		]);
	});
});

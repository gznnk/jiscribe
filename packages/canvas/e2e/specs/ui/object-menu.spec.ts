import { test, expect } from "../../fixtures";
import { selectors } from "../../support/selectors";

test.describe("styling through the ObjectMenu", () => {
	test("sets the background and stroke color from the CSS color input", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("bg-color", "#6366f1");
		await canvas.setColor("stroke-color", "#4f46e5");

		// Colors come from emotion CSS rather than SVG attributes, so check the computed
		// style. Polled because the commit reaches the render on a later frame.
		const expectedFill = await canvas.normalizeColor("#6366f1");
		const expectedStroke = await canvas.normalizeColor("#4f46e5");
		await expect
			.poll(() => canvas.computedColor(id, "fill"))
			.toBe(expectedFill);
		await expect
			.poll(() => canvas.computedColor(id, "stroke"))
			.toBe(expectedStroke);
	});

	test("sets transparent as well", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);

		await canvas.setColor("stroke-color", "transparent");

		// transparent resolves to rgba(0, 0, 0, 0) in the computed style
		expect(await canvas.computedColor(id, "stroke")).toBe(
			await canvas.normalizeColor("transparent"),
		);
	});

	test("makes a polyline dashed", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 400, y: 400 },
			{ x: 700, y: 450 },
		);

		await canvas.setStrokeDashType("line-style", "dashed");

		// The style lands on the visual element, not the hit-test element
		await expect(await canvas.visualPolylineFor(id)).toHaveAttribute(
			"stroke-dasharray",
			/.+/,
		);
	});

	test("leaves the keyboard shortcuts working right after a slider drag", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = await rect.getAttribute("stroke-width");

		await canvas.openObjectMenu("border-style");
		await canvas.dragSliderBy("strokeWidth", 40);
		await expect.poll(() => rect.getAttribute("stroke-width")).not.toBe(before);

		// Shortcuts are skipped while a form element has the focus, so the slider
		// gives it up on the pointer release rather than holding it until something
		// else is clicked: the undo lands without a detour.
		await canvas.undo();

		await expect.poll(() => rect.getAttribute("stroke-width")).toBe(before);
	});

	test("keeps the submenu open when its background is clicked", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		await canvas.openObjectMenu("bg-color");
		const colorInput = canvas.page.locator(selectors.cssColorInput);
		await expect(colorInput).toBeVisible();

		// Click the blank part of the panel (background, not a button): the top-left
		// corner falls inside the padding of ColorPickerContainer.
		const panel = canvas.page.locator(
			'[data-id="object-menu"][data-part="panel"]',
		);
		await panel.click({ position: { x: 6, y: 6 } });

		// The submenu stays open and the shape stays selected
		await expect(colorInput).toBeVisible();
		await expect(canvas.page.locator(selectors.control).first()).toBeVisible();
	});

	test("narrows the ObjectMenu to its text items while text is being edited", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const objectMenu = canvas.page.locator(selectors.objectMenu);
		const backgroundColor = canvas.page.locator(
			selectors.objectMenuToggle("bg-color"),
		);
		const fontSize = canvas.page.locator(
			selectors.objectMenuToggle("font-size"),
		);
		await expect(objectMenu).toBeVisible();
		await expect(backgroundColor).toBeVisible();

		// The menu stays through the edit — it is how a stretch of the text being
		// edited is styled — but only its text items, since the rest acts on the
		// shape rather than on the text.
		await canvas.typeTextAt({ x: 500, y: 260 }, "Editing");
		await expect(objectMenu).toBeVisible();
		await expect(fontSize).toBeVisible();
		await expect(backgroundColor).toHaveCount(0);

		await canvas.cancelText();
		await expect(backgroundColor).toBeVisible();
	});

	test("lays the text format buttons out flat while text is being edited", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 400, y: 200 }, { x: 600, y: 320 });

		const textFormatToggle = canvas.page.locator(
			selectors.objectMenuToggle("text-format"),
		);
		const bold = canvas.page.locator(
			selectors.objectMenuSet("fontWeight", "bold"),
		);
		const italic = canvas.page.locator(
			selectors.objectMenuSet("fontStyle", "italic"),
		);
		const underline = canvas.page.locator(
			selectors.objectMenuSet("textDecoration", "underline"),
		);
		const strikethrough = canvas.page.locator(
			selectors.objectMenuSet("textDecoration", "line-through"),
		);

		// Selected but not editing: the four sit behind the dropdown.
		await expect(textFormatToggle).toBeVisible();
		await expect(bold).toHaveCount(0);

		await canvas.typeTextAt({ x: 500, y: 260 }, "Editing");
		await expect(textFormatToggle).toHaveCount(0);
		await expect(bold).toBeVisible();
		await expect(italic).toBeVisible();
		await expect(underline).toBeVisible();
		await expect(strikethrough).toBeVisible();

		await canvas.cancelText();
		await expect(textFormatToggle).toBeVisible();
		await expect(bold).toHaveCount(0);
	});

	test("keeps the color setting after text editing", async ({ canvas }) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.setColor("bg-color", "#dbeafe");

		await canvas.deselect();
		await canvas.typeTextAt({ x: 500, y: 260 }, "Styled");
		await canvas.commitText();

		expect(await canvas.computedColor(id, "fill")).toBe(
			await canvas.normalizeColor("#dbeafe"),
		);
		await expect(canvas.page.locator("body")).toContainText("Styled");
	});

	test("follows the box a keystroke regrows while the text is being edited", async ({
		canvas,
	}) => {
		// A keystroke regrows an auto-sized text before any commit, and the pointer
		// sits on the editing surface rather than the menu, so nothing holds the
		// anchor: the menu tracks the draft box instead of waiting for the commit.
		const id = await canvas.placeShape("Text");
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();

		// Open the editor before taking the baseline, so the move measured below is
		// the growth alone and not the menu narrowing to its text items.
		const box = await canvas.objectById(id).boundingBox();
		await canvas.typeTextAt(
			canvas.toContent({
				x: (box?.x ?? 0) + (box?.width ?? 0) / 2,
				y: (box?.y ?? 0) + (box?.height ?? 0) / 2,
			}),
			"",
		);
		await expect(objectMenu).toBeVisible();
		const anchored = await objectMenu.boundingBox();

		// Each Enter moves the box's bottom edge down, one keystroke at a time.
		await canvas.page.keyboard.type("one\ntwo\nthree");

		// Still editing: the movement happened on the draft, not on a commit.
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect
			.poll(async () => (await objectMenu.boundingBox())?.y)
			.toBeGreaterThan(anchored?.y ?? 0);
	});

	test("stays put while a font size change regrows the text it is anchored to", async ({
		canvas,
	}) => {
		// A `text` re-measures its box from its own content, so a larger font grows it
		// down and to the right — and the menu is anchored to the bottom center of that
		// box. Following the growth would walk the control out from under the pointer
		// still using it, one step per change.
		const id = await canvas.placeShape("Text");
		const objectMenu = canvas.page.locator(selectors.objectMenu);
		await expect(objectMenu).toBeVisible();
		const anchored = await objectMenu.boundingBox();

		await canvas.openObjectMenu("font-size");
		await canvas.setNumberInput("fontSize", 48);
		await expect
			.poll(async () => (await canvas.textStyleOf(id))?.fontSize)
			.toBe("48px");

		expect(await objectMenu.boundingBox()).toEqual(anchored);

		// Closing the panel and taking the pointer off the menu ends the interaction,
		// and the anchor is re-taken below the box as it is now.
		await canvas.openObjectMenu("font-size");
		await canvas.page.mouse.move(0, 0);
		await expect
			.poll(async () => (await objectMenu.boundingBox())?.y)
			.toBeGreaterThan(anchored?.y ?? 0);
	});
});
